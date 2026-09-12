import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("todos", "0009_todo_event_date"),
    ]

    operations = [
        migrations.CreateModel(
            name="DayNote",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("date", models.DateField()),
                ("text", models.TextField(max_length=2000, verbose_name="Заметка")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="day_notes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="daynote",
            constraint=models.UniqueConstraint(
                fields=("user", "date"),
                name="unique_user_day_note",
            ),
        ),
        migrations.AddIndex(
            model_name="daynote",
            index=models.Index(fields=["user", "date"], name="todos_dayno_user_id_date_idx"),
        ),
    ]
