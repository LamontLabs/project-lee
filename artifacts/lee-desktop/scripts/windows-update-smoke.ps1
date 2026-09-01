param(
  [Parameter(Mandatory = $true)]
  [string] $CurrentDir,
  [Parameter(Mandatory = $true)]
  [string] $PreviousDir,
  [Parameter(Mandatory = $true)]
  [string] $ExpectedVersion,
  [Parameter(Mandatory = $true)]
  [string] $Output,
  [Parameter(Mandatory = $true)]
  [string] $Selection
)

$ErrorActionPreference = "Stop"
$desktopRoot = Split-Path -Parent $PSScriptRoot
$testRoot = Join-Path $env:RUNNER_TEMP "lee-update-smoke-$([guid]::NewGuid())"
$tamperedDir = Join-Path $testRoot "tampered"
$installDir = Join-Path $testRoot "previous-install"
$appData = Join-Path $testRoot "appdata"
$readyFile = Join-Path $testRoot "feed-ready.json"
$resultFile = Join-Path $testRoot "update-result.json"
$server = $null

function Assert-True([bool] $condition, [string] $message) {
  if (-not $condition) { throw "LEE Windows updater smoke failed: $message" }
}

try {
  $selectionRecord = Get-Content $Selection -Raw | ConvertFrom-Json
  if ($selectionRecord.status -eq "skipped") {
    Copy-Item $Selection $Output -Force
    exit 0
  }

  node (Join-Path $PSScriptRoot "verify-updater-feed.mjs") --release-dir $CurrentDir --platform windows --expected-version $ExpectedVersion
  node (Join-Path $PSScriptRoot "verify-updater-feed.mjs") --release-dir $PreviousDir --platform windows

  $currentInstaller = Get-ChildItem $CurrentDir -Filter "*.exe" | Select-Object -First 1
  $previousInstaller = Get-ChildItem $PreviousDir -Filter "*.exe" | Select-Object -First 1
  Assert-True ($null -ne $currentInstaller) "current installer is missing"
  Assert-True ($null -ne $previousInstaller) "previous installer is missing"
  foreach ($installer in @($currentInstaller, $previousInstaller)) {
    $signature = Get-AuthenticodeSignature $installer.FullName
    Assert-True ($signature.Status -eq "Valid") "$($installer.Name) does not have a valid Authenticode signature"
  }

  New-Item -ItemType Directory -Force $testRoot, $tamperedDir, $installDir | Out-Null
  Copy-Item (Join-Path $CurrentDir "latest.yml") $tamperedDir -Force
  $metadata = Get-Content (Join-Path $CurrentDir "latest.yml") -Raw
  $artifactName = ([regex]::Match($metadata, "(?m)^\s*-\s+url:\s*(\S+)\s*$")).Groups[1].Value
  Assert-True (-not [string]::IsNullOrWhiteSpace($artifactName)) "latest.yml has no installer URL"
  $tamperedPath = Join-Path $tamperedDir $artifactName
  $bytes = [System.IO.File]::ReadAllBytes($currentInstaller.FullName)
  $bytes[$bytes.Length - 1] = $bytes[$bytes.Length - 1] -bxor 255
  [System.IO.File]::WriteAllBytes($tamperedPath, $bytes)
  $tamperedCheck = Start-Process node -ArgumentList @(
    (Join-Path $PSScriptRoot "verify-updater-feed.mjs"), "--release-dir", $tamperedDir, "--platform", "windows", "--expected-version", $ExpectedVersion
  ) -Wait -PassThru -NoNewWindow
  Assert-True ($tamperedCheck.ExitCode -ne 0) "tampered installer passed updater checksum verification"

  $installerProcess = Start-Process -FilePath $previousInstaller.FullName -ArgumentList @("/S", "/D=$installDir") -Wait -PassThru
  Assert-True ($installerProcess.ExitCode -eq 0) "previous installer exited with $($installerProcess.ExitCode)"
  $appExe = Get-ChildItem $installDir -Filter "Project-LEE.exe" -Recurse | Select-Object -First 1
  Assert-True ($null -ne $appExe) "previous installed application is missing"

  $server = Start-Process node -ArgumentList @(
    (Join-Path $PSScriptRoot "update-feed-server.mjs"), "--root", $tamperedDir, "--port", "0", "--ready-file", $readyFile
  ) -PassThru -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 50 -and -not (Test-Path $readyFile); $attempt++) { Start-Sleep -Milliseconds 100 }
  Assert-True (Test-Path $readyFile) "tampered update feed server did not start"
  $tamperedFeed = (Get-Content $readyFile -Raw | ConvertFrom-Json).url
  $tamperedRun = Start-Process -FilePath $appExe.FullName -ArgumentList "--lee-smoke-exit" -Environment @{
    APPDATA = $appData
    LEE_SMOKE_UPDATE_FEED_URL = $tamperedFeed
    LEE_SMOKE_UPDATE_EXPECTED_VERSION = $ExpectedVersion
    LEE_SMOKE_UPDATE_RESULT_FILE = $resultFile
  } -Wait -PassThru
  $tamperedResult = Get-Content $resultFile -Raw | ConvertFrom-Json
  Assert-True ($tamperedResult.status -eq "error") "tampered updater was not rejected by the packaged app"
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue

  Remove-Item $readyFile, $resultFile -Force -ErrorAction SilentlyContinue
  $server = Start-Process node -ArgumentList @(
    (Join-Path $PSScriptRoot "update-feed-server.mjs"), "--root", $CurrentDir, "--port", "0", "--ready-file", $readyFile
  ) -PassThru -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 50 -and -not (Test-Path $readyFile); $attempt++) { Start-Sleep -Milliseconds 100 }
  Assert-True (Test-Path $readyFile) "valid update feed server did not start"
  $validFeed = (Get-Content $readyFile -Raw | ConvertFrom-Json).url
  $validRun = Start-Process -FilePath $appExe.FullName -ArgumentList "--lee-smoke-exit" -Environment @{
    APPDATA = $appData
    LEE_SMOKE_UPDATE_FEED_URL = $validFeed
    LEE_SMOKE_UPDATE_EXPECTED_VERSION = $ExpectedVersion
    LEE_SMOKE_UPDATE_RESULT_FILE = $resultFile
    LEE_SMOKE_UPDATE_INSTALL = "1"
  } -Wait -PassThru
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  while (-not (Test-Path $resultFile) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 250 }
  $validResult = Get-Content $resultFile -Raw | ConvertFrom-Json
  Assert-True ($validResult.status -eq "installed" -and $validResult.version -eq $ExpectedVersion) "valid signed update did not install cleanly"

  $record = $selectionRecord | Add-Member -NotePropertyName verification -NotePropertyValue "passed" -PassThru
  $record | Add-Member -NotePropertyName update -NotePropertyValue @{
    tamperedRejected = $true
    validInstalled = $true
    currentInstaller = $currentInstaller.Name
    previousInstaller = $previousInstaller.Name
  } -Force
  $record | ConvertTo-Json -Depth 10 | Set-Content $Output -Encoding utf8
  Write-Host "Verified Windows updater: tampered update rejected and $ExpectedVersion installed over the previous release."
} finally {
  if ($null -ne $server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  if (Test-Path $testRoot) { Remove-Item $testRoot -Recurse -Force -ErrorAction SilentlyContinue }
}