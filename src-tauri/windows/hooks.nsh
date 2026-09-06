; Remove leftover runtime files (mods written next to the exe on older builds)
; so the install directory can be deleted. Skip during in-app updates.

!macro NSIS_HOOK_PREUNINSTALL
  ${If} $UpdateMode <> 1
    RMDir /r "$INSTDIR\mods"
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    RMDir /r "$INSTDIR"
  ${EndIf}
!macroend
