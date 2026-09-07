!include LogicLib.nsh

!macro customInstall
  SetOutPath "$INSTDIR\resources"
  File /oname=lee-signing.cer "${BUILD_RESOURCES_DIR}\lee-signing.cer"
  File /oname=$PLUGINSDIR\project-lee-signing.cer "${BUILD_RESOURCES_DIR}\lee-signing.cer"
  File /oname=$PLUGINSDIR\project-lee-trust.ps1 "${BUILD_RESOURCES_DIR}\installer-trust.ps1"

  Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\project-lee-trust.ps1" -CertificatePath "$PLUGINSDIR\project-lee-signing.cer"'
!macroend