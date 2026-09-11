# ToDo App — frontend

SPA на **Vite**, **React** и **React Router**. Backend — Django REST API с JWT.

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
| `/` | Inbox задач (фильтры в query string) |
| `/todos/:id` | Детали задачи |
| `/login`, `/register` | Аутентификация |
