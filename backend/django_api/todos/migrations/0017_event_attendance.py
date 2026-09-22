from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0016_event"),
    ]

    operations = [
        migrations.CreateModel(
            name="EventAttendance",
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
                (
                    "occurrence_date",
                    models.DateField(verbose_name="Дата вхождения"),
                ),
                ("attended_at", models.DateTimeField(auto_now_add=True)),
                (
                    "event",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attendances",
                        to="todos.event",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="eventattendance",
            constraint=models.UniqueConstraint(
                fields=("event", "occurrence_date"),
                name="unique_event_occurrence_attendance",
            ),
        ),
    ]
