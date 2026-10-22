from decimal import Decimal

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0018_event_daynote_tags"),
    ]

    operations = [
        migrations.CreateModel(
            name="ShiftDayBonus",
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
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0.01"))
                        ],
                        verbose_name="Сумма, ₽",
                    ),
                ),
                (
                    "comment",
                    models.CharField(
                        blank=True, max_length=200, verbose_name="Комментарий"
                    ),
                ),
                (
                    "calendar",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="bonuses",
                        to="todos.shiftcalendar",
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="shiftdaybonus",
            index=models.Index(
                fields=["calendar", "date"],
                name="todos_shift_calenda_bonus_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="shiftdaybonus",
            constraint=models.UniqueConstraint(
                fields=("calendar", "date"),
                name="unique_calendar_shift_bonus_date",
            ),
        ),
    ]
