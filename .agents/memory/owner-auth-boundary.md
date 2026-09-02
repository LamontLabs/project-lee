---
name: Owner authentication boundary
description: Packaged desktop owner access uses local credential and session material without exposing secrets to the client.
---

Packaged desktop owner authentication stores a salted password verifier and a separate per-install session-signing secret under the private data directory; sessions are signed, expiring, and revocable until the process restarts.

**Why:** Installed desktops cannot depend on a hosted secret manager, while logout and compromised-session recovery require more than deleting a browser cookie.

**How to apply:** Keep credential enrollment atomic and permission-restricted, never persist plaintext passwords, treat malformed local records as invalid credentials, and retain environment credentials only as an explicit development compatibility path.