# БотМастер — MVP

AI-платформа для создания чат-ботов · Студенческий стартап ФСИ 2026

---

## ⚡ Быстрый запуск

### Шаг 1 — Установите Node.js (если ещё нет)

Скачайте с **https://nodejs.org** (LTS, версия 18+)

Проверьте: `node --version`

### Шаг 2 — Получите API-ключ Anthropic

1. Зайдите на **https://console.anthropic.com**
2. API Keys → Create Key
3. Скопируйте ключ (начинается с `sk-ant-...`)

### Шаг 3 — Запустите

**macOS / Linux:**
```bash
chmod +x start.sh && ./start.sh
```

**Windows:** дважды кликните `start.bat`

Скрипт сам установит зависимости, создаст конфиг и откроет http://localhost:5173

---

## Ручной запуск

```bash
# Терминал 1 — бэкенд
cd backend
cp .env.example .env        # добавьте ANTHROPIC_API_KEY в .env
npm install
npm run dev                  # → localhost:3001

# Терминал 2 — фронтенд
cd frontend
npm install
npm run dev                  # → localhost:5173
```

## Частые проблемы

**AI не отвечает** → проверьте ANTHROPIC_API_KEY в backend/.env

**"port 3001 in use"** → закройте другие приложения или смените PORT в .env

**"Cannot find module"** → не запускали `npm install` в папке backend/ или frontend/

