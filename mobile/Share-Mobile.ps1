$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$tunnel = Join-Path $env:TEMP 'labassist-cloudflared.exe'
if (-not (Test-Path -LiteralPath $tunnel)) { throw 'Cloudflared is not installed.' }
$ports = @{ student = 8080; supervisor = 5174; workshop = 5175 }
$urls = @{}
foreach ($role in @('student', 'supervisor', 'workshop')) {
    $log = Join-Path $PSScriptRoot ".expo/share-$role.log"
    $err = Join-Path $PSScriptRoot ".expo/share-$role-error.log"
    $process = Start-Process -FilePath $tunnel -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$($ports[$role])", '--http-host-header', 'localhost', '--protocol', 'http2') -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err -PassThru
    $process.Id | Set-Content ".expo/share-$role.pid"
    $until = (Get-Date).AddSeconds(55)
    do {
        Start-Sleep -Milliseconds 400
        $contents = if (Test-Path $err) { Get-Content $err -Raw } else { '' }
        $match = [regex]::Match(([string]$contents + " "), 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($match.Success) { $urls[$role] = $match.Value; break }
        if ($process.HasExited) { throw "The $role tunnel stopped. Check $err" }
    } while ((Get-Date) -lt $until)
    if (-not $urls.ContainsKey($role)) { throw "The $role tunnel did not become ready. Check $err" }
    Write-Output "$role : $($urls[$role])"
}
$urls | ConvertTo-Json | Set-Content -Encoding ASCII '.expo/shared-portals.json'
$env:LABASSIST_SHARED_PREVIEW = '1'
& (Join-Path $PSScriptRoot 'Start-Mobile.ps1') -Tunnel -Clear
