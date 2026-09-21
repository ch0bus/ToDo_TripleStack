import json
import logging
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

API_ROOT = "https://api.telegram.org"


class TelegramAPIError(Exception):
    pass


def call_telegram(
    token: str,
    method: str,
    payload: dict | None = None,
    timeout: int = 30,
) -> dict:
    if not token:
        raise TelegramAPIError("Токен бота пуст")
    url = f"{API_ROOT}/bot{token}/{method}"
    body = json.dumps(payload or {}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        logger.warning("Telegram %s HTTP %s: %s", method, exc.code, detail[:300])
        raise TelegramAPIError(detail) from exc
    except urllib.error.URLError as exc:
        logger.warning("Telegram %s network: %s", method, exc)
        raise TelegramAPIError(str(exc)) from exc
    if not data.get("ok"):
        raise TelegramAPIError(str(data.get("description") or data))
    return data


def fetch_bot_identity(token: str) -> tuple[int, str]:
    data = call_telegram(token, "getMe", {})
    result = data.get("result") or {}
    bot_id = int(result.get("id") or 0)
    username = str(result.get("username") or "").lstrip("@")
    if not bot_id or not username:
        raise TelegramAPIError("Telegram не вернул имя бота")
    return bot_id, username


def send_message(
    token: str,
    chat_id: int | None,
    text: str,
    reply_markup: dict | None = None,
) -> dict | None:
    if not token or chat_id is None:
        return None
    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        return call_telegram(token, "sendMessage", payload)
    except TelegramAPIError:
        return None


def edit_message(
    token: str,
    chat_id: int | None,
    message_id: int | None,
    text: str,
    reply_markup: dict | None = None,
) -> dict | None:
    if not token or chat_id is None or not message_id:
        return None
    payload: dict = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "disable_web_page_preview": True,
    }
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    try:
        return call_telegram(token, "editMessageText", payload)
    except TelegramAPIError:
        return None


def answer_callback(token: str, callback_id: str, text: str = "") -> None:
    if not token or not callback_id:
        return
    try:
        call_telegram(
            token,
            "answerCallbackQuery",
            {"callback_query_id": callback_id, "text": text},
        )
    except TelegramAPIError:
        return
