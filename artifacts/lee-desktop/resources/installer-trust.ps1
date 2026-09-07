param(
  [Parameter(Mandatory = $true)]
  [string] $CertificatePath
)

$ErrorActionPreference = "Stop"
$tracePath = Join-Path $PSScriptRoot "installer-trust.log"
"start" | Set-Content $tracePath
try {
  $certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($CertificatePath)
  "certificate-loaded" | Add-Content $tracePath
  $thumbprint = $certificate.Thumbprint.ToUpperInvariant()
  $certificateBytes = $certificate.RawData

  foreach ($storeName in @("Root", "TrustedPublisher")) {
    "opening-$storeName" | Add-Content $tracePath
    $registryPath = "Software\Microsoft\SystemCertificates\$storeName\Certificates\$thumbprint"
    $registryKey = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($registryPath)
    try {
      $registryKey.SetValue("Blob", $certificateBytes, [Microsoft.Win32.RegistryValueKind]::Binary)
      "written-$storeName" | Add-Content $tracePath
    } finally {
      $registryKey.Dispose()
    }
  }
  "complete" | Add-Content $tracePath
} catch {
  "error-$($_.Exception.Message)" | Add-Content $tracePath
  throw
}