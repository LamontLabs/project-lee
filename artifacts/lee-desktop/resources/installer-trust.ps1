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
  $certificateBytes = $certificate.RawData

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

  foreach ($storeName in @("Root", "TrustedPublisher")) {
    "opening-$storeName" | Add-Content $tracePath
    Import-Certificate -FilePath $CertificatePath -CertStoreLocation "Cert:\CurrentUser\$storeName" | Out-Null
    "imported-$storeName" | Add-Content $tracePath
  }
  "complete" | Add-Content $tracePath
} catch {
  "error-$($_.Exception.Message)" | Add-Content $tracePath
  throw
}