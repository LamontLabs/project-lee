---
name: Self-Test boundary
description: Self-Test produces persisted evidence reports across core Lee subsystems and emits a completion event.
---

Self-Test is an evidence-producing diagnostic, not a health ping: each isolated case has PASS/WARN/FAIL, duration, and observed evidence; suite and overall results persist for history and emit SelfTestCompleted.

**Why:** A live process can still have broken contracts, stale state, invalid policies, or unusable context selection.

**How to apply:** Add subsystem checks as independent suites, preserve actual observed values in evidence, use WARN for threshold boundaries, and keep remediation in Lifecycle/Recovery rather than inside the test runner.

Full checks must preserve real FAIL results from legacy data integrity gaps while still proving isolated restore behavior independently.

**Why:** A valid temporary restore can coexist with unresolved historical provenance or replay mismatches; collapsing either result into PASS hides the recovery risk.

**How to apply:** Report both the failing integrity checks and the passing isolated transaction evidence, and leave repair to a separate remediation task.