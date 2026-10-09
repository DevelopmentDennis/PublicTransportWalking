$ErrorActionPreference = 'Stop'

Invoke-WebRequest `
  -Uri 'http://localhost:7071/api/GetDistanceTime' `
  -Method Post `
  -ContentType 'application/json' `
  -Body (Get-Content -Raw -Path (Join-Path $PSScriptRoot 'sample-data.json')) `
  -UseBasicParsing