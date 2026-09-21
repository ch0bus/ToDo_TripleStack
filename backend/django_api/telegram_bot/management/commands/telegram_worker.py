import time

from django.core.management.base import BaseCommand
from django.db.utils import OperationalError

from telegram_bot.models import TelegramBot
from telegram_bot.services import run_tick, run_worker_cycle


class Command(BaseCommand):
    help = "Опрос ботов пользователей (getUpdates) и напоминания."

    def add_arguments(self, parser):
        parser.add_argument(
            "--loop",
            action="store_true",
            help="Работать постоянно (контейнер telegram).",
        )
        parser.add_argument(
            "--sleep",
            type=int,
            default=3,
            help="Пауза между циклами, секунды.",
        )

    def handle(self, *args, **options):
        looping = options["loop"]
        pause = max(1, options["sleep"])
        while True:
            try:
                if TelegramBot.objects.exists():
                    run_worker_cycle(timeout=0)
                else:
                    run_tick()
            except OperationalError:
                self.stdout.write("База ещё не готова, ждём.")
                time.sleep(3)
                continue
            if not looping:
                return
            time.sleep(pause)
