from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    TodoSerializer,
    TagSerializer,
    ProjectSerializer,
)
from todos.models import Todo, Tag, Project

User = get_user_model()


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
    """GET /api/auth/me"""

    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="Получить текущего пользователя",
        description="Возвращает информацию о вошедшем в систему пользователе.",
        responses={200: UserSerializer},
    )
    def get(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class TodoViewSet(viewsets.ModelViewSet):
    """API для управления задачами (Todo)."""

    serializer_class = TodoSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        """Фильтрация задач по всем нужным параметрам."""

        qs = (
            Todo.objects.select_related("user", "project")
            .prefetch_related("tags")
            .filter(user=self.request.user)
        )

        params = self.request.query_params

        status = params.get("status")
        priority = params.get("priority")
        project_id = params.get("project")
        tag_id = params.get("tag")
        due_from = params.get("due_from")
        due_to = params.get("due_to")
        search = params.get("search")

        if status:
            qs = qs.filter(status=status)

        if priority:
            qs = qs.filter(priority=priority)

        if project_id:
            qs = qs.filter(project_id=project_id)

        if tag_id:
            qs = qs.filter(tags__id=tag_id)

        if due_from:
            qs = qs.filter(due_date__gte=due_from)

        if due_to:
            qs = qs.filter(due_date__lte=due_to)

        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        return qs.distinct()

    @extend_schema(
        summary="Получить все задачи пользователя",
        description=(
            "Возвращает список всех задач текущего пользователя с поддержкой фильтрации по "
            "status, priority, project, tag, due_from, due_to и текстового поиска по title/description."
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
                name="project",
                description="ID проекта для фильтрации задач",
                required=False,
                type=OpenApiTypes.INT,
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
                    "priority": "medium",
                    "project": 1,
                    "tags": [1, 2],
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

    def get_queryset(self):
        user = self.request.user
        return Tag.objects.filter(Q(user__isnull=True) | Q(user=user)).order_by("tag_name")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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


class ProjectViewSet(viewsets.ModelViewSet):
    """Список и управление проектами пользователя."""

    serializer_class = ProjectSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by("project_name")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(
        summary="Список проектов",
        description="Возвращает проекты текущего пользователя.",
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать проект",
        description="Создает новый проект пользователя.",
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить проект",
        description="Удаляет проект пользователя.",
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
