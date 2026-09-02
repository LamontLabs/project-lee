!include LogicLib.nsh

!macro customInstall
  File /oname=$PLUGINSDIR\project-lee-signing.cer "${BUILD_RESOURCES_DIR}\lee-signing.cer"

  IfSilent lee_trust_certificate
  MessageBox MB_ICONINFORMATION|MB_YESNO "Project LEE uses a private signing certificate to verify updates on this Windows account. Install its public certificate automatically?" IDYES lee_trust_certificate
    Abort

lee_trust_certificate:
  ExecWait '"$SYSDIR\certutil.exe" -user -addstore -f "Root" "$PLUGINSDIR\project-lee-signing.cer"' $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "Project LEE could not install its private update-verification certificate."
    Abort
  ${EndIf}

  ExecWait '"$SYSDIR\certutil.exe" -user -addstore -f "TrustedPublisher" "$PLUGINSDIR\project-lee-signing.cer"' $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "Project LEE could not register its private publisher certificate."
    Abort
  ${EndIf}
!macroend