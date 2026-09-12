import re
from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from todos.models import (
    HEX_COLOR_RE,
    ShiftDayOverride,
    ShiftKind,
    ShiftPattern,
    ShiftPatternSlot,
    Todo,
    Tag,
    Subtask,
    Status,
    Priority,
    Recurrence,
)


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


class ShiftKindSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftKind
        fields = ("id", "name", "color")
        read_only_fields = ("id",)

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Укажите название смены.")
        return name

    def validate_color(self, value):
        color = value.strip()
        if not re.match(HEX_COLOR_RE, color):
            raise serializers.ValidationError("Цвет в формате #RRGGBB.")
        return color.lower()

    def validate(self, attrs):
        request = self.context["request"]
        name = attrs.get("name")
        if name is None and self.instance:
            return attrs
        qs = ShiftKind.objects.filter(user=request.user, name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"name": "Смена с таким названием уже есть."}
            )
        return attrs

    def create(self, validated_data):
        if ShiftKind.objects.filter(user=self.context["request"].user).count() >= 12:
            raise serializers.ValidationError("Можно создать не больше 12 типов смен.")
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ShiftPatternSlotWriteSerializer(serializers.Serializer):
    kind_id = serializers.IntegerField(allow_null=True)


class ShiftPatternSerializer(serializers.Serializer):
    start_date = serializers.DateField(allow_null=True, required=False)
    slots = serializers.ListField(child=ShiftPatternSlotWriteSerializer(), required=False)

    def to_representation(self, instance):
        if instance is None:
            return {"start_date": None, "slots": []}
        return {
            "start_date": instance.start_date,
            "slots": [
                {
                    "position": slot.position,
                    "kind_id": slot.kind_id,
                    "kind": ShiftKindSerializer(slot.kind).data if slot.kind else None,
                }
                for slot in instance.slots.all()
            ],
        }

    def validate_slots(self, slots):
        if len(slots) > 31:
            raise serializers.ValidationError("В цикле не больше 31 дня.")
        user = self.context["request"].user
        kind_ids = [s["kind_id"] for s in slots if s.get("kind_id") is not None]
        if kind_ids:
            found = set(
                ShiftKind.objects.filter(user=user, id__in=kind_ids).values_list(
                    "id", flat=True
                )
            )
            missing = set(kind_ids) - found
            if missing:
                raise serializers.ValidationError("Неизвестный тип смены.")
        return slots

    def save(self, **kwargs):
        user = self.context["request"].user
        start_date = self.validated_data.get("start_date") or date.today()
        slots = self.validated_data.get("slots", [])
        pattern, _ = ShiftPattern.objects.get_or_create(
            user=user,
            defaults={"start_date": start_date},
        )
        pattern.start_date = start_date
        pattern.save()
        pattern.slots.all().delete()
        ShiftPatternSlot.objects.bulk_create(
            [
                ShiftPatternSlot(
                    pattern=pattern,
                    position=index,
                    kind_id=slot.get("kind_id"),
                )
                for index, slot in enumerate(slots)
            ]
        )
        return (
            ShiftPattern.objects.filter(pk=pattern.pk)
            .prefetch_related("slots__kind")
            .get()
        )


class ShiftDaySerializer(serializers.Serializer):
    date = serializers.DateField()
    kind_id = serializers.IntegerField(allow_null=True)
    kind = ShiftKindSerializer(read_only=True, allow_null=True)
    source = serializers.CharField(read_only=True)

    def validate_kind_id(self, value):
        if value is None:
            return value
        user = self.context["request"].user
        if not ShiftKind.objects.filter(user=user, id=value).exists():
            raise serializers.ValidationError("Неизвестный тип смены.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        day = self.validated_data["date"]
        kind_id = self.validated_data.get("kind_id")
        override, _ = ShiftDayOverride.objects.update_or_create(
            user=user,
            date=day,
            defaults={"kind_id": kind_id},
        )
        override.refresh_from_db()
        return override
