@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\uvicorn.exe" (
  echo Uvicorn introuvable dans api\.venv.
  echo Installe les dependances avec : .venv\Scripts\python.exe -m pip install -r requirements.txt
  pause
  exit /b 1
)
".venv\Scripts\uvicorn.exe" app.main:app --reload --host 127.0.0.1 --port 8000
