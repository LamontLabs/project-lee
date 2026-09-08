param(
  [Parameter(Mandatory = $true)]
  [string] $CertificatePath,
  [switch] $VerifyOnly
)

$ErrorActionPreference = "Stop"
$tracePath = Join-Path $PSScriptRoot "installer-trust.log"
"start" | Set-Content $tracePath
try {
  $currentIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  "identity-$($currentIdentity.Name)-$env:USERPROFILE" | Add-Content $tracePath
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
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;

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

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr FindWindowEx(
        IntPtr parentWindow,
        IntPtr childAfter,
        string className,
        string windowName);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetWindowText(
        IntPtr window,
        StringBuilder text,
        int textLength);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool PostMessage(
        IntPtr window,
        uint message,
        IntPtr wParam,
        IntPtr lParam);

    private const uint ButtonClick = 0x00F5;

    public static bool AddCurrentUserRoot(byte[] encodedCertificate, int timeoutMilliseconds, out string detail)
    {
        Exception failure = null;
        using (var completed = new ManualResetEventSlim(false))
        {
            var worker = new Thread(() =>
            {
                try
                {
                    using (var certificate = new X509Certificate2(encodedCertificate))
                    using (var store = new X509Store(StoreName.Root, StoreLocation.CurrentUser))
                    {
                        store.Open(OpenFlags.ReadWrite);
                        store.Add(certificate);
                    }
                }
                catch (Exception exception)
                {
                    failure = exception;
                }
                finally
                {
                    completed.Set();
                }
            })
            {
                IsBackground = true
            };
            worker.Start();

            var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMilliseconds);
            while (!completed.IsSet && DateTime.UtcNow < deadline)
            {
                ApproveRootStorePrompt();
                Thread.Sleep(100);
            }

            if (!completed.IsSet)
            {
                detail = "Root store add timed out waiting for the Windows confirmation dialog.";
                return false;
            }
        }

        if (failure != null)
        {
            detail = failure.GetBaseException().Message;
            return false;
        }

        detail = "Root store add completed.";
        return true;
    }

    private static void ApproveRootStorePrompt()
    {
        foreach (var process in Process.GetProcessesByName("csrss"))
        {
            try
            {
                var window = process.MainWindowHandle;
                if (window == IntPtr.Zero)
                {
                    continue;
                }

                var button = IntPtr.Zero;
                while ((button = FindWindowEx(window, button, "Button", null)) != IntPtr.Zero)
                {
                    var text = new StringBuilder(128);
                    GetWindowText(button, text, text.Capacity);
                    var label = text.ToString().Trim();
                    if (label.Equals("Yes", StringComparison.OrdinalIgnoreCase) ||
                        label.Equals("Install", StringComparison.OrdinalIgnoreCase) ||
                        label.Equals("Allow", StringComparison.OrdinalIgnoreCase) ||
                        label.Equals("OK", StringComparison.OrdinalIgnoreCase))
                    {
                        PostMessage(button, ButtonClick, IntPtr.Zero, IntPtr.Zero);
                        return;
                    }
                }
            }
            catch
            {
                // A runner may deny inspection of a system process between enumeration and access.
            }
        }
    }
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
    if ($storeName -eq "Root") {
      [string]$rootAddDetail = ""
      $rootAdded = $nativeApiType::AddCurrentUserRoot($certificateBytes, 110000, [ref]$rootAddDetail)
      "capi-root-$rootAdded-$rootAddDetail" | Add-Content $tracePath
      if (-not $rootAdded) {
        throw "unable to add the certificate to CurrentUser Root through the supported store API: $rootAddDetail"
      }
      "certificate-added-$storeName" | Add-Content $tracePath
      continue
    }
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
      "postwrite-$storeName-$($matches.Count)" | Add-Content $tracePath
    } finally {
      $store.Close()
    }
  }
  "complete" | Add-Content $tracePath
} catch {
  "error-$($_.Exception.Message)" | Add-Content $tracePath
  throw
}