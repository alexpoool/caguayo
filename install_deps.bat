@echo off
echo Instalando dependencias del backend...
"C:\Users\AKIRA\AppData\Local\Programs\Python\Python312\python.exe" -m pip install --user fastapi uvicorn sqlalchemy sqlmodel pydantic python-dotenv psycopg-binary alembic

echo.
echo Instalando alembic...
"C:\Users\AKIRA\AppData\Local\Programs\Python\Python312\python.exe" -m pip install --user alembic

echo.
echo Dependencias instaladas!
pause
