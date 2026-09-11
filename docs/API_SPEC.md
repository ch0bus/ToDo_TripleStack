# ToDo API Specification

REST API для задач с JWT-аутентификацией. Контракт общий для Django, FastAPI и Flask;
текущая эталонная реализация — **Django** (`backend/django_api`).

Базовый URL: `/api`. Интерактивная документация Django: `/api/docs/`.

## Принципы

- Ответы в JSON, даты в ISO 8601 UTC (`2026-09-04T12:00:00Z`).
- Задачи, теги и подзадачи доступны **только владельцу** (по JWT).
- Чужие ресурсы → `404 Not Found` (не `403`), где применимо.
- Заголовок: `Authorization: Bearer <access_token>`.

## Ошибки

```json
{
  "detail": "Сообщение об ошибке",
  "field_name": ["Ошибка поля"]
}
```

Формат может отличаться (`errors` vs плоские поля); клиент должен показывать `detail` или первое поле.

---

## Auth

### POST `/api/auth/register/`

Тело: `{ "username", "email", "password" }` (пароль ≥ 8 символов).

- `201` — `{ "id", "username", "email" }`
- `400` — валидация

### POST `/api/auth/login/`

Тело: `{ "username", "password" }`.

- `200` — `{ "access", "refresh" }` (JWT SimpleJWT)
- `401` — неверные учётные данные

### GET `/api/auth/me/`

- `200` — `{ "id", "username" }`
- `401`

---

## Todo

### Модель (ответ)

```json
{
  "id": 1,
  "user_id": 1,
  "title": "Купить молоко",
  "description": "2 литра",
  "status": "todo",
  "priority": "medium",
  "due_date": "2026-09-04T18:00:00Z",
  "recurrence": "never",
  "tags": [
    { "id": 1, "tag_name": "покупки", "kind": "shopping" }
  ],
  "created_at": "2026-09-04T12:00:00Z",
  "updated_at": "2026-09-04T12:30:00Z"
}
```

**status:** `todo` | `in_progress` | `done`  
**priority:** `critical` | `high` | `medium` | `low`  
**recurrence:** `daily` | `weekly` | `monthly` | `never`

При **создании/обновлении** теги передаются полем **`tag_ids`**: `[1, 2]` (write-only).

### GET `/api/todos/`

Query (все опционально):

| Параметр   | Описание                          |
|-----------|-----------------------------------|
| `status`  | Фильтр по статусу                 |
| `priority`| Фильтр по приоритету              |
| `tag`     | ID тега                           |
| `due_from`| Срок ≥ (ISO datetime)             |
| `due_to`  | Срок ≤ (ISO datetime)             |
| `search`  | Поиск в title/description         |
| `overdue` | `true` — просроченные (не `done`) |
| `due_today` | `true` — срок сегодня (TZ сервера) |

- `200` — массив Todo

Каждый элемент может содержать **`subtasks_summary`**: `{ "done": 2, "total": 3 }`.

### GET `/api/todos/stats/`

- `200`:

```json
{
  "total": 12,
  "done": 5,
  "in_progress": 4,
  "overdue": 2
}
```

### POST `/api/todos/`

Тело (минимум `title`):

```json
{
  "title": "Задача",
  "description": "",
  "status": "todo",
  "priority": "medium",
  "due_date": null,
  "recurrence": "never",
  "tag_ids": [1]
}
```

- `201` — созданный Todo (с вложенными `tags`)

### GET / PUT / PATCH / DELETE `/api/todos/{id}/`

Стандартный CRUD; `user_id` только read-only.

---

## Tags

### GET `/api/tags/`

Системные теги (`user=null`) + теги текущего пользователя.

### POST `/api/tags/`

Тело: `{ "tag_name", "kind" }` — создаёт **личный** тег.

### DELETE `/api/tags/{id}/`

Удаление личного тега (реализация может ограничивать системные).

---

## Subtasks

Вложены в задачу пользователя.

### Модель

```json
{
  "id": 1,
  "title": "Шаг 1",
  "completed": false,
  "due_date": null,
  "created_at": "...",
  "updated_at": "..."
}
```

### GET / POST `/api/todos/{todo_id}/subtasks/`

- `GET` — список подзадач
- `POST` — `{ "title", "completed"?, "due_date"? }`

Если `todo_id` не принадлежит пользователю → `404`.

### GET / PUT / PATCH / DELETE `/api/todos/{todo_id}/subtasks/{id}/`

CRUD подзадачи в рамках родительской задачи.

---

## Статусы HTTP (сводка)

| Код | Когда |
|-----|--------|
| 200 | Успех (GET, PATCH, login, me) |
| 201 | Создание |
| 204 | DELETE без тела |
| 400 | Валидация |
| 401 | Нет/неверный JWT |
| 404 | Ресурс не найден у пользователя |

---

## Frontend (Vite)

- Dev: `http://localhost:5173`, proxy `/api` → Django `:8000`.
- Переменная: `VITE_API_URL` (пусто = `/api` через proxy).

Маршруты UI: `/`, `/todos/:id`, `/login`, `/register`.
