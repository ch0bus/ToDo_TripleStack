import re
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from todos.models import (
    HEX_COLOR_RE,
    SHIFT_CALENDAR_MAX,
    DayNote,
    Event,
    ShiftCalendar,
    ShiftDayOverride,
    ShiftKind,
    ShiftLayer,
    ShiftPattern,
    ShiftPatternSlot,
    Todo,
    Tag,
    Subtask,
    Status,
)
from todos.shift_utils import ensure_shift_layers, layer_for_user


User = get_user_model()


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
            "event_date",
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
                "help_text": "Дедлайн: до какого момента задачу нужно сделать",
            },
            "event_date": {
                "help_text": "Когда происходит само событие (календарь и повтор)",
            },
            "recurrence": {
                "help_text": "Шаг повтора от создания до даты события (или срока, если события нет)",
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


class ShiftCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftCalendar
        fields = ("id", "name", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_name(self, value):
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("Укажите название календаря.")
        return name

    def validate(self, attrs):
        request = self.context["request"]
        name = attrs.get("name")
        if name is None and self.instance:
            return attrs
        qs = ShiftCalendar.objects.filter(user=request.user, name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"name": "Календарь с таким названием уже есть."}
            )
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        if ShiftCalendar.objects.filter(user=user).count() >= SHIFT_CALENDAR_MAX:
            raise serializers.ValidationError(
                f"Можно создать не больше {SHIFT_CALENDAR_MAX} календарей смен."
            )
        validated_data["user"] = user
        calendar = super().create(validated_data)
        ensure_shift_layers(calendar)
        return calendar


class ShiftLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftLayer
        fields = ("id", "position", "name")
        read_only_fields = ("id", "position")

    def validate_name(self, value):
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("Укажите название слоя.")
        if len(name) > 40:
            raise serializers.ValidationError("Название слоя — до 40 символов.")
        return name


class ShiftKindSerializer(serializers.ModelSerializer):
    layer_id = serializers.IntegerField(required=False)

    class Meta:
        model = ShiftKind
        fields = (
            "id",
            "layer_id",
            "name",
            "color",
            "duration_hours",
            "break_minutes",
            "hourly_rate",
        )
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

    def validate_duration_hours(self, value):
        if value < Decimal("0.25") or value > Decimal("24"):
            raise serializers.ValidationError("Часы смены — от 0.25 до 24.")
        return value

    def validate_break_minutes(self, value):
        if value > 480:
            raise serializers.ValidationError("Перерыв — от 0 до 480 минут.")
        return value

    def validate_hourly_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("Ставка не может быть отрицательной.")
        return value

    def _layer_for(self, layer_id):
        user = self.context["request"].user
        layer = layer_for_user(user, layer_id)
        if not layer:
            raise serializers.ValidationError({"layer_id": "Неизвестный слой."})
        return layer

    def validate(self, attrs):
        layer_id = attrs.get("layer_id")
        if layer_id is None and self.instance:
            layer = self.instance.layer
        elif layer_id is None:
            raise serializers.ValidationError({"layer_id": "Укажите слой."})
        else:
            layer = self._layer_for(layer_id)
        attrs["layer"] = layer
        name = attrs.get("name")
        if name is None and self.instance:
            return attrs
        qs = ShiftKind.objects.filter(layer=layer, name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"name": "Смена с таким названием уже есть."}
            )
        return attrs

    def create(self, validated_data):
        layer = validated_data.pop("layer")
        validated_data.pop("layer_id", None)
        if ShiftKind.objects.filter(layer=layer).count() >= 12:
            raise serializers.ValidationError("Можно создать не больше 12 типов смен.")
        validated_data["layer"] = layer
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("layer", None)
        validated_data.pop("layer_id", None)
        return super().update(instance, validated_data)


class ShiftPatternSlotWriteSerializer(serializers.Serializer):
    kind_id = serializers.IntegerField(allow_null=True)


class ShiftPatternSerializer(serializers.Serializer):
    layer_id = serializers.IntegerField(required=False)
    start_date = serializers.DateField(allow_null=True, required=False)
    end_date = serializers.DateField(allow_null=True, required=False)
    slots = serializers.ListField(child=ShiftPatternSlotWriteSerializer(), required=False)

    def to_representation(self, instance):
        layer_id = self.context.get("layer_id")
        if instance is None:
            return {
                "layer_id": layer_id,
                "start_date": None,
                "end_date": None,
                "slots": [],
            }
        return {
            "layer_id": instance.layer_id,
            "start_date": instance.start_date,
            "end_date": instance.end_date,
            "slots": [
                {
                    "position": slot.position,
                    "kind_id": slot.kind_id,
                    "kind": ShiftKindSerializer(slot.kind).data if slot.kind else None,
                }
                for slot in instance.slots.all()
            ],
        }

    def _layer(self):
        user = self.context["request"].user
        layer_id = self.validated_data.get("layer_id") or self.context.get("layer_id")
        if not layer_id:
            raise serializers.ValidationError({"layer_id": "Укажите слой."})
        layer = layer_for_user(user, layer_id)
        if not layer:
            raise serializers.ValidationError({"layer_id": "Неизвестный слой."})
        return layer

    def validate(self, attrs):
        start = attrs.get("start_date") or date.today()
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "Конец цикла не раньше начала."}
            )
        return attrs

    def validate_slots(self, slots):
        if len(slots) > 31:
            raise serializers.ValidationError("В цикле не больше 31 дня.")
        return slots

    def save(self, **kwargs):
        layer = self._layer()
        start_date = self.validated_data.get("start_date") or date.today()
        slots = self.validated_data.get("slots", [])
        kind_ids = [s["kind_id"] for s in slots if s.get("kind_id") is not None]
        if kind_ids:
            found = set(
                ShiftKind.objects.filter(layer=layer, id__in=kind_ids).values_list(
                    "id", flat=True
                )
            )
            missing = set(kind_ids) - found
            if missing:
                raise serializers.ValidationError(
                    {"slots": "Тип смены должен принадлежать этому слою."}
                )
        pattern, _ = ShiftPattern.objects.get_or_create(
            layer=layer,
            defaults={"start_date": start_date},
        )
        pattern.start_date = start_date
        if "end_date" in self.validated_data:
            pattern.end_date = self.validated_data["end_date"]
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
    layer_id = serializers.IntegerField()
    kind_id = serializers.IntegerField(allow_null=True)
    kind = ShiftKindSerializer(read_only=True, allow_null=True)
    source = serializers.CharField(read_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        layer = layer_for_user(user, attrs["layer_id"])
        if not layer:
            raise serializers.ValidationError({"layer_id": "Неизвестный слой."})
        attrs["layer"] = layer
        kind_id = attrs.get("kind_id")
        if kind_id is not None and not ShiftKind.objects.filter(
            layer=layer, id=kind_id
        ).exists():
            raise serializers.ValidationError(
                {"kind_id": "Тип смены должен принадлежать этому слою."}
            )
        return attrs

    def save(self, **kwargs):
        layer = self.validated_data["layer"]
        day = self.validated_data["date"]
        kind_id = self.validated_data.get("kind_id")
        override, _ = ShiftDayOverride.objects.update_or_create(
            layer=layer,
            date=day,
            defaults={"kind_id": kind_id},
        )
        override.refresh_from_db()
        return override


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = (
            "id",
            "title",
            "description",
            "start_at",
            "end_at",
            "all_day",
            "recurrence",
            "color",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {
            "title": {"help_text": "Название события"},
            "description": {"help_text": "Описание — по желанию", "required": False},
            "start_at": {"help_text": "Начало"},
            "end_at": {
                "help_text": "Конец; пусто — только момент начала",
                "required": False,
                "allow_null": True,
            },
            "all_day": {"help_text": "Весь день, без времени", "required": False},
            "recurrence": {
                "help_text": "Повтор от даты начала вперёд",
                "required": False,
            },
            "color": {
                "help_text": "Цвет закладки на календаре, #RRGGBB",
                "required": False,
            },
        }

    def validate_title(self, value):
        title = (value or "").strip()
        if not title:
            raise serializers.ValidationError("Укажите название события.")
        return title

    def validate_color(self, value):
        color = (value or "").strip()
        if not re.match(HEX_COLOR_RE, color):
            raise serializers.ValidationError("Цвет в формате #RRGGBB.")
        return color.lower()

    def validate(self, attrs):
        start_at = attrs.get("start_at", getattr(self.instance, "start_at", None))
        end_at = attrs.get("end_at", getattr(self.instance, "end_at", None))
        if "end_at" in attrs and attrs["end_at"] is None:
            end_at = None
        if start_at and end_at and end_at < start_at:
            raise serializers.ValidationError(
                {"end_at": "Конец не может быть раньше начала."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class DayNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DayNote
        fields = ("date", "text", "updated_at")
        read_only_fields = ("updated_at",)

    def validate_text(self, value):
        text = (value or "").strip()
        if not text:
            raise serializers.ValidationError("Заметка не может быть пустой.")
        return text

    def save(self, **kwargs):
        user = self.context["request"].user
        note, _ = DayNote.objects.update_or_create(
            user=user,
            date=self.validated_data["date"],
            defaults={"text": self.validated_data["text"]},
        )
        return note
