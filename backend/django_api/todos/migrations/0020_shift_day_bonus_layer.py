from django.db import migrations, models
import django.db.models.deletion


def bonus_to_layer(apps, schema_editor):
    ShiftDayBonus = apps.get_model("todos", "ShiftDayBonus")
    ShiftLayer = apps.get_model("todos", "ShiftLayer")
    for bonus in ShiftDayBonus.objects.all():
        layer = (
            ShiftLayer.objects.filter(calendar_id=bonus.calendar_id)
            .order_by("position", "id")
            .first()
        )
        if not layer:
            bonus.delete()
            continue
        bonus.layer_id = layer.pk
        bonus.save(update_fields=["layer_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0019_shift_day_bonus"),
    ]

    operations = [
        migrations.AddField(
            model_name="shiftdaybonus",
            name="layer",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bonuses",
                to="todos.shiftlayer",
            ),
        ),
        migrations.RunPython(bonus_to_layer, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="shiftdaybonus",
            name="unique_calendar_shift_bonus_date",
        ),
        migrations.RemoveIndex(
            model_name="shiftdaybonus",
            name="todos_shift_calenda_bonus_idx",
        ),
        migrations.RemoveField(
            model_name="shiftdaybonus",
            name="calendar",
        ),
        migrations.AlterField(
            model_name="shiftdaybonus",
            name="layer",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bonuses",
                to="todos.shiftlayer",
            ),
        ),
        migrations.AddIndex(
            model_name="shiftdaybonus",
            index=models.Index(
                fields=["layer", "date"],
                name="todos_shift_layer_date_b_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="shiftdaybonus",
            constraint=models.UniqueConstraint(
                fields=("layer", "date"),
                name="unique_layer_shift_bonus_date",
            ),
        ),
    ]
