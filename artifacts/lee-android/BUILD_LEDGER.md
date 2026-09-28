# Android quality-pass build ledger

The debug build overwrites the same APK path after each pass. Keep no per-pass APK copies.

APK path: `android/app/build/outputs/apk/debug/app-debug.apk`

| Pass | Type | Change | Build result | APK SHA-256 | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | Functionality | Restore native screen-capture, share, and app-link entry points to Android's current activity APIs; add wiring coverage. | `assembleDebug` succeeded in 14m 19s. | `0b824afe14f986d4443c9cc32f4a5c01da97e2ad707d13c1829b323f5ab87857` | APK package `com.projectlee.owner`; v2 signature verified; `zipalign -c 4` passed; device-wiring tests passed 6/6. |
| 2 | Visual quality | Give capture-mode and tag selectors 48-point touch targets with clear crimson selected outlines; enlarge the save control. | `assembleDebug` succeeded in 2m 7s. | `e49c214b3515ea69de9c2fc5aeb311c5100f9947ee79a6791f380076654681b3` | Device-wiring tests passed 7/7; APK package `com.projectlee.owner`; embedded JS bundle 3,641,980 bytes; APK signature verification and `zipalign -c 4` passed. |