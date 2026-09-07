param(
  [Parameter(Mandatory = $true)]
  [string] $CertificatePath
)

$ErrorActionPreference = "Stop"
$certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($CertificatePath)

foreach ($storeName in @("Root", "TrustedPublisher")) {
  $store = [System.Security.Cryptography.X509Certificates.X509Store]::new(
    $storeName,
    [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
  )
  try {
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $store.Add($certificate)
  } finally {
    $store.Close()
  }
}