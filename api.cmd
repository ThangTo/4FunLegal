@echo off
setlocal
cd /d "%~dp0node-gateway"
call npm.cmd run dev
