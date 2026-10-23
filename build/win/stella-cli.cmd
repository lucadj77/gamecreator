@echo off
rem Comando stella per Windows (vedi docs/cli.md). stella.exe e un programma a finestre: lanciato
rem da qui il prompt aspetta la fine e riceve il codice di uscita. Senza sandbox di Chromium,
rem che non parte dentro la sandbox di alcuni agenti IA: il comando disegna solo il progetto.
start "" /b /wait "%~dp0stella.exe" --no-sandbox --disable-gpu --cli %*
exit /b %ERRORLEVEL%
