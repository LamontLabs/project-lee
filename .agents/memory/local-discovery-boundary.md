---
name: Local discovery boundary
description: The safety and portability rules for discovering local service contracts from the desktop shell.
---

Desktop service discovery must use a finite, explicit loopback allowlist and return provider-neutral candidates. It must never enumerate ports, hosts, or arbitrary paths, and probe failures must be reduced to safe summaries rather than forwarding service responses or error text.

**Why:** Discovery runs on an owner’s computer and is useful only when it reduces manual setup without turning setup into a network scanner or exposing credentials returned by a local service.

**How to apply:** Keep probing in the desktop runtime, pass only normalized contract metadata to the API, validate loopback candidates again server-side (including URL query/fragment and timestamp safety), and require an owner review action before creating or reusing a connection.

The persisted owner-approved local contract registry is the source of truth for enabled probes. The desktop must fail closed when it cannot read that registry rather than silently probing stale defaults.

**Why:** Removing a contract must take effect even when the owner has intentionally narrowed discovery; falling back to an old allowlist would make removal unreliable.

**How to apply:** Fetch enabled contract metadata through the local API before discovery, validate it again in the desktop runtime and server, and return no probes when the registry cannot be read.