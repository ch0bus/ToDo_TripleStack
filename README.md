# Haloday

Личный планер: входящие, календарь, события, заметки дня и график смен.
Учебный стек — один React-клиент и общий REST-контракт. Эталонный backend — **Django**; `backend/fastapi_api/` и `backend/flask_api/` — заглушки под те же эндпоинты.

Данные **личные**: задачи, события, заметки, теги и смены принадлежат аккаунту из JWT. Общего списка или общего календаря нет. Системные теги (работа, дом и т.п.) видят все, но задачи с ними остаются у владельца; в настройках их можно скрыть из меню и форм.

В интерфейсе бренд **Haloday**: словомарк с золотым нимбом на месте буквы o (тот же цвет, что рамка заметки дня).

## Что умеет клиент

- Входящие: переключатель недели; точка у дня с задачами или событиями; «Сегодня» возвращает к текущему дню; первый блок — выбранный день (заметка, события, задачи); Просрочено / Все / Готово — относительно сегодня; фильтры по статусу, приоритету, тегу и поиску
- Сортировка списка: «Все задачи» на входящих и «Задачи дня / недели / месяца / года» в календаре; события выбранного периода — отдельно (`esort`, `ecolor`)
- Задача: статус, приоритет, срок, дата на календаре, повтор, теги, подзадачи
- Событие: отдельная сущность (встреча, день рождения); без статуса и срока; на входящих в блоке выбранного дня; на календаре — цветная полоска, сетка часов (день/неделя) и список «События дня / недели / месяца / года»
- Заметка дня: одна на дату; на месяце — золотая полоска; во входящих — золотая рамка
- Календарь: виды день / неделя / месяц / год; день и неделя — сетка часов для событий и задач; месяц — полоски; год — точка занятости; смены — диагональная заливка двух слоёв
- Смены: до 10 досок, на каждой два слоя; типы с длительностью, перерывом и ставкой; цикл и правки дней
- Три даты у задачи: **создана**, **событие** (календарь), **срок** (дедлайн / просрочка)
- Повтор задачи: шаг daily / weekly / monthly; при «Готово» копия не создаётся
- Создание задачи, события и заметки — селектор «+ Добавить»; правка на отдельных страницах, не в модалках
- Профиль: настройки, смена пароля, тема (светлая / тёмная / система), скрытие системных тегов
- Быстрый вход: PIN (4–6 цифр) и опционально лицо / отпечаток на этом устройстве; не заменяет JWT, только локальный замок после пароля

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
