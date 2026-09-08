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

  $nativeAssemblyPath = Join-Path $PSScriptRoot "ProjectLeeCertificateStore.dll"
  $compileTempPath = Join-Path $PSScriptRoot "installer-trust-temp"
  New-Item -ItemType Directory -Path $compileTempPath -Force | Out-Null
  $originalTemp = $env:TEMP
  $originalTmp = $env:TMP
  try {
    $env:TEMP = $compileTempPath
    $env:TMP = $compileTempPath
    $nativeApiType = Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class ProjectLeeCertificateStore
{
    [DllImport("crypt32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr CertOpenStore(
        IntPtr storeProvider,
        uint encodingType,
        IntPtr cryptographicProvider,
        uint flags,
        string storeName);

    [DllImport("crypt32.dll", SetLastError = true)]
    public static extern bool CertAddEncodedCertificateToStore(
        IntPtr certificateStore,
        uint encodingType,
        byte[] encodedCertificate,
        int encodedCertificateLength,
        uint addDisposition,
        IntPtr certificateContext);

    [DllImport("crypt32.dll", SetLastError = true)]
    public static extern bool CertCloseStore(IntPtr certificateStore, uint flags);
}
"@ -OutputAssembly $nativeAssemblyPath -PassThru
  } finally {
    $env:TEMP = $originalTemp
    $env:TMP = $originalTmp
    Remove-Item $compileTempPath -Recurse -Force -ErrorAction SilentlyContinue
  }

  $certificateBytes = $certificate.RawData
  foreach ($storeName in @("Root", "TrustedPublisher")) {
    "opening-$storeName" | Add-Content $tracePath
    $store = $nativeApiType::CertOpenStore(
      [IntPtr]10,
      [uint32]0x00010001,
      [IntPtr]::Zero,
      [uint32]0x00010000,
      $storeName
    )
    if ($store -eq [IntPtr]::Zero) {
      throw "CertOpenStore failed for CurrentUser $storeName with Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }
    try {
      $added = $nativeApiType::CertAddEncodedCertificateToStore(
        $store,
        [uint32]0x00010001,
        $certificateBytes,
        $certificateBytes.Length,
        [uint32]3,
        [IntPtr]::Zero
      )
      if (-not $added) {
        throw "CertAddEncodedCertificateToStore failed for CurrentUser $storeName with Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
      }
    } finally {
      $nativeApiType::CertCloseStore($store, 0) | Out-Null
    }
    "imported-$storeName" | Add-Content $tracePath
  }
  "complete" | Add-Content $tracePath
} catch {
  "error-$($_.Exception.Message)" | Add-Content $tracePath
  throw
}