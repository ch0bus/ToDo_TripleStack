from decimal import Decimal

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0020_shift_day_bonus_layer"),
    ]

    operations = [
        migrations.AddField(
            model_name="shiftdayoverride",
            name="duration_hours",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=4,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.25")),
                    django.core.validators.MaxValueValidator(Decimal("24")),
                ],
                verbose_name="Часы в этот день",
            ),
        ),
    ]
