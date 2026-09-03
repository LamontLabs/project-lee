---
name: Desktop update interruption validation
description: Interrupted updates must preserve the previous usable install before retrying.
---

Desktop update validation must exercise both download interruption and install-handoff interruption, then launch the previous version and verify its database, migration, and contract health before retrying the same feed.

**Why:** A checksum failure is not the only updater failure mode; a killed transfer or installer can leave a user with no launchable application even when the next retry would otherwise succeed.

**How to apply:** Keep interruption controls smoke-only, use the normal shutdown path for download cancellation, retain phase-specific JSON evidence, and assert the previous version remains live before a clean retry.