$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$webDir = Join-Path $root "www"

New-Item -ItemType Directory -Force -Path $webDir | Out-Null
Copy-Item -Path (Join-Path $root "index.html") -Destination (Join-Path $webDir "index.html") -Force
Copy-Item -Path (Join-Path $root "app.js") -Destination (Join-Path $webDir "app.js") -Force
Copy-Item -Path (Join-Path $root "styles.css") -Destination (Join-Path $webDir "styles.css") -Force

Write-Host "Prepared web assets in $webDir"
