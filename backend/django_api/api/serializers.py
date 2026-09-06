from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from todos.models import Todo, Tag, Project, Status, Priority, Recurrence


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для отображения информации о пользователе."""

    class Meta:
        model = User
        fields = ("id", "username")
        read_only_fields = ("id",)
        extra_kwargs = {
            "id": {"help_text": "Уникальный идентификатор пользователя"},
            "username": {"help_text": "Имя пользователя"},
        }


class RegisterSerializer(serializers.ModelSerializer):
    """Используется для регистрации новых пользователей."""

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        help_text="Пароль должен быть минимум 8 символов",
    )

    class Meta:
        model = User
        fields = ("id", "username", "password", "email")
        read_only_fields = ("id",)
        extra_kwargs = {
            "id": {"read_only": True, "help_text": "Уникальный ID (генерируется автоматически)"},
            "username": {"help_text": "Уникальное имя пользователя"},
            "email": {"help_text": "Email адрес пользователя"},
        }

    def validate_password(self, value):
        """Дополнительная валидация пароля стандартными правилами Django."""

        validate_password(value)
        return value

    def create(self, validated_data):
        """Создание пользователя с безопасной установкой пароля."""

        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "tag_name", "kind")
        read_only_fields = ("id",)
        extra_kwargs = {
            "id": {"help_text": "Уникальный ID тега"},
            "tag_name": {"help_text": "Название тега"},
            "kind": {"help_text": "Тип тега (work, personal, ... )"},
        }


class TodoSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = Todo
        fields = (
            "id",
            "user_id",
            "project",
            "tags",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "recurrence",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user_id", "created_at", "updated_at")
        extra_kwargs = {
            "id": {"help_text": "Уникальный ID задачи"},
            "user_id": {"help_text": "ID пользователя, которому принадлежит задача"},
            "project": {
                "help_text": "ID проекта, к которому относится задача (опционально)",
                "required": False,
                "allow_null": True,
            },
            "tags": {
                "help_text": "Список ID тегов, связанных с задачей",
                "required": False,
            },
            "title": {"help_text": "Название задачи", "max_length": 255},
            "description": {"help_text": "Подробное описание задачи"},
            "status": {
                "help_text": "Статус задачи (todo, in_progress, done)",
            },
            "priority": {
                "help_text": "Приоритет задачи (critical, high, medium, low)",
            },
            "due_date": {
                "help_text": "Срок выполнения задачи (дата/время)",
            },
            "recurrence": {
                "help_text": "Повторяемость задачи (daily, weekly, monthly, never)",
            },
            "created_at": {"help_text": "Дата и время создания"},
            "updated_at": {"help_text": "Дата и время последнего обновления"},
        }

    def create(self, validated_data):
        """Автоматически присваивает текущего пользователя при создании задачи."""

        request = self.context["request"]
        validated_data["user"] = request.user
        return super().create(validated_data)
