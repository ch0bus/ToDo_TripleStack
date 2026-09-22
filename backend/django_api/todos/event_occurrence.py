"""Вхождения события: повтор, конец, последнее пропущенное."""

from calendar import monthrange
from datetime import date, datetime, time, timedelta

from todos.models import Event, Recurrence

MAX_OCCURRENCE_STEPS = 2400
DEFAULT_DURATION = timedelta(hours=1)


def next_occurrence(start: datetime, recurrence: str) -> datetime | None:
    if recurrence == Recurrence.DAILY:
        return start + timedelta(days=1)
    if recurrence == Recurrence.WEEKLY:
        return start + timedelta(weeks=1)
    if recurrence != Recurrence.MONTHLY:
        return None
    year = start.year + (1 if start.month == 12 else 0)
    month = 1 if start.month == 12 else start.month + 1
    last = monthrange(year, month)[1]
    day = min(start.day, last)
    try:
        return start.replace(year=year, month=month, day=day)
    except ValueError:
        return start + timedelta(days=32 - start.day)


def occurrence_date(occurrence_start: datetime, tz) -> date:
    return occurrence_start.astimezone(tz).date()


def occurrence_end(event: Event, occurrence_start: datetime, tz) -> datetime:
    local_start = occurrence_start.astimezone(tz)
    if event.all_day:
        nxt = local_start.date() + timedelta(days=1)
        return datetime.combine(nxt, time.min, tzinfo=tz)
    if event.end_at and event.start_at:
        duration = event.end_at - event.start_at
        if duration > timedelta(0):
            return occurrence_start + duration
    return occurrence_start + DEFAULT_DURATION


def last_missed_occurrence(
    event: Event,
    now: datetime,
    tz,
    attended_dates: set[date] | None = None,
) -> tuple[datetime, date] | None:
    """Последнее закончившееся вхождение без отметки. Для серии — одно, не все."""
    if attended_dates is None:
        attended_dates = {row.occurrence_date for row in event.attendances.all()}
    cursor = event.start_at
    last: tuple[datetime, date] | None = None
    for _ in range(MAX_OCCURRENCE_STEPS):
        end = occurrence_end(event, cursor, tz)
        if end > now:
            break
        day = occurrence_date(cursor, tz)
        if day not in attended_dates:
            last = (cursor, day)
        nxt = next_occurrence(cursor, event.recurrence)
        if nxt is None:
            break
        cursor = nxt
    return last


def missed_event_marks(events, now: datetime, tz, limit: int = 15):
    rows = []
    for event in events:
        missed = last_missed_occurrence(event, now, tz)
        if missed:
            rows.append((event, missed[1]))
    rows.sort(key=lambda item: (item[1], item[0].id))
    return rows[:limit]
