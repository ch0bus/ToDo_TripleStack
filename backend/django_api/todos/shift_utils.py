from datetime import date, timedelta

from todos.models import (
    SHIFT_LAYER_COUNT,
    SHIFT_LAYER_NAMES,
    ShiftDayOverride,
    ShiftLayer,
    ShiftPattern,
)


def ensure_shift_layers(user) -> list[ShiftLayer]:
    """Два слоя на пользователя: позиция 0 и 1."""
    existing = {
        layer.position: layer
        for layer in ShiftLayer.objects.filter(user=user)
    }
    created = False
    for position, name in enumerate(SHIFT_LAYER_NAMES[:SHIFT_LAYER_COUNT]):
        if position not in existing:
            existing[position] = ShiftLayer.objects.create(
                user=user,
                position=position,
                name=name,
            )
            created = True
    if created:
        return list(
            ShiftLayer.objects.filter(user=user).order_by("position")[:SHIFT_LAYER_COUNT]
        )
    return [existing[position] for position in range(SHIFT_LAYER_COUNT) if position in existing]


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


def expand_shift_days(user, start: date, end: date) -> list[dict]:
    """Развернуть шаблоны слоёв и наложить ручные правки на диапазон дат."""
    if start > end:
        return []
    layers = ensure_shift_layers(user)
    result: list[dict] = []
    for layer in layers:
        result.extend(_expand_layer_days(layer, start, end))
    result.sort(key=lambda row: (row["date"], row["layer_id"]))
    return result
