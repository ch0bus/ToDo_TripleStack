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


class Project(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
        verbose_name="Создатель",
        db_index=True,  # Индекс для быстрого поиска по пользователю
    )
    project_name = models.CharField(max_length=255, db_index=True)
    color = models.CharField(max_length=255, db_index=True)  # для визуализации (#FF5733)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "project_name"],
                name="unique_user_project_name",
            ),
        ]

    def __str__(self):
        return f"{self.project_name}"


class Todo(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="todos",
        verbose_name="Автор",
        db_index=True,  # Индекс для быстрого поиска по пользователю
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="todos",
        null=True,
        blank=True,
        db_index=True,
    )  # Индекс для быстрого поиска по пользователю
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name="todos",
        verbose_name="Теги",
    )
    priority = models.CharField(
        max_length=16,
        choices=Priority.choices,
        default=Priority.MEDIUM,
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
    )  # срок выполнения задачи
    recurrence = models.CharField(
        max_length=16,
        choices=Recurrence.choices,
        default=Recurrence.NEVER,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

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

