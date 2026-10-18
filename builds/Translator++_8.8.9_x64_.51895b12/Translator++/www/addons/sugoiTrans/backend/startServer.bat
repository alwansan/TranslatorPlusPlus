ECHO OFF
CLS
ECHO SERVER STARTED VIA CMD MODE
ECHO %*
"../../../../../Power-Source/Python38/python.exe" startServer.py %*
ECHO.
ECHO ==============================================================
ECHO The server has been closed.
PAUSE