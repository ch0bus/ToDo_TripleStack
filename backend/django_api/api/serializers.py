from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from todos.models import Todo


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Простой сериализатор для отображения информации о пользователе:

    Поля: только id и username
    read_only_fields: id не может быть изменён через API (это предотвращает попытки изменения ID)

    """
    class Meta:
        model = User
        fields = ("id", "username")
        read_only_fields = ("id",)
        extra_kwargs = {
            'id': {'help_text': 'Уникальный идентификатор пользователя'},
            'username': {'help_text': 'Имя пользователя'},
        }



class RegisterSerializer(serializers.ModelSerializer):
    """
    Используется для регистрации новых пользователей:
    """
    password = serializers.CharField(
        write_only=True, # write_only=True — пароль принимается при запросе, но не возвращается в ответе
        min_length=8,
        help_text='Пароль должен быть минимум 8 символов',) 

    class Meta:
        model = User
        fields = ("id", "username", "password", "email")
        read_only_fields = ("id",)
        extra_kwargs = {
            'id': {'read_only': True, 'help_text': 'Уникальный ID (генерируется автоматически)'},
            'username': {'help_text': 'Уникальное имя пользователя'},
            'email': {'help_text': 'Email адрес пользователя'},
        }


    def validate_password(self, value):
        """
        дополнительная валидация пароля с использованием встроенных правил Django (сложность, схожесть с username и т.д.)
        """
        validate_password(value)
        return value

    def create(self, validated_data):
        """
        Метод create() — переопределяет создание:

        - Извлекает пароль из данных
        - Создаёт пользователя, но не сохраняет сразу
        - Хеширует пароль методом set_password() (безопасный способ)
        - Сохраняет в базу данных

        Почему это важно? Если просто сохранить пароль как строку, он будет храниться в открытом виде — это критическая уязвимость!
        """
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class TodoSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = Todo
        fields = (
            "id",
            "user_id",
            "title",
            "description",
            "completed",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user_id", "created_at", "updated_at")
        extra_kwargs = {
            'id': {'help_text': 'Уникальный ID задачи'},
            'user_id': {'help_text': 'ID пользователя, которому принадлежит задача'},
            'title': {'help_text': 'Название задачи', 'max_length': 255},
            'description': {'help_text': 'Подробное описание задачи'},
            'completed': {'help_text': 'Статус выполнения (true/false)'},
            'created_at': {'help_text': 'Дата и время создания'},
            'updated_at': {'help_text': 'Дата и время последнего обновления'},
        }

    def create(self, validated_data):
        """
         автоматически присваивает текущего пользователя при создании задачи
        """
        request = self.context["request"]
        validated_data["user"] = request.user # Это гарантирует, что задача всегда принадлежит авторизованному пользователю, даже если он попытается указать другого пользователя.
        return super().create(validated_data)