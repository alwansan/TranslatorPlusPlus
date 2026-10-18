ECHO OFF
CLS
ECHO SERVER STARTED VIA CMD MODE
ECHO The current directory is %CD%
ECHO %*
"Python38/python.exe" pys/startServer.py %*
ECHO.
ECHO ==============================================================
ECHO The server has been closed.
PAUSE