from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema, inline_serializer

from .client import send_message
from .keyboards import remove_keyboard
from .models import TelegramBot
from .services import (
    delete_user_bot,
    save_user_bot,
    status_payload,
    unlink_user_chat,
)


def _status_serializer():
    return inline_serializer(
        name="TelegramStatus",
        fields={
            "configured": serializers.BooleanField(),
            "connected": serializers.BooleanField(),
            "bot_username": serializers.CharField(),
            "token_hint": serializers.CharField(),
            "chat_username": serializers.CharField(allow_null=True),
            "timezone": serializers.CharField(),
            "digest_hour": serializers.IntegerField(),
            "remind_minutes": serializers.IntegerField(),
            "deep_link": serializers.CharField(),
            "timezones": serializers.ListField(child=serializers.CharField()),
        },
    )


class TelegramWriteSerializer(serializers.Serializer):
    token = serializers.CharField(required=False, allow_blank=True, write_only=True)
    timezone = serializers.CharField(required=False)
    digest_hour = serializers.IntegerField(required=False, min_value=0, max_value=23)
    remind_minutes = serializers.IntegerField(
        required=False, min_value=5, max_value=1440
    )


class TelegramBotView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(summary="Настройки своего Telegram-бота", responses={200: _status_serializer()})
    def get(self, request):
        bot = TelegramBot.objects.filter(user=request.user).first()
        return Response(status_payload(bot))

    @extend_schema(
        summary="Сохранить токен и параметры бота",
        request=TelegramWriteSerializer,
        responses={200: _status_serializer()},
    )
    def put(self, request):
        serializer = TelegramWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        bot = save_user_bot(
            request.user,
            token=data.get("token") or "",
            tz_name=data.get("timezone"),
            digest_hour=data.get("digest_hour"),
            remind_minutes=data.get("remind_minutes"),
        )
        return Response(status_payload(bot))

    @extend_schema(summary="Удалить своего бота", responses={204: None})
    def delete(self, request):
        bot = TelegramBot.objects.filter(user=request.user).first()
        if bot:
            token, chat_id = bot.token, bot.chat_id
            delete_user_bot(request.user)
            send_message(
                token,
                chat_id,
                "Бот отключён в настройках Haloday.",
                reply_markup=remove_keyboard(),
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class TelegramUnlinkView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(summary="Отвязать чат, оставить бота", responses={200: _status_serializer()})
    def post(self, request):
        bot, chat_id = unlink_user_chat(request.user)
        if bot and chat_id is not None:
            send_message(
                bot.token,
                chat_id,
                "Чат отвязан в настройках Haloday.",
                reply_markup=remove_keyboard(),
            )
        bot = TelegramBot.objects.filter(user=request.user).first()
        return Response(status_payload(bot))
