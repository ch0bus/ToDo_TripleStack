# Схема БД ToDoApp

Логическая модель для Django / FastAPI / Flask. Имена таблиц в ORM могут отличаться;
семантика полей и связей — общая.

> Сущность **Project** удалена: группировка через **теги** и фильтры API.

## users

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | auto |
| username | string, unique | 3..150 |
| email | string, unique | Django: обязателен |
| password | hash | не отдаётся в API |

Django: `account.User` (`AbstractUser`).

## tags

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users, NULL | NULL = системный тег |
| tag_name | string | уникален в паре (user, tag_name) |
| kind | enum | work, personal, health, finance, shopping, home, hobby, other |

## todos

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users | владелец, индекс |
| title | string 255 | NOT NULL, индекс |
| description | text | optional |
| status | enum | todo, in_progress, done (default todo) |
| priority | enum | critical, high, medium, low |
| due_date | datetime | NULL |
| recurrence | enum | daily, weekly, monthly, never |
| created_at | datetime | auto |
| updated_at | datetime | auto |
| completed_at | datetime | NULL; ставится при входе в done, сбрасывается при выходе |

M2M: **todos ↔ tags** через промежуточную таблицу.

Индексы (Django): `(user, status)`, `(user, -created_at)`, отдельные на title, status, due_date.

## subtasks

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| todo_id | FK → todos | CASCADE |
| title | string 255 | |
| completed | bool | default false |
| due_date | datetime | NULL |
| created_at | datetime | |
| updated_at | datetime | |

## Связи

```text
User 1 ── * Todo
User 1 ── * Tag (личные; системные без user)
Todo * ── * Tag
Todo 1 ── * Subtask
```

## Правила доступа

- Все выборки todos/subtasks по `user_id` из JWT.
- `user_id` в JSON todo — read-only.
- Подзадачи только через todo, принадлежащий пользователю.
