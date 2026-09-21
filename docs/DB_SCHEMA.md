# Схема БД Haloday

Логическая модель для Django / FastAPI / Flask. Имена таблиц в ORM могут отличаться;
семантика полей и связей — общая.

> Сущность **Project** нет: группировка через **теги** и фильтры API.  
> Отдельной таблицы календаря нет: это UI над `todos`, `events` и сменами пользователя.

Все пользовательские сущности привязаны к `users`. Выборки в API — только свои строки.

## users

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | auto |
| username | string, unique | 3..150 |
| email | string, unique | Django: обязателен |
| phone_number | string 15 | NULL, профиль |
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
| event_date | datetime | NULL; когда происходит событие |
| due_date | datetime | NULL; дедлайн выполнения |
| recurrence | enum | daily, weekly, monthly, never. Превью на календаре в окне created_at…event_date (или due_date) |
| created_at | datetime | auto, момент создания карточки |
| updated_at | datetime | auto |
| completed_at | datetime | NULL; ставится при входе в done, сбрасывается при выходе |

M2M: **todos ↔ tags** через промежуточную таблицу.

Индексы (Django): `(user, status)`, `(user, -created_at)`, отдельные на title, status, due_date.

## events

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users | владелец, индекс |
| title | string 255 | NOT NULL |
| description | text | optional |
| start_at | datetime | начало, индекс |
| end_at | datetime | NULL; не раньше start_at |
| all_day | bool | default false |
| recurrence | enum | daily, weekly, monthly, never. Повтор от start_at вперёд |
| color | string 7 | `#RRGGBB`, полоска на месяце, по умолчанию `#e11d48` |
| created_at | datetime | auto |
| updated_at | datetime | auto |

Индекс: `(user, start_at)`.

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

## shift_calendars

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users | |
| name | string 40 | уникален в паре (user, name), до 10 досок |
| created_at | datetime | |

## shift_layers

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| calendar_id | FK → shift_calendars | CASCADE |
| position | int | 0 или 1, уникален в паре (calendar, position) |
| name | string 40 | «Слой 1» / «Слой 2» по умолчанию |

## shift_kinds

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| layer_id | FK → shift_layers | CASCADE |
| name | string 80 | уникален в паре (layer, name) |
| color | string 7 | `#RRGGBB` |
| duration_hours | decimal 4,2 | длина смены, 0.25–24, по умолчанию 8 |
| break_minutes | int | перерыв, 0–480, по умолчанию 0 |
| hourly_rate | decimal 8,2 | ₽/час, ≥ 0 |
| created_at | datetime | |

## shift_patterns

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| layer_id | FK → shift_layers, unique | один цикл на слой |
| start_date | date | начало цикла |
| end_date | date, NULL | конец цикла; NULL = без конца |
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
| layer_id | FK → shift_layers | |
| date | date | уникален в паре (layer, date) |
| kind_id | FK → shift_kinds, NULL | NULL = выходной поверх шаблона |

## day_notes

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users | |
| date | date | уникален в паре (user, date) |
| text | text 2000 | заметка к дню |
| updated_at | datetime | |

## telegram_bots

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users, unique | один бот на аккаунт |
| token | string 128 | токен BotFather, в API не отдаётся |
| token_hash | string 64, unique | SHA-256 токена |
| bot_id | bigint | из getMe |
| bot_username | string 64 | без `@` |
| timezone | string 64 | пояс дайджеста и «сегодня» |
| digest_hour | int 0–23 | час утренней сводки |
| remind_minutes | int 5–1440 | за сколько минут напомнить |
| chat_id | bigint, NULL, unique | личный чат после /start |
| telegram_user_id | bigint, NULL | |
| telegram_username | string 64 | |
| linked_at | datetime, NULL | |
| update_offset | bigint | offset getUpdates этого бота |
| updated_at | datetime | |

## telegram_deliveries

| Поле | Тип | Описание |
|------|-----|----------|
| id | PK | |
| user_id | FK → users | |
| kind | string | digest, due, event |
| object_id | int | 0 для дайджеста, иначе id задачи/события |
| period_key | string | локальная дата YYYY-MM-DD |
| sent_at | datetime | |

Уникально: `(user, kind, object_id, period_key)`.

## Связи

```text
User 1 ── * Todo
User 1 ── * Tag (личные; системные без user)
Todo * ── * Tag
Todo 1 ── * Subtask
User 1 ── * ShiftCalendar
ShiftCalendar 1 ── 2 ShiftLayer
ShiftLayer 1 ── * ShiftKind
ShiftLayer 1 ── 1 ShiftPattern ── * ShiftPatternSlot
ShiftLayer 1 ── * ShiftDayOverride
User 1 ── * Event
User 1 ── * DayNote
User 1 ── 1 TelegramBot
User 1 ── * TelegramDelivery
```

## Правила доступа

- Todos, события, личные теги, смены и правки дней — только `user_id` из JWT.
- `user_id` в JSON todo — read-only, при создании берётся из токена.
- Подзадачи только через todo владельца.
- Системные теги (`user_id` NULL) видны всем; создать/удалить может ограничение реализации.
- Календарь не шарится: каждый видит свои сроки, события, повторы, смены и заметки дней.
- Telegram: свой бот (токен в настройках); сообщения только в привязанный личный `chat_id`; выборки задач — по `user_id` этой записи. Токен в JSON не отдаётся.
