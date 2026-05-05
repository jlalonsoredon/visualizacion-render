@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==================================================
REM  Preparar entorno (backend + frontend)
REM  - Compatible con rutas con espacios (Google Drive, etc.)
REM  - Log detallado en instalacion.log
REM ==================================================

title Preparar entorno - Visualizador Geometrico ML

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

set "LOG=!ROOT!instalacion.log"
echo ================================================== > "!LOG!"
echo   Preparar entorno - %DATE% %TIME%                 >> "!LOG!"
echo   Carpeta raiz: !ROOT!                              >> "!LOG!"
echo ================================================== >> "!LOG!"

echo.
echo ==========================================
echo   Preparar entorno (backend + frontend)
echo ==========================================
echo Carpeta raiz detectada:
echo   !ROOT!
echo Log: instalacion.log
echo.

REM ========== BACKEND ==========
echo [1/4] Preparando backend (Python)...
echo [1/4] Preparando backend (Python)... >> "!LOG!"

if not exist "!ROOT!backend\" (
  echo ERROR: No existe la carpeta backend.
  goto :fail
)

pushd "!ROOT!backend"
if errorlevel 1 (
  echo ERROR: No se pudo acceder a la carpeta backend.
  goto :fail
)

set "PY_CMD=python"
!PY_CMD! --version >nul 2>&1
if errorlevel 1 set "PY_CMD=py"
!PY_CMD! --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: No se encontro Python en PATH.
  echo Instala Python y marca "Add Python to PATH".
  popd
  goto :fail
)

echo     Python detectado: !PY_CMD!

if exist "venv\Scripts\activate.bat" goto :skip_venv
echo     Creando entorno virtual...
!PY_CMD! -m venv venv >> "!LOG!" 2>&1
if errorlevel 1 (
  echo ERROR: Fallo creando el entorno virtual. Mira instalacion.log
  popd
  goto :fail
)
:skip_venv

call venv\Scripts\activate.bat >> "!LOG!" 2>&1
if errorlevel 1 (
  echo ERROR: No se pudo activar el entorno virtual.
  popd
  goto :fail
)

python -m pip install --upgrade pip >> "!LOG!" 2>&1

echo     Instalando dependencias del backend...
pip install -r requirements.txt >> "!LOG!" 2>&1
if errorlevel 1 (
  echo ERROR: Fallo instalando dependencias. Mira instalacion.log
  popd
  goto :fail
)

echo     Backend OK.
popd

REM ========== FRONTEND: DEPENDENCIAS ==========
echo.
echo [2/4] Instalando dependencias frontend...
echo [2/4] Instalando dependencias frontend... >> "!LOG!"

if not exist "!ROOT!frontend\" (
  echo ERROR: No existe la carpeta frontend.
  goto :fail
)

pushd "!ROOT!frontend"
if errorlevel 1 (
  echo ERROR: No se pudo acceder a la carpeta frontend.
  goto :fail
)

call node --version >> "!LOG!" 2>&1
if errorlevel 1 (
  echo ERROR: No se encontro Node.js.
  echo Instala Node.js LTS desde https://nodejs.org
  popd
  goto :fail
)

call npm --version >> "!LOG!" 2>&1
if errorlevel 1 (
  echo ERROR: No se encontro npm.
  popd
  goto :fail
)

echo     Node y npm detectados.

if exist "node_modules" goto :skip_npm_install

echo     Instalando paquetes npm (puede tardar)...
if not exist "package-lock.json" goto :use_npm_install

call npm ci >> "!LOG!" 2>&1
goto :check_npm_result

:use_npm_install
call npm install >> "!LOG!" 2>&1

:check_npm_result
if errorlevel 1 (
  echo ERROR: Fallo instalando paquetes npm. Mira instalacion.log
  popd
  goto :fail
)
goto :do_build

:skip_npm_install
echo     node_modules ya existe. Saltando.

REM ========== FRONTEND: BUILD ==========
:do_build
echo.
echo [3/4] Compilando frontend (next build)...
echo [3/4] Compilando frontend (next build)... >> "!LOG!"
echo     Esto puede tardar 1-2 minutos la primera vez...

call npm run build >> "!LOG!" 2>&1
if errorlevel 1 (
  echo ERROR: Fallo compilando el frontend. Mira instalacion.log
  popd
  goto :fail
)

echo     Frontend compilado OK.
popd

echo.
echo [4/4] Listo
echo =====================================
echo   Entorno preparado correctamente.
echo   Ya puedes lanzar la app con:
echo     lanzar.bat
echo =====================================
echo.
pause
exit /b 0

:fail
echo.
echo ------------------------------------------
echo  Preparacion interrumpida.
echo  Revisa: instalacion.log
echo ------------------------------------------
echo.
pause
exit /b 1
