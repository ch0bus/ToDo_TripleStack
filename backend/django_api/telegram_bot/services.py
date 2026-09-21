import hashlib
import logging
import re
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from todos.models import DayNote, Event, Status, Todo

from .client import (
    TelegramAPIError,
    answer_callback,
    call_telegram,
    edit_message,
    fetch_bot_identity,
    send_message,
)
from .constants import ALLOWED_TIMEZONES
from .keyboards import (
    BTN_NEW,
    BTN_NEW_EVENT,
    BTN_NEW_NOTE,
    BTN_OVERDUE,
    BTN_TODAY,
    BTN_TOMORROW,
    MENU_BUTTONS,
    date_choice_keyboard,
    done_keyboard,
    menu_keyboard,
    month_keyboard,
    parse_iso_day,
    remove_keyboard,
    shift_month,
    todos_done_keyboard,
)
from .models import TelegramBot, TelegramDelivery

logger = logging.getLogger(__name__)

START_RE = re.compile(r"^/start(?:@\S+)?(?:\s+\S+)?\s*$", re.IGNORECASE)
COMMAND_RE = re.compile(r"^/(\w+)(?:@\S+)?(?:\s|$)", re.IGNORECASE)
TOKEN_RE = re.compile(r"^\d{5,}:[A-Za-z0-9_-]{20,}$")
PENDING_TITLE = "title"
PENDING_DATE = "date"
PENDING_EVENT_TITLE = "etitle"
PENDING_EVENT_DATE = "edate"
PENDING_NOTE_TITLE = "ntitle"
PENDING_NOTE_DATE = "ndate"
TITLE_STEPS = frozenset({PENDING_TITLE, PENDING_EVENT_TITLE, PENDING_NOTE_TITLE})
DATE_STEPS = frozenset({PENDING_DATE, PENDING_EVENT_DATE, PENDING_NOTE_DATE})
NOTE_MAX = 2000
MONTHS_RU = (
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
)
HELP_TEXT = (
    "Haloday — личный планер.\n\n"
    "Напишите задачу — она появится на сегодня.\n"
    "«Новая задача» — сначала выбрать дату на календаре.\n"
    "«Новое событие» — встреча на весь день, тоже с датой.\n"
    "«Новая заметка» — текст заметки дня и дата.\n"
    "Кнопки внизу: Сегодня, Завтра, Просрочено.\n"
    "/stop — отвязать этот чат"
)
BUSY_HINT = "Этот бот уже привязан к другому чату."
START_HINT = (
    "Напишите /start в личном чате с ботом, чтобы получать задачи сюда."
)
ASK_TITLE = "Напишите название задачи."
ASK_EVENT_TITLE = "Напишите название события."
ASK_NOTE_TEXT = "Напишите текст заметки."
ASK_DATE_HINT = "Выберите дату кнопками ниже или нажмите Сегодня, чтобы отменить."


def hash_bot_token(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


def token_hint(raw: str) -> str:
    token = raw.strip()
    if len(token) < 4:
        return "••••"
    return "…" + token[-4:]


def bot_tz(bot: TelegramBot | None):
    name = (bot.timezone if bot else "") or settings.TELEGRAM_TZ
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("Europe/Moscow")


def local_now(bot: TelegramBot | None = None) -> datetime:
    return timezone.now().astimezone(bot_tz(bot))


def local_today(bot: TelegramBot | None = None):
    return local_now(bot).date()


def day_bounds(day, bot: TelegramBot | None = None):
    start = datetime.combine(day, time.min, tzinfo=bot_tz(bot))
    return start, start + timedelta(days=1)


def deep_link_for(bot: TelegramBot | None) -> str:
    if not bot or not bot.bot_username:
        return ""
    return f"https://t.me/{bot.bot_username}"


def normalize_token(raw: str) -> str:
    return raw.strip()


def validate_token_format(token: str) -> str:
    token = normalize_token(token)
    if not TOKEN_RE.match(token):
        raise ValidationError(
            {"token": "Ожидается токен BotFather вида 123456:AAH…"}
        )
    return token


def validate_timezone(name: str) -> str:
    value = (name or "").strip() or "Europe/Moscow"
    if value not in ALLOWED_TIMEZONES:
        raise ValidationError({"timezone": "Неизвестный часовой пояс."})
    return value


def _format_day(day) -> str:
    return f"{day.day} {MONTHS_RU[day.month - 1]}"


def _format_time(dt: datetime | None, bot: TelegramBot | None = None) -> str:
    if dt is None:
        return ""
    local = dt.astimezone(bot_tz(bot))
    if local.hour == 0 and local.minute == 0:
        return ""
    return local.strftime("%H:%M")


def _todo_line(todo: Todo, bot: TelegramBot | None = None) -> str:
    stamp = _format_time(todo.event_date, bot) or _format_time(todo.due_date, bot)
    return f"• {todo.title}" + (f" ({stamp})" if stamp else "")


def _event_line(event: Event, bot: TelegramBot | None = None) -> str:
    if event.all_day:
        extra = "весь день"
    else:
        extra = _format_time(event.start_at, bot) or "время не указано"
    return f"• {event.title} ({extra})"


def todos_for_day(user, day, bot: TelegramBot | None = None):
    start, end = day_bounds(day, bot)
    return list(
        Todo.objects.filter(user=user)
        .exclude(status=Status.DONE)
        .filter(
            Q(due_date__gte=start, due_date__lt=end)
            | Q(event_date__gte=start, event_date__lt=end)
        )
        .order_by("due_date", "event_date", "id")
    )


def events_for_day(user, day, bot: TelegramBot | None = None):
    start, end = day_bounds(day, bot)
    return list(
        Event.objects.filter(user=user, start_at__gte=start, start_at__lt=end).order_by(
            "start_at", "id"
        )
    )


def overdue_todos(user, day, bot: TelegramBot | None = None):
    start, _ = day_bounds(day, bot)
    return list(
        Todo.objects.filter(user=user, due_date__lt=start)
        .exclude(status=Status.DONE)
        .order_by("due_date", "id")[:15]
    )


def format_today(user, bot: TelegramBot | None = None) -> str:
    text, _todos = plan_today(user, bot)
    return text


def plan_today(user, bot: TelegramBot | None = None):
    bot = bot or getattr(user, "telegram_bot", None)
    day = local_today(bot)
    return build_day_plan(
        user,
        bot,
        day,
        heading=f"Сегодня, {_format_day(day)}",
        with_overdue=True,
        empty="На сегодня ничего не запланировано.",
    )


def plan_tomorrow(user, bot: TelegramBot | None = None):
    bot = bot or getattr(user, "telegram_bot", None)
    day = local_today(bot) + timedelta(days=1)
    return build_day_plan(
        user,
        bot,
        day,
        heading=f"Завтра, {_format_day(day)}",
        with_overdue=False,
        empty="На завтра ничего не запланировано.",
    )


def plan_overdue(user, bot: TelegramBot | None = None):
    bot = bot or getattr(user, "telegram_bot", None)
    overdue = overdue_todos(user, local_today(bot), bot)
    if not overdue:
        return "Просроченных задач нет.", []
    text = "Просрочено:\n" + "\n".join(_todo_line(todo, bot) for todo in overdue)
    return text, overdue


def note_for_day(user, day):
    return DayNote.objects.filter(user=user, date=day).first()


def build_day_plan(
    user,
    bot: TelegramBot | None,
    day,
    *,
    heading: str,
    with_overdue: bool,
    empty: str,
):
    todos = todos_for_day(user, day, bot)
    events = events_for_day(user, day, bot)
    overdue = overdue_todos(user, day, bot) if with_overdue else []
    note = note_for_day(user, day)
    blocks = [heading]
    if note:
        blocks.append("Заметка:\n" + note.text)
    if todos:
        blocks.append("Задачи:\n" + "\n".join(_todo_line(t, bot) for t in todos))
    if events:
        blocks.append("События:\n" + "\n".join(_event_line(e, bot) for e in events))
    if overdue:
        blocks.append("Просрочено:\n" + "\n".join(_todo_line(t, bot) for t in overdue))
    if len(blocks) == 1:
        blocks.append(empty)
    return "\n\n".join(blocks), _unique_todos(todos, overdue)


def _unique_todos(*groups):
    seen: set[int] = set()
    result = []
    for group in groups:
        for todo in group:
            if todo.id in seen:
                continue
            seen.add(todo.id)
            result.append(todo)
    return result


def human_day(day, bot: TelegramBot | None = None) -> str:
    today = local_today(bot)
    if day == today:
        return "сегодня"
    if day == today + timedelta(days=1):
        return "завтра"
    return _format_day(day)


def event_at_on(day, bot: TelegramBot | None):
    start, _ = day_bounds(day, bot)
    return start.replace(hour=9, minute=0)


def pending_fields():
    return [
        "pending_step",
        "pending_title",
        "pending_body",
        "pending_month",
        "updated_at",
    ]


def clear_pending(bot: TelegramBot) -> None:
    if (
        not bot.pending_step
        and not bot.pending_title
        and not bot.pending_body
        and bot.pending_month is None
    ):
        return
    bot.pending_step = ""
    bot.pending_title = ""
    bot.pending_body = ""
    bot.pending_month = None
    bot.save(update_fields=pending_fields())


def push_message(
    bot: TelegramBot,
    text: str,
    reply_markup: dict | None = None,
    chat_id: int | None = None,
):
    return send_message(
        bot.token,
        bot.chat_id if chat_id is None else chat_id,
        text,
        reply_markup=reply_markup,
    )


def send_plan(bot: TelegramBot, text: str, todos) -> None:
    markup = todos_done_keyboard(todos) or menu_keyboard()
    push_message(bot, text, markup)


def send_today(bot: TelegramBot) -> None:
    text, todos = plan_today(bot.user, bot)
    send_plan(bot, text, todos)


def send_tomorrow(bot: TelegramBot) -> None:
    text, todos = plan_tomorrow(bot.user, bot)
    send_plan(bot, text, todos)


def send_overdue(bot: TelegramBot) -> None:
    text, todos = plan_overdue(bot.user, bot)
    send_plan(bot, text, todos)


def start_wizard(bot: TelegramBot, kind: str) -> None:
    steps = {
        "event": PENDING_EVENT_TITLE,
        "note": PENDING_NOTE_TITLE,
        "todo": PENDING_TITLE,
    }
    prompts = {
        "event": ASK_EVENT_TITLE,
        "note": ASK_NOTE_TEXT,
        "todo": ASK_TITLE,
    }
    bot.pending_step = steps[kind]
    bot.pending_title = ""
    bot.pending_body = ""
    bot.pending_month = None
    bot.save(update_fields=pending_fields())
    push_message(bot, prompts[kind], menu_keyboard())


def ask_date(bot: TelegramBot, kind: str) -> None:
    dates = {
        "event": PENDING_EVENT_DATE,
        "note": PENDING_NOTE_DATE,
        "todo": PENDING_DATE,
    }
    bot.pending_step = dates[kind]
    bot.pending_month = None
    bot.save(update_fields=pending_fields())
    if kind == "event":
        text = f"Когда событие «{bot.pending_title}»?"
    elif kind == "note":
        text = "На какой день сохранить заметку?"
    else:
        text = f"Когда «{bot.pending_title}» на календаре?"
    push_message(bot, text, date_choice_keyboard())


def save_user_bot(
    user,
    *,
    token: str = "",
    tz_name: str | None = None,
    digest_hour: int | None = None,
    remind_minutes: int | None = None,
) -> TelegramBot:
    bot = TelegramBot.objects.filter(user=user).first()
    token = token.strip()
    if not bot and not token:
        raise ValidationError({"token": "Вставьте токен от BotFather."})

    if tz_name is None:
        tz_value = bot.timezone if bot else settings.TELEGRAM_TZ
    else:
        tz_value = validate_timezone(tz_name)
    hour = settings.TELEGRAM_DIGEST_HOUR if digest_hour is None else digest_hour
    remind = (
        settings.TELEGRAM_REMIND_MINUTES if remind_minutes is None else remind_minutes
    )
    if not 0 <= hour <= 23:
        raise ValidationError({"digest_hour": "Час от 0 до 23."})
    if not 5 <= remind <= 24 * 60:
        raise ValidationError({"remind_minutes": "От 5 до 1440 минут."})

    if token:
        token = validate_token_format(token)
        digest = hash_bot_token(token)
        taken = TelegramBot.objects.filter(token_hash=digest).exclude(user=user)
        if taken.exists():
            raise ValidationError(
                {"token": "Этот бот уже добавлен в другом аккаунте Haloday."}
            )
        try:
            bot_id, username = fetch_bot_identity(token)
        except TelegramAPIError:
            raise ValidationError({"token": "Telegram не принял токен. Проверьте BotFather."})
        if bot is None:
            bot = TelegramBot(user=user)
        else:
            bot.chat_id = None
            bot.telegram_user_id = None
            bot.telegram_username = ""
            bot.linked_at = None
            bot.update_offset = 0
            bot.pending_step = ""
            bot.pending_title = ""
            bot.pending_body = ""
            bot.pending_month = None
        bot.token = token
        bot.token_hash = digest
        bot.bot_id = bot_id
        bot.bot_username = username

    bot.timezone = tz_value
    bot.digest_hour = hour
    bot.remind_minutes = remind
    bot.save()
    return bot


def clear_chat(bot: TelegramBot) -> int | None:
    chat_id = bot.chat_id
    if chat_id is None:
        return None
    bot.chat_id = None
    bot.telegram_user_id = None
    bot.telegram_username = ""
    bot.linked_at = None
    bot.pending_step = ""
    bot.pending_title = ""
    bot.pending_body = ""
    bot.pending_month = None
    bot.save(
        update_fields=[
            "chat_id",
            "telegram_user_id",
            "telegram_username",
            "linked_at",
            "pending_step",
            "pending_title",
            "pending_body",
            "pending_month",
            "updated_at",
        ]
    )
    return chat_id


def unlink_user_chat(user) -> tuple[TelegramBot | None, int | None]:
    bot = TelegramBot.objects.filter(user=user).first()
    if bot is None:
        return None, None
    return bot, clear_chat(bot)


def delete_user_bot(user) -> TelegramBot | None:
    bot = TelegramBot.objects.filter(user=user).first()
    if bot is None:
        return None
    snapshot = bot
    bot.delete()
    return snapshot


def bind_chat(bot: TelegramBot, chat_id: int, telegram_user_id: int, username: str):
    username = (username or "")[:64]
    with transaction.atomic():
        other = (
            TelegramBot.objects.select_for_update()
            .filter(chat_id=chat_id)
            .exclude(pk=bot.pk)
            .first()
        )
        other_token = None
        other_chat = None
        if other:
            other_token = other.token
            other_chat = other.chat_id
            other.chat_id = None
            other.telegram_user_id = None
            other.telegram_username = ""
            other.linked_at = None
            other.save(
                update_fields=[
                    "chat_id",
                    "telegram_user_id",
                    "telegram_username",
                    "linked_at",
                    "updated_at",
                ]
            )
        bot.chat_id = chat_id
        bot.telegram_user_id = telegram_user_id
        bot.telegram_username = username
        bot.linked_at = timezone.now()
        bot.pending_step = ""
        bot.pending_title = ""
        bot.pending_body = ""
        bot.pending_month = None
        bot.save(
            update_fields=[
                "chat_id",
                "telegram_user_id",
                "telegram_username",
                "linked_at",
                "pending_step",
                "pending_title",
                "pending_body",
                "pending_month",
                "updated_at",
            ]
        )
    if other_token and other_chat and other_chat != chat_id:
        send_message(
            other_token,
            other_chat,
            "Этот Telegram-чат отвязан: его занял другой бот Haloday.",
        )
    return bot


def _from_private(message: dict) -> bool:
    chat = message.get("chat") or {}
    return chat.get("type") == "private"


def _user_name(from_user: dict) -> str:
    return (from_user.get("username") or from_user.get("first_name") or "")[:64]


def handle_update(bot: TelegramBot, update: dict) -> None:
    callback = update.get("callback_query")
    if callback:
        handle_callback(bot, callback)
        return
    message = update.get("message") or update.get("edited_message")
    if not message or not _from_private(message):
        return
    text = (message.get("text") or "").strip()
    if not text:
        return
    chat_id = int(message["chat"]["id"])
    from_user = message.get("from") or {}
    telegram_user_id = int(from_user.get("id") or chat_id)
    username = _user_name(from_user)

    if START_RE.match(text):
        if bot.chat_id is None:
            bind_chat(bot, chat_id, telegram_user_id, username)
            push_message(
                bot,
                "Готово. Этот чат привязан к вашему аккаунту Haloday.\n\n" + HELP_TEXT,
                menu_keyboard(),
            )
            send_today(bot)
            return
        if bot.chat_id == chat_id:
            clear_pending(bot)
            push_message(bot, HELP_TEXT, menu_keyboard())
            return
        send_message(bot.token, chat_id, BUSY_HINT)
        return

    if bot.chat_id is None:
        send_message(bot.token, chat_id, START_HINT)
        return
    if bot.chat_id != chat_id:
        send_message(bot.token, chat_id, BUSY_HINT)
        return

    if text in MENU_BUTTONS:
        handle_menu(bot, text)
        return

    command = COMMAND_RE.match(text)
    if command:
        name = command.group(1).lower()
        if name in {"today", "t"}:
            clear_pending(bot)
            send_today(bot)
        elif name in {"help", "start"}:
            push_message(bot, HELP_TEXT, menu_keyboard())
        elif name in {"stop", "unlink"}:
            token = bot.token
            clear_chat(bot)
            send_message(
                token,
                chat_id,
                "Чат отвязан. Задачи сюда больше не приходят.",
                reply_markup=remove_keyboard(),
            )
        else:
            push_message(bot, HELP_TEXT, menu_keyboard())
        return

    if bot.pending_step in TITLE_STEPS:
        accept_wizard_title(bot, text)
        return
    if bot.pending_step in DATE_STEPS:
        push_message(bot, ASK_DATE_HINT, date_choice_keyboard())
        return

    create_todo_from_text(bot, text)


def handle_menu(bot: TelegramBot, text: str) -> None:
    if text == BTN_NEW:
        start_wizard(bot, "todo")
        return
    if text == BTN_NEW_EVENT:
        start_wizard(bot, "event")
        return
    if text == BTN_NEW_NOTE:
        start_wizard(bot, "note")
        return
    clear_pending(bot)
    if text == BTN_TODAY:
        send_today(bot)
    elif text == BTN_TOMORROW:
        send_tomorrow(bot)
    elif text == BTN_OVERDUE:
        send_overdue(bot)


def accept_wizard_title(bot: TelegramBot, text: str) -> None:
    if bot.pending_step == PENDING_NOTE_TITLE:
        note_text = text.strip()[:NOTE_MAX]
        if not note_text:
            push_message(bot, ASK_NOTE_TEXT, menu_keyboard())
            return
        bot.pending_title = note_text[:255]
        bot.pending_body = note_text
        ask_date(bot, "note")
        return
    kind = "event" if bot.pending_step == PENDING_EVENT_TITLE else "todo"
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    title = (lines[0] if lines else "")[:255]
    if not title:
        prompt = ASK_EVENT_TITLE if kind == "event" else ASK_TITLE
        push_message(bot, prompt, menu_keyboard())
        return
    bot.pending_title = title
    bot.pending_body = "\n".join(lines[1:])[:NOTE_MAX]
    ask_date(bot, kind)


def split_title_body(text: str) -> tuple[str, str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    title = (lines[0] if lines else "Задача")[:255]
    description = "\n".join(lines[1:])[:2000]
    return title, description


def create_todo_on_day(
    bot: TelegramBot,
    title: str,
    description: str,
    day: date,
) -> Todo:
    todo = Todo.objects.create(
        user=bot.user,
        title=title or "Задача",
        description=description,
        event_date=event_at_on(day, bot),
    )
    clear_pending(bot)
    push_message(
        bot,
        f"Задача «{todo.title}» на {human_day(day, bot)}.",
        done_keyboard(todo.id),
    )
    return todo


def create_event_on_day(
    bot: TelegramBot,
    title: str,
    description: str,
    day: date,
) -> Event:
    start, _ = day_bounds(day, bot)
    event = Event.objects.create(
        user=bot.user,
        title=title or "Событие",
        description=description,
        start_at=start,
        all_day=True,
    )
    clear_pending(bot)
    push_message(
        bot,
        f"Событие «{event.title}» на {human_day(day, bot)}, весь день.",
        menu_keyboard(),
    )
    return event


def create_note_on_day(bot: TelegramBot, text: str, day: date) -> DayNote:
    note_text = (text or "").strip()[:NOTE_MAX] or "Заметка"
    existing = DayNote.objects.filter(user=bot.user, date=day).first()
    if existing:
        merged = f"{existing.text.rstrip()}\n\n{note_text}".strip()[:NOTE_MAX]
        existing.text = merged
        existing.save(update_fields=["text", "updated_at"])
        note = existing
        suffix = ", дописана к уже существующей"
    else:
        note = DayNote.objects.create(user=bot.user, date=day, text=note_text)
        suffix = ""
    clear_pending(bot)
    push_message(
        bot,
        f"Заметка на {human_day(day, bot)}{suffix}.",
        menu_keyboard(),
    )
    return note


def finish_wizard_on_day(bot: TelegramBot, day: date) -> None:
    title = bot.pending_title
    body = bot.pending_body
    if bot.pending_step == PENDING_NOTE_DATE:
        create_note_on_day(bot, body or title, day)
        return
    if bot.pending_step == PENDING_EVENT_DATE:
        create_event_on_day(bot, title, body, day)
        return
    create_todo_on_day(bot, title, body, day)


def create_todo_from_text(bot: TelegramBot, text: str) -> Todo:
    title, description = split_title_body(text)
    return create_todo_on_day(bot, title, description, local_today(bot))


def handle_callback(bot: TelegramBot, callback: dict) -> None:
    data = str(callback.get("data") or "")
    callback_id = str(callback.get("id") or "")
    message = callback.get("message") or {}
    chat = message.get("chat") or {}
    chat_id = int(chat.get("id") or 0)
    message_id = int(message.get("message_id") or 0)
    if not chat_id:
        answer_callback(bot.token, callback_id)
        return
    if bot.chat_id != chat_id:
        answer_callback(bot.token, callback_id, "Чат не привязан")
        return
    if data.startswith("d:"):
        complete_todo_callback(bot, callback_id, chat_id, data)
        return
    if data.startswith("k:"):
        handle_date_callback(bot, callback_id, chat_id, message_id, data[2:])
        return
    answer_callback(bot.token, callback_id)


def complete_todo_callback(
    bot: TelegramBot, callback_id: str, chat_id: int, data: str
) -> None:
    try:
        todo_id = int(data.split(":", 1)[1])
    except ValueError:
        answer_callback(bot.token, callback_id, "Некорректная кнопка")
        return
    todo = Todo.objects.filter(id=todo_id, user=bot.user).first()
    if todo is None:
        answer_callback(bot.token, callback_id, "Нет такой задачи")
        return
    if todo.status == Status.DONE:
        answer_callback(bot.token, callback_id, "Уже выполнена")
        return
    todo.status = Status.DONE
    todo.completed_at = timezone.now()
    todo.save(update_fields=["status", "completed_at", "updated_at"])
    answer_callback(bot.token, callback_id, "Готово")
    send_message(bot.token, chat_id, f"«{todo.title}» отмечена выполненной.")


def handle_date_callback(
    bot: TelegramBot,
    callback_id: str,
    chat_id: int,
    message_id: int,
    payload: str,
) -> None:
    if payload in {"", "~"}:
        answer_callback(bot.token, callback_id)
        return
    if bot.pending_step not in DATE_STEPS or not bot.pending_title:
        answer_callback(bot.token, callback_id, "Сначала название")
        return
    today = local_today(bot)
    if payload == "t":
        answer_callback(bot.token, callback_id, "Сегодня")
        finish_wizard_on_day(bot, today)
        return
    if payload == "m":
        answer_callback(bot.token, callback_id, "Завтра")
        finish_wizard_on_day(bot, today + timedelta(days=1))
        return
    if payload == "c":
        answer_callback(bot.token, callback_id)
        show_calendar(bot, chat_id, message_id, today.replace(day=1))
        return
    if payload == "<":
        answer_callback(bot.token, callback_id)
        current = bot.pending_month or today.replace(day=1)
        show_calendar(bot, chat_id, message_id, shift_month(current, -1))
        return
    if payload == ">":
        answer_callback(bot.token, callback_id)
        current = bot.pending_month or today.replace(day=1)
        show_calendar(bot, chat_id, message_id, shift_month(current, 1))
        return
    picked = parse_iso_day(payload)
    if picked is None:
        answer_callback(bot.token, callback_id)
        return
    answer_callback(bot.token, callback_id, human_day(picked, bot))
    finish_wizard_on_day(bot, picked)


def show_calendar(
    bot: TelegramBot, chat_id: int, message_id: int, month: date
) -> None:
    first = month.replace(day=1)
    bot.pending_month = first
    bot.save(update_fields=["pending_month", "updated_at"])
    text = f"Выберите день для «{bot.pending_title}»."
    markup = month_keyboard(first, local_today(bot))
    edited = edit_message(bot.token, chat_id, message_id, text, markup)
    if edited is None:
        send_message(bot.token, chat_id, text, reply_markup=markup)


def _claim_delivery(user, kind: str, object_id: int, period_key: str) -> bool:
    try:
        with transaction.atomic():
            TelegramDelivery.objects.create(
                user=user,
                kind=kind,
                object_id=object_id,
                period_key=period_key,
            )
        return True
    except IntegrityError:
        return False


def send_due_reminders() -> int:
    now = timezone.now()
    sent = 0
    bots = TelegramBot.objects.exclude(chat_id=None).select_related("user")
    for bot in bots:
        remind = timedelta(minutes=bot.remind_minutes)
        window_start = now - timedelta(minutes=5)
        window_end = now + remind
        todos = (
            Todo.objects.filter(
                user=bot.user,
                due_date__gte=window_start,
                due_date__lte=window_end,
            )
            .exclude(status=Status.DONE)
        )
        for todo in todos:
            period = todo.due_date.astimezone(bot_tz(bot)).date().isoformat()
            if not _claim_delivery(bot.user, TelegramDelivery.KIND_DUE, todo.id, period):
                continue
            stamp = _format_time(todo.due_date, bot) or "скоро"
            send_message(
                bot.token,
                bot.chat_id,
                f"Срок «{todo.title}» в {stamp}.",
                reply_markup=done_keyboard(todo.id),
            )
            sent += 1
    return sent


def send_event_reminders() -> int:
    now = timezone.now()
    sent = 0
    bots = TelegramBot.objects.exclude(chat_id=None).select_related("user")
    for bot in bots:
        remind = timedelta(minutes=bot.remind_minutes)
        window_start = now - timedelta(minutes=5)
        window_end = now + remind
        events = Event.objects.filter(
            user=bot.user,
            all_day=False,
            start_at__gte=window_start,
            start_at__lte=window_end,
        )
        for event in events:
            period = event.start_at.astimezone(bot_tz(bot)).date().isoformat()
            if not _claim_delivery(
                bot.user, TelegramDelivery.KIND_EVENT, event.id, period
            ):
                continue
            stamp = _format_time(event.start_at, bot) or "скоро"
            send_message(
                bot.token,
                bot.chat_id,
                f"Событие «{event.title}» в {stamp}.",
            )
            sent += 1
    return sent


def send_morning_digests() -> int:
    sent = 0
    for bot in TelegramBot.objects.exclude(chat_id=None).select_related("user"):
        now = local_now(bot)
        if now.hour != bot.digest_hour:
            continue
        day_key = now.date().isoformat()
        if not _claim_delivery(bot.user, TelegramDelivery.KIND_DIGEST, 0, day_key):
            continue
        send_today(bot)
        sent += 1
    return sent


def run_tick() -> dict:
    due = send_due_reminders()
    events = send_event_reminders()
    digest = send_morning_digests()
    return {"due": due, "events": events, "digest": digest}


def poll_bot(bot: TelegramBot, timeout: int = 0) -> int:
    try:
        data = call_telegram(
            bot.token,
            "getUpdates",
            {
                "offset": bot.update_offset,
                "timeout": timeout,
                "allowed_updates": ["message", "callback_query"],
            },
            timeout=max(timeout + 10, 15),
        )
    except TelegramAPIError:
        return 0
    updates = data.get("result") or []
    max_id = bot.update_offset
    for update in updates:
        handle_update(bot, update)
        bot.refresh_from_db()
        update_id = int(update.get("update_id") or 0)
        if update_id >= max_id:
            max_id = update_id + 1
    if max_id != bot.update_offset:
        TelegramBot.objects.filter(pk=bot.pk).update(update_offset=max_id)
        bot.update_offset = max_id
    return len(updates)


def run_worker_cycle(timeout: int = 0) -> int:
    total = 0
    for bot in TelegramBot.objects.select_related("user"):
        total += poll_bot(bot, timeout=timeout)
    run_tick()
    return total


def status_payload(bot: TelegramBot | None) -> dict:
    if bot is None:
        return {
            "configured": False,
            "connected": False,
            "bot_username": "",
            "token_hint": "",
            "chat_username": None,
            "timezone": settings.TELEGRAM_TZ,
            "digest_hour": settings.TELEGRAM_DIGEST_HOUR,
            "remind_minutes": settings.TELEGRAM_REMIND_MINUTES,
            "deep_link": "",
            "timezones": list(ALLOWED_TIMEZONES),
        }
    return {
        "configured": True,
        "connected": bot.connected,
        "bot_username": bot.bot_username,
        "token_hint": token_hint(bot.token),
        "chat_username": bot.telegram_username or None,
        "timezone": bot.timezone,
        "digest_hour": bot.digest_hour,
        "remind_minutes": bot.remind_minutes,
        "deep_link": deep_link_for(bot),
        "timezones": list(ALLOWED_TIMEZONES),
    }
