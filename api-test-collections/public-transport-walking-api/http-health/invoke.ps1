$ErrorActionPreference = 'Stop'

Invoke-WebRequest -Uri 'http://localhost:7071/api/health' -Method Get -UseBasicParsing