---
name: Hosted Windows Root-store limitation
description: GitHub-hosted noninteractive Windows users cannot complete the CurrentUser Root trust prompt during installer smoke tests.
---

GitHub-hosted Windows smoke accounts can write and verify `CurrentUser\TrustedPublisher`, but a supported write to `CurrentUser\Root` waits for an interactive Windows security confirmation that is unavailable to the noninteractive runner. Direct HKCU serialized-blob writes can read back from the registry while remaining invisible to the logical Root store.

**Why:** A clean-account release run proved the smoke identity and TrustedPublisher path, while the supported Root-store API timed out waiting for the security dialog; a CA-capable certificate did not remove that prompt.

**How to apply:** Do not treat Root registry presence as trust-store success. Use an interactive/self-hosted Windows validation environment or change the release trust contract to validate the issuing root through a supported pre-provisioning mechanism and the signer in TrustedPublisher.