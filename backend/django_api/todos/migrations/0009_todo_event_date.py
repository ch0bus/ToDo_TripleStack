from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0008_shift_schedule"),
    ]

    operations = [
        migrations.AddField(
            model_name="todo",
            name="event_date",
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                null=True,
                verbose_name="Дата события",
            ),
        ),
    ]
