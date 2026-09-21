from django.contrib import admin

from .models import TelegramBot


@admin.register(TelegramBot)
class TelegramBotAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "bot_username",
        "timezone",
        "digest_hour",
        "chat_id",
        "updated_at",
    )
    search_fields = ("bot_username", "user__username", "user__email")
    readonly_fields = (
        "token_hash",
        "bot_id",
        "update_offset",
        "linked_at",
        "updated_at",
    )
    exclude = ("token",)
