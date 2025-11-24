@echo off
REM Audio Conversion Script for Game Optimization
REM This script converts WAV files to OGG format for better web performance

echo === Game Asset Optimizer ===
echo.
echo This script will convert your WAV audio files to compressed OGG format
echo Expected size reduction: 90%% (12.8 MB -^> ~1.25 MB)
echo.

REM Check if ffmpeg is installed
where ffmpeg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ffmpeg is not installed or not in PATH
    echo.
    echo Please install ffmpeg:
    echo 1. Download from: https://ffmpeg.org/download.html
    echo 2. Or use: winget install ffmpeg
    echo 3. Or use: choco install ffmpeg
    echo.
    pause
    exit /b 1
)

echo [OK] ffmpeg found
echo.

cd /d "%~dp0public\assets"

echo Converting audio files...
echo.

REM Convert each WAV file to OGG with good quality settings (-q:a 6 = ~128kbps)
echo [1/3] Converting Casualty LOOP 1...
ffmpeg -i "White Bat Audio - Casualty LOOP 1.wav" -c:a libvorbis -q:a 6 "casualty-loop-1.ogg" -y
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to convert LOOP 1
    pause
    exit /b 1
)

echo [2/3] Converting Casualty LOOP 2...
ffmpeg -i "White Bat Audio - Casualty LOOP 2.wav" -c:a libvorbis -q:a 6 "casualty-loop-2.ogg" -y
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to convert LOOP 2
    pause
    exit /b 1
)

echo [3/3] Converting Casualty LOOP 3...
ffmpeg -i "White Bat Audio - Casualty LOOP 3.wav" -c:a libvorbis -q:a 6 "casualty-loop-3.ogg" -y
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to convert LOOP 3
    pause
    exit /b 1
)

echo.
echo ===================================
echo [SUCCESS] All files converted!
echo ===================================
echo.

REM Show file sizes
echo Original WAV files:
dir "White Bat Audio - Casualty LOOP*.wav" | find "LOOP"
echo.
echo New OGG files:
dir "casualty-loop-*.ogg" | find "loop"
echo.

echo Size reduction achieved!
echo Original WAV files can be safely kept but won't be deployed.
echo The OGG files will be used in production builds.
echo.
pause
