from datetime import date, timedelta

from todos.models import (
    DEFAULT_SHIFT_CALENDAR_NAME,
    SHIFT_LAYER_COUNT,
    SHIFT_LAYER_NAMES,
    ShiftCalendar,
    ShiftDayOverride,
    ShiftLayer,
    ShiftPattern,
)


def ensure_shift_layers(calendar: ShiftCalendar) -> list[ShiftLayer]:
    """Два слоя на календарь: позиция 0 и 1."""
    existing = {
        layer.position: layer
        for layer in ShiftLayer.objects.filter(calendar=calendar)
    }
    created = False
    for position, name in enumerate(SHIFT_LAYER_NAMES[:SHIFT_LAYER_COUNT]):
        if position not in existing:
            existing[position] = ShiftLayer.objects.create(
                calendar=calendar,
                position=position,
                name=name,
            )
            created = True
    if created:
        return list(
            ShiftLayer.objects.filter(calendar=calendar).order_by("position")[
                :SHIFT_LAYER_COUNT
            ]
        )
    return [
        existing[position]
        for position in range(SHIFT_LAYER_COUNT)
        if position in existing
    ]


def ensure_default_calendar(user) -> ShiftCalendar:
    calendar = (
        ShiftCalendar.objects.filter(user=user).order_by("created_at", "id").first()
    )
    if calendar:
        ensure_shift_layers(calendar)
        return calendar
    calendar = ShiftCalendar.objects.create(
        user=user,
        name=DEFAULT_SHIFT_CALENDAR_NAME,
    )
    ensure_shift_layers(calendar)
    return calendar


def list_shift_calendars(user) -> list[ShiftCalendar]:
    ensure_default_calendar(user)
    return list(ShiftCalendar.objects.filter(user=user).order_by("created_at", "id"))


def layer_for_user(user, layer_id) -> ShiftLayer | None:
    return ShiftLayer.objects.filter(calendar__user=user, pk=layer_id).first()


def _expand_layer_days(layer: ShiftLayer, start: date, end: date) -> list[dict]:
    pattern = (
        ShiftPattern.objects.filter(layer=layer)
        .prefetch_related("slots__kind")
        .first()
    )
    slots = list(pattern.slots.all()) if pattern else []
    overrides = {
        row.date: row
        for row in ShiftDayOverride.objects.filter(
            layer=layer,
            date__gte=start,
            date__lte=end,
        ).select_related("kind")
    }

    result: list[dict] = []
    cursor = start
    while cursor <= end:
        if cursor in overrides:
            override = overrides[cursor]
            result.append(
                {
                    "date": cursor,
                    "layer_id": layer.id,
                    "kind": override.kind,
                    "source": "override",
                }
            )
        elif (
            pattern
            and slots
            and cursor >= pattern.start_date
            and (pattern.end_date is None or cursor <= pattern.end_date)
        ):
            slot = slots[(cursor - pattern.start_date).days % len(slots)]
            if slot.kind_id:
                result.append(
                    {
                        "date": cursor,
                        "layer_id": layer.id,
                        "kind": slot.kind,
                        "source": "pattern",
                    }
                )
        cursor += timedelta(days=1)
    return result


def expand_shift_days(calendar: ShiftCalendar, start: date, end: date) -> list[dict]:
    """Развернуть шаблоны слоёв календаря и наложить ручные правки."""
    if start > end:
        return []
    layers = ensure_shift_layers(calendar)
    result: list[dict] = []
    for layer in layers:
        result.extend(_expand_layer_days(layer, start, end))
    result.sort(key=lambda row: (row["date"], row["layer_id"]))
    return result
