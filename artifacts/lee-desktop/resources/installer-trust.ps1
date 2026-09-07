param(
  [Parameter(Mandatory = $true)]
  [string] $CertificatePath
)

$ErrorActionPreference = "Stop"
$tracePath = Join-Path $env:TEMP "lee-installer-trust.log"
"start" | Set-Content $tracePath
try {
  $certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($CertificatePath)
  "certificate-loaded" | Add-Content $tracePath

  foreach ($storeName in @("Root", "TrustedPublisher")) {
    "opening-$storeName" | Add-Content $tracePath
    $store = [System.Security.Cryptography.X509Certificates.X509Store]::new(
      $storeName,
      [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
    )
    try {
      $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
      "opened-$storeName" | Add-Content $tracePath
      $store.Add($certificate)
      "added-$storeName" | Add-Content $tracePath
    } finally {
      $store.Close()
    }
    try {
      Import-Certificate -FilePath $CertificatePath -CertStoreLocation "Cert:\CurrentUser\$storeName" | Out-Null
      "imported-$storeName" | Add-Content $tracePath
    } catch {
      "import-fallback-error-$storeName-$($_.Exception.Message)" | Add-Content $tracePath
    }
  }
  "complete" | Add-Content $tracePath
} catch {
  "error-$($_.Exception.Message)" | Add-Content $tracePath
  throw
}