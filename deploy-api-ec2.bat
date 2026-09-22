@echo off
setlocal

rem ===== EC2 settings =====
set "EC2_USER=ec2-user"
set "EC2_HOST=13.205.201.198"
set "KEY_FILE=D:\xampp\htdocs\salah-time\salah-time.pem"
set "REMOTE_DIR=/var/www/api"
set "STAGING_DIR=%TEMP%\salah-time-api-deploy"

cd /d "%~dp0"
if errorlevel 1 exit /b 1

if exist "%STAGING_DIR%" rd /s /q "%STAGING_DIR%"
mkdir "%STAGING_DIR%"

echo Preparing API files. Local .env, vendor, and runtime are excluded...
robocopy "api" "%STAGING_DIR%" /E /XD "api\vendor" "api\runtime" /XF ".env" >nul
if %errorlevel% GEQ 8 exit /b 1

echo Creating remote directory...
ssh -i "%KEY_FILE%" %EC2_USER%@%EC2_HOST% "sudo mkdir -p %REMOTE_DIR%/web && sudo chown -R %EC2_USER%:%EC2_USER% %REMOTE_DIR%"
if errorlevel 1 exit /b 1

echo Uploading API source...
scp -i "%KEY_FILE%" -r "%STAGING_DIR%\*" %EC2_USER%@%EC2_HOST%:%REMOTE_DIR%/
if errorlevel 1 exit /b 1

echo Installing PHP dependencies on EC2...
ssh -i "%KEY_FILE%" %EC2_USER%@%EC2_HOST% "cd %REMOTE_DIR% && composer install --no-dev --optimize-autoloader"
if errorlevel 1 exit /b 1

rd /s /q "%STAGING_DIR%"
echo API deployment completed. The server-side .env was preserved.
pause
