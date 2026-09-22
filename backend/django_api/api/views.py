from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    TodoSerializer,
    TagSerializer,
    SubtaskSerializer,
    ShiftCalendarSerializer,
    ShiftKindSerializer,
    ShiftLayerSerializer,
    ShiftPatternSerializer,
    ShiftDaySerializer,
    DayNoteSerializer,
    EventSerializer,
    EventAttendanceWriteSerializer,
)
from todos.models import (
    Todo,
    Tag,
    Subtask,
    Status,
    Recurrence,
    ShiftCalendar,
    ShiftKind,
    ShiftLayer,
    ShiftPattern,
    ShiftDayOverride,
    DayNote,
    Event,
    EventAttendance,
)
from todos.shift_utils import (
    ensure_default_calendar,
    ensure_shift_layers,
    expand_shift_days,
    layer_for_user,
    list_shift_calendars,
)

User = get_user_model()

CALENDAR_RANGE_MAX_DAYS = 366

CALENDAR_RANGE_PARAMETERS = [
    OpenApiParameter(
        name="from",
        description=(
            "Начало окна календаря (YYYY-MM-DD). Только вместе с to. "
            "Задачи: якорь event_date или due_date, повторы в окне created_at…якорь, "
            "плюс задачи без даты. События: пересечение start_at…end_at или повтор от start_at."
        ),
        required=False,
        type=OpenApiTypes.DATE,
    ),
    OpenApiParameter(
        name="to",
        description="Конец окна календаря (YYYY-MM-DD). Вместе с from, не больше 366 дней.",
        required=False,
        type=OpenApiTypes.DATE,
    ),
]


def _parse_query_date(value: str | None, field: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError({field: "Ожидается дата YYYY-MM-DD."})


def _optional_date_range(params) -> tuple[date | None, date | None]:
    raw_from = params.get("from")
    raw_to = params.get("to")
    if not raw_from and not raw_to:
        return None, None
    if not raw_from or not raw_to:
        raise ValidationError(
            {"detail": "Нужны оба параметра from и to (YYYY-MM-DD)."}
        )
    start = _parse_query_date(raw_from, "from")
    end = _parse_query_date(raw_to, "to")
    if start is None or end is None:
        raise ValidationError(
            {"detail": "Нужны оба параметра from и to (YYYY-MM-DD)."}
        )
    if end < start:
        raise ValidationError({"detail": "to не раньше from."})
    if (end - start).days > CALENDAR_RANGE_MAX_DAYS:
        raise ValidationError({"detail": "Диапазон не больше 366 дней."})
    return start, end


def _filter_todos_for_calendar(qs, start: date, end: date):
    """Задачи, которые могут стоять в окне, плюс без даты (блок «Без даты»)."""
    pad_start = start - timedelta(days=1)
    pad_end = end + timedelta(days=1)
    undated = Q(event_date__isnull=True, due_date__isnull=True)
    has_event = Q(event_date__isnull=False)
    due_only = Q(event_date__isnull=True, due_date__isnull=False)
    once = (has_event & Q(event_date__date__gte=pad_start, event_date__date__lte=pad_end)) | (
        due_only & Q(due_date__date__gte=pad_start, due_date__date__lte=pad_end)
    )
    recurring = ~Q(recurrence=Recurrence.NEVER)
    window = recurring & Q(created_at__date__lte=pad_end) & (
        (has_event & Q(event_date__date__gte=pad_start))
        | (due_only & Q(due_date__date__gte=pad_start))
    )
    return qs.filter(undated | once | window)


def _filter_events_for_calendar(qs, start: date, end: date):
    """Разовые события, пересекающие окно, и повторы, начавшиеся не позже to."""
    pad_start = start - timedelta(days=1)
    pad_end = end + timedelta(days=1)
    never = Q(recurrence=Recurrence.NEVER)
    one_shot = never & Q(start_at__date__lte=pad_end) & (
        Q(end_at__date__gte=pad_start)
        | Q(end_at__isnull=True, start_at__date__gte=pad_start)
    )
    repeating = ~never & Q(start_at__date__lte=pad_end)
    return qs.filter(one_shot | repeating)


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register"""

    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        summary="Регистрация нового пользователя",
        description="Создает новый аккаунт пользователя. Пароль должен быть минимум 8 символов.",
        examples=[
            OpenApiExample(
                "Успешная регистрация",
                value={
                    "username": "johndoe",
                    "email": "john@example.com",
                    "password": "SecurePass123",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Ответ 201 Created",
                value={
                    "id": 1,
                    "username": "johndoe",
                    "email": "john@example.com",
                },
                response_only=True,
            ),
        ],
        responses={
            201: RegisterSerializer,
            400: {"description": "Ошибка валидации (например, пароль слишком короткий)"},
        },
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class MeView(APIView):
    """GET/PATCH /api/auth/me"""

    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="Получить профиль",
        description="Профиль текущего пользователя для настроек.",
        responses={200: ProfileSerializer},
    )
    def get(self, request, *args, **kwargs):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        summary="Обновить профиль",
        description="Email, телефон и опционально новый пароль.",
        request=ProfileUpdateSerializer,
        responses={200: ProfileSerializer},
    )
    def patch(self, request, *args, **kwargs):
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(request.user).data)


class TodoViewSet(viewsets.ModelViewSet):
    """API для управления задачами (Todo)."""

    serializer_class = TodoSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def _annotated_queryset(self):
        return (
            Todo.objects.filter(user=self.request.user)
            .select_related("user")
            .prefetch_related("tags")
            .annotate(
                subtasks_total=Count("subtasks", distinct=True),
                subtasks_done=Count(
                    "subtasks",
                    filter=Q(subtasks__completed=True),
                    distinct=True,
                ),
            )
        )

    def get_queryset(self):
        """Фильтрация задач по всем нужным параметрам."""

        qs = self._annotated_queryset()
        params = self.request.query_params

        status = params.get("status")
        priority = params.get("priority")
        tag_id = params.get("tag")
        due_from = params.get("due_from")
        due_to = params.get("due_to")
        search = params.get("search")
        overdue = params.get("overdue")
        due_today = params.get("due_today")

        if status:
            qs = qs.filter(status=status)

        if priority:
            qs = qs.filter(priority=priority)

        if tag_id:
            qs = qs.filter(tags__id=tag_id)

        if due_from:
            qs = qs.filter(due_date__gte=due_from)

        if due_to:
            qs = qs.filter(due_date__lte=due_to)

        if overdue in ("true", "1", "yes"):
            qs = qs.filter(due_date__lt=timezone.now()).exclude(status=Status.DONE)

        if due_today in ("true", "1", "yes"):
            qs = qs.filter(due_date__date=timezone.localdate())

        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        if getattr(self, "action", None) == "list":
            range_from, range_to = _optional_date_range(params)
            if range_from and range_to:
                qs = _filter_todos_for_calendar(qs, range_from, range_to)

        # distinct() после annotate/join с тегами сбрасывает Meta.ordering.
        return qs.distinct().order_by("-created_at")

    @extend_schema(
        summary="Сводная статистика задач",
        description="Количество задач по категориям для текущего пользователя.",
    )
    @action(detail=False, methods=["get"])
    def stats(self, request):
        now = timezone.now()
        data = Todo.objects.filter(user=request.user).aggregate(
            total=Count("id"),
            done=Count("id", filter=Q(status=Status.DONE)),
            in_progress=Count("id", filter=Q(status=Status.IN_PROGRESS)),
            overdue=Count("id", filter=Q(due_date__lt=now) & ~Q(status=Status.DONE)),
        )
        return Response(data)

    @extend_schema(
        summary="Получить все задачи пользователя",
        description=(
            "Возвращает список всех задач текущего пользователя с поддержкой фильтрации по "
            "status, priority, tag, due_from, due_to, from/to (окно календаря) "
            "и текстового поиска по title/description."
        ),
        parameters=[
            OpenApiParameter(
                name="status",
                description="Статус задачи (todo, in_progress, done)",
                required=False,
                type=OpenApiTypes.STR,
            ),
            OpenApiParameter(
                name="priority",
                description="Приоритет задачи (critical, high, medium, low)",
                required=False,
                type=OpenApiTypes.STR,
            ),
            OpenApiParameter(
                name="tag",
                description="ID тега для фильтрации задач",
                required=False,
                type=OpenApiTypes.INT,
            ),
            OpenApiParameter(
                name="due_from",
                description="Фильтр по сроку выполнения: с этой даты (ISO 8601)",
                required=False,
                type=OpenApiTypes.DATETIME,
            ),
            OpenApiParameter(
                name="due_to",
                description="Фильтр по сроку выполнения: до этой даты (ISO 8601)",
                required=False,
                type=OpenApiTypes.DATETIME,
            ),
            OpenApiParameter(
                name="search",
                description="Поиск по названию или описанию задачи (регистронезависимый)",
                required=False,
                type=OpenApiTypes.STR,
            ),
            OpenApiParameter(
                name="overdue",
                description="true — только просроченные (due_date в прошлом, не done)",
                required=False,
                type=OpenApiTypes.BOOL,
            ),
            OpenApiParameter(
                name="due_today",
                description="true — срок выполнения сегодня (локальная дата сервера)",
                required=False,
                type=OpenApiTypes.BOOL,
            ),
            *CALENDAR_RANGE_PARAMETERS,
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новую задачу",
        description="Создает новую задачу для текущего пользователя.",
        examples=[
            OpenApiExample(
                "Создание задачи",
                value={
                    "title": "Купить продукты",
                    "description": "Молоко, хлеб, яйца",
                    "status": "todo",
                    "priority": "low",
                    "tag_ids": [1, 2],
                    "due_date": "2026-09-04T18:00:00Z",
                    "recurrence": "never",
                },
                request_only=True,
            ),
        ],
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить задачу по ID",
        description="Возвращает конкретную задачу по её ID.",
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Обновить задачу",
        description="Полностью обновляет задачу (все поля обязательны).",
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить задачу",
        description="Обновляет только указанные поля задачи.",
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить задачу",
        description="Удаляет задачу по ID.",
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class TagViewSet(viewsets.ModelViewSet):
    """Список и управление тегами пользователя + системные теги."""

    serializer_class = TagSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return Tag.visible_to(self.request.user).order_by("tag_name")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        if instance.user_id is None:
            raise PermissionDenied("Системные теги нельзя удалить.")
        super().perform_destroy(instance)

    @extend_schema(
        summary="Список тегов",
        description="Возвращает системные теги и персональные теги текущего пользователя.",
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать тег",
        description="Создает новый персональный тег пользователя.",
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить тег",
        description="Удаляет персональный тег пользователя.",
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class SubtaskViewSet(viewsets.ModelViewSet):
    """Подзадачи внутри задачи пользователя."""

    serializer_class = SubtaskSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def _get_todo(self) -> Todo:
        return get_object_or_404(
            Todo,
            pk=self.kwargs["todo_pk"],
            user=self.request.user,
        )

    def get_queryset(self):
        return Subtask.objects.filter(todo=self._get_todo()).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(todo=self._get_todo())

    @extend_schema(summary="Список подзадач задачи")
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(summary="Создать подзадачу")
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(summary="Получить подзадачу")
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(summary="Обновить подзадачу")
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(summary="Частично обновить подзадачу")
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(summary="Удалить подзадачу")
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


def _calendar_from_request(request, required=False) -> ShiftCalendar:
    raw = request.query_params.get("calendar")
    if raw:
        try:
            calendar_id = int(raw)
        except (TypeError, ValueError):
            raise ValidationError({"calendar": "Ожидается id календаря."})
        return get_object_or_404(ShiftCalendar, user=request.user, pk=calendar_id)
    if required:
        raise ValidationError({"calendar": "Укажите календарь."})
    return ensure_default_calendar(request.user)


class ShiftCalendarViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftCalendarSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        list_shift_calendars(self.request.user)
        return ShiftCalendar.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        if ShiftCalendar.objects.filter(user=self.request.user).count() <= 1:
            raise ValidationError({"detail": "Нельзя удалить последний календарь смен."})
        instance.delete()


class ShiftLayerViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftLayerSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        owned = ShiftLayer.objects.filter(calendar__user=self.request.user)
        if getattr(self, "action", None) in ("list", "create", None):
            calendar = _calendar_from_request(self.request)
            ensure_shift_layers(calendar)
            return owned.filter(calendar=calendar)
        return owned


class ShiftKindViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftKindSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        owned = ShiftKind.objects.filter(
            layer__calendar__user=self.request.user
        ).select_related("layer")
        if getattr(self, "action", None) in ("list", "create", None):
            calendar = _calendar_from_request(self.request)
            ensure_shift_layers(calendar)
            qs = owned.filter(layer__calendar=calendar)
            layer_id = self.request.query_params.get("layer")
            if layer_id:
                qs = qs.filter(layer_id=layer_id)
            return qs
        return owned


class ShiftPatternView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        calendar = _calendar_from_request(request)
        layers = ensure_shift_layers(calendar)
        layer_id = request.query_params.get("layer")
        if layer_id:
            layer = get_object_or_404(
                ShiftLayer, calendar=calendar, pk=layer_id
            )
            pattern = (
                ShiftPattern.objects.filter(layer=layer)
                .prefetch_related("slots__kind")
                .first()
            )
            return Response(
                ShiftPatternSerializer(
                    pattern, context={"request": request, "layer_id": layer.id}
                ).data
            )
        payload = []
        for layer in layers:
            pattern = (
                ShiftPattern.objects.filter(layer=layer)
                .prefetch_related("slots__kind")
                .first()
            )
            payload.append(
                ShiftPatternSerializer(
                    pattern, context={"request": request, "layer_id": layer.id}
                ).data
            )
        return Response(payload)

    def put(self, request):
        serializer = ShiftPatternSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        pattern = serializer.save()
        return Response(
            ShiftPatternSerializer(
                pattern, context={"request": request, "layer_id": pattern.layer_id}
            ).data
        )


class ShiftDaysView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        start = _parse_query_date(request.query_params.get("from"), "from")
        end = _parse_query_date(request.query_params.get("to"), "to")
        if not start or not end:
            raise ValidationError({"detail": "Нужны параметры from и to (YYYY-MM-DD)."})
        if (end - start).days > 366:
            raise ValidationError({"detail": "Диапазон не больше 366 дней."})
        calendar = _calendar_from_request(request)
        days = expand_shift_days(calendar, start, end)
        return Response(
            [
                {
                    "date": row["date"].isoformat(),
                    "layer_id": row["layer_id"],
                    "kind": ShiftKindSerializer(row["kind"]).data
                    if row["kind"]
                    else None,
                    "source": row["source"],
                }
                for row in days
            ]
        )

    def put(self, request):
        serializer = ShiftDaySerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        override = serializer.save()
        return Response(
            {
                "date": override.date.isoformat(),
                "layer_id": override.layer_id,
                "kind": ShiftKindSerializer(override.kind).data
                if override.kind
                else None,
                "source": "override",
            }
        )


class ShiftDayDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, day: str):
        try:
            parsed = date.fromisoformat(day)
        except ValueError:
            raise ValidationError({"detail": "Ожидается дата YYYY-MM-DD."})
        layer_id = request.query_params.get("layer")
        if not layer_id:
            raise ValidationError({"layer": "Укажите слой."})
        layer = layer_for_user(request.user, layer_id)
        if not layer:
            raise ValidationError({"layer": "Неизвестный слой."})
        deleted, _ = ShiftDayOverride.objects.filter(
            layer=layer,
            date=parsed,
        ).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = Event.objects.filter(user=self.request.user).prefetch_related(
            "attendances"
        )
        if getattr(self, "action", None) == "list":
            range_from, range_to = _optional_date_range(self.request.query_params)
            if range_from and range_to:
                qs = _filter_events_for_calendar(qs, range_from, range_to)
        return qs

    @extend_schema(
        summary="Список событий",
        parameters=CALENDAR_RANGE_PARAMETERS,
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Отметить посещение вхождения",
        request=EventAttendanceWriteSerializer,
        responses={200: EventSerializer},
    )
    @action(detail=True, methods=["put"])
    def attendance(self, request, pk=None):
        event = self.get_object()
        writer = EventAttendanceWriteSerializer(data=request.data)
        writer.is_valid(raise_exception=True)
        day = writer.validated_data["occurrence_date"]
        if writer.validated_data["attended"]:
            EventAttendance.objects.get_or_create(
                event=event,
                occurrence_date=day,
            )
        else:
            EventAttendance.objects.filter(
                event=event,
                occurrence_date=day,
            ).delete()
        event = (
            Event.objects.filter(pk=event.pk)
            .prefetch_related("attendances")
            .get()
        )
        return Response(EventSerializer(event, context={"request": request}).data)


class DayNotesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        start = _parse_query_date(request.query_params.get("from"), "from")
        end = _parse_query_date(request.query_params.get("to"), "to")
        if not start or not end:
            raise ValidationError({"detail": "Нужны параметры from и to (YYYY-MM-DD)."})
        if (end - start).days > 366:
            raise ValidationError({"detail": "Диапазон не больше 366 дней."})
        notes = DayNote.objects.filter(
            user=request.user,
            date__range=(start, end),
        ).order_by("date")
        return Response(DayNoteSerializer(notes, many=True).data)

    def put(self, request):
        serializer = DayNoteSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        note = serializer.save()
        return Response(DayNoteSerializer(note).data)


class DayNoteDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def _date(self, day: str) -> date:
        try:
            return date.fromisoformat(day)
        except ValueError:
            raise ValidationError({"detail": "Ожидается дата YYYY-MM-DD."})

    def get(self, request, day: str):
        note = DayNote.objects.filter(
            user=request.user,
            date=self._date(day),
        ).first()
        if not note:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(DayNoteSerializer(note).data)

    def delete(self, request, day: str):
        deleted, _ = DayNote.objects.filter(
            user=request.user,
            date=self._date(day),
        ).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
