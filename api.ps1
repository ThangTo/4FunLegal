Push-Location (Join-Path $PSScriptRoot "node-gateway")

try {
  & npm.cmd run dev
}
finally {
  Pop-Location
}
