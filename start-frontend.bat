@echo off
cd /d %~dp0
start index.html

http-server . -p 8080
pause 