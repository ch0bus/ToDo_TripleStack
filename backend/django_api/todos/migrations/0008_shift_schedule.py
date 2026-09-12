import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("todos", "0007_todo_completed_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="ShiftKind",
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
                ("name", models.CharField(max_length=80, verbose_name="Название")),
                ("color", models.CharField(max_length=7, verbose_name="Цвет")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shift_kinds",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="ShiftPattern",
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
                ("start_date", models.DateField(verbose_name="Начало цикла")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shift_pattern",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ShiftPatternSlot",
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
                ("position", models.PositiveSmallIntegerField()),
                (
                    "kind",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pattern_slots",
                        to="todos.shiftkind",
                    ),
                ),
                (
                    "pattern",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="slots",
                        to="todos.shiftpattern",
                    ),
                ),
            ],
            options={
                "ordering": ["position"],
            },
        ),
        migrations.CreateModel(
            name="ShiftDayOverride",
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
                (
                    "kind",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="day_overrides",
                        to="todos.shiftkind",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shift_day_overrides",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="shiftkind",
            constraint=models.UniqueConstraint(
                fields=("user", "name"),
                name="unique_user_shift_kind_name",
            ),
        ),
        migrations.AddConstraint(
            model_name="shiftpatternslot",
            constraint=models.UniqueConstraint(
                fields=("pattern", "position"),
                name="unique_pattern_slot_position",
            ),
        ),
        migrations.AddConstraint(
            model_name="shiftdayoverride",
            constraint=models.UniqueConstraint(
                fields=("user", "date"),
                name="unique_user_shift_day",
            ),
        ),
        migrations.AddIndex(
            model_name="shiftdayoverride",
            index=models.Index(
                fields=["user", "date"],
                name="todos_shift_user_id_date_idx",
            ),
        ),
    ]
