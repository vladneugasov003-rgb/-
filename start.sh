#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       БотМастер — Запуск MVP         ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js не найден. Установите с https://nodejs.org (версия 18+)"
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Нужен Node.js 18+. У вас: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v)"

# Setup backend .env
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo ""
  echo "⚠️  Файл backend/.env создан."
  echo "   Откройте его и вставьте ваш ANTHROPIC_API_KEY:"
  echo "   Ключ получите на: https://console.anthropic.com"
  echo ""
  read -p "Нажмите Enter когда добавите ключ в backend/.env ..."
fi

# Check API key
API_KEY=$(grep ANTHROPIC_API_KEY backend/.env | cut -d'=' -f2 | tr -d ' ')
if [[ "$API_KEY" == "sk-ant-..."* ]] || [ -z "$API_KEY" ]; then
  echo ""
  echo "⚠️  ANTHROPIC_API_KEY не настроен в backend/.env"
  echo "   Бот запустится, но AI не будет отвечать."
  echo "   Получите ключ: https://console.anthropic.com"
  echo ""
fi

# Install dependencies
echo "📦 Устанавливаю зависимости бэкенда..."
cd backend && npm install --silent
cd ..

echo "📦 Устанавливаю зависимости фронтенда..."
cd frontend && npm install --silent
cd ..

echo ""
echo "🚀 Запускаю серверы..."
echo "   Бэкенд:  http://localhost:3001"
echo "   Сайт:    http://localhost:5173"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

# Run both servers
trap 'kill %1 %2 2>/dev/null; exit' INT TERM

cd backend && npm run dev &
cd frontend && npm run dev &

wait
