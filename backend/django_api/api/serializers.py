from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from todos.models import Todo, Tag, Subtask, Status, Priority, Recurrence


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


class ProfileSerializer(serializers.ModelSerializer):
    """Профиль для страницы настроек."""

    class Meta:
        model = User
        fields = ("id", "username", "email", "phone_number")
        read_only_fields = ("id", "username")


class ProfileUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
    )

    class Meta:
        model = User
        fields = ("email", "phone_number", "password")

    def validate_password(self, value):
        validate_password(value)
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


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
    is_system = serializers.SerializerMethodField()

    class Meta:
        model = Tag
        fields = ("id", "tag_name", "kind", "is_system")
        read_only_fields = ("id", "is_system")
        extra_kwargs = {
            "id": {"help_text": "Уникальный ID тега"},
            "tag_name": {"help_text": "Название тега"},
            "kind": {"help_text": "Тип тега (work, personal, ... )"},
            "is_system": {"help_text": "Системный тег (read-only)"},
        }

    def get_is_system(self, obj):
        return obj.user_id is None


class SubtasksSummarySerializer(serializers.Serializer):
    done = serializers.IntegerField()
    total = serializers.IntegerField()


class TodoSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    subtasks_summary = serializers.SerializerMethodField()
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        source="tags",
        write_only=True,
        required=False,
    )

    class Meta:
        model = Todo
        fields = (
            "id",
            "user_id",
            "tags",
            "tag_ids",
            "subtasks_summary",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "recurrence",
            "created_at",
            "updated_at",
            "completed_at",
        )
        read_only_fields = (
            "id",
            "user_id",
            "created_at",
            "updated_at",
            "completed_at",
        )
        extra_kwargs = {
            "id": {"help_text": "Уникальный ID задачи"},
            "user_id": {"help_text": "ID пользователя, которому принадлежит задача"},
            "tag_ids": {
                "help_text": "Список ID тегов при создании/обновлении",
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
            "completed_at": {
                "help_text": "Когда статус стал «Готово»; сбрасывается при другом статусе",
            },
        }

    def get_subtasks_summary(self, obj):
        total = getattr(obj, "subtasks_total", None)
        done = getattr(obj, "subtasks_done", None)
        if total is not None and done is not None:
            return {"total": total, "done": done}
        subtasks = obj.subtasks.all()
        return {
            "total": subtasks.count(),
            "done": subtasks.filter(completed=True).count(),
        }

    def create(self, validated_data):
        """Автоматически присваивает текущего пользователя при создании задачи."""

        request = self.context["request"]
        validated_data["user"] = request.user
        self._apply_completed_at(validated_data, previous_status=None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._apply_completed_at(validated_data, previous_status=instance.status)
        return super().update(instance, validated_data)

    def _apply_completed_at(self, validated_data, previous_status):
        new_status = validated_data.get("status", previous_status or Status.TODO)
        if new_status == Status.DONE:
            if previous_status != Status.DONE:
                validated_data["completed_at"] = timezone.now()
        else:
            validated_data["completed_at"] = None


class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = (
            "id",
            "title",
            "completed",
            "due_date",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
