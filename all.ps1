$root = $PSScriptRoot

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  (Join-Path $root "ai.ps1")
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  (Join-Path $root "api.ps1")
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  (Join-Path $root "fe.ps1")
)

Write-Host "Da mo 3 cua so cho fastapi-ai, node-gateway, frontend."
