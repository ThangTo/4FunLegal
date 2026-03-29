Push-Location (Join-Path $PSScriptRoot "fastapi-ai")

try {
  & ".\run.ps1"
}
finally {
  Pop-Location
}
