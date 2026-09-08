!include LogicLib.nsh

!macro customInstall
  SetOutPath "$INSTDIR\resources"
  File /oname=lee-signing.cer "${BUILD_RESOURCES_DIR}\lee-signing.cer"
  File /oname=installer-trust.ps1 "${BUILD_RESOURCES_DIR}\installer-trust.ps1"

  Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\resources\installer-trust.ps1" -CertificatePath "$INSTDIR\resources\lee-signing.cer"'
!macroend