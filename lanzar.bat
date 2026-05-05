@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Lanzar app - Visualizador Geometrico ML

set "ROOT=%~dp0"
cd /d "!ROOT!"

REM Detectar raiz real si el .bat esta en carpeta padre
if exist "!ROOT!backend\" goto :found_root
if exist "!ROOT!frontend\" goto :found_root
for /d %%D in ("!ROOT!*") do (
  if exist "%%D\backend\" if exist "%%D\frontend\" (
    set "ROOT=%%~fD\"
    goto :found_root
  )
)
:found_root
cd /d "!ROOT!"

echo.
echo ==========================================
echo   Lanzar aplicacion (backend + frontend)
echo ==========================================
echo Carpeta raiz: !ROOT!
echo.

if not exist "!ROOT!backend\venv\Scripts\activate.bat" (
  echo ERROR: No se encuentra el entorno virtual del backend.
  echo Ejecuta primero preparar_entorno.bat
  pause
  exit /b 1
)

if not exist "!ROOT!frontend\.next\" (
  echo ERROR: El frontend no esta compilado.
  echo Ejecuta primero preparar_entorno.bat
  pause
  exit /b 1
)

REM 1) Crear scripts temporales para arrancar backend y frontend
REM    (evita problemas de comillas anidadas con rutas con espacios)

set "TMPBACK=!ROOT!_start_backend.bat"
echo @echo off > "!TMPBACK!"
echo cd /d "!ROOT!backend" >> "!TMPBACK!"
echo call venv\Scripts\activate.bat >> "!TMPBACK!"
echo uvicorn main:app --host 127.0.0.1 --port 8000 >> "!TMPBACK!"
echo pause >> "!TMPBACK!"

set "TMPFRONT=!ROOT!_start_frontend.bat"
echo @echo off > "!TMPFRONT!"
echo cd /d "!ROOT!frontend" >> "!TMPFRONT!"
echo call npm run start >> "!TMPFRONT!"
echo pause >> "!TMPFRONT!"

start "Backend (FastAPI)" "!TMPBACK!"
start "Frontend (Next.js)" "!TMPFRONT!"

REM 2) Esperar a que el puerto 3000 acepte conexiones
echo.
echo ------------------------------------------
echo  Esperando a que el frontend este listo...
echo  (normalmente unos pocos segundos)
echo ------------------------------------------

set "ATTEMPTS=0"
:poll_loop
if !ATTEMPTS! GEQ 60 goto :poll_timeout

powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient('127.0.0.1',3000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto :poll_ready

set /a ATTEMPTS+=1
<nul set /p ="."
timeout /t 1 /nobreak >nul 2>&1
goto :poll_loop

:poll_ready
echo.
echo.
echo Frontend listo. Abriendo en tu navegador...
start "" "http://localhost:3000"

REM Limpiar scripts temporales
del "!TMPBACK!" >nul 2>&1
del "!TMPFRONT!" >nul 2>&1

echo.
echo Listo. Para cerrar la app, cierra las ventanas Backend y Frontend.
echo.
pause
exit /b 0

:poll_timeout
echo.
echo ERROR: El frontend no ha respondido en 60 segundos.
echo Mira la ventana "Frontend (Next.js)" para ver el error.
del "!TMPBACK!" >nul 2>&1
del "!TMPFRONT!" >nul 2>&1
echo.
pause
exit /b 1
