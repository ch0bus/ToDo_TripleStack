from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0011_rename_todos_dayno_user_id_date_idx_todos_dayno_user_id_f85e9b_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="shiftkind",
            name="duration_hours",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("8.00"),
                max_digits=4,
                verbose_name="Продолжительность, ч",
            ),
        ),
        migrations.AddField(
            model_name="shiftkind",
            name="break_minutes",
            field=models.PositiveSmallIntegerField(
                default=0,
                verbose_name="Перерыв, мин",
            ),
        ),
        migrations.AddField(
            model_name="shiftkind",
            name="hourly_rate",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                max_digits=8,
                verbose_name="Оплата, ₽/ч",
            ),
        ),
        migrations.AddField(
            model_name="shiftpattern",
            name="end_date",
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name="Конец цикла",
            ),
        ),
    ]
