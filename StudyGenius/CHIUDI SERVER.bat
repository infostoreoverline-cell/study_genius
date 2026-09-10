@echo off
title Chiusura Study Genius...
color 0C

echo.
echo  ===========================================
echo         CHIUSURA DI STUDY GENIUS
echo  ===========================================
echo.
echo Sto spegnendo il server e pulendo i processi in background...

:: Usa PowerShell per chiudere tutti i processi node in modo sicuro
powershell -NoProfile -Command "Stop-Process -Name 'node' -Force -ErrorAction SilentlyContinue"

echo.
echo [ OK ] Tutti i processi del server sono stati chiusi!
echo        Non ci sono piu' server fantasma in esecuzione.
echo.
ping 127.0.0.1 -n 3 >nul
exit /b 0
