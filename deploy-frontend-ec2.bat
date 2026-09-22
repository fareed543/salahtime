@echo off
setlocal

rem ===== EC2 settings =====
set "EC2_USER=ec2-user"
set "EC2_HOST=13.205.201.198"
set "KEY_FILE=D:\xampp\htdocs\salah-time\salah-time.pem"
set "REMOTE_DIR=/var/www/front-office"

cd /d "%~dp0frontend"
if errorlevel 1 exit /b 1

echo Installing frontend dependencies...
call npm install
if errorlevel 1 exit /b 1

echo Building frontend...
call npm run build:prod
if errorlevel 1 exit /b 1

echo Creating remote directory...
ssh -i "%KEY_FILE%" %EC2_USER%@%EC2_HOST% "sudo mkdir -p %REMOTE_DIR% && sudo chown -R %EC2_USER%:%EC2_USER% %REMOTE_DIR%"
if errorlevel 1 exit /b 1

echo Uploading frontend build...
scp -i "%KEY_FILE%" -r "dist\salahtime\*" %EC2_USER%@%EC2_HOST%:%REMOTE_DIR%/
if errorlevel 1 exit /b 1

echo Frontend deployment completed.
pause
