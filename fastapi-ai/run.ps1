$pythonPath = Join-Path $PSScriptRoot "venv\Scripts\python.exe"

if (-not (Test-Path $pythonPath)) {
  Write-Error "Khong tim thay Python trong venv. Hay tao venv va cai requirements truoc."
  exit 1
}

Push-Location $PSScriptRoot

try {
  & $pythonPath "main.py"
}
finally {
  Pop-Location
}
