@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Starting SalahTime Build - %date% %time%
echo ==========================================

:: Go to project folder
cd /d D:\xampp\htdocs\salah-time\frontend

:: Increment app version in Gradle properties before building
set "GRADLE_PROPERTIES=android\gradle.properties"
for /f %%I in ('powershell -NoProfile -Command "$path = Resolve-Path ''android/gradle.properties''; $content = Get-Content -LiteralPath $path; $codeLine = $content | Where-Object { $_ -match ''^APP_VERSION_CODE='' } | Select-Object -First 1; if (-not $codeLine) { throw ''APP_VERSION_CODE not found'' }; $currentCode = [int]($codeLine -replace ''^APP_VERSION_CODE='', ''''); $newCode = $currentCode + 1; $newName = ''1.0.'' + $newCode; $updated = $content | ForEach-Object { if ($_ -match ''^APP_VERSION_CODE='') { ''APP_VERSION_CODE='' + $newCode } elseif ($_ -match ''^APP_VERSION_NAME='') { ''APP_VERSION_NAME='' + $newName } else { $_ } }; Set-Content -LiteralPath $path -Value $updated; Write-Output $newCode; Write-Output $newName"') do (
    if not defined APP_VERSION_CODE (
        set "APP_VERSION_CODE=%%I"
    ) else (
        set "APP_VERSION_NAME=%%I"
    )
)

if not defined APP_VERSION_CODE (
    echo Could not update APP_VERSION_CODE in %GRADLE_PROPERTIES%
    pause
    exit /b 1
)

if not defined APP_VERSION_NAME (
    echo Could not update APP_VERSION_NAME in %GRADLE_PROPERTIES%
    pause
    exit /b 1
)

echo Updated app version code: %APP_VERSION_CODE%
echo Updated app version name: %APP_VERSION_NAME%

:: Read app version from Gradle properties
set "APP_VERSION_NAME="
for /f "tokens=1,* delims==" %%A in (%GRADLE_PROPERTIES%) do (
    if /i "%%A"=="APP_VERSION_NAME" set "APP_VERSION_NAME=%%B"
)

if not defined APP_VERSION_NAME (
    echo Could not read APP_VERSION_NAME from %GRADLE_PROPERTIES%
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
