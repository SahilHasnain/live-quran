@echo off
REM Live Quran Radio Management Script for Windows

setlocal enabledelayedexpansion

cd /d "%~dp0"

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="status" goto status
if "%1"=="logs" goto logs
if "%1"=="current" goto current
if "%1"=="clean" goto clean
if "%1"=="rebuild" goto rebuild
goto help

:start
if not exist .env (
    echo [ERROR] .env file not found!
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Please edit .env with your Appwrite credentials
    exit /b 1
)

if "%2"=="" (
    echo Starting all radio streams...
    docker-compose up -d
    echo All streams started!
    goto status
) else (
    echo Starting %2 radio...
    docker-compose up -d %2-radio
    echo %2 radio started!
)
goto end

:stop
if "%2"=="" (
    echo Stopping all radio streams...
    docker-compose down
    echo All streams stopped!
) else (
    echo Stopping %2 radio...
    docker-compose stop %2-radio
    echo %2 radio stopped!
)
goto end

:restart
if "%2"=="" (
    echo Restarting all radio streams...
    docker-compose restart
    echo All streams restarted!
) else (
    echo Restarting %2 radio...
    docker-compose restart %2-radio
    echo %2 radio restarted!
)
goto end

:status
echo.
echo Stream Status:
echo.

curl -sf http://localhost:3000/health >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Tafseer Radio: Running
    echo   Stream: http://localhost:8000/tafseer
    echo   API: http://localhost:3000/api/current
) else (
    echo [ERROR] Tafseer Radio: Not running
)

echo.

curl -sf http://localhost:3001/health >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Tilawat Radio: Running
    echo   Stream: http://localhost:8001/tilawat
    echo   API: http://localhost:3001/api/current
) else (
    echo [ERROR] Tilawat Radio: Not running
)

echo.

curl -sf http://localhost:3002/health >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Translation Radio: Running
    echo   Stream: http://localhost:8002/translation
    echo   API: http://localhost:3002/api/current
) else (
    echo [ERROR] Translation Radio: Not running
)

echo.
goto end

:logs
if "%2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %2-radio
)
goto end

:current
if "%2"=="" (
    echo Please specify stream: tafseer, tilawat, or translation
    exit /b 1
)

if "%2"=="tafseer" set PORT=3000
if "%2"=="tilawat" set PORT=3001
if "%2"=="translation" set PORT=3002

echo Stream info for %2:
curl -s http://localhost:!PORT!/api/info
goto end

:clean
echo Cleaning audio cache...
if exist audio-cache\tafseer rmdir /s /q audio-cache\tafseer
if exist audio-cache\tilawat rmdir /s /q audio-cache\tilawat
if exist audio-cache\translation rmdir /s /q audio-cache\translation
mkdir audio-cache\tafseer
mkdir audio-cache\tilawat
mkdir audio-cache\translation
echo Cache cleaned!
goto end

:rebuild
if not exist .env (
    echo [ERROR] .env file not found!
    exit /b 1
)
echo Rebuilding containers...
docker-compose down
docker-compose build --no-cache
docker-compose up -d
echo Rebuild complete!
goto end

:help
echo Live Quran Radio Management Script
echo.
echo Usage: manage.bat [command] [options]
echo.
echo Commands:
echo   start [stream]      Start all streams or specific stream (tafseer^|tilawat^|translation)
echo   stop [stream]       Stop all streams or specific stream
echo   restart [stream]    Restart all streams or specific stream
echo   status              Show status of all streams
echo   logs [stream]       Show logs (all or specific stream)
echo   current ^<stream^>    Show stream info for stream
echo   clean               Clean audio cache
echo   rebuild             Rebuild containers from scratch
echo   help                Show this help message
echo.
echo Examples:
echo   manage.bat start                    # Start all streams
echo   manage.bat start tafseer            # Start only tafseer stream
echo   manage.bat logs tilawat             # Show tilawat logs
echo   manage.bat current translation      # Show translation stream info
echo   manage.bat status                   # Show status of all streams
echo.

:end
endlocal
