---
name: Self-Test boundary
description: Self-Test produces persisted evidence reports across core Lee subsystems and emits a completion event.
---

Self-Test is an evidence-producing diagnostic, not a health ping: each isolated case has PASS/WARN/FAIL, duration, and observed evidence; suite and overall results persist for history and emit SelfTestCompleted.

**Why:** A live process can still have broken contracts, stale state, invalid policies, or unusable context selection.

**How to apply:** Add subsystem checks as independent suites, preserve actual observed values in evidence, use WARN for threshold boundaries, and keep remediation in Lifecycle/Recovery rather than inside the test runner.