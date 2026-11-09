$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $runtime = $nodeCommand.Source }
else { $runtime = Join-Path $env:TEMP 'hardwaremate-node-runtime/node_modules/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $runtime)) { throw 'Install Node.js LTS first.' }
$env:PATH = (Split-Path -Parent $runtime) + ';' + $env:PATH
$env:EXPO_NO_TELEMETRY = '1'
Write-Host 'Sign in with the same Expo account you use in Expo Go on your iPhone.'
Write-Host 'Enter your password here only. Do not send it in chat.'
& $runtime (Join-Path $PSScriptRoot 'node_modules/expo/bin/cli') login
if ($LASTEXITCODE -eq 0) {
    & $runtime (Join-Path $PSScriptRoot 'node_modules/expo/bin/cli') whoami
    Write-Host 'Now sign in to that same account in Expo Go and tap Try again.'
}
