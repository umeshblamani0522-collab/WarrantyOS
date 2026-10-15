@echo off
setlocal
cd /d "%~dp0..\backend"

if not defined MAVEN_HOME set "MAVEN_HOME=D:\apache-maven-3.10.0"
if exist "%MAVEN_HOME%\bin\mvn.cmd" (
  set "MAVEN_CMD=%MAVEN_HOME%\bin\mvn.cmd"
) else (
  set "MAVEN_CMD=mvn.cmd"
)

echo [1/3] Cleaning previous compiled classes...
if exist target rmdir /s /q target

echo [2/3] Compiling backend...
call "%MAVEN_CMD%" -q clean package -DskipTests
if errorlevel 1 (
  echo BUILD FAILED. Check the Maven output above.
  exit /b 1
)

if not exist target\classes\com\wp\ReplacementRecord.class (
  echo ERROR: ReplacementRecord.class was not generated.
  echo This indicates the source tree is incomplete or Maven is using the wrong project folder.
  exit /b 2
)

echo [3/3] Runtime class check passed: ReplacementRecord.class exists.
echo Backend verification passed.
exit /b 0
