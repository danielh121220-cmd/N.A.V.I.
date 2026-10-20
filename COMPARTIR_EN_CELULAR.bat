@echo off
chcp 65001 >nul
title N.A.V.I - Enlace HTTPS para el celular
echo.
echo  Este enlace HTTPS temporal permite abrir e INSTALAR la app en tu celular,
echo  incluso fuera de tu casa. Deja abierta tambien la ventana INICIAR_NAVI.
echo.
echo  Cuando aparezca una direccion https://....trycloudflare.com, abrela en el celular.
echo  Para cerrar el enlace, cierra esta ventana.
echo.

where cloudflared >nul 2>nul
if not errorlevel 1 (
  cloudflared tunnel --url http://localhost:3000
  goto fin
)
if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" (
  "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
  goto fin
)
if exist "%ProgramFiles%\cloudflared\cloudflared.exe" (
  "%ProgramFiles%\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
  goto fin
)

where winget >nul 2>nul
if not errorlevel 1 (
  echo  Instalando cloudflared con winget...
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" (
    "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
    goto fin
  )
  if exist "%ProgramFiles%\cloudflared\cloudflared.exe" (
    "%ProgramFiles%\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
    goto fin
  )
)

echo  Usando la version de npm de cloudflared...
call npx --yes cloudflared tunnel --url http://localhost:3000

:fin
pause
