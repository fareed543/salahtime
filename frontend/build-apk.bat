@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Starting SalahTime Build - %date% %time%
echo ==========================================

:: Go to project folder
cd /d D:\xampp\htdocs\salah-time\frontend

:: Read app version from Gradle properties
set "APP_VERSION_NAME="
for /f "tokens=1,* delims==" %%A in (android\gradle.properties) do (
    if /i "%%A"=="APP_VERSION_NAME" set "APP_VERSION_NAME=%%B"
)

if not defined APP_VERSION_NAME (
    echo Could not read APP_VERSION_NAME from android\gradle.properties
    pause
    exit /b 1
)

echo Using app version: %APP_VERSION_NAME%

:: Update Angular environment versions before build
call npm run sync:app-version
if %errorlevel% neq 0 (
    echo Failed to update environment versions!
    pause
    exit /b %errorlevel%
)

echo Environment files updated to version %APP_VERSION_NAME%.

:: Remove old dist folder
if exist dist (
    rd /s /q dist
    echo Old dist folder removed.
)

:: Angular production build
echo Running Angular production build...
call npm run build:prod
if %errorlevel% neq 0 (
    echo Angular build failed!
    pause
    exit /b %errorlevel%
)

:: Capacitor copy + sync (IMPORTANT)
echo Copying web assets to Android...
call npx cap copy android
if %errorlevel% neq 0 (
    echo Capacitor copy failed!
    pause
    exit /b %errorlevel%
)

echo Running Capacitor sync...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Capacitor sync failed!
    pause
    exit /b %errorlevel%
)

:: Go to Android folder
cd android

:: Clean Android build
echo Cleaning Android build...
call gradlew clean
if %errorlevel% neq 0 (
    echo Gradle clean failed!
    pause
    exit /b %errorlevel%
)

:: Build Android APK release
echo Building Android APK release...
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo APK build failed!
    pause
    exit /b %errorlevel%
)

:: Build Android App Bundle
echo Building Android App Bundle...
call gradlew bundleRelease
if %errorlevel% neq 0 (
    echo Bundle build failed!
    pause
    exit /b %errorlevel%
)

echo ==========================================
echo Build completed successfully!
echo ==========================================
pause
