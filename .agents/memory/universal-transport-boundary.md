---
name: Universal transport boundary
description: External capability calls share registered-system transport metadata and audit behavior.
---

Every external capability request must pass through the Universal Systems transport; provider-specific adapters may only describe payload shape and credential header metadata.

**Why:** Separate HTTP and SDK paths made authority, correlation, timeout, health, and audit guarantees difficult to verify consistently.

**How to apply:** Keep the contract envelope as the generic default. Use explicit registered metadata for direct provider payloads, provider credential header names, method, and timeout; do not add provider-specific network clients inside adapters.