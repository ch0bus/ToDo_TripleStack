import hashlib
import logging
import re
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from todos.models import Event, Status, Todo

from .client import (
    TelegramAPIError,
    answer_callback,
    call_telegram,
    done_keyboard,
    fetch_bot_identity,
    send_message,
)
from .constants import ALLOWED_TIMEZONES
from .models import TelegramBot, TelegramDelivery

logger = logging.getLogger(__name__)

START_RE = re.compile(r"^/start(?:@\S+)?(?:\s+\S+)?\s*$", re.IGNORECASE)
COMMAND_RE = re.compile(r"^/(\w+)(?:@\S+)?(?:\s|$)", re.IGNORECASE)
TOKEN_RE = re.compile(r"^\d{5,}:[A-Za-z0-9_-]{20,}$")
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
    "/today — задачи и события дня\n"
    "/stop — отвязать этот чат"
)
BUSY_HINT = "Этот бот уже привязан к другому чату."
START_HINT = (
    "Напишите /start в личном чате с ботом, чтобы получать задачи сюда."
)


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
    bot = bot or getattr(user, "telegram_bot", None)
    day = local_today(bot)
    title = f"Сегодня, {_format_day(day)}"
    todos = todos_for_day(user, day, bot)
    events = events_for_day(user, day, bot)
    overdue = overdue_todos(user, day, bot)
    blocks = [title]
    if todos:
        blocks.append("Задачи:\n" + "\n".join(_todo_line(t, bot) for t in todos))
    if events:
        blocks.append("События:\n" + "\n".join(_event_line(e, bot) for e in events))
    if overdue:
        blocks.append("Просрочено:\n" + "\n".join(_todo_line(t, bot) for t in overdue))
    if len(blocks) == 1:
        blocks.append("На сегодня ничего не запланировано.")
    return "\n\n".join(blocks)


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
    bot.save(
        update_fields=[
            "chat_id",
            "telegram_user_id",
            "telegram_username",
            "linked_at",
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
        bot.save(
            update_fields=[
                "chat_id",
                "telegram_user_id",
                "telegram_username",
                "linked_at",
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
            send_message(
                bot.token,
                chat_id,
                "Готово. Этот чат привязан к вашему аккаунту Haloday.\n\n" + HELP_TEXT,
            )
            send_message(bot.token, chat_id, format_today(bot.user, bot))
            return
        if bot.chat_id == chat_id:
            send_message(bot.token, chat_id, HELP_TEXT)
            return
        send_message(bot.token, chat_id, BUSY_HINT)
        return

    if bot.chat_id is None:
        send_message(bot.token, chat_id, START_HINT)
        return
    if bot.chat_id != chat_id:
        send_message(bot.token, chat_id, BUSY_HINT)
        return

    command = COMMAND_RE.match(text)
    if command:
        name = command.group(1).lower()
        if name in {"today", "t"}:
            send_message(bot.token, chat_id, format_today(bot.user, bot))
        elif name in {"help", "start"}:
            send_message(bot.token, chat_id, HELP_TEXT)
        elif name in {"stop", "unlink"}:
            clear_chat(bot)
            send_message(bot.token, chat_id, "Чат отвязан. Задачи сюда больше не приходят.")
        else:
            send_message(bot.token, chat_id, HELP_TEXT)
        return

    create_todo_from_text(bot, text)


def create_todo_from_text(bot: TelegramBot, text: str) -> Todo:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    title = (lines[0] if lines else "Задача")[:255]
    description = "\n".join(lines[1:])[:2000]
    start, _ = day_bounds(local_today(bot), bot)
    event_at = start.replace(hour=9, minute=0)
    todo = Todo.objects.create(
        user=bot.user,
        title=title,
        description=description,
        event_date=event_at,
    )
    send_message(
        bot.token,
        bot.chat_id,
        f"Задача «{todo.title}» на сегодня.",
        reply_markup=done_keyboard(todo.id),
    )
    return todo


def handle_callback(bot: TelegramBot, callback: dict) -> None:
    data = callback.get("data") or ""
    callback_id = str(callback.get("id") or "")
    message = callback.get("message") or {}
    chat = message.get("chat") or {}
    chat_id = int(chat.get("id") or 0)
    if not data.startswith("d:") or not chat_id:
        answer_callback(bot.token, callback_id)
        return
    if bot.chat_id != chat_id:
        answer_callback(bot.token, callback_id, "Чат не привязан")
        return
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
        send_message(bot.token, bot.chat_id, format_today(bot.user, bot))
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
