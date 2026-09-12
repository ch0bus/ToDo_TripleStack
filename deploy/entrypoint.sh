#!/bin/sh
set -eu

mkdir -p "$(dirname "${DJANGO_DB_PATH:-/app/data/db.sqlite3}")"
python manage.py migrate --noinput
python manage.py collectstatic --noinput
exec gunicorn todotriplestack.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-2}" \
    --timeout 60
