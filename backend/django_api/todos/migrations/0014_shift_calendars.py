import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def attach_layers_to_default_calendar(apps, schema_editor):
    ShiftCalendar = apps.get_model("todos", "ShiftCalendar")
    ShiftLayer = apps.get_model("todos", "ShiftLayer")
    user_ids = set(ShiftLayer.objects.values_list("user_id", flat=True))
    for user_id in user_ids:
        calendar = ShiftCalendar.objects.create(
            user_id=user_id,
            name="Основной",
        )
        ShiftLayer.objects.filter(user_id=user_id, calendar_id__isnull=True).update(
            calendar_id=calendar.id
        )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("todos", "0013_shift_layers"),
    ]

    operations = [
        migrations.CreateModel(
            name="ShiftCalendar",
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
                ("name", models.CharField(max_length=40, verbose_name="Название")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shift_calendars",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["created_at", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="shiftcalendar",
            constraint=models.UniqueConstraint(
                fields=("user", "name"),
                name="unique_user_shift_calendar_name",
            ),
        ),
        migrations.AddField(
            model_name="shiftlayer",
            name="calendar",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="layers",
                to="todos.shiftcalendar",
            ),
        ),
        migrations.RunPython(
            attach_layers_to_default_calendar,
            migrations.RunPython.noop,
        ),
        migrations.RemoveConstraint(
            model_name="shiftlayer",
            name="unique_user_shift_layer_position",
        ),
        migrations.RemoveField(
            model_name="shiftlayer",
            name="user",
        ),
        migrations.AlterField(
            model_name="shiftlayer",
            name="calendar",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="layers",
                to="todos.shiftcalendar",
            ),
        ),
        migrations.AddConstraint(
            model_name="shiftlayer",
            constraint=models.UniqueConstraint(
                fields=("calendar", "position"),
                name="unique_calendar_shift_layer_position",
            ),
        ),
    ]
