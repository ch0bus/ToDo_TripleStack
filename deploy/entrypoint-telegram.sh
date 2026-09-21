#!/bin/sh
set -eu

echo "Воркер Telegram: опрос ботов из настроек пользователей."
exec python manage.py telegram_worker --loop
