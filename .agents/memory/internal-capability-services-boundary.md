---
name: Internal Capability Services boundary
description: LEE calls CIL and CerbaSeal through authenticated versioned service contracts without sharing their databases or runtimes.
---

CIL is an optional reasoning accelerator: unavailable calls emit a typed event and use frontier fallback. CerbaSeal is execution governance: unavailable or invalid responses produce HOLD and never release an action.

**Why:** LEE must remain operationally independent while preserving strict safety around consequential actions.

**How to apply:** Keep credentials in environment secrets, expose only credential variable names in health/manifest, sign requests with correlation and timestamp, validate responses, and record typed summaries in LEE’s Event Log.