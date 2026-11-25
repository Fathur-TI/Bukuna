@echo off
title BUKUNA - Server Cerita Anak Digital
echo ===================================================
echo   Menjalankan Website BUKUNA di http://localhost:5173
echo ===================================================
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Node.js terdeteksi. Menjalankan Vite Dev Server...
    if not exist node_modules (
        call npm install
    )
    call npm run dev
) else (
    echo Menjalankan Server Lokal Python BUKUNA di http://localhost:5173 ...
    start "" "http://localhost:5173"
    python "%~dp0dev_server.py"
)
pause
