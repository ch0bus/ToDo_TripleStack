from django.core.management.base import BaseCommand

from telegram_bot.services import run_tick


class Command(BaseCommand):
    help = "Разово отправить дайджест и напоминания в Telegram."

    def handle(self, *args, **options):
        result = run_tick()
        self.stdout.write(
            f"due={result['due']} events={result['events']} digest={result['digest']}"
        )
