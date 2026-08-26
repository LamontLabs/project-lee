---
name: Local discovery boundary
description: The safety and portability rules for discovering local service contracts from the desktop shell.
---

Desktop service discovery must use a finite, explicit loopback allowlist and return provider-neutral candidates. It must never enumerate ports, hosts, or arbitrary paths, and probe failures must be reduced to safe summaries rather than forwarding service responses or error text.

**Why:** Discovery runs on an owner’s computer and is useful only when it reduces manual setup without turning setup into a network scanner or exposing credentials returned by a local service.

**How to apply:** Keep probing in the desktop runtime, pass only normalized contract metadata to the API, validate loopback candidates again server-side, and require an owner review action before creating or reusing a connection.