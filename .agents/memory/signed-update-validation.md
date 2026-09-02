---
name: Signed update validation
description: Desktop releases need published-feed, tamper-rejection, and valid-install evidence on each supported platform.
---

Updater metadata checks alone do not prove that an installed desktop can apply a release. Validation must download the published current and previous stable Windows/Linux assets, verify each platform feed’s checksums, exercise an intentionally tampered artifact, and then install the valid update through the packaged updater.

**Why:** A release can have correct-looking latest metadata while an installer signature, platform-specific updater, writable install location, or relaunch path is broken.

**How to apply:** Keep the smoke mode test-only and environment-gated; verify Windows Authenticode and Linux AppImage feed consumption, and retain JSON plus checklist evidence with the published release. Do not add macOS signing, notarization, or architecture-specific feed work unless macOS becomes an explicitly supported release target again.