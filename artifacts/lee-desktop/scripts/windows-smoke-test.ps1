param(
  [Parameter(Mandatory = $true)]
  [string] $InstallerPath,
  [Parameter(Mandatory = $false)]
  [string] $EvidencePath,
  [Parameter(Mandatory = $false)]
  [switch] $RequireNonAdmin
)

$ErrorActionPreference = "Stop"
$testRoot = Join-Path $env:RUNNER_TEMP "lee-windows-smoke-$([guid]::NewGuid())"
$installDir = Join-Path $testRoot "install"
$appData = Join-Path $testRoot "appdata"
$statusFile = Join-Path $testRoot "runtime-status.json"
$diagnosticFile = Join-Path $testRoot "runtime-diagnostics.log"
$discoveryFile = Join-Path $testRoot "local-discovery.json"
$mockScript = Join-Path $testRoot "mock-k6.ps1"
$mockLog = Join-Path $testRoot "mock-k6-requests.log"
$configFile = Join-Path $appData "Project LEE\config.json"
$migrationLog = Join-Path $appData "Project LEE\logs\migration.log"
$postgresLog = Join-Path $appData "Project LEE\logs\postgres.log"
$postgresLauncherLog = Join-Path $appData "Project LEE\logs\postgres-launcher.log"
$apiLauncherLog = Join-Path $appData "Project LEE\logs\api-launcher.log"
$apiLog = Join-Path $appData "Project LEE\logs\api.log"
$databaseDir = Join-Path $appData "Project LEE\database"
$migrationUpgradeFile = Join-Path $testRoot "migration-upgrade.json"
$appExe = $null
$phase = "initialize"
$smokeStartedAt = [DateTime]::UtcNow.ToString("o")
$markers = @()
$lastOperation = $null
$certificateEvidence = $null

New-Item -ItemType Directory -Force $testRoot | Out-Null

function Write-SmokeEvidence([string] $status, [object] $failure = $null) {
  if ([string]::IsNullOrWhiteSpace($EvidencePath)) { return }
  $parent = Split-Path -Parent $EvidencePath
  if (-not [string]::IsNullOrWhiteSpace($parent)) {
    New-Item -ItemType Directory -Force $parent | Out-Null
  }
  $processState = @(
    Get-Process -Name "Project-LEE", "postgres", "pg_ctl" -ErrorAction SilentlyContinue |
      Select-Object ProcessName, Id, HasExited, StartTime
  )
  $payload = [ordered]@{
    status = $status
    phase = $phase
    startedAt = $script:smokeStartedAt
    completedAt = [DateTime]::UtcNow.ToString("o")
    installerPath = $InstallerPath
    testRoot = $testRoot
    appPath = $appExe
    lastOperation = $lastOperation
    markers = $markers
    certificateTrust = $certificateEvidence
    processState = $processState
    expectedAppData = $appData
  }
  if (Test-Path $diagnosticFile) {
    $payload.runtimeDiagnostics = Get-Content $diagnosticFile -Raw
  }
  if (Test-Path $postgresLog) {
    $payload.postgresLog = Get-Content $postgresLog -Raw
  }
  if (Test-Path $postgresLauncherLog) {
    $payload.postgresLauncherLog = Get-Content $postgresLauncherLog -Raw
  }
  if (Test-Path $apiLauncherLog) {
    $payload.apiLauncherLog = Get-Content $apiLauncherLog -Raw
  }
  if (Test-Path $apiLog) {
    $payload.apiLog = Get-Content $apiLog -Raw
  }
  $payload.testRootLogs = @(
    Get-ChildItem -Path $testRoot -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Extension -in @(".log", ".json") } |
      Select-Object FullName, Length
  )
  if ($null -ne $failure) {
    $failureMessage = if ($failure.PSObject.Properties.Name -contains "message") {
      [string]$failure.message
    } elseif ($null -ne $failure.Exception) {
      [string]$failure.Exception.Message
    } else {
      [string]$failure
    }
    $payload.error = [ordered]@{
      message = $failureMessage
      scriptStackTrace = if ($failure.PSObject.Properties.Name -contains "scriptStackTrace") { $failure.scriptStackTrace } else { $failure.ScriptStackTrace }
    }
  }
  $payload | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding utf8
}

function Write-SmokeExcerpt([string] $label, [string] $path, [int] $maxLength = 24000) {
  Write-Host "--- LEE smoke $label ---"
  Write-Host "path=$path"
  Write-Host ((Get-SmokeExcerptText $path $maxLength) -replace "::", ": :")
}

function Get-SmokeExcerptText([string] $path, [int] $maxLength = 8000) {
  if (-not (Test-Path $path)) { return "missing" }
  $text = Get-Content $path -Raw -ErrorAction SilentlyContinue
  if ([string]::IsNullOrEmpty($text)) { return "empty" }
  if ($text.Length -gt $maxLength) {
    return $text.Substring(0, $maxLength) + "`n...[truncated]..."
  }
  return $text
}

function Set-Phase([string] $nextPhase, [string] $message = "") {
  $script:phase = $nextPhase
  $script:markers += [ordered]@{
    at = [DateTime]::UtcNow.ToString("o")
    phase = $nextPhase
    message = $message
  }
  Write-Host "[windows-smoke] $nextPhase$(if ($message) { " - $message" })"
  Write-SmokeEvidence "running"
}

function Assert-True([bool] $condition, [string] $message) {
  if (-not $condition) { throw "LEE Windows smoke test failed: $message" }
}

function Get-StoreCertificateMatches(
  [string] $storeName,
  [System.Security.Cryptography.X509Certificates.StoreLocation] $storeLocation,
  [string] $thumbprint
) {
  $store = [System.Security.Cryptography.X509Certificates.X509Store]::new($storeName, $storeLocation)
  try {
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
    return @($store.Certificates.Find(
      [System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint,
      $thumbprint,
      $false
    ))
  } finally {
    $store.Close()
  }
}

function Assert-NoPreexistingProjectLeeCertificate {
  foreach ($storeName in @("TrustedPublisher", "My", "CA", "TrustedPeople")) {
    $store = [System.Security.Cryptography.X509Certificates.X509Store]::new(
      $storeName,
      [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
    )
    try {
      $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
      $matches = @($store.Certificates | Where-Object {
        $_.Subject -match "(?i)Project[\s-]?LEE" -or $_.Issuer -match "(?i)Project[\s-]?LEE"
      })
      Assert-True ($matches.Count -eq 0) "clean smoke user already has a Project LEE certificate in its current user's $storeName store"
    } finally {
      $store.Close()
    }
  }
}

function Assert-PackagedCertificateTrusted([string] $certificatePath) {
  Assert-True (Test-Path $certificatePath) "installed package is missing its packaged signing certificate: $certificatePath"
  $packagedCertificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($certificatePath)
  $certificateThumbprint = $packagedCertificate.Thumbprint
  Assert-True (-not [string]::IsNullOrWhiteSpace($certificateThumbprint)) "packaged Project LEE signing certificate has no usable identity"
  Assert-True (-not $packagedCertificate.HasPrivateKey) "installed Project LEE signing certificate unexpectedly contains a private key"

  $resourcesRoot = Split-Path $certificatePath
  $privateKeyFiles = @(
    Get-ChildItem $resourcesRoot -Recurse -File -ErrorAction Stop |
      Where-Object {
        $_.Name -match "(?i)(signing|project[-_]?lee).*(pfx|p12|pvk|key|pem)$" -or
        $_.Extension -in @(".pfx", ".p12", ".pvk")
      }
  )
  Assert-True ($privateKeyFiles.Count -eq 0) "installed resources contain possible private signing material: $($privateKeyFiles.FullName -join ', ')"

  $verifiedCurrentUserStores = @()
  foreach ($storeName in @("TrustedPublisher")) {
    $trustedCertificates = Get-StoreCertificateMatches $storeName `
      ([System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser) `
      $certificateThumbprint
    Assert-True (
      $trustedCertificates.Count -gt 0
    ) "packaged Project LEE certificate '$($packagedCertificate.Subject)' ($certificateThumbprint) is missing from the current user's $storeName store; automatic trust bootstrap may have regressed"
    $verifiedCurrentUserStores += $storeName
    Write-Host "Verified packaged Project LEE certificate $certificateThumbprint in the current user's $storeName store."
  }

  foreach ($storeName in @("My", "CA", "TrustedPeople", "Disallowed")) {
    $matches = Get-StoreCertificateMatches $storeName `
      ([System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser) `
      $certificateThumbprint
    Assert-True ($matches.Count -eq 0) "packaged Project LEE certificate was unexpectedly added to the current user's $storeName store"
  }

  foreach ($storeName in @("TrustedPublisher")) {
    $matches = Get-StoreCertificateMatches $storeName `
      ([System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine) `
      $certificateThumbprint
    Assert-True ($matches.Count -eq 0) "packaged Project LEE certificate was unexpectedly added to the local machine's $storeName store; installer trust must remain current-user scoped"
  }

  $script:certificateEvidence = [ordered]@{
    subject = $packagedCertificate.Subject
    thumbprint = $certificateThumbprint
    privateKeyPresent = $packagedCertificate.HasPrivateKey
    privateKeyFiles = @($privateKeyFiles | ForEach-Object { $_.FullName })
    currentUserStores = @($verifiedCurrentUserStores)
    currentUserForbiddenStores = @("My", "CA", "TrustedPeople", "Disallowed", "Root")
    localMachineStoresChecked = @("TrustedPublisher")
  }
}

function Stop-ProcessTree([int] $processId) {
  & taskkill.exe /pid $processId /t /f 2>$null | Out-Null
}

function Stop-PostgresProcesses() {
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    $postgresProcesses = @(Get-Process postgres, pg_ctl -ErrorAction SilentlyContinue)
    if ($postgresProcesses.Count -eq 0) { return }
    $postgresProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
}

function Invoke-Lee([hashtable] $environment, [string] $label) {
  Set-Phase "launch-$label" "Starting the packaged application."
  $process = Start-Process -FilePath $appExe `
    -ArgumentList @("--lee-smoke-exit") `
    -WorkingDirectory $installDir `
    -Environment $environment `
    -PassThru
  Assert-True ($null -ne $process) "$label did not start"
  $script:lastOperation = [ordered]@{ label = $label; processId = $process.Id; timeoutSeconds = 120 }
  if (-not $process.WaitForExit(120000)) {
    Stop-ProcessTree $process.Id
    throw "$label did not exit after its bounded 120 second smoke run; process $($process.Id) was terminated"
  }
  $script:lastOperation.exitCode = $process.ExitCode
  Assert-True (Test-Path $statusFile) "$label did not write runtime status"
  $status = Get-Content $statusFile -Raw | ConvertFrom-Json
  foreach ($childPid in @($status.apiProcessId, $status.postgresProcessId) | Where-Object { $_ }) {
    Stop-ProcessTree ([int] $childPid)
  }
  Start-Sleep -Milliseconds 500
  Remove-Item $statusFile -Force
  return $status
}

function Wait-ForFile([string] $path, [int] $timeoutSeconds, [string] $label) {
  $deadline = [DateTime]::UtcNow.AddSeconds($timeoutSeconds)
  while (-not (Test-Path $path) -and [DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 250
  }
  Assert-True (Test-Path $path) "$label did not produce $path"
}

function Start-K6Mock([ValidateSet("contract", "timeout", "malformed", "oversized", "sensitive")] [string] $mode) {
  Remove-Item $mockLog -Force -ErrorAction SilentlyContinue
  $process = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", $mockScript, "-LogPath", $mockLog, "-Mode", $mode
  ) -PassThru -WindowStyle Hidden
  Start-Sleep -Milliseconds 500
  Assert-True (-not $process.HasExited) "K6 mock server did not start in $mode mode"
  return $process
}

function Stop-Mock([System.Diagnostics.Process] $process) {
  if ($null -ne $process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    $process.WaitForExit(5000)
  }
}

function Invoke-Discovery([hashtable] $environment, [string] $label) {
  Remove-Item $discoveryFile -Force -ErrorAction SilentlyContinue
  $discoveryEnvironment = @{} + $environment
  $discoveryEnvironment["LEE_SMOKE_EXIT"] = "1"
  $discoveryEnvironment["LEE_SMOKE_HEADLESS"] = "0"
  $discoveryEnvironment["LEE_SMOKE_DISCOVERY_FILE"] = [string]$discoveryFile
  $status = Invoke-Lee $discoveryEnvironment $label
  Wait-ForFile $discoveryFile 10 "$label discovery"
  $discovery = Get-Content $discoveryFile -Raw | ConvertFrom-Json
  Remove-Item $discoveryFile -Force
  return @{ Status = $status; Discovery = $discovery }
}

function Invoke-TrayExit([System.Diagnostics.Process] $process, [object] $status, [switch] $Headless) {
  if ($Headless) {
    if (-not $process.HasExited) {
      Assert-True ($process.WaitForExit(120000)) "headless smoke application did not terminate"
    }
    foreach ($childPid in @($status.apiProcessId, $status.postgresProcessId) | Where-Object { $_ }) {
      Stop-ProcessTree ([int] $childPid)
    }
    Stop-PostgresProcesses
    return
  }
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
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
  $isAdministrator = $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
  Assert-True (-not $RequireNonAdmin -or -not $isAdministrator) "clean installer smoke must run as a non-admin user"
  Set-Phase "preinstall-certificate-state" "Confirming the smoke user has no pre-existing Project LEE certificate."
  Assert-NoPreexistingProjectLeeCertificate

  Set-Phase "validate-installer" "Checking the downloaded installer."
  Assert-True (Test-Path $InstallerPath) "installer is missing: $InstallerPath"
  @'
param(
  [Parameter(Mandatory = $true)]
  [string] $LogPath,
  [Parameter(Mandatory = $true)]
  [ValidateSet("contract", "timeout", "malformed", "oversized", "sensitive")]
  [string] $Mode
)

$ErrorActionPreference = "Stop"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:6420/")
$listener.Start()
try {
  while ($true) {
    $context = $listener.GetContext()
    Add-Content -Path $LogPath -Value "$($context.Request.HttpMethod) $($context.Request.Url.AbsolutePath)" -Encoding utf8
    if ($Mode -eq "timeout") {
      Start-Sleep -Seconds 3
    }
    if ($context.Request.Url.AbsolutePath -eq "/k6/contract" -and $Mode -in @("contract", "malformed", "oversized", "sensitive")) {
      if ($Mode -eq "malformed") {
        $payload = '{"contractVersion":"v1","identity":{"displayName":"Malformed contract"'
      } elseif ($Mode -eq "oversized") {
        $items = (1..20000 | ForEach-Object { '{"id":"k6.smoke","name":"oversized metadata"}' }) -join ","
        $payload = '{"contractVersion":"v1","identity":{"displayName":"Oversized contract"},"capabilities":[' + $items + '],"dependencies":[]}'
      } elseif ($Mode -eq "sensitive") {
        $payload = '{"contractVersion":"v1","identity":{"displayName":"token=do-not-forward"},"capabilities":[{"id":"k6.smoke","name":"Safe capability","token":"do-not-forward","api_key":"do-not-forward"}],"dependencies":[{"id":"k6.dep","required":true,"secret":"do-not-forward"}]}'
      } else {
        $payload = '{"contractVersion":"v1","identity":{"displayName":"Smoke K6 Contract"},"capabilities":[{"id":"k6.smoke","name":"Smoke contract"}],"dependencies":[]}'
      }
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
      $context.Response.StatusCode = 200
      $context.Response.ContentType = "application/json"
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $context.Response.StatusCode = 404
    }
    $context.Response.Close()
  }
} finally {
  $listener.Stop()
}
'@ | Set-Content $mockScript -Encoding utf8
  Set-Phase "install" "Running the installer silently."
  $installer = Start-Process -FilePath $InstallerPath -ArgumentList @("/S", "/D=$installDir") -Wait -PassThru
  Assert-True ($installer.ExitCode -eq 0) "silent installer exited with $($installer.ExitCode)"
  $appExe = Get-ChildItem $installDir -Filter "*.exe" | Where-Object { $_.Name -notlike "Uninstall*" } | Select-Object -First 1
  Assert-True ($null -ne $appExe) "installed application executable is missing"
  $appExe = $appExe.FullName
  Set-Phase "certificate-trust" "Verifying the installed certificate in the current-user publisher trust store."
  Assert-PackagedCertificateTrusted (Join-Path (Split-Path $appExe) "resources\lee-signing.cer")
  Set-Phase "migration-assets" "Checking packaged migration assets."
  node (Join-Path $PSScriptRoot "verify-packaged-migrations.mjs") `
    --resources-root (Join-Path (Split-Path $appExe) "resources") `
    --source-file (Join-Path $PSScriptRoot "..\src\runtime.ts") `
    --platform windows
  Set-Phase "migration-upgrade" "Proving an existing database can be upgraded."
  node (Join-Path $PSScriptRoot "migration-upgrade-smoke.mjs") `
    --resources-root (Join-Path (Split-Path $appExe) "resources") `
    --postgres-root (Join-Path (Split-Path $appExe) "resources\postgres") `
    --platform windows `
    --work-root $testRoot `
    --output $migrationUpgradeFile
  $migrationUpgrade = Get-Content $migrationUpgradeFile -Raw | ConvertFrom-Json
  Assert-True ($migrationUpgrade.status -eq "passed" -and $migrationUpgrade.migration.previousJournalEntries -ge 1 -and $migrationUpgrade.migration.upgradedJournalEntries -eq ($migrationUpgrade.migration.previousJournalEntries + 1)) "existing-database migration upgrade did not complete"
  Write-Host ("Migration upgrade evidence: " + ($migrationUpgrade.migration | ConvertTo-Json -Compress))

  $commonEnvironment = @{
    APPDATA = $appData
    LEE_MIGRATION_COMMAND = "cmd /c exit 0"
    LEE_SMOKE_STATUS_FILE = $statusFile
    LEE_SMOKE_DIAGNOSTIC_FILE = $diagnosticFile
    LEE_SMOKE_EXIT = "1"
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

  Set-Phase "tray-launch" "Starting the normal tray application."
  $trayProcess = Start-Process -FilePath $appExe -WorkingDirectory $installDir -Environment @{
    APPDATA = $appData
    LEE_MIGRATION_COMMAND = "cmd /c exit 0"
    LEE_SMOKE_STATUS_FILE = $statusFile
    LEE_SMOKE_DIAGNOSTIC_FILE = $diagnosticFile
    LEE_SMOKE_EXIT = "0"
    LEE_SMOKE_HEADLESS = "1"
  } -PassThru
  Assert-True ($null -ne $trayProcess) "normal tray launch did not start"
  $trayDeadline = [DateTime]::UtcNow.AddSeconds(120)
  while (-not (Test-Path $statusFile) -and [DateTime]::UtcNow -lt $trayDeadline) {
    Start-Sleep -Milliseconds 250
  }
  Assert-True (Test-Path $statusFile) "normal tray launch did not write runtime status"
  $tray = Get-Content $statusFile -Raw | ConvertFrom-Json
  Remove-Item $statusFile -Force
  Invoke-TrayExit $trayProcess $tray -Headless
  Assert-True (-not (Get-Process postgres, pg_ctl -ErrorAction SilentlyContinue)) "PostgreSQL processes survived tray Exit LEE"

  $config = Get-Content $configFile -Raw | ConvertFrom-Json
  $databaseUrl = $config.databaseUrl
  Assert-True ($databaseUrl -match "^postgresql://lee@127\.0\.0\.1:\d+/lee$") "private database URL was not persisted"
  $config | Add-Member -NotePropertyName migrationCommand -NotePropertyValue "cmd /c exit 23" -Force
  $config | ConvertTo-Json | Set-Content $configFile -Encoding utf8
  $failed = Invoke-Lee @{
    APPDATA = $appData
    LEE_MIGRATION_COMMAND = "cmd /c exit 23"
    LEE_SMOKE_MIGRATION_COMMAND = "cmd /c exit 23"
    LEE_SMOKE_STATUS_FILE = $statusFile
    LEE_SMOKE_DIAGNOSTIC_FILE = $diagnosticFile
  } "forced migration failure"
  Assert-True ($failed.migration -eq "failed") "forced migration failure was not reported"
  Assert-True ($failed.reason -like "*$migrationLog*") "migration failure did not report the log path"
  Assert-True (Test-Path $migrationLog) "migration log was not written"
  Assert-True (-not (Get-Process postgres, pg_ctl -ErrorAction SilentlyContinue)) "PostgreSQL processes survived failed startup"

  Set-Phase "failed-tray-launch" "Checking visible migration failure handling."
  $failedTrayProcess = Start-Process -FilePath $appExe -WorkingDirectory $installDir -Environment @{
    APPDATA = $appData
    LEE_SMOKE_MIGRATION_COMMAND = "cmd /c exit 23"
    LEE_SMOKE_STATUS_FILE = $statusFile
    LEE_SMOKE_DIAGNOSTIC_FILE = $diagnosticFile
    LEE_SMOKE_EXIT = "0"
    LEE_SMOKE_HEADLESS = "1"
  } -PassThru
  Assert-True ($null -ne $failedTrayProcess) "failed migration tray launch did not start"
  $failedTrayDeadline = [DateTime]::UtcNow.AddSeconds(120)
  while (-not (Test-Path $statusFile) -and [DateTime]::UtcNow -lt $failedTrayDeadline) {
    Start-Sleep -Milliseconds 250
  }
  Assert-True (Test-Path $statusFile) "failed migration tray launch did not write runtime status"
  $failedTray = Get-Content $statusFile -Raw | ConvertFrom-Json
  Remove-Item $statusFile -Force
  Assert-True ($failedTray.migration -eq "failed") "failed migration tray launch did not report migration failure"
  Invoke-TrayExit $failedTrayProcess $failedTray -Headless
  Assert-True (-not (Get-Process "Project-LEE", postgres, pg_ctl -ErrorAction SilentlyContinue)) "application or PostgreSQL processes survived failed migration tray Exit LEE"
  $failedTrayApiPort = ([Uri]$failedTray.apiUrl).Port
  Assert-True (-not (Get-NetTCPConnection -LocalPort $failedTrayApiPort -ErrorAction SilentlyContinue)) "API child survived failed migration tray Exit LEE"

  $config.migrationCommand = "cmd /c exit 0"
  $config | Add-Member -NotePropertyName apiCommand -NotePropertyValue "cmd.exe" -Force
  $config | Add-Member -NotePropertyName apiArgs -NotePropertyValue @("/c", "ping.exe -n 601 127.0.0.1 > nul") -Force
  $config | ConvertTo-Json | Set-Content $configFile -Encoding utf8
  Set-Phase "degraded-tray-launch" "Checking bounded degraded startup handling."
  $degradedTrayProcess = Start-Process -FilePath $appExe -WorkingDirectory $installDir -Environment @{
    APPDATA = $appData
    LEE_SMOKE_STATUS_FILE = $statusFile
    LEE_SMOKE_DIAGNOSTIC_FILE = $diagnosticFile
    LEE_SMOKE_EXIT = "0"
    LEE_SMOKE_HEADLESS = "1"
  } -PassThru
  Assert-True ($null -ne $degradedTrayProcess) "degraded startup tray launch did not start"
  $degradedTrayDeadline = [DateTime]::UtcNow.AddSeconds(120)
  while (-not (Test-Path $statusFile) -and [DateTime]::UtcNow -lt $degradedTrayDeadline) {
    Start-Sleep -Milliseconds 250
  }
  Assert-True (Test-Path $statusFile) "degraded startup tray launch did not write runtime status"
  $degradedTray = Get-Content $statusFile -Raw | ConvertFrom-Json
  Remove-Item $statusFile -Force
  Assert-True ($degradedTray.database -eq "configured") "degraded startup did not configure private PostgreSQL"
  Assert-True ($degradedTray.migration -eq "complete") "degraded startup migration did not complete"
  Assert-True ($degradedTray.state -eq "degraded") "unavailable API contract did not produce degraded runtime state"
  Assert-True ($degradedTray.contract -eq "unavailable") "unavailable API contract was not reported"
  $degradedApiPort = ([Uri]$degradedTray.apiUrl).Port
  Invoke-TrayExit $degradedTrayProcess $degradedTray -Headless
  Assert-True (-not (Get-Process "Project-LEE", postgres, pg_ctl -ErrorAction SilentlyContinue)) "application or PostgreSQL processes survived degraded startup tray Exit LEE"
  Assert-True (-not (Get-NetTCPConnection -LocalPort $degradedApiPort -ErrorAction SilentlyContinue)) "API child survived degraded startup tray Exit LEE"

  $config.PSObject.Properties.Remove("apiCommand")
  $config.PSObject.Properties.Remove("apiArgs")
  $config | ConvertTo-Json | Set-Content $configFile -Encoding utf8
  $restarted = Invoke-Lee $commonEnvironment "restart"
  Assert-True ($restarted.database -eq "configured") "restart did not reuse the private database"
  $configAfterRestart = Get-Content $configFile -Raw | ConvertFrom-Json
  Assert-True ($configAfterRestart.databaseUrl -eq $databaseUrl) "restart changed the persisted database URL"
  Assert-True (Test-Path (Join-Path $databaseDir "PG_VERSION")) "restart did not reuse the configured database directory"
  Assert-True (-not (Get-Process postgres, pg_ctl -ErrorAction SilentlyContinue)) "PostgreSQL processes survived restart Exit LEE"

  Set-Phase "local-discovery" "Checking bounded local service discovery and owner review."
  $mock = Start-K6Mock "contract"
  try {
    $discoveryRun = Invoke-Discovery $commonEnvironment "allowlisted local discovery"
    $discovery = $discoveryRun.Discovery
    $k6Candidate = @($discovery.candidates | Where-Object { $_.contractId -eq "k6" }) | Select-Object -First 1
    Assert-True ($null -ne $k6Candidate) "approved K6 mock contract was not returned through Electron discovery IPC"
    Assert-True ($k6Candidate.baseUrl -eq "http://127.0.0.1:6420") "K6 discovery escaped the approved loopback port"
    Assert-True ($k6Candidate.healthEndpoint -eq "/k6/contract") "K6 discovery used an unapproved path"
    Assert-True ($discovery.attempted -le 4) "discovery attempted more probes than the finite allowlist permits"
    $requests = @(Get-Content $mockLog -ErrorAction SilentlyContinue)
    Assert-True ($requests.Count -eq 1 -and $requests[0] -eq "GET /k6/contract") "discovery probed an unexpected K6 host, port, or path"

    Stop-Mock $mock
    $mock = Start-K6Mock "malformed"
    $malformedRun = Invoke-Discovery $commonEnvironment "malformed local discovery"
    $malformedDiscovery = $malformedRun.Discovery
    $malformedFailure = @($malformedDiscovery.failures | Where-Object { $_.contractId -eq "k6" }) | Select-Object -First 1
    Assert-True ($null -ne $malformedFailure -and $malformedFailure.reason -eq "Malformed response") "malformed K6 contract did not produce the safe malformed-response summary"
    Assert-True (@($malformedDiscovery.candidates | Where-Object { $_.contractId -eq "k6" }).Count -eq 0) "malformed K6 contract produced a discovery candidate"
    $malformedJson = $malformedDiscovery | ConvertTo-Json -Depth 20
    Assert-True ($malformedJson -notmatch "Malformed contract|do-not-forward|api[_-]?key|secret|password|token") "malformed discovery exposed response content"

    Stop-Mock $mock
    $mock = Start-K6Mock "oversized"
    $oversizedRun = Invoke-Discovery $commonEnvironment "oversized local discovery"
    $oversizedDiscovery = $oversizedRun.Discovery
    $oversizedFailure = @($oversizedDiscovery.failures | Where-Object { $_.contractId -eq "k6" }) | Select-Object -First 1
    Assert-True ($null -ne $oversizedFailure -and $oversizedFailure.reason -eq "Oversized response") "oversized K6 contract did not produce the safe oversized-response summary"
    Assert-True (@($oversizedDiscovery.candidates | Where-Object { $_.contractId -eq "k6" }).Count -eq 0) "oversized K6 contract produced a discovery candidate"
    $oversizedJson = $oversizedDiscovery | ConvertTo-Json -Depth 20
    Assert-True ($oversizedJson -notmatch "Oversized contract|oversized metadata|do-not-forward|api[_-]?key|secret|password|token") "oversized discovery exposed response content"

    Stop-Mock $mock
    $mock = Start-K6Mock "sensitive"
    $sensitiveRun = Invoke-Discovery $commonEnvironment "sensitive metadata discovery"
    $sensitiveDiscovery = $sensitiveRun.Discovery
    $sensitiveCandidate = @($sensitiveDiscovery.candidates | Where-Object { $_.contractId -eq "k6" }) | Select-Object -First 1
    Assert-True ($null -ne $sensitiveCandidate) "safe K6 contract with sensitive metadata was not discovered"
    Assert-True ($sensitiveCandidate.displayName -eq "K6 Service Contract") "sensitive K6 display name was forwarded"
    $sensitiveJson = $sensitiveCandidate | ConvertTo-Json -Depth 20
    Assert-True ($sensitiveJson -notmatch "do-not-forward|api[_-]?key|secret|password|token") "sensitive K6 metadata was forwarded in the discovery candidate"

    Stop-Mock $mock
    $mock = Start-K6Mock "timeout"
    $timeoutRun = Invoke-Discovery $commonEnvironment "timed out local discovery"
    $timeoutFailure = @($timeoutRun.Discovery.failures | Where-Object { $_.contractId -eq "k6" }) | Select-Object -First 1
    Assert-True ($null -ne $timeoutFailure -and $timeoutFailure.reason -eq "Timed out") "unresponsive K6 contract did not produce the safe timeout summary"

    Stop-Mock $mock
    $unreachableRun = Invoke-Discovery $commonEnvironment "unreachable local discovery"
    $unreachableFailure = @($unreachableRun.Discovery.failures | Where-Object { $_.contractId -eq "k6" }) | Select-Object -First 1
    Assert-True ($null -ne $unreachableFailure) "unreachable K6 contract was not reported"
    Assert-True ($unreachableFailure.reason -in @("Not reachable", "Timed out", "Malformed response", "Oversized response", "Unsupported response", "Not a compatible service contract") -or $unreachableFailure.reason -match "^Returned HTTP [1-5]\d{2}$") "unreachable K6 failure exposed an unsafe raw error"

    $mock = Start-K6Mock "malformed"
    try {
      Remove-Item $statusFile, $discoveryFile -Force -ErrorAction SilentlyContinue
      $malformedReviewProcess = Start-Process -FilePath $appExe -WorkingDirectory $installDir -Environment @{
        APPDATA = $appData
        LEE_MIGRATION_COMMAND = "cmd /c exit 0"
        LEE_SMOKE_STATUS_FILE = $statusFile
        LEE_SMOKE_DISCOVERY_FILE = $discoveryFile
        LEE_SMOKE_DIAGNOSTIC_FILE = $diagnosticFile
        LEE_SMOKE_EXIT = "0"
        LEE_SMOKE_HEADLESS = "1"
      } -PassThru
      Assert-True ($null -ne $malformedReviewProcess) "malformed discovery review launch did not start"
      Wait-ForFile $statusFile 120 "malformed discovery review launch"
      Wait-ForFile $discoveryFile 15 "malformed discovery review launch"
      $malformedReviewStatus = Get-Content $statusFile -Raw | ConvertFrom-Json
      $malformedReviewDiscovery = Get-Content $discoveryFile -Raw | ConvertFrom-Json
      $malformedReviewCandidate = @($malformedReviewDiscovery.candidates | Where-Object { $_.contractId -eq "k6" }) | Select-Object -First 1
      Assert-True ($null -eq $malformedReviewCandidate) "malformed response reached review as a candidate"
      $malformedReviewBody = $malformedReviewDiscovery | ConvertTo-Json -Depth 20
      $malformedReviewed = Invoke-RestMethod -Uri "$($malformedReviewStatus.apiUrl)/api/desktop-setup/run" -Method Post -ContentType "application/json" -Body $malformedReviewBody
      $malformedConnections = @(Invoke-RestMethod -Uri "$($malformedReviewStatus.apiUrl)/api/connections" -Method Get)
      Assert-True (-not @($malformedConnections | Where-Object { $_.method -eq "local" -and $_.baseUrl -eq "http://127.0.0.1:6420" })) "malformed response created or reused a local connection"
      Assert-True (($malformedReviewed.summary.discovery.failures | Where-Object { $_.contractId -eq "k6" -and $_.reason -eq "Malformed response" }).Count -eq 1) "malformed response was not retained as a safe reviewable failure"
      Remove-Item $statusFile -Force -ErrorAction SilentlyContinue
      Invoke-TrayExit $malformedReviewProcess $malformedReviewStatus -Headless
    } finally {
      Stop-Mock $mock
    }

    $mock = Start-K6Mock "contract"
    Remove-Item $statusFile, $discoveryFile -Force -ErrorAction SilentlyContinue
    $reviewProcess = Start-Process -FilePath $appExe -WorkingDirectory $installDir -Environment @{
      APPDATA = $appData
      LEE_MIGRATION_COMMAND = "cmd /c exit 0"
      LEE_SMOKE_STATUS_FILE = $statusFile
      LEE_SMOKE_DISCOVERY_FILE = $discoveryFile
      LEE_SMOKE_DIAGNOSTIC_FILE = $diagnosticFile
      LEE_SMOKE_EXIT = "0"
      LEE_SMOKE_HEADLESS = "1"
    } -PassThru
    Assert-True ($null -ne $reviewProcess) "discovery review launch did not start"
    Wait-ForFile $statusFile 120 "discovery review launch"
    Wait-ForFile $discoveryFile 15 "discovery review launch"
    $reviewStatus = Get-Content $statusFile -Raw | ConvertFrom-Json
    $reviewDiscovery = Get-Content $discoveryFile -Raw | ConvertFrom-Json
    $reviewCandidate = @($reviewDiscovery.candidates | Where-Object { $_.contractId -eq "k6" }) | Select-Object -First 1
    Assert-True ($null -ne $reviewCandidate) "review launch did not discover the K6 contract"
    $connectionsBefore = @(Invoke-RestMethod -Uri "$($reviewStatus.apiUrl)/api/connections" -Method Get)
    Assert-True (-not @($connectionsBefore | Where-Object { $_.baseUrl -eq $reviewCandidate.baseUrl -and $_.healthEndpoint -eq $reviewCandidate.healthEndpoint })) "discovery persisted a connection before owner review"
    $reviewBody = $reviewDiscovery | ConvertTo-Json -Depth 20
    $reviewed = Invoke-RestMethod -Uri "$($reviewStatus.apiUrl)/api/desktop-setup/run" -Method Post -ContentType "application/json" -Body $reviewBody
    $reviewedCandidate = @($reviewed.summary.discovery.candidates | Where-Object { $_.contractId -eq "k6" }) | Select-Object -First 1
    Assert-True ($null -ne $reviewedCandidate -and $reviewedCandidate.status -eq "new") "discovery review did not leave the new service awaiting owner acceptance"
    $connectionsAfterReview = @(Invoke-RestMethod -Uri "$($reviewStatus.apiUrl)/api/connections" -Method Get)
    Assert-True (-not @($connectionsAfterReview | Where-Object { $_.baseUrl -eq $reviewCandidate.baseUrl -and $_.healthEndpoint -eq $reviewCandidate.healthEndpoint })) "discovery review persisted a connection without acceptance"
    $accepted = Invoke-RestMethod -Uri "$($reviewStatus.apiUrl)/api/desktop-setup/discoveries/accept" -Method Post -ContentType "application/json" -Body ($reviewCandidate | ConvertTo-Json -Depth 20)
    Assert-True ($accepted.connection.baseUrl -eq $reviewCandidate.baseUrl) "owner acceptance did not create the reviewed local connection"
    Assert-True ($accepted.reused -eq $false) "owner acceptance unexpectedly reused a connection in the fresh smoke database"
    Remove-Item $statusFile -Force -ErrorAction SilentlyContinue
    Invoke-TrayExit $reviewProcess $reviewStatus -Headless
  } finally {
    Stop-Mock $mock
  }

  Set-Phase "complete" "All Windows installer smoke checks passed."
  Write-SmokeEvidence "passed"
  Write-Host "LEE Windows installer smoke test passed: clean launch, existing-database migration upgrade, bounded Electron local discovery, safe malformed/oversized/sensitive/timeout/unreachable handling, review-before-persist, private PostgreSQL, migration failure reporting, tray cleanup, and restart reuse."
} catch {
  $diagnosticExcerpt = Get-SmokeExcerptText $diagnosticFile 8000
  $processExcerpt = @(Get-Process "Project-LEE", postgres, pg_ctl -ErrorAction SilentlyContinue |
    Select-Object ProcessName, Id, HasExited, StartTime |
    ConvertTo-Json -Compress) -join "`n"
  $failure = [pscustomobject]@{
    message = "$($_.Exception.Message)`nRuntime diagnostics:`n$diagnosticExcerpt`nProcess snapshot:`n$processExcerpt"
    scriptStackTrace = $_.ScriptStackTrace
  }
  Write-SmokeEvidence "failed" $failure
  Write-Host "=== LEE smoke failure diagnostics ==="
  Write-Host "phase=$phase"
  Write-Host "testRoot=$testRoot"
  Write-Host "appPath=$appExe"
  if ($null -ne $lastOperation) {
    Write-Host ("lastOperation=" + ($lastOperation | ConvertTo-Json -Compress))
  } else {
    Write-Host "lastOperation=none"
  }
  Write-SmokeExcerpt "runtime diagnostic trace" $diagnosticFile
  Write-SmokeExcerpt "postgres log" $postgresLog
  Write-SmokeExcerpt "postgres launcher log" $postgresLauncherLog
  Write-SmokeExcerpt "api launcher log" $apiLauncherLog
  Write-SmokeExcerpt "api log" $apiLog
  Write-Host "--- LEE smoke process snapshot ---"
  Get-Process "Project-LEE", postgres, pg_ctl -ErrorAction SilentlyContinue |
    Select-Object ProcessName, Id, HasExited, StartTime |
    Format-Table -AutoSize |
    Out-String |
    Write-Host
  Write-Host "--- LEE smoke test-root files ---"
  Get-ChildItem -Path $testRoot -Recurse -File -ErrorAction SilentlyContinue |
    Select-Object FullName, Length |
    Format-Table -AutoSize |
    Out-String |
    Write-Host
  if ($env:GITHUB_ACTIONS -eq "true" -and (Test-Path $EvidencePath)) {
    try {
      $evidence = Get-Content $EvidencePath -Raw | ConvertFrom-Json
      $summary = [ordered]@{
        status = $evidence.status
        phase = $evidence.phase
        error = $evidence.error.message
        lastOperation = $evidence.lastOperation.label
        recentMarkers = @($evidence.markers | Select-Object -Last 5 | ForEach-Object { "$($_.phase): $($_.message)" })
      } | ConvertTo-Json -Compress
      $summary = $summary.Replace("%", "%25").Replace("`r", "%0D").Replace("`n", "%0A")
      Write-Host "::error title=Windows smoke evidence::$summary"
    } catch {
      Write-Host "::error title=Windows smoke evidence::The smoke evidence file could not be summarized: $($_.Exception.Message)"
    }
  }
  throw
} finally {
  Get-Process "Project-LEE", postgres, pg_ctl -ErrorAction SilentlyContinue | ForEach-Object { Stop-ProcessTree $_.Id }
  if (Test-Path $testRoot) { Remove-Item $testRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
