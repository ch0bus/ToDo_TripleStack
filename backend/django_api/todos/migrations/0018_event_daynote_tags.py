from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0017_event_attendance"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="tags",
            field=models.ManyToManyField(
                blank=True,
                related_name="events",
                to="todos.tag",
                verbose_name="Теги",
            ),
        ),
        migrations.AddField(
            model_name="daynote",
            name="tags",
            field=models.ManyToManyField(
                blank=True,
                related_name="day_notes",
                to="todos.tag",
                verbose_name="Теги",
            ),
        ),
    ]
