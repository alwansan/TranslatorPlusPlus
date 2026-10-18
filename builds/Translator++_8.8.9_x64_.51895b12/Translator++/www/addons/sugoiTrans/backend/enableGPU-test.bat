echo off
cls
echo python version
.\python.exe --version
echo pip version
cd scripts
echo %CD%
echo .
.\pip.exe --version
pause