# ToDoApp

Учебный проект ToDo-приложения с тремя независимыми backend-сервисами (Django, FastAPI, Flask) и общим frontend на React.

## Структура репозитория

```text
ToDoApp/
  backend/
    django_api/
    fastapi_api/
    flask_api/
  frontend/
    react_app/
  docs/
```

- `backend/` — три реализации одного и того же REST API.
- `frontend/` — единый React-клиент, переключающийся между бекэндами через переменные окружения.
- `docs/` — документация и спецификации (API, заметки и т.д.).

## Схема БД (общее логическое представление)

Во всех трёх бекэндах используется одна и та же логическая модель данных: пользователи и их задачи.
Фактическая реализация (конкретные типы, имена таблиц) может отличаться между Django ORM,
SQLAlchemy и т.д., но структура должна соответствовать контракту API.

### Таблица `users`

Минимальный набор полей:

- `id` — первичный ключ (integer, auto-increment).
- `username` — строка, 3..150 символов, уникальная.
- `password_hash` — строка с хэшом пароля (BCrypt/Argon2/PBKDF2 — на выбор).
- (`created_at`, `updated_at` — опционально, для аудита).

Пример моделей:

- **Django**: использование встроенной модели `User` или кастомной модели с полями `username`/`password`.
- **FastAPI**: модель SQLAlchemy `User` с полями как выше.
- **Flask**: модель SQLAlchemy `User` с теми же полями.

### Таблица `todos`

Поля:

- `id` — первичный ключ (integer, auto-increment).
- `user_id` — внешний ключ на `users.id` (владелец задачи).
- `title` — строка, 1..255 символов, NOT NULL.
- `description` — текст, NULLable.
- `completed` — boolean, NOT NULL, по умолчанию `false`.
- `created_at` — datetime (UTC), NOT NULL.
- `updated_at` — datetime (UTC), NOT NULL.

Ограничения и индексы:

- Внешний ключ `user_id` с каскадным удалением или soft-delete (на твой выбор).
- Индекс по `user_id` (для выборок задач пользователя).
- Опционально индексы по `completed` и/или `title` (для фильтрации и поиска).

### Связь между таблицами

- Один `User` может иметь много `Todo` (`One-to-Many`).
- Все запросы к `/api/todos/...` должны фильтроваться по `user_id` текущего аутентифицированного
  пользователя.

### Привязка к API

- Поле `user_id` присутствует в ответах API как read-only и никогда не задаётся напрямую клиентом.
- При создании задачи (`POST /api/todos`) `user_id` заполняется на основе текущего пользователя
  (по токену).
- При выборке/обновлении/удалении задач backend всегда добавляет условие по `user_id`, чтобы
  исключить доступ к чужим данным.

## Установка Node.js, npm и npx (через nvm)

Если в системе нет `npm`/`npx`, можно установить их вместе с Node.js через `nvm`.

1. Установить nvm:

```bash
cd ~
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh -o install_nvm.sh
bash install_nvm.sh
```

2. Подключить nvm в текущей сессии (без перезапуска терминала):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
```

3. Установить последнюю LTS-версию Node.js (вместе с npm и npx):

```bash
nvm install --lts
nvm use --lts
node -v
npm -v
npx -v
```

После этого можно пользоваться `npm` и `npx` в проекте (например, для создания фронтенда на Next.js).

## Запуск (план)

1. Реализовать базовый API (auth + todos) на одном фреймворке (например, Django) по спецификации.
2. Поднять фронтенд и убедиться, что он работает с API.
3. Реализовать эквивалентный API на FastAPI и Flask, используя ту же схему данных.
4. Добавить дополнительные фичи, тесты, Docker (по желанию).


# Проверка backend API

## Регистрация
```
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "email": "user1@example.com",
    "password": "password123"
  }'

```

## Логин 
(Скопируй access_token из ответа.)
```
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'

```

## Проверка текущего пользователя (me)
Убедись, что приходит ответ вида: {"id": ..., "username": "user1"}.
```
ACCESS=ПОДСТАВЬ_ТОКЕН

curl http://127.0.0.1:8000/api/auth/me \
  -H "Authorization: Bearer $ACCESS"
```

## 2. Проверить todos
```
curl http://127.0.0.1:8000/api/todos/ \
  -H "Authorization: Bearer $ACCESS"

```

## Создать задачу
```
curl -X POST http://127.0.0.1:8000/api/todos/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Купить молоко",
    "description": "2 литра"
  }'

```

## Проверить, что задача появилась
```
curl http://127.0.0.1:8000/api/todos/ \
  -H "Authorization: Bearer $ACCESS"
```

## Обновление и удаление
Обновление/удаление любой задачи по id — по аналогии с другими запросами.
