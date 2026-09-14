import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def attach_existing_shifts_to_layers(apps, schema_editor):
    ShiftLayer = apps.get_model("todos", "ShiftLayer")
    ShiftKind = apps.get_model("todos", "ShiftKind")
    ShiftPattern = apps.get_model("todos", "ShiftPattern")
    ShiftDayOverride = apps.get_model("todos", "ShiftDayOverride")

    user_ids = set()
    user_ids.update(ShiftKind.objects.values_list("user_id", flat=True))
    user_ids.update(ShiftPattern.objects.values_list("user_id", flat=True))
    user_ids.update(ShiftDayOverride.objects.values_list("user_id", flat=True))

    for user_id in user_ids:
        layer0, _ = ShiftLayer.objects.get_or_create(
            user_id=user_id,
            position=0,
            defaults={"name": "Я"},
        )
        ShiftLayer.objects.get_or_create(
            user_id=user_id,
            position=1,
            defaults={"name": "Супруга"},
        )
        ShiftKind.objects.filter(user_id=user_id, layer_id__isnull=True).update(
            layer_id=layer0.id
        )
        ShiftPattern.objects.filter(user_id=user_id, layer_id__isnull=True).update(
            layer_id=layer0.id
        )
        ShiftDayOverride.objects.filter(user_id=user_id, layer_id__isnull=True).update(
            layer_id=layer0.id
        )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("todos", "0012_shift_kind_hours_pattern_end"),
    ]

    operations = [
        migrations.CreateModel(
            name="ShiftLayer",
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
                ("name", models.CharField(max_length=40, verbose_name="Название")),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shift_layers",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["position"],
            },
        ),
        migrations.AddConstraint(
            model_name="shiftlayer",
            constraint=models.UniqueConstraint(
                fields=("user", "position"),
                name="unique_user_shift_layer_position",
            ),
        ),
        migrations.AddField(
            model_name="shiftkind",
            name="layer",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="kinds",
                to="todos.shiftlayer",
            ),
        ),
        migrations.AddField(
            model_name="shiftpattern",
            name="layer",
            field=models.OneToOneField(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="pattern",
                to="todos.shiftlayer",
            ),
        ),
        migrations.AddField(
            model_name="shiftdayoverride",
            name="layer",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="day_overrides",
                to="todos.shiftlayer",
            ),
        ),
        migrations.RunPython(attach_existing_shifts_to_layers, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="shiftkind",
            name="unique_user_shift_kind_name",
        ),
        migrations.RemoveField(
            model_name="shiftkind",
            name="user",
        ),
        migrations.AlterField(
            model_name="shiftkind",
            name="layer",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="kinds",
                to="todos.shiftlayer",
            ),
        ),
        migrations.AddConstraint(
            model_name="shiftkind",
            constraint=models.UniqueConstraint(
                fields=("layer", "name"),
                name="unique_layer_shift_kind_name",
            ),
        ),
        migrations.RemoveField(
            model_name="shiftpattern",
            name="user",
        ),
        migrations.AlterField(
            model_name="shiftpattern",
            name="layer",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="pattern",
                to="todos.shiftlayer",
            ),
        ),
        migrations.RemoveConstraint(
            model_name="shiftdayoverride",
            name="unique_user_shift_day",
        ),
        migrations.RemoveIndex(
            model_name="shiftdayoverride",
            name="todos_shift_user_id_90bed8_idx",
        ),
        migrations.RemoveField(
            model_name="shiftdayoverride",
            name="user",
        ),
        migrations.AlterField(
            model_name="shiftdayoverride",
            name="layer",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="day_overrides",
                to="todos.shiftlayer",
            ),
        ),
        migrations.AddConstraint(
            model_name="shiftdayoverride",
            constraint=models.UniqueConstraint(
                fields=("layer", "date"),
                name="unique_layer_shift_day",
            ),
        ),
        migrations.AddIndex(
            model_name="shiftdayoverride",
            index=models.Index(
                fields=["layer", "date"],
                name="todos_shift_layer_i_date_idx",
            ),
        ),
    ]
