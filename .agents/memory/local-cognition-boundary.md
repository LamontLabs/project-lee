---
name: Governed local cognition boundary
description: Ollama is a CIL-selected, resource-gated execution destination for approved background work.
---

Ollama is an execution destination, not a local router. LEE may execute an Ollama route only when CIL selected the provider, model, and route ID and the caller supplied an explicitly approved background workload class. Interactive and consequential reasoning must not silently move local.

**Why:** Local availability, privacy, and cost characteristics are useful for bounded background work, but allowing LEE to choose locally would create a second routing authority and could bypass CIL outage behavior.

**How to apply:** Keep runtime health, model inventory, limits, cancellation, resource admission, cost, measured usage, and outcome evidence behind the adapter. Treat llama.cpp and whisper.cpp as future seams until separately installed and governed. Failed or unavailable Ollama execution may only reroute through a fresh CIL decision.