@echo off
REM PowerShell runs npm.ps1 first, which is blocked when ExecutionPolicy is Restricted.
REM Use this file from PowerShell:  .\npm-safe.cmd run git:login
setlocal
cd /d "%~dp0"
call npm.cmd %*
