---
name: Domain Events boundary
description: Typed, versioned EventBus records causal state changes on the immutable Event Log.
---

All supported domain emissions validate against a versioned catalog before insertion, carry event version and causal metadata, and notify typed subscribers; Event Log remains the internal recovery and projection primitive.

**Why:** Downstream engines must consume explicit contracts rather than infer payload shape from generic event names, especially during re-projection and causal tracing.

**How to apply:** Add new event types and payload schemas to the catalog first, emit through EventBus, pass the triggering event ID as causation, and use catalog/filter/causal APIs for inspection.