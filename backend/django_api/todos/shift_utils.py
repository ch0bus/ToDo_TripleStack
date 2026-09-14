from datetime import date, timedelta

from todos.models import ShiftDayOverride, ShiftPattern


def expand_shift_days(user, start: date, end: date) -> list[dict]:
    """Развернуть шаблон и наложить ручные правки на диапазон дат."""
    if start > end:
        return []

    pattern = (
        ShiftPattern.objects.filter(user=user)
        .prefetch_related("slots__kind")
        .first()
    )
    slots = list(pattern.slots.all()) if pattern else []
    overrides = {
        row.date: row
        for row in ShiftDayOverride.objects.filter(
            user=user,
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
                        "kind": slot.kind,
                        "source": "pattern",
                    }
                )
        cursor += timedelta(days=1)
    return result
