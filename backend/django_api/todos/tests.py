from datetime import datetime, timedelta, timezone as dt_timezone

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from todos.models import Event, Recurrence, Status, Tag, TagKind, Todo

User = get_user_model()


class TagIsolationTests(APITestCase):
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
        self.alice_tag = Tag.objects.create(
            user=self.alice,
            tag_name="диплом",
            kind=TagKind.OTHER,
        )
        self.bob_tag = Tag.objects.create(
            user=self.bob,
            tag_name="секрет",
            kind=TagKind.OTHER,
        )
        self.system_tag = Tag.objects.filter(user__isnull=True).first()
        if self.system_tag is None:
            self.system_tag = Tag.objects.create(
                user=None,
                tag_name="работа",
                kind=TagKind.WORK,
            )

    def test_cannot_attach_another_users_tag(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post(
            "/api/todos/",
            {"title": "Задача", "tag_ids": [self.bob_tag.id]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Todo.objects.filter(user=self.alice).exists())

    def test_can_attach_own_and_system_tags(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post(
            "/api/todos/",
            {
                "title": "Задача",
                "tag_ids": [self.alice_tag.id, self.system_tag.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        todo = Todo.objects.get(id=res.data["id"])
        self.assertEqual(
            set(todo.tags.values_list("id", flat=True)),
            {self.alice_tag.id, self.system_tag.id},
        )

    def test_cannot_delete_or_patch_system_tag(self):
        self.client.force_authenticate(self.alice)
        delete_res = self.client.delete(f"/api/tags/{self.system_tag.id}/")
        self.assertEqual(delete_res.status_code, 403)
        patch_res = self.client.patch(
            f"/api/tags/{self.system_tag.id}/",
            {"tag_name": "взлом"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, 405)
        self.system_tag.refresh_from_db()
        self.assertNotEqual(self.system_tag.tag_name, "взлом")


class TodoStatsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="stats",
            email="stats@example.com",
            password="password123",
        )
        Todo.objects.create(user=self.user, title="open")
        Todo.objects.create(
            user=self.user,
            title="doing",
            status=Status.IN_PROGRESS,
        )
        Todo.objects.create(user=self.user, title="done", status=Status.DONE)
        Todo.objects.create(
            user=self.user,
            title="late",
            due_date=timezone.now() - timedelta(days=1),
        )

    def test_stats_counts(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/todos/stats/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total"], 4)
        self.assertEqual(res.data["done"], 1)
        self.assertEqual(res.data["in_progress"], 1)
        self.assertEqual(res.data["overdue"], 1)


UTC = dt_timezone.utc


def _dt(year, month, day, hour=12):
    return datetime(year, month, day, hour, 0, tzinfo=UTC)


class CalendarRangeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="cal",
            email="cal@example.com",
            password="password123",
        )
        self.client.force_authenticate(self.user)

    def _ids(self, path):
        res = self.client.get(path)
        self.assertEqual(res.status_code, 200, res.data)
        return {row["id"] for row in res.data}

    def test_todos_window_keeps_anchor_undated_and_recurrence(self):
        inside = Todo.objects.create(
            user=self.user, title="in", due_date=_dt(2026, 3, 15)
        )
        event_only = Todo.objects.create(
            user=self.user,
            title="event",
            event_date=_dt(2026, 3, 10),
            due_date=_dt(2026, 8, 1),
        )
        outside = Todo.objects.create(
            user=self.user, title="out", due_date=_dt(2026, 8, 1)
        )
        undated = Todo.objects.create(user=self.user, title="none")
        overlapping = Todo.objects.create(
            user=self.user,
            title="rep",
            recurrence=Recurrence.DAILY,
            due_date=_dt(2026, 4, 1),
        )
        Todo.objects.filter(pk=overlapping.pk).update(created_at=_dt(2026, 1, 1))
        finished = Todo.objects.create(
            user=self.user,
            title="old-rep",
            recurrence=Recurrence.WEEKLY,
            due_date=_dt(2026, 2, 10),
        )
        Todo.objects.filter(pk=finished.pk).update(created_at=_dt(2026, 1, 1))

        ids = self._ids("/api/todos/?from=2026-03-01&to=2026-03-31")
        self.assertIn(inside.id, ids)
        self.assertIn(event_only.id, ids)
        self.assertIn(undated.id, ids)
        self.assertIn(overlapping.id, ids)
        self.assertNotIn(outside.id, ids)
        self.assertNotIn(finished.id, ids)

    def test_events_window_keeps_span_and_started_recurrence(self):
        inside = Event.objects.create(
            user=self.user, title="in", start_at=_dt(2026, 3, 15)
        )
        outside = Event.objects.create(
            user=self.user, title="out", start_at=_dt(2026, 8, 1)
        )
        spanning = Event.objects.create(
            user=self.user,
            title="span",
            start_at=_dt(2026, 2, 27),
            end_at=_dt(2026, 3, 2),
        )
        weekly = Event.objects.create(
            user=self.user,
            title="week",
            start_at=_dt(2026, 1, 5),
            recurrence=Recurrence.WEEKLY,
        )
        future_weekly = Event.objects.create(
            user=self.user,
            title="later",
            start_at=_dt(2026, 8, 3),
            recurrence=Recurrence.WEEKLY,
        )
        ids = self._ids("/api/events/?from=2026-03-01&to=2026-03-31")
        self.assertIn(inside.id, ids)
        self.assertIn(spanning.id, ids)
        self.assertIn(weekly.id, ids)
        self.assertNotIn(outside.id, ids)
        self.assertNotIn(future_weekly.id, ids)

    def test_from_and_to_required_together(self):
        res = self.client.get("/api/todos/?from=2026-03-01")
        self.assertEqual(res.status_code, 400)
        res = self.client.get("/api/events/?to=2026-03-31")
        self.assertEqual(res.status_code, 400)

    def test_range_cap(self):
        res = self.client.get("/api/todos/?from=2025-01-01&to=2026-01-03")
        self.assertEqual(res.status_code, 400)

    def test_without_range_still_lists_all(self):
        Todo.objects.create(user=self.user, title="a", due_date=_dt(2026, 1, 1))
        Todo.objects.create(user=self.user, title="b", due_date=_dt(2026, 8, 1))
        ids = self._ids("/api/todos/")
        self.assertEqual(len(ids), 2)
