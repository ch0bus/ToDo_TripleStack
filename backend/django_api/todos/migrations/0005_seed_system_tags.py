from django.db import migrations


SYSTEM_TAGS = [
    ("работа", "work"),
    ("личное", "personal"),
    ("здоровье", "health"),
    ("финансы", "finance"),
    ("покупки", "shopping"),
    ("дом", "home"),
    ("хобби", "hobby"),
]


def seed_system_tags(apps, schema_editor):
    Tag = apps.get_model("todos", "Tag")
    for tag_name, kind in SYSTEM_TAGS:
        Tag.objects.get_or_create(
            user=None,
            tag_name=tag_name,
            defaults={"kind": kind},
        )


def unseed_system_tags(apps, schema_editor):
    Tag = apps.get_model("todos", "Tag")
    names = [name for name, _ in SYSTEM_TAGS]
    Tag.objects.filter(user__isnull=True, tag_name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0004_remove_project"),
    ]

    operations = [
        migrations.RunPython(seed_system_tags, unseed_system_tags),
    ]
