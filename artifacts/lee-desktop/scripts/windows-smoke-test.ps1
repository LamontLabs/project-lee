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

function Invoke-TrayExit([System.Diagnostics.Process] $process) {
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class LeeMouse {
  [DllImport("user32.dll", SetLastError = true)]
  private static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll", SetLastError = true)]
  private static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
  public static void RightClick(int x, int y) {
    if (!SetCursorPos(x, y)) throw new InvalidOperationException("Could not position the mouse.");
    mouse_event(0x0008, 0, 0, 0, UIntPtr.Zero);
    mouse_event(0x0010, 0, 0, 0, UIntPtr.Zero);
  }
}
"@

  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $iconCondition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::NameProperty,
    "Project LEE"
  )
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  $icon = $null
  while ([DateTime]::UtcNow -lt $deadline -and $null -eq $icon) {
    $icons = $root.FindAll(
      [System.Windows.Automation.TreeScope]::Descendants,
      $iconCondition
    )
    foreach ($candidate in $icons) {
      if ($candidate.Current.IsEnabled -and $candidate.Current.IsOffscreen -eq $false) {
        $icon = $candidate
        break
      }
    }
    if ($null -eq $icon) { Start-Sleep -Milliseconds 500 }
  }
  Assert-True ($null -ne $icon) "Project LEE notification-area icon was not discoverable"

  $point = [System.Windows.Point]::new()
  Assert-True ($icon.TryGetClickablePoint([ref]$point)) "Project LEE notification-area icon has no clickable point"
  [LeeMouse]::RightClick([int]$point.X, [int]$point.Y)

  $menuCondition = [System.Windows.Automation.AndCondition]::new(
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::NameProperty,
      "Exit LEE"
    ),
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      [System.Windows.Automation.ControlType]::MenuItem
    )
  )
  $menuItem = $null
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  while ([DateTime]::UtcNow -lt $deadline -and $null -eq $menuItem) {
    $menuItem = $root.FindFirst(
      [System.Windows.Automation.TreeScope]::Descendants,
      $menuCondition
    )
    if ($null -eq $menuItem) { Start-Sleep -Milliseconds 250 }
  }
  Assert-True ($null -ne $menuItem) "Exit LEE was not present in the Project LEE tray menu"
  $invokePattern = $menuItem.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  ([System.Windows.Automation.InvokePattern]$invokePattern).Invoke()

  Assert-True ($process.WaitForExit(120000)) "Exit LEE tray action did not terminate the application"
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

  $trayProcess = Start-Process -FilePath $appExe -WorkingDirectory $installDir -Environment @{
    APPDATA = $appData
    LEE_MIGRATION_COMMAND = "cmd /c exit 0"
    LEE_SMOKE_STATUS_FILE = $statusFile
  } -PassThru
  Assert-True ($null -ne $trayProcess) "normal tray launch did not start"
  $trayDeadline = [DateTime]::UtcNow.AddSeconds(120)
  while (-not (Test-Path $statusFile) -and [DateTime]::UtcNow -lt $trayDeadline) {
    Start-Sleep -Milliseconds 250
  }
  Assert-True (Test-Path $statusFile) "normal tray launch did not write runtime status"
  Assert-True (-not $trayProcess.HasExited) "normal tray launch exited before the tray menu was opened"
  Remove-Item $statusFile -Force
  Invoke-TrayExit $trayProcess
  Assert-True (-not (Get-Process postgres, pg_ctl -ErrorAction SilentlyContinue)) "PostgreSQL processes survived tray Exit LEE"

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
