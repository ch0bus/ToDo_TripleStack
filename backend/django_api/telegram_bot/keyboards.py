"""Клавиатуры Telegram: меню, дата, Готово. Не путать задачу с Event."""

from calendar import MONDAY, Calendar
from datetime import date

BTN_NEW = "Новая задача"
BTN_NEW_EVENT = "Новое событие"
BTN_NEW_NOTE = "Новая заметка"
BTN_TODAY = "Сегодня"
BTN_TOMORROW = "Завтра"
BTN_OVERDUE = "Просрочено"
MENU_BUTTONS = frozenset(
    {BTN_NEW, BTN_NEW_EVENT, BTN_NEW_NOTE, BTN_TODAY, BTN_TOMORROW, BTN_OVERDUE}
)

MAX_DONE_BUTTONS = 12
MONTHS_NOM = (
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
)
WEEKDAYS = ("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")
NOOP = "k:~"


def menu_keyboard() -> dict:
    return {
        "keyboard": [
            [{"text": BTN_NEW}, {"text": BTN_NEW_EVENT}],
            [{"text": BTN_NEW_NOTE}, {"text": BTN_TODAY}],
            [{"text": BTN_TOMORROW}, {"text": BTN_OVERDUE}],
        ],
        "resize_keyboard": True,
        "is_persistent": True,
    }


def remove_keyboard() -> dict:
    return {"remove_keyboard": True}


def done_keyboard(todo_id: int) -> dict:
    return {
        "inline_keyboard": [[{"text": "Готово", "callback_data": f"d:{todo_id}"}]],
    }


def todos_done_keyboard(todos) -> dict | None:
    rows = []
    for todo in todos[:MAX_DONE_BUTTONS]:
        rows.append(
            [{"text": _done_label(todo.title), "callback_data": f"d:{todo.id}"}]
        )
    if not rows:
        return None
    return {"inline_keyboard": rows}


def date_choice_keyboard() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": BTN_TODAY, "callback_data": "k:t"},
                {"text": BTN_TOMORROW, "callback_data": "k:m"},
            ],
            [{"text": "Выбрать день", "callback_data": "k:c"}],
        ]
    }


def month_keyboard(month: date, today: date) -> dict:
    first = month.replace(day=1)
    header = [
        {
            "text": f"{MONTHS_NOM[first.month - 1]} {first.year}",
            "callback_data": NOOP,
        }
    ]
    rows = [header, [{"text": name, "callback_data": NOOP} for name in WEEKDAYS]]
    weeks = Calendar(firstweekday=MONDAY).monthdayscalendar(first.year, first.month)
    for week in weeks:
        row = []
        for day_num in week:
            if day_num == 0:
                row.append({"text": " ", "callback_data": NOOP})
                continue
            day = date(first.year, first.month, day_num)
            label = f"·{day_num}·" if day == today else str(day_num)
            row.append({"text": label, "callback_data": f"k:{day.isoformat()}"})
        rows.append(row)
    rows.append(
        [
            {"text": "‹", "callback_data": "k:<"},
            {"text": "›", "callback_data": "k:>"},
        ]
    )
    return {"inline_keyboard": rows}


def shift_month(month: date, delta: int) -> date:
    first = month.replace(day=1)
    year = first.year
    index = first.month - 1 + delta
    year += index // 12
    index = index % 12
    return date(year, index + 1, 1)


def parse_iso_day(value: str) -> date | None:
    if len(value) != 10 or value[4] != "-" or value[7] != "-":
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _done_label(title: str) -> str:
    prefix = "Готово · "
    room = 64 - len(prefix)
    text = (title or "Задача").strip() or "Задача"
    if len(text) <= room:
        return prefix + text
    return prefix + text[: max(room - 1, 1)] + "…"
