from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("telegram_bot", "0002_user_bot"),
    ]

    operations = [
        migrations.AddField(
            model_name="telegrambot",
            name="pending_body",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="telegrambot",
            name="pending_month",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="telegrambot",
            name="pending_step",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="telegrambot",
            name="pending_title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
