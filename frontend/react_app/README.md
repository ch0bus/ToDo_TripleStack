# Haloday — frontend

SPA на **Vite**, **React** и **React Router**. Backend — Django REST API с JWT.
Бренд в шапке: словомарк Haloday с золотым нимбом на месте буквы o.

## Команды

```bash
npm install
npm run dev    # http://localhost:5173
npm run build
npm run preview
```

## API

По умолчанию в dev запросы идут на `/api` и проксируются на `http://127.0.0.1:8000`.

Переменная окружения (файл `.env`):

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Пустое значение `VITE_API_URL` — использовать относительный путь `/api` (proxy).

## Маршруты

| Путь | Описание |
|------|----------|
| `/` | Входящие; переключатель недели (`?day=`); «+ Добавить»; события и заметка выбранного дня; сортировка в «Все задачи» (`?sort=`) |
| `/todos/new` | Новая задача |
| `/todos/:id` | Карточка задачи |
| `/events/new` | Новое событие |
| `/events/:id` | Карточка события |
| `/notes/:date` | Заметка дня (`YYYY-MM-DD`) |
| `/calendar` | Календарь (`?view=day\|week\|month\|year`); грузит задачи и события только на видимое окно `from`/`to`; при смене периода — полоска загрузки; доска смен `?calendar=id`; списки периода |
| `/settings` | Аккаунт, тема, быстрый вход, свой Telegram-бот (токен BotFather), теги, смены |
| `/settings/shifts` | Типы смен, слои и шаблон цикла (`?calendar=id`) |
| `/login`, `/register` | Аутентификация |
