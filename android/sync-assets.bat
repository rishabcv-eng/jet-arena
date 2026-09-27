@echo off
REM Copy the current game files into the Android project's assets.
REM Run this after changing the game, then rebuild the APK.

setlocal
cd /d "%~dp0\.."

set DEST=android\app\src\main\assets\game

if not exist "%DEST%\icons" mkdir "%DEST%\icons"

copy /y index.html            "%DEST%\" >nul
copy /y manifest.webmanifest  "%DEST%\" >nul
copy /y sw.js                 "%DEST%\" >nul
copy /y icons\icon-192.png    "%DEST%\icons\" >nul
copy /y icons\icon-512.png    "%DEST%\icons\" >nul

echo Game copied into %DEST%
endlocal
