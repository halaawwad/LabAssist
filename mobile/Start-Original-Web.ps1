param([ValidateSet('student','supervisor','workshop')][string]$Portal='student')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$project=Join-Path $projectRoot ('frontend/'+$Portal)
$nodeCommand=Get-Command node -ErrorAction SilentlyContinue
if($nodeCommand){$runtime=$nodeCommand.Source}else{$runtime=Join-Path $env:TEMP 'hardwaremate-node-runtime/node_modules/node/bin/node.exe'}
$env:PATH=(Split-Path -Parent $runtime)+';'+$env:PATH
$vite=Join-Path $project 'node_modules/vite/bin/vite.js'
if(-not(Test-Path -LiteralPath $vite)){$vite=Join-Path $projectRoot 'node_modules/vite/bin/vite.js'}
if(-not(Test-Path -LiteralPath $vite)){throw "Install the original $Portal web dependencies first."}
$ports=@{student=8080;supervisor=5174;workshop=5175}
Set-Location -LiteralPath $project
& $runtime $vite --host 0.0.0.0 --port $ports[$Portal] --strictPort
exit $LASTEXITCODE
