param([Parameter(Mandatory=$true)][string]$Stage)
$ErrorActionPreference = 'Stop'
$evidence = 'artifacts/windows-functional'
New-Item -ItemType Directory $evidence -Force | Out-Null
$installer = (Resolve-Path 'dist-electron/Smart-Manage-Setup-1.0.32.exe').Path
$hash = (Get-FileHash $installer -Algorithm SHA256).Hash
if ($hash -ne '34D86D8F1931A10CCD32518AF95B7DE1AAD00B9EE7AFAB31D084D6DA2546DB9E') { throw 'Checkpoint installer hash mismatch' }
$destination = Join-Path $env:RUNNER_TEMP 'nsis-environment-checkpoint'
$started = Get-Date
Get-Process | Select-Object ProcessName,Id,Path | ConvertTo-Json | Set-Content "$evidence/$Stage-processes.json"
try {
  $process = Start-Process $installer -ArgumentList @('/S',"/D=$destination") -Wait -PassThru -WindowStyle Hidden
  @{stage=$Stage;exitCode=$process.ExitCode;sha256=$hash;image=$env:ImageOS;imageVersion=$env:ImageVersion;destination=$destination;temp=$env:TEMP;attempts=1} | ConvertTo-Json | Set-Content "$evidence/$Stage-result.json"
  if ($process.ExitCode -ne 0) { throw "NSIS checkpoint $Stage failed: $($process.ExitCode)" }
  $exe = Join-Path $destination 'Smart Manage.exe'
  if (-not (Get-Item $exe).VersionInfo.ProductVersion.StartsWith('1.0.32')) { throw 'Checkpoint installed version mismatch' }
  $uninstaller = Get-ChildItem -LiteralPath $destination -Filter '*Uninstall*.exe' | Select-Object -First 1
  if (-not $uninstaller) { throw 'Checkpoint cleanup uninstaller missing' }
  $cleanup = Start-Process $uninstaller.FullName -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
  if ($cleanup.ExitCode -ne 0) { throw 'Checkpoint uninstall failed' }
  for ($wait = 0; $wait -lt 60 -and (Test-Path $exe); $wait++) { Start-Sleep -Seconds 1 }
  if (Test-Path $exe) { throw 'Checkpoint cleanup incomplete: installed executable remains' }
  @{uninstallerExitCode=$cleanup.ExitCode;installedExecutableRemoved=$true} | ConvertTo-Json | Set-Content "$evidence/$Stage-cleanup.json"
} finally {
  Get-WinEvent -FilterHashtable @{LogName='Application';StartTime=$started} -ErrorAction SilentlyContinue |
    Where-Object ProviderName -match 'Application Error|Windows Error Reporting' |
    Select-Object TimeCreated,ProviderName,Id,Message | ConvertTo-Json -Depth 4 | Set-Content "$evidence/$Stage-events.json"
}
