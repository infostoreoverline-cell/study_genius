@echo off
cd /d "%~dp0"
title Study Genius - Avvio in corso...
color 0B

echo.
echo  ===========================================
echo           STUDY GENIUS - v1.0               
echo      Tool AI per Riassunti Universitari     
echo  ===========================================
echo.

node --version >nul 2>&1
if errorlevel 1 goto nonode

if exist "node_modules" goto startserver

echo Installazione dipendenze (solo la prima volta)...
call npm install
if errorlevel 1 goto noinstall
echo Dipendenze installate con successo!
echo.

:startserver
echo Avvio del server in corso...
echo.

:: Libera la porta 3000 se occupata da un processo precedente
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
timeout /t 1 /nobreak >nul

echo  ===========================================
echo    Study Genius e' in avvio!               
echo    Il browser si aprira' in automatico      
echo    appena il server sara' pronto su:        
echo    http://localhost:3000                    
echo                                             
echo    [ IMPORTANTE ]                           
echo    Per fermare il server, clicca la 'X'     
echo    in alto a destra in questa finestra      
echo    oppure usa "CHIUDI SERVER.bat".          
echo  ===========================================
echo.
echo  --- LOG IN TEMPO REALE ---
echo.

:: Avvia il server in primo piano (server.js aprirà il browser solo quando è pronto!)
node server.js

pause
exit /b 0

:nonode
echo [ERRORE] Node.js non trovato! Scaricalo da: https://nodejs.org
pause
exit /b 1

:noinstall
echo [ERRORE] Installazione dipendenze fallita!
pause
exit /b 1
