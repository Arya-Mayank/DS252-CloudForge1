@echo off
echo Killing any process on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul
echo Starting backend server...
npm run dev

