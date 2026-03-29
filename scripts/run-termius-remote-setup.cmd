@echo off
setlocal
set "SCRIPT=C:\Users\trent\OneDrive\Desktop\setup-termius-remote.ps1"

if not exist "%SCRIPT%" (
  echo setup-termius-remote.ps1 was not found on the Desktop.
  echo Expected path: %SCRIPT%
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
endlocal
