# ToDo API Specification

REST API для задач с JWT-аутентификацией. Контракт общий для Django, FastAPI и Flask;
текущая эталонная реализация — **Django** (`backend/django_api`).

Базовый URL: `/api` (у Django пути со слэшем в конце). Интерактивная документация: `/api/docs/`.

## Принципы

- Ответы в JSON, даты в ISO 8601 UTC (`2026-09-04T12:00:00Z`).
- Данные **персональные**: todos, личные теги, подзадачи, смены и заметки дней фильтруются по пользователю из JWT.
- Общего календаря и общих списков нет. Календарь в UI — представление своих задач и своих смен.
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

### POST `/api/auth/token/refresh/`

Тело: `{ "refresh": "<refresh_token>" }`.

- `200` — `{ "access" }` (и опционально новый `refresh`, если включена ротация)
- `401` — refresh недействителен

### GET `/api/auth/me/`

- `200` — `{ "id", "username", "email", "phone_number" }`
- `401`

### PATCH `/api/auth/me/`

Тело (любое подмножество): `{ "email", "phone_number", "password" }` (пароль ≥ 8).

- `200` — обновлённый профиль
- `400` — валидация

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
  "event_date": "2026-09-06T15:00:00Z",
  "due_date": "2026-09-04T18:00:00Z",
  "recurrence": "never",
  "tags": [
    { "id": 1, "tag_name": "покупки", "kind": "shopping" }
  ],
  "created_at": "2026-09-04T12:00:00Z",
  "updated_at": "2026-09-04T12:30:00Z",
  "completed_at": null
}
```

**status:** `todo` | `in_progress` | `done`  
**priority:** `critical` | `high` | `medium` | `low` (по умолчанию `low`)  
**recurrence:** `daily` | `weekly` | `monthly` | `never`  
**event_date:** когда происходит событие (календарь, повтор).  
**due_date:** дедлайн выполнения (просрочка, «Сегодня» по сроку).  
**created_at:** read-only, момент создания карточки.  
**completed_at:** read-only. Ставится при переходе в `done`, сбрасывается при любом другом статусе.

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

- `200` — массив Todo, сортировка `-created_at` (новые сверху)

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
  "priority": "low",
  "event_date": null,
  "due_date": null,
  "recurrence": "never",
  "tag_ids": [1]
}
```

- `201` — созданный Todo (с вложенными `tags`)

### GET / PUT / PATCH / DELETE `/api/todos/{id}/`

Стандартный CRUD; `user_id` только read-only.

**Повторение** — правило на задаче, не отдельные строки в БД:

- окно: от дня `created_at` до дня `event_date`, а если события нет — до `due_date`;
- шаг `daily` / `weekly` / `monthly`;
- на календаре задача стоит в день события (или срока, если события нет);
- без события и без срока повторы не рисуются;
- при переходе в `done` новая копия задачи **не** создаётся.

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

## Смены (календарь)

Типы смен, шаблон и правки дней — **свои у каждого пользователя**.
Два именованных слоя (по умолчанию «Я» и «Супруга»). У каждого слоя свои типы, цикл и ручные дни.
Тип: имя, цвет `#RRGGBB`, продолжительность (часы), перерыв (минуты), ставка ₽/час.
Цикл слоя разворачивается с `start_date` до `end_date` (пусто — без конца).
Ручная метка дня перекрывает шаблон слоя и действует и вне окна цикла.

### GET / PATCH `/api/shift-layers/`

- `GET` — два слоя текущего пользователя (создаются при первом обращении)
- `PATCH /api/shift-layers/{id}/` — `{ "name": "Супруга" }`

### GET / POST `/api/shift-kinds/`

- `GET` — типы смен; `?layer={id}` — только слой
- `POST` — `{ "layer_id": 1, "name": "Ночь", "color": "#7c3aed", "duration_hours": "11.00", "break_minutes": 60, "hourly_rate": "250.00" }`

### PATCH / DELETE `/api/shift-kinds/{id}/`

### GET / PUT `/api/shift-pattern/`

`GET` без `layer` — список шаблонов обоих слоёв. `GET ?layer={id}` — один шаблон.

```json
{
  "layer_id": 1,
  "start_date": "2026-09-01",
  "end_date": "2026-12-31",
  "slots": [
    { "kind_id": 1 },
    { "kind_id": 1 },
    { "kind_id": null },
    { "kind_id": null }
  ]
}
```

`end_date: null` — цикл без конца. `kind_id: null` — выходной в цикле. Пустой `slots` — только ручные метки. Типы в слотах должны принадлежать этому слою.

### GET `/api/shift-days/?from=YYYY-MM-DD&to=YYYY-MM-DD`

Развёрнутые дни обоих слоёв (`pattern` или `override`). Элемент: `{ date, layer_id, kind, source }`. Диапазон не больше 366 дней.

### PUT `/api/shift-days/`

`{ "date": "2026-09-15", "layer_id": 1, "kind_id": 1 }` — ручная метка слоя. `kind_id: null` — выходной.

### DELETE `/api/shift-days/{date}/?layer={id}`

Убрать ручную метку слоя, вернуть день к шаблону этого слоя.

---

## Заметки дня

Одна заметка на календарный день у пользователя. День с заметкой в UI — золотая рамка.

### GET `/api/day-notes/?from=YYYY-MM-DD&to=YYYY-MM-DD`

Список своих заметок в диапазоне (не больше 366 дней).

```json
[{ "date": "2026-09-12", "text": "Смена графика", "updated_at": "2026-09-12T12:00:00Z" }]
```

### PUT `/api/day-notes/`

`{ "date": "2026-09-12", "text": "Смена графика" }` — создать или заменить.

### DELETE `/api/day-notes/{date}/`

Удалить заметку дня.

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

Маршруты UI: `/`, `/todos/:id`, `/calendar`, `/settings`, `/login`, `/register`.

Календарь (`/calendar`) грузит свои `/todos/`, `/shift-days/` и `/day-notes/` на видимый месяц или год.
Задачи ставятся в день `event_date`, иначе `due_date`. Смены двух слоёв заливают день по диагонали.
День с заметкой — золотая рамка.
