from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from .serializers import RegisterSerializer, UserSerializer, TodoSerializer
from todos.models import Todo

User = get_user_model()


class RegisterView(generics.CreateAPIView): # CreateAPIView — вьюшка для создания объектов (только POST)
    """
    POST /api/auth/register
    """
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        summary='Регистрация нового пользователя',
        description='Создает новый аккаунт пользователя. Пароль должен быть минимум 8 символов.',
        examples=[
            OpenApiExample(
                'Успешная регистрация',
                value={
                    'id': 1,
                    'username': 'johndoe',
                    'email': 'john@example.com',
                    'password': 'SecurePass123',
                },
                request_only=True,
            ),
            OpenApiExample(
                'Ответ 201 Created',
                value={
                    'id': 1,
                    'username': 'johndoe',
                    'email': 'john@example.com',
                },
                response_only=True,
            ),
        ],
        responses={
            201: RegisterSerializer,
            400: {'description': 'Ошибка валидации (например, пароль слишком короткий)'},
        },
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class MeView(APIView): # APIView — базовая вьюшка для кастомной логики
    """
    GET /api/auth/me
    """
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary='Получить текущего пользователя',
        description='Возвращает информацию о вошедшем в систему пользователе.',
        responses={200: UserSerializer},
    )

    def get(self, request, *args, **kwargs):
        """
        возвращает данные текущего пользователя
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class TodoViewSet(viewsets.ModelViewSet): # ModelViewSet — автоматически создаёт все CRUD операции:
    """
    /api/todos/...
    
    API для управления задачами (Todo).
    
    list: Получить все задачи текущего пользователя\n
    GET /api/todos/ — список задач (с пагинацией)\n
    
    create: Создать новую задачу\n
    POST /api/todos/ — создание\n
    
    retrieve: Получить одну задачу по ID\n
    GET /api/todos/{id}/ — получение одной\n
    

    update: Обновить всю задачу (PUT)\n
    PUT /api/todos/{id}/ — полное обновление\n
    
    
    partial_update: Обновить часть задачи (PATCH)\n
    PATCH /api/todos/{id}/ — частичное обновление\n
    

    destroy: Удалить задачу\n    
    DELETE /api/todos/{id}/ — удаление\n
    """
    serializer_class = TodoSerializer
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_queryset(self):
        """
        Фильтрует задачи по двум критериям:
        1. По статусу завершения
        2. По поисковому запросу
        """
        qs = Todo.objects.filter(user=self.request.user)

        completed = self.request.query_params.get("completed")
        search = self.request.query_params.get("search")

        if completed is not None:
            if completed.lower() in ("true", "1"):
                qs = qs.filter(completed=True)
            elif completed.lower() in ("false", "0"):
                qs = qs.filter(completed=False)

        if search:
            qs = qs.filter(title__icontains=search) | qs.filter( # __icontains — поиск по частичному совпадению (без учёта регистра)
                description__icontains=search
            )

        return qs

    @extend_schema(
        summary='Получить все задачи пользователя',
        description='Возвращает список всех задач текущего пользователя с поддержкой фильтрации и поиска.',
        parameters=[
            OpenApiParameter(
                name='completed',
                description='Фильтр по статусу выполнения (true/false, 1/0, yes/no)',
                required=False,
                type=str,
                examples=[
                    OpenApiExample('Только выполненные', value='true'),
                    OpenApiExample('Только невыполненные', value='false'),
                ],
            ),
            OpenApiParameter(
                name='search',
                description='Поиск по названию или описанию задачи (регистронезависимый)',
                required=False,
                type=str,
                examples=[
                    OpenApiExample('Поиск "купить"', value='купить'),
                ],
            ),
        ],
        responses={200: TodoSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary='Создать новую задачу',
        description='Создает новую задачу для текущего пользователя.',
        examples=[
            OpenApiExample(
                'Создание задачи',
                value={
                    'title': 'Купить продукты',
                    'description': 'Молоко, хлеб, яйца',
                    'completed': False,
                },
                request_only=True,
            ),
            OpenApiExample(
                'Ответ сервера',
                value={
                    'id': 1,
                    'user_id': 1,
                    'title': 'Купить продукты',
                    'description': 'Молоко, хлеб, яйца',
                    'completed': False,
                    'created_at': '2026-09-04T18:00:00Z',
                    'updated_at': '2026-09-04T18:00:00Z',
                },
                response_only=True,
            ),
        ],
        responses={
            201: TodoSerializer,
            400: {'description': 'Ошибка валидации'},
        },
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary='Получить задачу по ID',
        description='Возвращает конкретную задачу по её ID.',
        responses={200: TodoSerializer},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary='Обновить задачу',
        description='Полностью обновляет задачу (все поля обязательны).',
        responses={200: TodoSerializer},
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary='Частично обновить задачу',
        description='Обновляет только указанные поля задачи.',
        responses={200: TodoSerializer},
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary='Удалить задачу',
        description='Удаляет задачу по ID.',
        responses={204: None},
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    

        
