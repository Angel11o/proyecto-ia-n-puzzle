@echo off
set BACKEND_DIR=C:\Users\angel\OneDrive\Documentos\UNIVERSIDAD\coco-engine2

REM Enciende el backend en su propia ventana
start "Backend N-Puzzle" /D "%BACKEND_DIR%" "%BACKEND_DIR%\build\puzzle_server.exe"

REM Espera un momento a que el servidor levante
timeout /t 2 /nobreak >nul

REM Abre el frontend en el navegador
start "" "%~dp0index.html"