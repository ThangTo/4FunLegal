@echo off
setlocal
set "ROOT=%~dp0"

start "fastapi-ai" cmd /k ""%ROOT%fastapi-ai\run.cmd""
start "node-gateway" cmd /k "cd /d ""%ROOT%node-gateway"" && npm.cmd run dev"
start "frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm.cmd run dev"

echo Da mo 3 cua so cho fastapi-ai, node-gateway, frontend.
