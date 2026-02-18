@echo off
echo ==========================================
echo      BUILDING WINDOWS COMMAND CONTROLLER
echo ==========================================
echo.

echo [1/2] Building Backend (PyInstaller)...
cd backend
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build
pyinstaller --onefile --name interview-backend main.py
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b %errorlevel%
)
cd ..
echo [SUCCESS] Backend built successfully.
echo.

echo [2/2] Building Frontend (Electron)...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %errorlevel%
)
cd ..
echo.

echo ==========================================
echo [SUCCESS] ALL BUILDS COMPLETE!
echo Installer is located in: frontend/dist/
echo ==========================================
pause
