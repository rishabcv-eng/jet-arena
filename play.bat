@echo off
title Jet Arena - server (keep this window open)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed - needed only for playing with friends.
  echo   Install it from https://nodejs.org  ... or just double-click
  echo   index.html to play solo right now.
  echo.
  pause
  exit /b 1
)

REM open the browser a moment after the server is actually listening
start "" cmd /c "timeout /t 2 /nobreak >nul & start """" http://localhost:8123"

echo.
echo   Keep this window open while you play. Close it to stop the server.
echo.
node server.js 8123

echo.
echo   Server stopped.
pause >nul
