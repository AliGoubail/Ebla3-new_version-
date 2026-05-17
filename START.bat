@echo off
echo.
echo  ========================================
echo   Ebla3 Backend Starter
echo  ========================================
echo.

cd /d "%~dp0backend"

:: Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo [1/3] Creating virtual environment with Python 3.11...
    py -3.11 -m venv venv
    if errorlevel 1 (
        echo ERROR: Python 3.11 not found!
        echo Please download from: https://www.python.org/downloads/release/python-3119/
        pause
        exit
    )
)

echo [2/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/3] Installing requirements...
pip install -r requirements.txt -q

echo.
echo Running migrations...
python manage.py makemigrations 2>nul
python manage.py migrate

echo.
echo Seeding sample data...
python seed_data.py

echo.
echo  ========================================
echo   Server running at http://127.0.0.1:8000
echo   Admin panel:  http://127.0.0.1:8000/admin
echo   Login:        admin / admin123
echo  ========================================
echo.
python manage.py runserver

pause
