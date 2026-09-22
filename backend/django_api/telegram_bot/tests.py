from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from telegram_bot.models import TelegramBot, TelegramDelivery
from telegram_bot.services import format_today, handle_update, hash_bot_token, run_tick
from todos.models import DayNote, Event, EventAttendance, Status, Todo

User = get_user_model()

ALICE_TOKEN = "11111:AAAAAAAAAAAAAAAAAAAA"
BOB_TOKEN = "22222:BBBBBBBBBBBBBBBBBBBB"


def add_bot(user, token: str, chat_id: int | None = None, **kwargs) -> TelegramBot:
    return TelegramBot.objects.create(
        user=user,
        token=token,
        token_hash=hash_bot_token(token),
        bot_id=int(token.split(":", 1)[0]),
        bot_username=kwargs.pop("bot_username", f"{user.username}bot"),
        chat_id=chat_id,
        telegram_user_id=chat_id,
        telegram_username=kwargs.pop("telegram_username", user.username + "_tg"),
        **kwargs,
    )


class TelegramApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="password123",
        )

    def test_status_requires_auth(self):
        res = self.client.get("/api/telegram/")
        self.assertEqual(res.status_code, 401)

    def test_status_empty(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/telegram/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["configured"])
        self.assertFalse(res.data["connected"])
        self.assertNotIn("token", res.data)
        self.assertIn("Europe/Moscow", res.data["timezones"])

    def test_put_requires_token_for_new_bot(self):
        self.client.force_authenticate(self.user)
        res = self.client.put(
            "/api/telegram/",
            {"timezone": "Europe/Moscow", "digest_hour": 8, "remind_minutes": 30},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    @patch("telegram_bot.services.fetch_bot_identity", return_value=(11111, "AliceBot"))
    def test_put_saves_token_without_echo(self, _fetch):
        self.client.force_authenticate(self.user)
        res = self.client.put(
            "/api/telegram/",
            {
                "token": ALICE_TOKEN,
                "timezone": "Asia/Yekaterinburg",
                "digest_hour": 7,
                "remind_minutes": 15,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["configured"])
        self.assertFalse(res.data["connected"])
        self.assertEqual(res.data["bot_username"], "AliceBot")
        self.assertEqual(res.data["token_hint"], "…" + ALICE_TOKEN[-4:])
        self.assertNotIn(ALICE_TOKEN, str(res.data))
        bot = TelegramBot.objects.get(user=self.user)
        self.assertEqual(bot.token, ALICE_TOKEN)
        self.assertEqual(bot.timezone, "Asia/Yekaterinburg")
        self.assertEqual(bot.digest_hour, 7)

    @patch("telegram_bot.services.fetch_bot_identity", return_value=(11111, "AliceBot"))
    def test_token_cannot_be_reused(self, _fetch):
        bob = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="password123",
        )
        add_bot(bob, ALICE_TOKEN, bot_username="Taken")
        self.client.force_authenticate(self.user)
        res = self.client.put(
            "/api/telegram/",
            {"token": ALICE_TOKEN},
            format="json",
        )
        self.assertEqual(res.status_code, 400)


class TelegramIsolationTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="password123",
        )
        self.bob = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="password123",
        )
        self.alice_bot = add_bot(self.alice, ALICE_TOKEN)
        self.bob_bot = add_bot(self.bob, BOB_TOKEN, chat_id=222)

    @patch("telegram_bot.services.send_message")
    def test_start_binds_owner_chat(self, send):
        send.return_value = {}
        handle_update(
            self.alice_bot,
            {
                "message": {
                    "text": "/start",
                    "chat": {"id": 111, "type": "private"},
                    "from": {"id": 111, "username": "alice_tg"},
                }
            },
        )
        self.alice_bot.refresh_from_db()
        self.assertEqual(self.alice_bot.chat_id, 111)
        self.bob_bot.refresh_from_db()
        self.assertEqual(self.bob_bot.chat_id, 222)

    @patch("telegram_bot.services.send_message")
    def test_second_chat_cannot_steal_bot(self, send):
        send.return_value = {}
        self.alice_bot.chat_id = 111
        self.alice_bot.telegram_user_id = 111
        self.alice_bot.save()
        handle_update(
            self.alice_bot,
            {
                "message": {
                    "text": "/start",
                    "chat": {"id": 999, "type": "private"},
                    "from": {"id": 999, "username": "intruder"},
                }
            },
        )
        self.alice_bot.refresh_from_db()
        self.assertEqual(self.alice_bot.chat_id, 111)
        send.assert_called()
        self.assertIn("другому чату", send.call_args.args[2])

    @patch("telegram_bot.services.send_message")
    def test_text_creates_todo_for_bot_owner_only(self, send):
        send.return_value = {}
        self.alice_bot.chat_id = 111
        self.alice_bot.save(update_fields=["chat_id"])
        handle_update(
            self.alice_bot,
            {
                "message": {
                    "text": "Купить молоко",
                    "chat": {"id": 111, "type": "private"},
                    "from": {"id": 111, "username": "alice_tg"},
                }
            },
        )
        self.assertTrue(
            Todo.objects.filter(user=self.alice, title="Купить молоко").exists()
        )
        self.assertFalse(Todo.objects.filter(user=self.bob).exists())

    @patch("telegram_bot.services.answer_callback")
    @patch("telegram_bot.services.send_message")
    def test_cannot_complete_another_users_todo(self, send, answer):
        send.return_value = {}
        self.alice_bot.chat_id = 111
        self.alice_bot.save(update_fields=["chat_id"])
        bob_todo = Todo.objects.create(user=self.bob, title="Секрет")
        handle_update(
            self.alice_bot,
            {
                "callback_query": {
                    "id": "cb1",
                    "data": f"d:{bob_todo.id}",
                    "message": {"chat": {"id": 111, "type": "private"}},
                }
            },
        )
        bob_todo.refresh_from_db()
        self.assertEqual(bob_todo.status, Status.TODO)
        answer.assert_called()
        self.assertEqual(answer.call_args.args[2], "Нет такой задачи")

    def test_today_does_not_include_other_users_todos(self):
        from telegram_bot.services import day_bounds, local_today

        start, _ = day_bounds(local_today(self.alice_bot), self.alice_bot)
        Todo.objects.create(
            user=self.bob,
            title="Чужое",
            due_date=start.replace(hour=12),
        )
        text = format_today(self.alice, self.alice_bot)
        self.assertNotIn("Чужое", text)
        DayNote.objects.create(
            user=self.bob,
            date=local_today(self.alice_bot),
            text="Чужая заметка",
        )
        text = format_today(self.alice, self.alice_bot)
        self.assertNotIn("Чужая заметка", text)


class TelegramTickTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="password123",
        )
        self.bot = add_bot(self.user, ALICE_TOKEN, chat_id=111, remind_minutes=30)

    @patch("telegram_bot.services.send_message")
    def test_due_reminder_once(self, send):
        send.return_value = {}
        due = timezone.now() + timedelta(minutes=10)
        todo = Todo.objects.create(user=self.user, title="Сдать отчёт", due_date=due)
        first = run_tick()
        second = run_tick()
        self.assertEqual(first["due"], 1)
        self.assertEqual(second["due"], 0)
        self.assertEqual(
            TelegramDelivery.objects.filter(
                user=self.user, kind="due", object_id=todo.id
            ).count(),
            1,
        )

    @patch("telegram_bot.services.send_message")
    def test_timed_window_skips_all_day_event(self, send):
        send.return_value = {}
        from telegram_bot.services import local_now

        self.bot.digest_hour = (local_now(self.bot).hour + 5) % 24
        self.bot.save(update_fields=["digest_hour"])
        Event.objects.create(
            user=self.user,
            title="Праздник",
            start_at=timezone.now() + timedelta(minutes=10),
            all_day=True,
        )
        result = run_tick()
        self.assertEqual(result["events"], 0)

    @patch("telegram_bot.services.send_message")
    def test_all_day_event_reminds_at_digest_hour(self, send):
        send.return_value = {}
        from telegram_bot.services import day_bounds, local_now

        now = local_now(self.bot)
        self.bot.digest_hour = now.hour
        self.bot.save(update_fields=["digest_hour"])
        start, _ = day_bounds(now.date(), self.bot)
        event = Event.objects.create(
            user=self.user,
            title="Праздник",
            start_at=start,
            all_day=True,
        )
        first = run_tick()
        second = run_tick()
        self.assertEqual(first["events"], 1)
        self.assertEqual(second["events"], 0)
        reminder = next(
            call
            for call in send.call_args_list
            if len(call.args) > 2 and "весь день" in str(call.args[2])
        )
        self.assertIn("Праздник", reminder.args[2])
        markup = reminder.kwargs.get("reply_markup")
        self.assertEqual(
            markup["inline_keyboard"][0][0]["callback_data"],
            f"e:{event.id}:{now.date().isoformat()}",
        )

    @patch("telegram_bot.services.send_message")
    def test_no_reminders_without_chat(self, send):
        send.return_value = {}
        self.bot.chat_id = None
        self.bot.save(update_fields=["chat_id"])
        Todo.objects.create(
            user=self.user,
            title="Сдать отчёт",
            due_date=timezone.now() + timedelta(minutes=10),
        )
        result = run_tick()
        self.assertEqual(result["due"], 0)
        send.assert_not_called()


class TelegramMenuTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="password123",
        )
        self.bob = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="password123",
        )
        self.alice_bot = add_bot(self.alice, ALICE_TOKEN, chat_id=111)
        add_bot(self.bob, BOB_TOKEN, chat_id=222)

    def _message(self, text: str, chat_id: int = 111):
        return {
            "message": {
                "text": text,
                "chat": {"id": chat_id, "type": "private"},
                "from": {"id": chat_id, "username": "alice_tg"},
            }
        }

    def _callback(self, data: str, chat_id: int = 111):
        return {
            "callback_query": {
                "id": "cb1",
                "data": data,
                "message": {
                    "message_id": 42,
                    "chat": {"id": chat_id, "type": "private"},
                },
            }
        }

    @patch("telegram_bot.services.send_message")
    def test_today_list_has_done_buttons(self, send):
        send.return_value = {}
        from telegram_bot.keyboards import BTN_TODAY
        from telegram_bot.services import day_bounds, local_today

        start, _ = day_bounds(local_today(self.alice_bot), self.alice_bot)
        todo = Todo.objects.create(
            user=self.alice,
            title="Молоко",
            event_date=start.replace(hour=9),
        )
        handle_update(self.alice_bot, self._message(BTN_TODAY))
        markup = send.call_args.kwargs.get("reply_markup")
        self.assertEqual(
            markup["inline_keyboard"][0][0]["callback_data"], f"d:{todo.id}"
        )

    @patch("telegram_bot.services.answer_callback")
    @patch("telegram_bot.services.send_message")
    def test_wizard_creates_todo_on_chosen_day(self, send, _answer):
        send.return_value = {}
        from datetime import date as date_cls

        from telegram_bot.keyboards import BTN_NEW
        from telegram_bot.services import event_at_on

        handle_update(self.alice_bot, self._message(BTN_NEW))
        handle_update(self.alice_bot, self._message("Купить хлеб"))
        self.assertFalse(Todo.objects.filter(user=self.alice).exists())
        self.alice_bot.refresh_from_db()
        self.assertEqual(self.alice_bot.pending_step, "date")
        handle_update(self.alice_bot, self._callback("k:2026-12-25"))
        todo = Todo.objects.get(user=self.alice, title="Купить хлеб")
        self.assertEqual(
            todo.event_date, event_at_on(date_cls(2026, 12, 25), self.alice_bot)
        )
        self.assertFalse(Todo.objects.filter(user=self.bob).exists())
        self.alice_bot.refresh_from_db()
        self.assertEqual(self.alice_bot.pending_step, "")

    @patch("telegram_bot.services.answer_callback")
    @patch("telegram_bot.services.send_message")
    def test_wizard_creates_all_day_event_on_chosen_day(self, send, _answer):
        send.return_value = {}
        from datetime import date as date_cls

        from telegram_bot.keyboards import BTN_NEW_EVENT
        from telegram_bot.services import day_bounds

        handle_update(self.alice_bot, self._message(BTN_NEW_EVENT))
        handle_update(self.alice_bot, self._message("День рождения"))
        self.assertFalse(Event.objects.filter(user=self.alice).exists())
        self.assertFalse(Todo.objects.filter(user=self.alice).exists())
        self.alice_bot.refresh_from_db()
        self.assertEqual(self.alice_bot.pending_step, "edate")
        handle_update(self.alice_bot, self._callback("k:2026-12-25"))
        event = Event.objects.get(user=self.alice, title="День рождения")
        start, _ = day_bounds(date_cls(2026, 12, 25), self.alice_bot)
        self.assertEqual(event.start_at, start)
        self.assertTrue(event.all_day)
        self.assertFalse(Event.objects.filter(user=self.bob).exists())
        self.assertFalse(Todo.objects.filter(user=self.alice).exists())
        self.alice_bot.refresh_from_db()
        self.assertEqual(self.alice_bot.pending_step, "")

    @patch("telegram_bot.services.answer_callback")
    @patch("telegram_bot.services.send_message")
    def test_wizard_creates_day_note_on_chosen_day(self, send, _answer):
        send.return_value = {}
        from datetime import date as date_cls

        from telegram_bot.keyboards import BTN_NEW_NOTE

        handle_update(self.alice_bot, self._message(BTN_NEW_NOTE))
        handle_update(self.alice_bot, self._message("Смена графика"))
        self.assertFalse(DayNote.objects.filter(user=self.alice).exists())
        self.alice_bot.refresh_from_db()
        self.assertEqual(self.alice_bot.pending_step, "ndate")
        handle_update(self.alice_bot, self._callback("k:2026-12-25"))
        note = DayNote.objects.get(user=self.alice, date=date_cls(2026, 12, 25))
        self.assertEqual(note.text, "Смена графика")
        self.assertFalse(DayNote.objects.filter(user=self.bob).exists())
        self.assertFalse(Todo.objects.filter(user=self.alice).exists())
        self.assertFalse(Event.objects.filter(user=self.alice).exists())
        self.alice_bot.refresh_from_db()
        self.assertEqual(self.alice_bot.pending_step, "")

    @patch("telegram_bot.services.answer_callback")
    @patch("telegram_bot.services.send_message")
    def test_wizard_appends_existing_day_note(self, send, _answer):
        send.return_value = {}
        from datetime import date as date_cls

        from telegram_bot.keyboards import BTN_NEW_NOTE

        day = date_cls(2026, 12, 25)
        DayNote.objects.create(user=self.alice, date=day, text="Уже было")
        handle_update(self.alice_bot, self._message(BTN_NEW_NOTE))
        handle_update(self.alice_bot, self._message("Ещё строка"))
        handle_update(self.alice_bot, self._callback("k:2026-12-25"))
        note = DayNote.objects.get(user=self.alice, date=day)
        self.assertEqual(note.text, "Уже было\n\nЕщё строка")

    @patch("telegram_bot.services.send_message")
    def test_menu_today_cancels_wizard(self, send):
        send.return_value = {}
        from telegram_bot.keyboards import BTN_NEW, BTN_TODAY

        handle_update(self.alice_bot, self._message(BTN_NEW))
        handle_update(self.alice_bot, self._message("Черновик"))
        handle_update(self.alice_bot, self._message(BTN_TODAY))
        self.assertFalse(Todo.objects.filter(user=self.alice).exists())
        self.alice_bot.refresh_from_db()
        self.assertEqual(self.alice_bot.pending_step, "")

    @patch("telegram_bot.services.send_message")
    def test_due_reminder_includes_done_button(self, send):
        send.return_value = {}
        due = timezone.now() + timedelta(minutes=10)
        todo = Todo.objects.create(user=self.alice, title="Сдать отчёт", due_date=due)
        run_tick()
        reminder = next(
            call
            for call in send.call_args_list
            if len(call.args) > 2 and "Срок" in str(call.args[2])
        )
        markup = reminder.kwargs.get("reply_markup")
        self.assertEqual(
            markup["inline_keyboard"][0][0]["callback_data"], f"d:{todo.id}"
        )

    @patch("telegram_bot.services.answer_callback")
    @patch("telegram_bot.services.send_message")
    def test_event_attendance_callback_is_not_todo_done(self, send, answer):
        send.return_value = {}
        from telegram_bot.services import day_bounds, local_today

        start, _ = day_bounds(local_today(self.alice_bot), self.alice_bot)
        event = Event.objects.create(
            user=self.alice,
            title="Стоматолог",
            start_at=start.replace(hour=10),
            end_at=start.replace(hour=11),
        )
        day = start.date()
        handle_update(self.alice_bot, self._callback(f"e:{event.id}:{day.isoformat()}"))
        self.assertTrue(
            EventAttendance.objects.filter(
                event=event, occurrence_date=day
            ).exists()
        )
        self.assertFalse(Event.objects.filter(user=self.bob).exists())
        answer.assert_called()
        self.assertEqual(answer.call_args.args[2], "Отмечено")

    @patch("telegram_bot.services.send_message")
    def test_overdue_lists_missed_event_with_attend_button(self, send):
        send.return_value = {}
        from telegram_bot.keyboards import BTN_OVERDUE

        event = Event.objects.create(
            user=self.alice,
            title="Митинг",
            start_at=timezone.now() - timedelta(days=2),
            end_at=timezone.now() - timedelta(days=2) + timedelta(hours=1),
        )
        handle_update(self.alice_bot, self._message(BTN_OVERDUE))
        text = send.call_args.args[2]
        self.assertIn("Пропущено", text)
        self.assertIn("Митинг", text)
        markup = send.call_args.kwargs.get("reply_markup")
        self.assertTrue(
            markup["inline_keyboard"][0][0]["callback_data"].startswith(
                f"e:{event.id}:"
            )
        )
