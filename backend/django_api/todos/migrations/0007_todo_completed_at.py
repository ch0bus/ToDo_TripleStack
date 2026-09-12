from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0006_todo_priority_default_low"),
    ]

    operations = [
        migrations.AddField(
            model_name="todo",
            name="completed_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="Дата завершения",
            ),
        ),
    ]
