param(
  [Parameter(Mandatory = $true)]
  [string] $CertificatePath,
  [switch] $VerifyOnly
)

$ErrorActionPreference = "Stop"
$tracePath = Join-Path $PSScriptRoot "installer-trust.log"
"start" | Set-Content $tracePath
try {
  $certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($CertificatePath)
  "certificate-loaded" | Add-Content $tracePath
  $thumbprint = $certificate.Thumbprint.ToUpperInvariant()

  if ($VerifyOnly) {
    foreach ($storeName in @("Root", "TrustedPublisher")) {
      $store = [System.Security.Cryptography.X509Certificates.X509Store]::new(
        $storeName,
        [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
      )
      try {
        $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
        $matches = @($store.Certificates.Find(
          [System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint,
          $thumbprint,
          $false
        ))
        if ($matches.Count -eq 0) {
          throw "certificate is missing from CurrentUser $storeName"
        }
        "verified-$storeName" | Add-Content $tracePath
      } finally {
        $store.Close()
      }
    }
    "complete" | Add-Content $tracePath
    exit 0
  }

  $certutilPath = Join-Path $env:WINDIR "System32\certutil.exe"
  foreach ($storeName in @("Root", "TrustedPublisher")) {
    "opening-$storeName" | Add-Content $tracePath
    $stdoutPath = Join-Path $PSScriptRoot "installer-trust-certutil-$PID-$storeName.stdout.log"
    $stderrPath = Join-Path $PSScriptRoot "installer-trust-certutil-$PID-$storeName.stderr.log"
    $certutil = Start-Process `
      -FilePath $certutilPath `
      -ArgumentList @("-silent", "-user", "-addstore", "-f", $storeName, $CertificatePath) `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath `
      -PassThru
    if (-not $certutil.WaitForExit(60000)) {
      & taskkill.exe /pid $certutil.Id /t /f 2>$null | Out-Null
      throw "certutil timed out for CurrentUser $storeName"
    }
    $certutil.WaitForExit()
    if ($certutil.ExitCode -ne 0) {
      throw "certutil failed for CurrentUser $storeName with exit code $($certutil.ExitCode)"
    }
    "certificate-added-$storeName" | Add-Content $tracePath
  }
  "complete" | Add-Content $tracePath
} catch {
  "error-$($_.Exception.Message)" | Add-Content $tracePath
  throw
}