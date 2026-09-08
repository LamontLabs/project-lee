param(
  [Parameter(Mandatory = $true)]
  [string] $CertificatePath,
  [switch] $VerifyOnly
)

$ErrorActionPreference = "Stop"
$tracePath = Join-Path $PSScriptRoot "installer-trust.log"
"start" | Set-Content $tracePath
try {
  "identity-$env:USERNAME-$env:USERPROFILE" | Add-Content $tracePath
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
          $registryPath = "Software\Microsoft\SystemCertificates\$storeName\Certificates\$thumbprint"
          $registryBaseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey(
            [Microsoft.Win32.RegistryHive]::CurrentUser,
            [Microsoft.Win32.RegistryView]::Registry64
          )
          $registryKey = $registryBaseKey.OpenSubKey($registryPath)
          try {
            $blob = if ($null -ne $registryKey) {
              $registryKey.GetValue("Blob", $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
            } else {
              $null
            }
            $blobLength = if ($blob -is [byte[]]) { $blob.Length } else { 0 }
            "registry-$storeName-$blobLength" | Add-Content $tracePath
          } finally {
            if ($null -ne $registryKey) { $registryKey.Close() }
            $registryBaseKey.Close()
          }
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

  $compileTempPath = Join-Path $PSScriptRoot "installer-trust-temp-$PID"
  New-Item -ItemType Directory -Path $compileTempPath -Force | Out-Null
  $originalTemp = $env:TEMP
  $originalTmp = $env:TMP
  try {
    $env:TEMP = $compileTempPath
    $env:TMP = $compileTempPath
    $nativeApiType = Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class ProjectLeeCertificateSerialization
{
    [DllImport("crypt32.dll", SetLastError = true)]
    public static extern IntPtr CertCreateCertificateContext(
        uint encodingType,
        byte[] encodedCertificate,
        int encodedCertificateLength);

    [DllImport("crypt32.dll", SetLastError = true)]
    public static extern bool CertSerializeCertificateStoreElement(
        IntPtr certificateContext,
        uint flags,
        byte[] serializedElement,
        ref uint serializedElementLength);

    [DllImport("crypt32.dll", SetLastError = true)]
    public static extern bool CertFreeCertificateContext(IntPtr certificateContext);
}
"@ -PassThru
    "native-type-loaded" | Add-Content $tracePath
  } finally {
    $env:TEMP = $originalTemp
    $env:TMP = $originalTmp
    Remove-Item $compileTempPath -Recurse -Force -ErrorAction SilentlyContinue
  }

  $certificateBytes = $certificate.RawData
  $certificateContext = $nativeApiType::CertCreateCertificateContext(
    [uint32]0x00010001,
    $certificateBytes,
    $certificateBytes.Length
  )
  if ($certificateContext -eq [IntPtr]::Zero) {
    throw "CertCreateCertificateContext failed with Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
  }
  try {
    [uint32]$serializedLength = 0
    $null = $nativeApiType::CertSerializeCertificateStoreElement(
      $certificateContext,
      [uint32]0,
      $null,
      [ref]$serializedLength
    )
    if ($serializedLength -eq 0) {
      throw "CertSerializeCertificateStoreElement returned an empty store element"
    }
    $serializedElement = New-Object byte[] $serializedLength
    $serialized = $nativeApiType::CertSerializeCertificateStoreElement(
      $certificateContext,
      [uint32]0,
      $serializedElement,
      [ref]$serializedLength
    )
    if (-not $serialized) {
      throw "CertSerializeCertificateStoreElement failed with Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }
  } finally {
    $nativeApiType::CertFreeCertificateContext($certificateContext) | Out-Null
  }

  foreach ($storeName in @("Root", "TrustedPublisher")) {
    "opening-$storeName" | Add-Content $tracePath
    $registryPath = "Software\Microsoft\SystemCertificates\$storeName\Certificates\$thumbprint"
    $registryBaseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey(
      [Microsoft.Win32.RegistryHive]::CurrentUser,
      [Microsoft.Win32.RegistryView]::Registry64
    )
    "hive-$($registryBaseKey.Name)" | Add-Content $tracePath
    $registryKey = $registryBaseKey.CreateSubKey($registryPath)
    if ($null -eq $registryKey) {
      throw "unable to open CurrentUser certificate registry path $registryPath"
    }
    try {
      $registryKey.SetValue(
        "Blob",
        $serializedElement,
        [Microsoft.Win32.RegistryValueKind]::Binary
      )
      $registryKey.Flush()
      "registry-written-$storeName-$($serializedElement.Length)" | Add-Content $tracePath
      $readbackKey = $registryBaseKey.OpenSubKey($registryPath)
      try {
        $readback = $readbackKey.GetValue("Blob", $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
        $readbackLength = if ($readback -is [byte[]]) { $readback.Length } else { 0 }
        "registry-readback-$storeName-$readbackLength" | Add-Content $tracePath
      } finally {
        if ($null -ne $readbackKey) { $readbackKey.Close() }
      }
    } finally {
      $registryKey.Close()
      $registryBaseKey.Close()
    }
    "certificate-added-$storeName" | Add-Content $tracePath
  }
  "complete" | Add-Content $tracePath
} catch {
  "error-$($_.Exception.Message)" | Add-Content $tracePath
  throw
}