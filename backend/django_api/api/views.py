from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer, TodoSerializer
from todos.models import Todo

User = get_user_model()


class RegisterView(generics.CreateAPIView): # CreateAPIView — вьюшка для создания объектов (только POST)
    """
    POST /api/auth/register
    """
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class MeView(APIView): # APIView — базовая вьюшка для кастомной логики
    """
    GET /api/auth/me
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        """
        возвращает данные текущего пользователя
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


"""
ModelViewSet — автоматически создаёт все CRUD операции:

    GET /api/todos/ — список задач (с пагинацией)
    POST /api/todos/ — создание
    GET /api/todos/{id}/ — получение одной
    PUT /api/todos/{id}/ — полное обновление
    PATCH /api/todos/{id}/ — частичное обновление
    DELETE /api/todos/{id}/ — удаление

"""
class TodoViewSet(viewsets.ModelViewSet):
    """
    /api/todos/...
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