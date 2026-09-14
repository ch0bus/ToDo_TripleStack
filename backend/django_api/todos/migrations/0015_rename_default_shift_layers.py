from django.db import migrations


def rename_default_layers(apps, schema_editor):
    ShiftLayer = apps.get_model("todos", "ShiftLayer")
    ShiftLayer.objects.filter(position=0, name="Я").update(name="Слой 1")
    ShiftLayer.objects.filter(position=1, name="Супруга").update(name="Слой 2")


def revert_default_layers(apps, schema_editor):
    ShiftLayer = apps.get_model("todos", "ShiftLayer")
    ShiftLayer.objects.filter(position=0, name="Слой 1").update(name="Я")
    ShiftLayer.objects.filter(position=1, name="Слой 2").update(name="Супруга")


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0014_shift_calendars"),
    ]

    operations = [
        migrations.RunPython(rename_default_layers, revert_default_layers),
    ]
