@echo off
cd /d "%~dp0"
title 3D Grand Gallery Server
echo ========================================================
echo   Starting 3D Grand Gallery Local Server...
echo ========================================================
echo.
start "" "http://localhost:8089/index.html"
if exist "C:\Program Files\nodejs\node.exe" (
    "C:\Program Files\nodejs\node.exe" server.js
) else (
    node server.js
)
echo.
pause
