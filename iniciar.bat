@echo off
setlocal
cd /d "%~dp0"
title N-Puzzle

set "SERVER=backend\puzzle_server.exe"
if not exist "%SERVER%" set "SERVER=..\coco-engine2\build\puzzle_server.exe"

if not exist "%SERVER%" (
  echo.
  echo No se encontro puzzle_server.exe.
  echo.
  echo 1. Descargalo de la seccion Releases del repo del backend.
  echo 2. Guardalo en la carpeta "backend" de este proyecto:
  echo    %~dp0backend\puzzle_server.exe
  echo 3. Vuelve a ejecutar iniciar.bat
  echo.
  pause
  exit /b 1
)

netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if %errorlevel%==0 (
  echo El backend ya esta corriendo en el puerto 8080.
) else (
  echo Iniciando backend...
  for %%I in ("%SERVER%") do (
    pushd "%%~dpI"
    start "N-Puzzle backend" "%%~fI"
    popd
  )
  timeout /t 3 /nobreak >nul
)

start "" "%~dp0index.html"
endlocal