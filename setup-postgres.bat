@echo off
echo ========================================
echo PostgreSQL 18 Setup Script
echo ========================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Step 1: Initializing PostgreSQL Database Cluster...
echo.
echo You will be asked to set a password for the 'postgres' user.
echo REMEMBER THIS PASSWORD - you'll need it!
echo.
pause

"C:\Program Files\PostgreSQL\18\bin\initdb.exe" -D "C:\Program Files\PostgreSQL\18\data" -U postgres -W -E UTF8 --locale=C

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Database cluster initialization failed!
    echo.
    echo Possible causes:
    echo - Data directory already has files
    echo - Permission issues
    echo.
    echo Try cleaning the data directory first:
    echo rd /s /q "C:\Program Files\PostgreSQL\18\data"
    echo mkdir "C:\Program Files\PostgreSQL\18\data"
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 2: Registering PostgreSQL Service...
echo ========================================
echo.

"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" register -N postgresql-18 -D "C:\Program Files\PostgreSQL\18\data"

if %errorLevel% neq 0 (
    echo.
    echo WARNING: Service registration failed or service already exists.
    echo This is OK if the service already exists.
    echo.
)

echo.
echo ========================================
echo Step 3: Starting PostgreSQL Service...
echo ========================================
echo.

net start postgresql-18

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Failed to start PostgreSQL service!
    echo.
    echo Try starting it manually:
    echo services.msc -> Find "postgresql-18" -> Start
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 4: Creating Database 'haber_db'...
echo ========================================
echo.
echo Enter the password you just set for 'postgres' user:

"C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres haber_db

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Failed to create database!
    echo Make sure you entered the correct password.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! PostgreSQL is now set up!
echo ========================================
echo.
echo Next steps:
echo 1. Update your .env file with the PostgreSQL password
echo 2. Run: npm run init-db
echo 3. Restart your backend
echo.
echo Press any key to continue...
pause >nul
