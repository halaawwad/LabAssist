param([switch]$Tunnel,[switch]$Clear)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $runtime = $nodeCommand.Source }
else { $runtime = Join-Path $env:TEMP 'hardwaremate-node-runtime/node_modules/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $runtime)) { throw 'Install Node.js LTS, then run this script again.' }
$env:PATH = (Split-Path -Parent $runtime) + ';' + $env:PATH
$env:EXPO_NO_TELEMETRY = '1'
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot '.expo') | Out-Null
$ports=@{student=8080;supervisor=5174;workshop=5175}
foreach($portal in @('student','supervisor','workshop')){
    $client=New-Object System.Net.Sockets.TcpClient
    $running=$false
    try{$running=$client.ConnectAsync('127.0.0.1',$ports[$portal]).Wait(300) -and $client.Connected}catch{}finally{$client.Dispose()}
    if(-not $running){
        $script=Join-Path $PSScriptRoot 'Start-Original-Web.ps1'
        Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$script+'"'),'-Portal',$portal) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot ".expo/web-$portal.log") -RedirectStandardError (Join-Path $PSScriptRoot ".expo/web-$portal-error.log") | Out-Null
    }
}
$cli = Join-Path $PSScriptRoot 'node_modules/expo/bin/cli'
if (-not (Test-Path -LiteralPath $cli)) { throw 'Run npm install --workspaces=false inside mobile first.' }
$options=@('start','--go','--port','8081')
if($Tunnel){$options+='--tunnel'}else{$options+='--lan'}
if($Clear){$options+='--clear'}
& $runtime $cli @options
exit $LASTEXITCODE
