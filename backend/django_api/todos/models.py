from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q


class Recurrence(models.TextChoices):
    DAILY = "daily", "ежедневно"
    WEEKLY = "weekly", "каждую неделю"
    MONTHLY = "monthly", "ежемесячно"
    NEVER = "never", "никогда"


class Status(models.TextChoices):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class Priority(models.TextChoices):
    CRITICAL = "critical", "Критический"
    HIGH = "high", "Высокий"
    MEDIUM = "medium", "Средний"
    LOW = "low", "Низкий"


class TagKind(models.TextChoices):
    WORK = "work", "работа"
    PERSONAL = "personal", "личное"
    HEALTH = "health", "здоровье"
    FINANCE = "finance", "финансы"
    SHOPPING = "shopping", "покупки"
    HOME = "home", "дом"
    HOBBY = "hobby", "хобби"
    OTHER = "other", "другое"


class Tag(models.Model):
    """Системные теги (user=None) + персональные теги пользователя."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="tags",
        verbose_name="Владелец",
        help_text="Пусто — системный тег; иначе только для этого пользователя.",
    )
    tag_name = models.CharField("Название", max_length=100)
    kind = models.CharField(
        max_length=16,
        choices=TagKind.choices,
        default=TagKind.OTHER,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "tag_name"],
                name="unique_user_tag_name",
            ),
        ]

    def __str__(self):
        return f"{self.tag_name}"

    @classmethod
    def visible_to(cls, user):
        """Системные теги и личные теги пользователя."""
        if user is None or not getattr(user, "is_authenticated", False):
            return cls.objects.filter(user__isnull=True)
        return cls.objects.filter(Q(user__isnull=True) | Q(user_id=user.pk))


class Todo(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="todos",
        verbose_name="Автор",
        db_index=True,  # Индекс для быстрого поиска по пользователю
    )
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name="todos",
        verbose_name="Теги",
    )
    priority = models.CharField(
        max_length=16,
        choices=Priority.choices,
        default=Priority.LOW,
    )
    title = models.CharField(max_length=255, db_index=True)  # Индекс для поиска
    description = models.TextField(blank=True)
    status = models.CharField(  # заменяет completed
        max_length=16,
        choices=Status.choices,
        default=Status.TODO,
        db_index=True,
    )
    due_date = models.DateTimeField(
        "Срок выполнения задачи",
        blank=True,
        null=True,
        db_index=True,
    )
    event_date = models.DateTimeField(
        "Дата события",
        blank=True,
        null=True,
        db_index=True,
    )
    recurrence = models.CharField(
        max_length=16,
        choices=Recurrence.choices,
        default=Recurrence.NEVER,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(
        "Дата завершения",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),  # Комбинированный индекс
            models.Index(fields=["user", "-created_at"]),  # Для сортировки
        ]

    def __str__(self):
        return f"{self.title} [{self.status}]"


class Subtask(models.Model):
    todo = models.ForeignKey(
        Todo,
        on_delete=models.CASCADE,
        related_name="subtasks",
    )
    due_date = models.DateTimeField(null=True, blank=True)  # срок выполнения задачи
    title = models.CharField(max_length=255, db_index=True)  # Индекс для поиска
    completed = models.BooleanField(
        default=False,
        db_index=True,
    )  # Индекс для фильтрации
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} (completed={self.completed})"


HEX_COLOR_RE = r"^#[0-9A-Fa-f]{6}$"
DEFAULT_EVENT_COLOR = "#e11d48"

SHIFT_LAYER_NAMES = ("Слой 1", "Слой 2")
SHIFT_LAYER_COUNT = 2
SHIFT_CALENDAR_MAX = 10
DEFAULT_SHIFT_CALENDAR_NAME = "Основной"


class ShiftCalendar(models.Model):
    """Доска смен. Задачи и заметки общие, визуал и учёт смен — свои."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shift_calendars",
    )
    name = models.CharField("Название", max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name"],
                name="unique_user_shift_calendar_name",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.user_id})"


class ShiftLayer(models.Model):
    """Именованный график. У календаря ровно два слоя (позиции 0 и 1)."""

    calendar = models.ForeignKey(
        ShiftCalendar,
        on_delete=models.CASCADE,
        related_name="layers",
    )
    position = models.PositiveSmallIntegerField()
    name = models.CharField("Название", max_length=40)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(
                fields=["calendar", "position"],
                name="unique_calendar_shift_layer_position",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.position})"


class ShiftKind(models.Model):
    """Тип смены: имя, цвет, часы и ставка задаёт пользователь."""

    layer = models.ForeignKey(
        ShiftLayer,
        on_delete=models.CASCADE,
        related_name="kinds",
    )
    name = models.CharField("Название", max_length=80)
    color = models.CharField("Цвет", max_length=7)
    duration_hours = models.DecimalField(
        "Продолжительность, ч",
        max_digits=4,
        decimal_places=2,
        default=Decimal("8.00"),
        validators=[
            MinValueValidator(Decimal("0.25")),
            MaxValueValidator(Decimal("24")),
        ],
    )
    break_minutes = models.PositiveSmallIntegerField(
        "Перерыв, мин",
        default=0,
        validators=[MaxValueValidator(480)],
    )
    hourly_rate = models.DecimalField(
        "Оплата, ₽/ч",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["layer", "name"],
                name="unique_layer_shift_kind_name",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.color})"


class ShiftPattern(models.Model):
    """Один активный цикл смен на слой."""

    layer = models.OneToOneField(
        ShiftLayer,
        on_delete=models.CASCADE,
        related_name="pattern",
    )
    start_date = models.DateField("Начало цикла")
    end_date = models.DateField("Конец цикла", null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"pattern {self.layer_id} from {self.start_date}"


class ShiftPatternSlot(models.Model):
    """Слот цикла. kind=NULL — выходной / пустой день в шаблоне."""

    pattern = models.ForeignKey(
        ShiftPattern,
        on_delete=models.CASCADE,
        related_name="slots",
    )
    position = models.PositiveSmallIntegerField()
    kind = models.ForeignKey(
        ShiftKind,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pattern_slots",
    )

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(
                fields=["pattern", "position"],
                name="unique_pattern_slot_position",
            ),
        ]


class ShiftDayOverride(models.Model):
    """Ручная правка дня. kind=NULL — снять смену (в т.ч. поверх шаблона)."""

    layer = models.ForeignKey(
        ShiftLayer,
        on_delete=models.CASCADE,
        related_name="day_overrides",
    )
    date = models.DateField()
    kind = models.ForeignKey(
        ShiftKind,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="day_overrides",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["layer", "date"],
                name="unique_layer_shift_day",
            ),
        ]
        indexes = [
            models.Index(fields=["layer", "date"]),
        ]


class Event(models.Model):
    """Именованный факт во времени. Не задача: без статуса и просрочки."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events",
        verbose_name="Владелец",
        db_index=True,
    )
    title = models.CharField("Название", max_length=255)
    description = models.TextField("Описание", blank=True)
    start_at = models.DateTimeField("Начало", db_index=True)
    end_at = models.DateTimeField("Конец", blank=True, null=True)
    all_day = models.BooleanField("Весь день", default=False)
    recurrence = models.CharField(
        max_length=16,
        choices=Recurrence.choices,
        default=Recurrence.NEVER,
    )
    color = models.CharField("Цвет", max_length=7, default=DEFAULT_EVENT_COLOR)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_at", "id"]
        indexes = [
            models.Index(fields=["user", "start_at"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_at})"


class DayNote(models.Model):
    """Заметка на календарный день."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="day_notes",
    )
    date = models.DateField()
    text = models.TextField("Заметка", max_length=2000)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="unique_user_day_note",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "date"]),
        ]

    def __str__(self):
        return f"note {self.user_id} {self.date}"

