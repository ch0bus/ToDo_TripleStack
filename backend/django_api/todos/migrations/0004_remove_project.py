from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("todos", "0003_project_subtask_tag_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="todo",
            name="project",
        ),
        migrations.RemoveConstraint(
            model_name="project",
            name="unique_user_project_name",
        ),
        migrations.DeleteModel(
            name="Project",
        ),
    ]
