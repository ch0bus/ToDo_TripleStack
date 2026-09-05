from django.conf import settings
from django.db import models


class Todo(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="todos",
        db_index=True  # Индекс для быстрого поиска по пользователю
    )
    title = models.CharField(max_length=255, db_index=True) # Индекс для поиска
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False, db_index=True) # Индекс для фильтрации
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'completed']),  # Комбинированный индекс
            models.Index(fields=['user', '-created_at']),  # Для сортировки
        ]

    def __str__(self):
        return f"{self.title} (completed={self.completed})"