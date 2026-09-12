from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0005_seed_system_tags"),
    ]

    operations = [
        migrations.AlterField(
            model_name="todo",
            name="priority",
            field=models.CharField(
                choices=[
                    ("critical", "Критический"),
                    ("high", "Высокий"),
                    ("medium", "Средний"),
                    ("low", "Низкий"),
                ],
                default="low",
                max_length=16,
            ),
        ),
    ]
