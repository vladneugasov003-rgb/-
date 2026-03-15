@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════╗
echo ║       БотМастер — Запуск MVP         ║
echo ╚══════════════════════════════════════╝
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Node.js не найден.
    echo Установите с https://nodejs.org ^(версия 18+^)
    pause
    exit /b 1
)

echo [OK] Node.js найден: & node --version

:: Setup .env
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo.
    echo [!] Файл backend\.env создан.
    echo     Откройте его в блокноте и вставьте ANTHROPIC_API_KEY
    echo     Ключ получите на: https://console.anthropic.com
    echo.
    notepad backend\.env
    pause
)

:: Install backend
echo.
echo [1/2] Устанавливаю зависимости бэкенда...
cd backend
npm install --silent
cd ..

:: Install frontend
echo [2/2] Устанавливаю зависимости фронтенда...
cd frontend
npm install --silent
cd ..

echo.
echo [ЗАПУСК] Открываю два окна терминала...
echo.

:: Start backend in new window
start "БотМастер — Бэкенд (порт 3001)" cmd /k "cd backend && npm run dev"

:: Wait a bit then start frontend
timeout /t 2 /nobreak >nul
start "БотМастер — Фронтенд (порт 5173)" cmd /k "cd frontend && npm run dev"

:: Wait then open browser
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo [OK] Серверы запущены!
echo      Сайт: http://localhost:5173
echo      API:  http://localhost:3001
echo.
echo Закройте оба окна терминала для остановки.
pause
