---
name: Mobile local-first boundary
description: The durable mobile companion behavior when the hosted API is unavailable.
---

The Android companion should keep pairing state and captures on-device, expose queued status clearly, and treat live API synchronization as an enhancement rather than a prerequisite for capture.

**Why:** The companion’s primary job is fast capture away from the Console; network failure must not erase the observation or interrupt the user’s flow.

**How to apply:** Keep AsyncStorage-backed queue state behind the shared mobile context while adding upload, retry, audio, notifications, and live brief endpoints.