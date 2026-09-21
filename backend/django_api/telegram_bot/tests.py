from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from telegram_bot.models import TelegramBot, TelegramDelivery
from telegram_bot.services import format_today, handle_update, hash_bot_token, run_tick
from todos.models import Event, Status, Todo

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
    def test_event_reminder_skips_all_day(self, send):
        send.return_value = {}
        Event.objects.create(
            user=self.user,
            title="Праздник",
            start_at=timezone.now() + timedelta(minutes=10),
            all_day=True,
        )
        result = run_tick()
        self.assertEqual(result["events"], 0)

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
