@echo off
setlocal

:: Welcome message
echo ===========================================================================
ECHO Warning: Hard Reset will revert your Translator++ on the pristine condition.
ECHO All Translator++ and its add-on setting will be cleared!
ECHO (The existing stagging folders for your projects will not be removed)
echo ===========================================================================
ECHO.

:: Check for the -f (force) flag
set "FORCE_MODE=false"
if "%~1"=="-f" (
    set "FORCE_MODE=true"
)

set "LOCAL_APPDATA=%USERPROFILE%\AppData\Local\translator++"

:: Function to delete temporary files
:delete_temp_files
echo Killing all Translator++ processes...
taskkill /F /IM Translator++.exe 2>NUL

:: Check if the process was successfully terminated
if %ERRORLEVEL% equ 0 (
    echo Translator++ processes terminated.
) else (
    echo No Translator++ processes found.
)

echo Deleting data...
:: Delete the contents of the AppData\Local folder
rmdir /S /Q "%LOCAL_APPDATA%"

echo Data deleted successfully.

:: Start Translator++ application without blocking
echo Starting Translator++ application...
start "" "translator++.exe"
goto end

:: Check if force mode is enabled
if "%FORCE_MODE%"=="true" (
    goto delete_temp_files
)

:: Prompt the user for confirmation before deletion
echo This will delete the contents of %LOCAL_APPDATA%.
set /p delConfirm="Are you sure you want to delete all contents in this folder? (Y/N): "

:: Check the user's input
if /I "%delConfirm%"=="Y" (
    goto delete_temp_files
) else (
    echo Deletion aborted.
)

:end
endlocal
