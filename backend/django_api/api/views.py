from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer, TodoSerializer
from todos.models import Todo

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register
    """
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class MeView(APIView):
    """
    GET /api/auth/me
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class TodoViewSet(viewsets.ModelViewSet):
    """
    /api/todos/...
    
    API для управления задачами (Todo).
    
    list: Получить все задачи текущего пользователя
    create: Создать новую задачу
    retrieve: Получить одну задачу по ID
    update: Обновить всю задачу (PUT)
    partial_update: Обновить часть задачи (PATCH)
    destroy: Удалить задачу
    """
    serializer_class = TodoSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Todo.objects.filter(user=self.request.user)

        completed = self.request.query_params.get("completed")
        search = self.request.query_params.get("search")

        if completed is not None:
            if completed.lower() in ("true", "1"):
                qs = qs.filter(completed=True)
            elif completed.lower() in ("false", "0"):
                qs = qs.filter(completed=False)

        if search:
            qs = qs.filter(title__icontains=search) | qs.filter(
                description__icontains=search
            )

        return qs