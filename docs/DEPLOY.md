# Деплой на VPS без домена

Сервер: `62.182.102.210`  
Занято: `80`, `8003`, `8005`  
Этот стек: **8006** → http://62.182.102.210:8006

Три уже запущенных приложения не трогаем.

## Развёртывание

С ноутбука (из корня репозитория):

```bash
rsync -av --exclude venv --exclude node_modules --exclude .git \
  ./ user@62.182.102.210:/opt/todoapp/
```

На сервере:

```bash
cd /opt/todoapp
cp .env.example .env
sed -i "s/^DJANGO_SECRET_KEY=.*/DJANGO_SECRET_KEY=$(openssl rand -hex 32)/" .env
docker compose up -d --build
sudo ufw allow 8006/tcp
```

Если `ufw` нет или порт режется в панели хостера — откройте **8006/tcp** там.

Проверка с сервера:

```bash
curl -I http://127.0.0.1:8006
curl -I http://127.0.0.1:8006/api/docs/
```

Снаружи: [http://62.182.102.210:8006](http://62.182.102.210:8006) — регистрация, затем вход.

## Обновление

```bash
# с ноутбука
rsync -av --exclude venv --exclude node_modules --exclude .git \
  ./ user@62.182.102.210:/opt/todoapp/

# на сервере
cd /opt/todoapp
docker compose build --no-cache web
docker compose up -d --build
```

База SQLite в томе `todoapp_todo_data`, при пересборке не стирается.

`docker compose down` запускайте только из `/opt/todoapp` — гасится только этот стек.
