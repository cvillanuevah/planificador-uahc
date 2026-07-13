@echo off
title Frontend - Planificador de Asignaturas UAHC
cd /d "%~dp0frontend"

set NODE_DIR=C:\Users\cvillanueva\AppData\Local\Temp\node-v22.16.0-win-x64
set PATH=%NODE_DIR%;%PATH%

echo [1/2] Instalando dependencias (solo primera vez)...
if not exist "node_modules" (
    "%NODE_DIR%\npm.cmd" install
)

echo [2/2] Iniciando frontend en http://localhost:5173
echo.
"%NODE_DIR%\npm.cmd" run dev
pause
