---
name: Context Economy boundary
description: Context packets rank candidates continuously across relevance factors and audit both winners and exclusions.
---

Context Value replaces tier allocation with a multiplicative, policy-weighted score across goal match, recency, importance, relationship, project activity, confidence, trust, and mode relevance; greedy selection respects the token budget and persists every competition result.

**Why:** Static memory tiers age poorly as the operating history grows, while score breakdowns make packet selection explainable and debuggable.

**How to apply:** Retrieve candidates through Query/Semantic Index, use configured intent weights, preserve factor breakdowns and exclusions in the packet, and treat semantic similarity as an enhancement rather than the authority. For sensitive provider content, select metadata candidates first and hydrate bodies only for winners; excluded candidates must remain metadata-only and un-fetched.