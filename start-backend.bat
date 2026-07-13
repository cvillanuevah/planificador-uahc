@echo off
title Backend - Planificador de Asignaturas UAHC
cd /d "%~dp0backend"

set PYTHON=C:\Users\cvillanueva\.local\bin\python3.11.exe
set UV=C:\Users\cvillanueva\.local\bin\uv.exe
set UV_LINK_MODE=copy

echo [1/3] Creando entorno virtual...
if not exist ".venv" (
    "%UV%" venv .venv --python "%PYTHON%"
)

echo [2/3] Instalando dependencias...
"%UV%" pip install -r requirements.txt --quiet

echo [3/3] Iniciando servidor backend en http://localhost:8001
echo.
echo Documentacion API: http://localhost:8001/docs
echo.
.venv\Scripts\uvicorn.exe main:app --reload --port 8001 --host 0.0.0.0
pause
