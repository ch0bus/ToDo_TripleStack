import calendar
from datetime import timedelta

from django.utils import timezone

from todos.models import Recurrence, Status, Todo


def next_due_date(current, recurrence: str):
    """Следующий срок от current (или now), если current пуст."""
    base = current if current is not None else timezone.now()

    if recurrence == Recurrence.DAILY:
        return base + timedelta(days=1)
    if recurrence == Recurrence.WEEKLY:
        return base + timedelta(weeks=1)
    if recurrence == Recurrence.MONTHLY:
        month = base.month + 1
        year = base.year
        if month > 12:
            month = 1
            year += 1
        day = min(base.day, calendar.monthrange(year, month)[1])
        return base.replace(year=year, month=month, day=day)
    return None


def spawn_next_occurrence(todo: Todo) -> Todo | None:
    if todo.recurrence == Recurrence.NEVER:
        return None

    new_due = next_due_date(todo.due_date, todo.recurrence)
    new_todo = Todo.objects.create(
        user=todo.user,
        title=todo.title,
        description=todo.description,
        status=Status.TODO,
        priority=todo.priority,
        due_date=new_due,
        recurrence=todo.recurrence,
    )
    new_todo.tags.set(todo.tags.all())
    return new_todo
