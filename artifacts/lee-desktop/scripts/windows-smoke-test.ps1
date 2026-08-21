param(
  [Parameter(Mandatory = $true)]
  [string] $InstallerPath
)

$ErrorActionPreference = "Stop"
$testRoot = Join-Path $env:RUNNER_TEMP "lee-windows-smoke-$([guid]::NewGuid())"
$installDir = Join-Path $testRoot "install"
$appData = Join-Path $testRoot "appdata"
$statusFile = Join-Path $testRoot "runtime-status.json"
$configFile = Join-Path $appData "Project LEE\config.json"
$migrationLog = Join-Path $appData "Project LEE\logs\migration.log"
$databaseDir = Join-Path $appData "Project LEE\database"
$appExe = $null

New-Item -ItemType Directory -Force $testRoot | Out-Null

function Assert-True([bool] $condition, [string] $message) {
  if (-not $condition) { throw "LEE Windows smoke test failed: $message" }
}

function Stop-ProcessTree([int] $processId) {
  & taskkill.exe /pid $processId /t /f 2>$null | Out-Null
}

function Invoke-Lee([hashtable] $environment, [string] $label) {
  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $appExe
  $psi.Arguments = "--lee-smoke-exit"
  $psi.WorkingDirectory = $installDir
  $psi.UseShellExecute = $false
  foreach ($entry in $environment.GetEnumerator()) {
    $psi.Environment[$entry.Key] = $entry.Value
  }
  $process = [System.Diagnostics.Process]::Start($psi)
  Assert-True ($null -ne $process) "$label did not start"
  if (-not $process.WaitForExit(120000)) {
    Stop-ProcessTree $process.Id
    throw "$label did not exit after its smoke run"
  }
  Assert-True (Test-Path $statusFile) "$label did not write runtime status"
  $status = Get-Content $statusFile -Raw | ConvertFrom-Json
  Remove-Item $statusFile -Force
  return $status
}

try {
  Assert-True (Test-Path $InstallerPath) "installer is missing: $InstallerPath"
  $installer = Start-Process -FilePath $InstallerPath -ArgumentList @("/S", "/D=$installDir") -Wait -PassThru
  Assert-True ($installer.ExitCode -eq 0) "silent installer exited with $($installer.ExitCode)"
  $appExe = Get-ChildItem $installDir -Filter "*.exe" | Where-Object { $_.Name -notlike "Uninstall*" } | Select-Object -First 1
  Assert-True ($null -ne $appExe) "installed application executable is missing"
  $appExe = $appExe.FullName

  $commonEnvironment = @{
    APPDATA = $appData
    LEE_MIGRATION_COMMAND = "cmd /c exit 0"
    LEE_SMOKE_STATUS_FILE = $statusFile
  }
  $first = Invoke-Lee $commonEnvironment "clean first launch"
  foreach ($directory in @(
    (Join-Path $appData "Project LEE\database"),
    (Join-Path $appData "Project LEE\brain"),
    (Join-Path $appData "Project LEE\event-log"),
    (Join-Path $appData "Project LEE\logs")
  )) {
    Assert-True (Test-Path $directory) "first launch did not create $directory"
  }
  Assert-True ($first.database -eq "configured") "private PostgreSQL was not configured"
  Assert-True ($first.migration -eq "complete") "clean migration did not complete"
  Assert-True (-not (Get-Process postgres, pg_ctl -ErrorAction SilentlyContinue)) "PostgreSQL processes survived Exit LEE"

  $config = Get-Content $configFile -Raw | ConvertFrom-Json
  $databaseUrl = $config.databaseUrl
  Assert-True ($databaseUrl -match "^postgresql://lee@127\.0\.0\.1:\d+/lee$") "private database URL was not persisted"
  $config | Add-Member -NotePropertyName migrationCommand -NotePropertyValue "cmd /c exit 23" -Force
  $config | ConvertTo-Json | Set-Content $configFile -Encoding utf8
  $failed = Invoke-Lee @{ APPDATA = $appData; LEE_SMOKE_STATUS_FILE = $statusFile } "forced migration failure"
  Assert-True ($failed.migration -eq "failed") "forced migration failure was not reported"
  Assert-True ($failed.reason -like "*$migrationLog*") "migration failure did not report the log path"
  Assert-True (Test-Path $migrationLog) "migration log was not written"
  Assert-True (-not (Get-Process postgres, pg_ctl -ErrorAction SilentlyContinue)) "PostgreSQL processes survived failed startup"

  $config.migrationCommand = "cmd /c exit 0"
  $config | ConvertTo-Json | Set-Content $configFile -Encoding utf8
  $restarted = Invoke-Lee $commonEnvironment "restart"
  Assert-True ($restarted.database -eq "configured") "restart did not reuse the private database"
  $configAfterRestart = Get-Content $configFile -Raw | ConvertFrom-Json
  Assert-True ($configAfterRestart.databaseUrl -eq $databaseUrl) "restart changed the persisted database URL"
  Assert-True (Test-Path (Join-Path $databaseDir "PG_VERSION")) "restart did not reuse the configured database directory"
  Assert-True (-not (Get-Process postgres, pg_ctl -ErrorAction SilentlyContinue)) "PostgreSQL processes survived restart Exit LEE"

  Write-Host "LEE Windows installer smoke test passed: clean launch, private PostgreSQL, migration failure reporting, Exit LEE cleanup, and restart reuse."
} finally {
  Get-Process "Project-LEE", postgres, pg_ctl -ErrorAction SilentlyContinue | ForEach-Object { Stop-ProcessTree $_.Id }
  if (Test-Path $testRoot) { Remove-Item $testRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
