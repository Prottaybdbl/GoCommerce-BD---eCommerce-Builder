@echo off
setlocal
echo ==============================================================================
echo                 GO COMMERCE BD — SAAS PLATFORM (LOCAL RUNNER)                
echo ==============================================================================

rem Check if PowerShell is available to run run.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Script completed with exit code %ERRORLEVEL%.
)
endlocal
