@echo off
chcp 65001 >nul
title N.A.V.I - Demostracion
cd /d "%~dp0backend"
set NAVI_DEMO=1

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  No encuentro Node.js en esta PC.
  echo  Instala la version LTS desde https://nodejs.org/es y vuelve a abrir este archivo.
  echo.
  start "" https://nodejs.org/es
  pause
  exit /b 1
)

if not exist "node_modules\better-sqlite3" (
  echo.
  echo  Instalando dependencias por primera vez, espera un momento...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  No se pudieron instalar las dependencias. Revisa tu conexion a internet.
    pause
    exit /b 1
  )
)

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"
node server.js
if errorlevel 1 (
  echo.
  echo  El servidor se detuvo con un error. Si dice "better-sqlite3" o "NODE_MODULE_VERSION",
  echo  borra la carpeta backend\node_modules y vuelve a abrir este archivo.
)
pause
