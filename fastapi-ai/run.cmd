@echo off
setlocal
set "SCRIPT_DIR=%~dp0"

if not exist "%SCRIPT_DIR%venv\Scripts\python.exe" (
  echo Khong tim thay Python trong venv. Hay tao venv va cai requirements truoc.
  exit /b 1
)

"%SCRIPT_DIR%venv\Scripts\python.exe" "%SCRIPT_DIR%main.py"
