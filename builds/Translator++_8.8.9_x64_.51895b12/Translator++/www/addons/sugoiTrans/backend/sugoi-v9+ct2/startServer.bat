ECHO OFF
CLS
ECHO SERVER STARTED VIA CMD MODE
ECHO The current directory is %CD%
ECHO %*
"../../../../Power-Source/Python39/python.exe" startServer.py %*
ECHO.
ECHO ==============================================================
ECHO The server has been closed.
PAUSE