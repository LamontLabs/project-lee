!include LogicLib.nsh

!macro customInstall
  File /oname=$PLUGINSDIR\project-lee-signing.cer "${BUILD_RESOURCES_DIR}\lee-signing.cer"
  File /oname=$PLUGINSDIR\project-lee-trust.ps1 "${BUILD_RESOURCES_DIR}\installer-trust.ps1"

  IfSilent lee_trust_certificate
  MessageBox MB_ICONINFORMATION|MB_YESNO "Project LEE uses a private signing certificate to verify updates on this Windows account. Install its public certificate automatically?" IDYES lee_trust_certificate
    Abort

lee_trust_certificate:
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\project-lee-trust.ps1" -CertificatePath "$PLUGINSDIR\project-lee-signing.cer"' $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "Project LEE could not install its private update-verification certificate."
    Abort
  ${EndIf}
!macroend