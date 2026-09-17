# Haloday

Личный планер: входящие, календарь, события, заметки дня и график смен.
Учебный стек — один React-клиент и общий REST-контракт. Эталонный backend — **Django**; `backend/fastapi_api/` и `backend/flask_api/` — заглушки под те же эндпоинты.

Данные **личные**: задачи, события, заметки, теги и смены принадлежат аккаунту из JWT. Общего списка или общего календаря нет. Системные теги (работа, дом и т.п.) видят все, но задачи с ними остаются у владельца.

В интерфейсе бренд **Haloday**: словомарк с золотым нимбом на месте буквы o (тот же цвет, что рамка заметки дня).

## Что умеет клиент

- Входящие: Сегодня / Просрочено / Все / Готово; фильтры по статусу, приоритету, тегу и поиску
- Сортировка списка: «Все задачи» на входящих и «Задачи месяца» в календаре; события месяца — отдельно (`esort`, `ecolor`)
- Задача: статус, приоритет, срок, дата на календаре, повтор, теги, подзадачи
- Событие: отдельная сущность (встреча, день рождения); без статуса и срока; на входящих только в «Сегодня»; на календаре — цветная полоска и список «События месяца»
- Заметка дня: одна на дату; на месяце — золотая полоска; во входящих — золотая рамка
- Календарь месяца и года: сегодня — нимб у числа; месяц — полоски событий/задач/заметок; год — точка занятости; смены — диагональная заливка двух слоёв
- Смены: до 10 досок, на каждой два слоя; типы с длительностью, перерывом и ставкой; цикл и правки дней
- Три даты у задачи: **создана**, **событие** (календарь), **срок** (дедлайн / просрочка)
- Повтор задачи: шаг daily / weekly / monthly; при «Готово» копия не создаётся
- Создание задачи, события и заметки — селектор «+ Добавить»; правка на отдельных страницах, не в модалках
- Профиль: настройки, смена пароля, тема (светлая / тёмная / система)

Подробности контракта и таблиц: [`docs/API_SPEC.md`](docs/API_SPEC.md), [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md).  
[`docs/ToDoApp.txt`](docs/ToDoApp.txt) — исходный бэклог-визия, не описание текущей реализации.

## Структура

```text
ToDoApp/                    # репозиторий; продукт — Haloday
  backend/django_api/       # Django REST + JWT (эталон)
  backend/fastapi_api/      # заглушка
  backend/flask_api/        # заглушка
  frontend/react_app/       # Vite + React Router
  docs/
    API_SPEC.md
    DB_SCHEMA.md
    DEPLOY.md
    ToDoApp.txt
```

- Frontend: `http://localhost:5173/` — proxy `/api` → Django `:8000` (`vite.config.ts`).
- Прямой URL API: в `.env` задайте `VITE_API_URL=http://127.0.0.1:8000/api`.
- Swagger: `http://127.0.0.1:8000/api/docs/`

Маршруты UI: `/`, `/todos/new`, `/todos/:id`, `/notes/:date`, `/events/new`, `/events/:id`, `/calendar`, `/settings`, `/settings/shifts`, `/login`, `/register`.

## Запуск

### Backend (Django)

```bash
cd backend/django_api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/`

### Frontend

```bash
cd frontend/react_app
npm install
npm run dev
```

Если нет Node.js — установите LTS через [nvm](https://github.com/nvm-sh/nvm), затем `nvm install --lts`.

## Проверка API

Слэши в конце путей обязательны (Django).

```bash
# регистрация
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","email":"user1@example.com","password":"password123"}'

# логин — скопируйте access
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"password123"}'

ACCESS=ПОДСТАВЬ_ТОКЕН

curl http://127.0.0.1:8000/api/auth/me/ \
  -H "Authorization: Bearer $ACCESS"

curl -X POST http://127.0.0.1:8000/api/todos/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"title":"Купить молоко","description":"2 литра","priority":"low"}'

curl http://127.0.0.1:8000/api/todos/ \
  -H "Authorization: Bearer $ACCESS"
```

Создание без JWT → `401`. Чужой `id` задачи → `404`.

## Деплой на VPS

Без домена, отдельный порт рядом с уже запущенными приложениями: [`docs/DEPLOY.md`](docs/DEPLOY.md).

Эквивалент API на FastAPI и Flask — по желанию. Новые поля и эндпоинты сначала фиксируйте в `docs/API_SPEC.md` и `docs/DB_SCHEMA.md`.
