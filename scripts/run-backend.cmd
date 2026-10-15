@echo off
setlocal
cd /d "%~dp0..\backend"

if not exist "local.env.cmd" (
    echo ERROR: backend\local.env.cmd is missing.
    echo Create it using your local database credentials and JWT secret.
    exit /b 1
)

call "local.env.cmd"
set "MAVEN_HOME=D:\apache-maven-3.10.0"

if exist "mail.env.cmd" (
    call "mail.env.cmd"
) else (
    echo WARNING: backend\mail.env.cmd is missing.
    echo Real email delivery requires SMTP configuration.
)

"%MAVEN_HOME%\bin\mvn.cmd" clean spring-boot:run