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

node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 (
  echo.
  echo  Tu Node.js es muy antiguo. N.A.V.I necesita la version 22.13 o mas nueva.
  echo  Instala la version LTS desde https://nodejs.org/es y vuelve a abrir este archivo.
  echo.
  start "" https://nodejs.org/es
  pause
  exit /b 1
)

node -e "for(const m of Object.keys(require('./package.json').dependencies))require.resolve(m)" >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Instalando lo necesario por primera vez, espera un momento...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  No se pudo instalar. Revisa tu conexion a internet y vuelve a abrir este archivo.
    pause
    exit /b 1
  )
)

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"
node server.js
if errorlevel 1 (
  echo.
  echo  El servidor se detuvo con un error.
  echo  Si dice "EADDRINUSE", ya hay otra ventana de N.A.V.I abierta: cierrala y vuelve a intentar.
)
pause
