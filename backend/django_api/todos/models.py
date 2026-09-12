from django.conf import settings
from django.db import models


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


class ShiftKind(models.Model):
    """Тип смены: имя и цвет задаёт пользователь."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shift_kinds",
    )
    name = models.CharField("Название", max_length=80)
    color = models.CharField("Цвет", max_length=7)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name"],
                name="unique_user_shift_kind_name",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.color})"


class ShiftPattern(models.Model):
    """Один активный цикл смен на пользователя."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shift_pattern",
    )
    start_date = models.DateField("Начало цикла")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"pattern {self.user_id} from {self.start_date}"


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

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shift_day_overrides",
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
                fields=["user", "date"],
                name="unique_user_shift_day",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "date"]),
        ]


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

