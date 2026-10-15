@echo off
title Server Tangklet Dokter
echo ============================================
echo  Menjalankan server lokal Tangklet Dokter
echo ============================================
echo.
echo Server akan berjalan di: http://localhost:3000
echo Tekan Ctrl + C untuk menghentikan server.
echo.
start "" http://localhost:3000/
node "%~dp0server.js"
pause
