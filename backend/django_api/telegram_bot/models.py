from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from .constants import ALLOWED_TIMEZONES


class TelegramBot(models.Model):
    """Свой бот пользователя: токен, параметры и привязанный личный чат."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="telegram_bot",
    )
    token = models.CharField(max_length=128)
    token_hash = models.CharField(max_length=64, unique=True)
    bot_id = models.BigIntegerField(default=0)
    bot_username = models.CharField(max_length=64)
    timezone = models.CharField(max_length=64, default="Europe/Moscow")
    digest_hour = models.PositiveSmallIntegerField(
        default=8,
        validators=[MinValueValidator(0), MaxValueValidator(23)],
    )
    remind_minutes = models.PositiveSmallIntegerField(
        default=30,
        validators=[MinValueValidator(5), MaxValueValidator(24 * 60)],
    )
    chat_id = models.BigIntegerField(null=True, blank=True, unique=True)
    telegram_user_id = models.BigIntegerField(null=True, blank=True)
    telegram_username = models.CharField(max_length=64, blank=True)
    linked_at = models.DateTimeField(null=True, blank=True)
    update_offset = models.BigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"@{self.bot_username} → user {self.user_id}"

    @property
    def connected(self) -> bool:
        return self.chat_id is not None

    def clean(self):
        if self.timezone not in ALLOWED_TIMEZONES:
            self.timezone = "Europe/Moscow"


class TelegramDelivery(models.Model):
    """Чтобы дайджест и напоминание не уходили дважды."""

    KIND_DIGEST = "digest"
    KIND_DUE = "due"
    KIND_EVENT = "event"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="telegram_deliveries",
    )
    kind = models.CharField(max_length=16)
    object_id = models.PositiveIntegerField(default=0)
    period_key = models.CharField(max_length=32)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "kind", "object_id", "period_key"],
                name="unique_telegram_delivery",
            ),
        ]
