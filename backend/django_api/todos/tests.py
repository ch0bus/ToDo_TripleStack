from datetime import datetime, timedelta, timezone as dt_timezone

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from todos.models import (
    DayNote,
    Event,
    EventAttendance,
    Recurrence,
    Status,
    Subtask,
    Tag,
    TagKind,
    Todo,
)

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

    def test_event_and_note_use_same_tags(self):
        self.client.force_authenticate(self.alice)
        event_res = self.client.post(
            "/api/events/",
            {
                "title": "Встреча",
                "start_at": "2026-04-01T10:00:00Z",
                "tag_ids": [self.alice_tag.id, self.system_tag.id],
            },
            format="json",
        )
        self.assertEqual(event_res.status_code, 201, event_res.data)
        self.assertEqual(
            {row["id"] for row in event_res.data["tags"]},
            {self.alice_tag.id, self.system_tag.id},
        )
        note_res = self.client.put(
            "/api/day-notes/",
            {
                "date": "2026-04-02",
                "text": "Смена",
                "tag_ids": [self.alice_tag.id],
            },
            format="json",
        )
        self.assertEqual(note_res.status_code, 200, note_res.data)
        self.assertEqual(
            {row["id"] for row in note_res.data["tags"]},
            {self.alice_tag.id},
        )
        listed = self.client.get(f"/api/events/?tag={self.alice_tag.id}")
        self.assertEqual(
            {row["id"] for row in listed.data},
            {event_res.data["id"]},
        )
        notes = self.client.get(
            f"/api/day-notes/?from=2026-04-01&to=2026-04-03&tag={self.alice_tag.id}"
        )
        self.assertEqual({row["date"] for row in notes.data}, {"2026-04-02"})

    def test_cannot_attach_another_users_tag_to_event_or_note(self):
        self.client.force_authenticate(self.alice)
        event_res = self.client.post(
            "/api/events/",
            {
                "title": "Встреча",
                "start_at": "2026-04-01T10:00:00Z",
                "tag_ids": [self.bob_tag.id],
            },
            format="json",
        )
        self.assertEqual(event_res.status_code, 400)
        self.assertFalse(Event.objects.filter(user=self.alice).exists())
        note_res = self.client.put(
            "/api/day-notes/",
            {
                "date": "2026-04-02",
                "text": "Смена",
                "tag_ids": [self.bob_tag.id],
            },
            format="json",
        )
        self.assertEqual(note_res.status_code, 400)
        self.assertFalse(DayNote.objects.filter(user=self.alice).exists())


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

    def test_exclude_done(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/todos/?exclude_done=true")
        self.assertEqual(res.status_code, 200)
        titles = {row["title"] for row in res.data}
        self.assertEqual(titles, {"open", "doing", "late"})


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


class EventAttendanceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="att",
            email="att@example.com",
            password="password123",
        )
        self.other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="password123",
        )
        self.client.force_authenticate(self.user)

    def test_list_includes_attended_dates(self):
        event = Event.objects.create(
            user=self.user, title="Встреча", start_at=_dt(2026, 3, 15, 10)
        )
        EventAttendance.objects.create(
            event=event, occurrence_date=event.start_at.date()
        )
        res = self.client.get("/api/events/")
        self.assertEqual(res.status_code, 200)
        row = next(item for item in res.data if item["id"] == event.id)
        self.assertEqual(row["attended_dates"], ["2026-03-15"])

    def test_put_attendance_toggles_occurrence(self):
        event = Event.objects.create(
            user=self.user, title="Встреча", start_at=_dt(2026, 3, 15, 10)
        )
        res = self.client.put(
            f"/api/events/{event.id}/attendance/",
            {"occurrence_date": "2026-03-15", "attended": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["attended_dates"], ["2026-03-15"])
        self.assertTrue(
            EventAttendance.objects.filter(
                event=event, occurrence_date="2026-03-15"
            ).exists()
        )
        res = self.client.put(
            f"/api/events/{event.id}/attendance/",
            {"occurrence_date": "2026-03-15", "attended": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["attended_dates"], [])

    def test_cannot_mark_another_users_event(self):
        event = Event.objects.create(
            user=self.other, title="Чужое", start_at=_dt(2026, 3, 15, 10)
        )
        res = self.client.put(
            f"/api/events/{event.id}/attendance/",
            {"occurrence_date": "2026-03-15", "attended": True},
            format="json",
        )
        self.assertEqual(res.status_code, 404)
        self.assertFalse(EventAttendance.objects.exists())

    def test_recurring_last_missed_is_one_occurrence(self):
        from datetime import timezone as tz
        from zoneinfo import ZoneInfo

        from todos.event_occurrence import last_missed_occurrence

        event = Event.objects.create(
            user=self.user,
            title="Стендап",
            start_at=_dt(2026, 3, 10, 10),
            end_at=_dt(2026, 3, 10, 11),
            recurrence=Recurrence.DAILY,
        )
        now = datetime(2026, 3, 15, 12, tzinfo=tz.utc)
        missed = last_missed_occurrence(event, now, ZoneInfo("UTC"))
        self.assertIsNotNone(missed)
        self.assertEqual(missed[1].isoformat(), "2026-03-15")
        EventAttendance.objects.create(event=event, occurrence_date=missed[1])
        event = Event.objects.prefetch_related("attendances").get(pk=event.pk)
        missed = last_missed_occurrence(event, now, ZoneInfo("UTC"))
        self.assertEqual(missed[1].isoformat(), "2026-03-14")


class SearchTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="seek",
            email="seek@example.com",
            password="password123",
        )
        self.other = User.objects.create_user(
            username="other-seek",
            email="other-seek@example.com",
            password="password123",
        )
        self.client.force_authenticate(self.user)
        self.todo = Todo.objects.create(
            user=self.user,
            title="Купить краску",
            description="для кухни",
        )
        Subtask.objects.create(todo=self.todo, title="валик")
        Event.objects.create(
            user=self.user,
            title="День рождения",
            description="кафе",
            start_at=_dt(2026, 4, 1, 18),
        )
        DayNote.objects.create(
            user=self.user,
            date="2026-04-02",
            text="Смена графика",
        )
        Todo.objects.create(user=self.other, title="Купить краску")
        Event.objects.create(
            user=self.other, title="День рождения", start_at=_dt(2026, 4, 1)
        )
        DayNote.objects.create(
            user=self.other, date="2026-04-02", text="Смена графика"
        )

    def test_empty_query(self):
        res = self.client.get("/api/search/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["q"], "")
        self.assertEqual(res.data["todos"], [])
        self.assertEqual(res.data["events"], [])
        self.assertEqual(res.data["notes"], [])

    def test_finds_own_entities(self):
        res = self.client.get("/api/search/?q=крас")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["q"], "крас")
        self.assertEqual({row["title"] for row in res.data["todos"]}, {"Купить краску"})
        self.assertEqual(res.data["events"], [])
        self.assertEqual(res.data["notes"], [])

        res = self.client.get("/api/search/?q=валик")
        self.assertEqual({row["id"] for row in res.data["todos"]}, {self.todo.id})

        res = self.client.get("/api/search/?q=кафе")
        self.assertEqual({row["title"] for row in res.data["events"]}, {"День рождения"})

        res = self.client.get("/api/search/?q=график")
        self.assertEqual({row["date"] for row in res.data["notes"]}, {"2026-04-02"})

    def test_finds_by_tag_name(self):
        tag = Tag.objects.create(
            user=self.user, tag_name="покупки", kind=TagKind.SHOPPING
        )
        self.todo.tags.add(tag)
        event = Event.objects.get(user=self.user, title="День рождения")
        event.tags.add(tag)
        note = DayNote.objects.get(user=self.user, date="2026-04-02")
        note.tags.add(tag)
        res = self.client.get("/api/search/?q=покуп")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual({row["id"] for row in res.data["todos"]}, {self.todo.id})
        self.assertEqual({row["title"] for row in res.data["events"]}, {"День рождения"})
        self.assertEqual({row["date"] for row in res.data["notes"]}, {"2026-04-02"})

    def test_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/search/?q=крас")
        self.assertEqual(res.status_code, 401)


class DayNoteListTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="notes",
            email="notes@example.com",
            password="password123",
        )
        self.other = User.objects.create_user(
            username="other-notes",
            email="other-notes@example.com",
            password="password123",
        )
        self.client.force_authenticate(self.user)
        self.tag = Tag.objects.create(
            user=self.user, tag_name="работа", kind=TagKind.WORK
        )
        self.note = DayNote.objects.create(
            user=self.user,
            date="2026-04-02",
            text="Смена графика",
        )
        self.note.tags.add(self.tag)
        DayNote.objects.create(user=self.user, date="2026-01-10", text="Старый план")
        DayNote.objects.create(
            user=self.other, date="2026-04-02", text="Чужая смена"
        )

    def test_list_all_without_range(self):
        res = self.client.get("/api/day-notes/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(
            {row["date"] for row in res.data},
            {"2026-04-02", "2026-01-10"},
        )
        self.assertGreaterEqual(
            res.data[0]["updated_at"],
            res.data[1]["updated_at"],
        )

    def test_search_text(self):
        res = self.client.get("/api/day-notes/?q=график")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual({row["date"] for row in res.data}, {"2026-04-02"})

    def test_tag_filter(self):
        res = self.client.get(f"/api/day-notes/?tag={self.tag.id}")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual({row["date"] for row in res.data}, {"2026-04-02"})

    def test_range_still_works(self):
        res = self.client.get("/api/day-notes/?from=2026-04-01&to=2026-04-03")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual({row["date"] for row in res.data}, {"2026-04-02"})

    def test_only_from_rejected(self):
        res = self.client.get("/api/day-notes/?from=2026-04-01")
        self.assertEqual(res.status_code, 400)

    def test_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/day-notes/")
        self.assertEqual(res.status_code, 401)


class ShiftBonusTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="bonus",
            email="bonus@example.com",
            password="password123",
        )
        self.other = User.objects.create_user(
            username="other-bonus",
            email="other-bonus@example.com",
            password="password123",
        )
        self.client.force_authenticate(self.user)
        calendars = self.client.get("/api/shift-calendars/")
        self.assertEqual(calendars.status_code, 200, calendars.data)
        self.calendar_id = calendars.data[0]["id"]
        layers = self.client.get(f"/api/shift-layers/?calendar={self.calendar_id}")
        self.assertEqual(layers.status_code, 200, layers.data)
        self.layer_id = layers.data[0]["id"]
        self.layer2_id = layers.data[1]["id"]

    def test_put_get_delete(self):
        res = self.client.put(
            "/api/shift-bonuses/",
            {
                "date": "2026-10-20",
                "layer_id": self.layer_id,
                "amount": "1500.50",
                "comment": "Премия",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["date"], "2026-10-20")
        self.assertEqual(res.data["layer_id"], self.layer_id)
        self.assertEqual(res.data["comment"], "Премия")
        listed = self.client.get(
            f"/api/shift-bonuses/?from=2026-10-01&to=2026-10-31&calendar={self.calendar_id}"
        )
        self.assertEqual(listed.status_code, 200, listed.data)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["comment"], "Премия")
        self.assertEqual(listed.data[0]["layer_id"], self.layer_id)
        deleted = self.client.delete(
            f"/api/shift-bonuses/2026-10-20/?layer={self.layer_id}"
        )
        self.assertEqual(deleted.status_code, 204)
        empty = self.client.get(
            f"/api/shift-bonuses/?from=2026-10-01&to=2026-10-31&calendar={self.calendar_id}"
        )
        self.assertEqual(empty.data, [])

    def test_per_layer_same_day(self):
        first = self.client.put(
            "/api/shift-bonuses/",
            {"date": "2026-10-20", "layer_id": self.layer_id, "amount": "100"},
            format="json",
        )
        second = self.client.put(
            "/api/shift-bonuses/",
            {"date": "2026-10-20", "layer_id": self.layer2_id, "amount": "200"},
            format="json",
        )
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        listed = self.client.get(
            f"/api/shift-bonuses/?from=2026-10-01&to=2026-10-31&calendar={self.calendar_id}"
        )
        self.assertEqual(len(listed.data), 2)
        self.client.delete(f"/api/shift-bonuses/2026-10-20/?layer={self.layer_id}")
        left = self.client.get(
            f"/api/shift-bonuses/?from=2026-10-01&to=2026-10-31&calendar={self.calendar_id}"
        )
        self.assertEqual(len(left.data), 1)
        self.assertEqual(left.data[0]["layer_id"], self.layer2_id)

    def test_amount_must_be_positive(self):
        res = self.client.put(
            "/api/shift-bonuses/",
            {"date": "2026-10-20", "layer_id": self.layer_id, "amount": "0"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_layer_required(self):
        res = self.client.put(
            "/api/shift-bonuses/",
            {"date": "2026-10-20", "amount": "100"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_other_user_isolated(self):
        self.client.put(
            "/api/shift-bonuses/",
            {"date": "2026-10-20", "layer_id": self.layer_id, "amount": "100"},
            format="json",
        )
        self.client.force_authenticate(self.other)
        other_cals = self.client.get("/api/shift-calendars/")
        other_id = other_cals.data[0]["id"]
        listed = self.client.get(
            f"/api/shift-bonuses/?from=2026-10-01&to=2026-10-31&calendar={other_id}"
        )
        self.assertEqual(listed.data, [])
        stolen = self.client.delete(
            f"/api/shift-bonuses/2026-10-20/?layer={self.layer_id}"
        )
        self.assertEqual(stolen.status_code, 400)


class ShiftDayHoursTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="hours",
            email="hours@example.com",
            password="password123",
        )
        self.client.force_authenticate(self.user)
        calendars = self.client.get("/api/shift-calendars/")
        self.calendar_id = calendars.data[0]["id"]
        layers = self.client.get(f"/api/shift-layers/?calendar={self.calendar_id}")
        self.layer_id = layers.data[0]["id"]
        kind = self.client.post(
            "/api/shift-kinds/",
            {
                "layer_id": self.layer_id,
                "name": "День",
                "color": "#2563eb",
                "duration_hours": "8.00",
                "break_minutes": 60,
                "hourly_rate": "200",
            },
            format="json",
        )
        self.assertEqual(kind.status_code, 201, kind.data)
        self.kind_id = kind.data["id"]

    def test_put_hours_for_day(self):
        painted = self.client.put(
            "/api/shift-days/",
            {
                "date": "2026-10-20",
                "layer_id": self.layer_id,
                "kind_id": self.kind_id,
            },
            format="json",
        )
        self.assertEqual(painted.status_code, 200, painted.data)
        self.assertIsNone(painted.data["duration_hours"])
        custom = self.client.put(
            "/api/shift-days/",
            {
                "date": "2026-10-20",
                "layer_id": self.layer_id,
                "kind_id": self.kind_id,
                "duration_hours": "10.50",
            },
            format="json",
        )
        self.assertEqual(custom.status_code, 200, custom.data)
        self.assertEqual(custom.data["duration_hours"], "10.50")
        listed = self.client.get(
            f"/api/shift-days/?from=2026-10-20&to=2026-10-20&calendar={self.calendar_id}"
        )
        self.assertEqual(listed.status_code, 200, listed.data)
        row = next(item for item in listed.data if item["layer_id"] == self.layer_id)
        self.assertEqual(row["duration_hours"], "10.50")
        self.assertEqual(row["kind"]["duration_hours"], "8.00")

    def test_paint_clears_day_hours(self):
        self.client.put(
            "/api/shift-days/",
            {
                "date": "2026-10-20",
                "layer_id": self.layer_id,
                "kind_id": self.kind_id,
                "duration_hours": "11",
            },
            format="json",
        )
        painted = self.client.put(
            "/api/shift-days/",
            {
                "date": "2026-10-20",
                "layer_id": self.layer_id,
                "kind_id": self.kind_id,
            },
            format="json",
        )
        self.assertIsNone(painted.data["duration_hours"])

    def test_hours_require_shift(self):
        res = self.client.put(
            "/api/shift-days/",
            {
                "date": "2026-10-20",
                "layer_id": self.layer_id,
                "kind_id": None,
                "duration_hours": "8",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_hours_range(self):
        res = self.client.put(
            "/api/shift-days/",
            {
                "date": "2026-10-20",
                "layer_id": self.layer_id,
                "kind_id": self.kind_id,
                "duration_hours": "0",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
