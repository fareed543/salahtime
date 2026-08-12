@echo off
setlocal

echo ==========================================
echo Starting Backoffice Production Build - %date% %time%
echo ==========================================

cd /d D:\xampp\htdocs\salah-time\backoffice

set "APP_VERSION="
for /f "tokens=1,* delims==" %%A in ('node tools\bump-backoffice-version.js') do (
    if /i "%%A"=="APP_VERSION" set "APP_VERSION=%%B"
)

if not defined APP_VERSION (
    echo Could not update backoffice app version.
    pause
    exit /b 1
)

echo Updated backoffice version: %APP_VERSION%

if exist dist (
    rd /s /q dist
    echo Old dist folder removed.
)

echo Running Angular production build...
call ng build --configuration=production
if %errorlevel% neq 0 (
    echo Angular production build failed!
    pause
    exit /b %errorlevel%
)

echo ==========================================
echo Backoffice build completed successfully!
echo ==========================================
pause
