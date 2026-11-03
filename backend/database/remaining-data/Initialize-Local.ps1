$ErrorActionPreference = 'Stop'
$stageRoot = $PSScriptRoot
$secretDirectory = Join-Path $stageRoot 'secrets'
$passwordFile = Join-Path $secretDirectory 'postgres_password.txt'
if (-not (Test-Path -LiteralPath $secretDirectory)) {
    New-Item -ItemType Directory -Path $secretDirectory | Out-Null
}
if (-not (Test-Path -LiteralPath $passwordFile)) {
    $secretBytes = New-Object byte[] 32
    $randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $randomGenerator.GetBytes($secretBytes) } finally { $randomGenerator.Dispose() }
    [System.IO.File]::WriteAllText($passwordFile, [Convert]::ToBase64String($secretBytes), (New-Object System.Text.UTF8Encoding($false)))
}
$environmentFile = Join-Path $stageRoot '.env'
if (-not (Test-Path -LiteralPath $environmentFile)) {
    Copy-Item -LiteralPath (Join-Path $stageRoot '.env.example') -Destination $environmentFile
}
Write-Output 'Local configuration ready. Existing database credentials were preserved.'
Write-Output 'Next: docker compose up -d --wait'
