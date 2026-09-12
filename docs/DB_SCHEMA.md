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

## shift_kinds

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users | |
| name | string 80 | уникален в паре (user, name) |
| color | string 7 | `#RRGGBB` |
| created_at | datetime | |

## shift_patterns

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users, unique | один цикл на пользователя |
| start_date | date | начало цикла |
| updated_at | datetime | |

## shift_pattern_slots

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| pattern_id | FK → shift_patterns | CASCADE |
| position | int | порядок в цикле |
| kind_id | FK → shift_kinds, NULL | NULL = выходной |

## shift_day_overrides

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users | |
| date | date | уникален в паре (user, date) |
| kind_id | FK → shift_kinds, NULL | NULL = выходной поверх шаблона |

## Связи

```text
User 1 ── * Todo
User 1 ── * Tag (личные; системные без user)
Todo * ── * Tag
Todo 1 ── * Subtask
User 1 ── * ShiftKind
User 1 ── 1 ShiftPattern ── * ShiftPatternSlot
User 1 ── * ShiftDayOverride
```

## Правила доступа

- Все выборки todos/subtasks по `user_id` из JWT.
- `user_id` в JSON todo — read-only.
- Подзадачи только через todo, принадлежащий пользователю.
