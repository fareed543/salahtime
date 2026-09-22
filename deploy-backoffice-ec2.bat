@echo off
setlocal

rem ===== EC2 settings =====
set "EC2_USER=ec2-user"
set "EC2_HOST=13.205.201.198"
set "KEY_FILE=D:\xampp\htdocs\salah-time\salah-time.pem"
set "REMOTE_DIR=/var/www/back-office"

cd /d "%~dp0backoffice"
if errorlevel 1 exit /b 1

echo Installing backoffice dependencies...
call npm install
if errorlevel 1 exit /b 1

echo Building backoffice...
call ng build --configuration=production
if errorlevel 1 exit /b 1

echo Creating remote directory...
ssh -i "%KEY_FILE%" %EC2_USER%@%EC2_HOST% "sudo mkdir -p %REMOTE_DIR% && sudo chown -R %EC2_USER%:%EC2_USER% %REMOTE_DIR%"
if errorlevel 1 exit /b 1

echo Uploading backoffice build...
scp -i "%KEY_FILE%" -r "dist\oneportal\*" %EC2_USER%@%EC2_HOST%:%REMOTE_DIR%/
if errorlevel 1 exit /b 1

echo Backoffice deployment completed.
pause
