# Схема БД ToDoApp

Общее логическое представление схемы БД для всех трёх бекэндов (Django, FastAPI, Flask).
Фактическая реализация (типы полей, названия таблиц, миграции) может отличаться, но
структура и семантика данных должны быть одинаковыми.

## 1. Таблица `users`

Минимальный набор полей:

- `id` — первичный ключ (integer, auto-increment).
- `username` — строка, 3..150 символов, **уникальная**, NOT NULL.
- `password_hash` — строка с хэшом пароля (NOT NULL).
- `created_at` — datetime (UTC), NOT NULL.
- `updated_at` — datetime (UTC), NOT NULL.

Рекомендации по хэшированию паролей:

- использовать современные алгоритмы: Argon2, PBKDF2, BCrypt (в зависимости от фреймворка); 
- пароль никогда не хранится в открытом виде и не возвращается в ответах API.

### Реализация по фреймворкам

#### Django

Варианты:

1. Использовать встроенную модель `User` (`django.contrib.auth.models.User`).
2. Либо завести кастомную модель пользователя (рекомендуется для реальных проектов).

Для учебного проекта можно использовать встроенный `User` и маппить:

- `username` → поле `username` Django User.
- `id` → первичный ключ Django User.
- `password_hash` → стандартное поле `password` (Django сам хранит хэш).

#### FastAPI (SQLAlchemy)

Пример модели (логически):

```python
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    todos = relationship("Todo", back_populates="user")
```

#### Flask (SQLAlchemy)

Модель будет почти идентична FastAPI‑варианту, отличие — только в стиле объявления
(через `db.Model` или чистый SQLAlchemy Base, в зависимости от стека).

## 2. Таблица `todos`

Поля:

- `id` — первичный ключ (integer, auto-increment).
- `user_id` — внешний ключ на `users.id` (владелец задачи), NOT NULL.
- `title` — строка, 1..255 символов, NOT NULL.
- `description` — текст, NULLable.
- `completed` — boolean, NOT NULL, по умолчанию `false`.
- `created_at` — datetime (UTC), NOT NULL.
- `updated_at` — datetime (UTC), NOT NULL.

### Ограничения и индексы

- Внешний ключ `user_id` → `users.id`.
- Индекс по `user_id` (для выборки задач пользователя).
- Опционально индексы по `completed` и/или `title` (для фильтрации и поиска).

### Реализация по фреймворкам

#### Django (пример логической модели)

```python
from django.conf import settings
from django.db import models


class Todo(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="todos",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} (completed={self.completed})"
```

#### FastAPI / Flask (SQLAlchemy, логика одинаковая)

```python
class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="todos")
```

## 3. Связи между сущностями

- Один `User` может иметь много `Todo` (связь `One-to-Many`).
- Каждая задача (`Todo`) принадлежит ровно одному пользователю (`user_id`).

В ORM это представлено как:

- у `User` — коллекция `todos`;
- у `Todo` — ссылка `user`.

## 4. Связь схемы БД с API

См. `docs/API_SPEC.md`.

Ключевые моменты:

- API никогда не отдаёт и не принимает пароль в чистом виде, только `username` и `password`
  в запросе при регистрации/логине.
- В ответах API сущность пользователя представлена как:

  ```json
  {
    "id": 1,
    "username": "user1"
  }
  ```

- Поле `user_id` в модели `Todo`:
  - **read-only** в API (возвращается клиенту);
  - никогда не задаётся напрямую клиентом (сервер берёт его из текущего пользователя).
- Все операции с задачами (`/api/todos/...`) должны фильтроваться по `user_id` равному ID
  аутентифицированного пользователя.

## 5. Минимальный набор таблиц

Для реализации текущей спецификации достаточно двух таблиц:

- `users`
- `todos`

Дополнительно в реальном проекте могут появиться:

- таблицы для refresh‑токенов;
- таблицы аудита/логов;
- таблица ролей/прав доступа и т.п.

Но для учебного проекта достаточно базовой схемы из этого документа.
