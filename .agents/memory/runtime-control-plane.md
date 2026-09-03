---
name: Runtime and control planes
description: The durable separation between consuming services and managing registered projects.
---

LEE has two external connectivity planes. The runtime service plane consumes capabilities through authenticated contracts: CIL for cognitive routing, CerbaSeal for consequential governance, providers for normalized data, and an execution gateway for CIL-selected model routes. The management/control plane uses the scoped MCP Project Bridge to inspect, read, preview, change, test, and coordinate registered projects.

**Why:** Using MCP as an indirect path to CIL would blur authority, while treating a project-bridge outage as a core outage would overstate system failure.

**How to apply:** Keep CIL and CerbaSeal independently owned and API-only. Model readiness, governance readiness, and project-operations readiness must remain separate from Core readiness. Keep project bridge permissions preview-first and never expose secrets or arbitrary shell.