---
name: Understanding pipeline schema
description: Import persistence separates raw sources, chunks, runs, and owner review suggestions.
---

The Understanding Pipeline keeps source content and checksum identity in Source Vault, chunk-level provenance in Source Chunk, and uncertain extractions in an explicit review queue. It never promotes extracted records beyond candidate/working canon automatically.

**Why:** Imports need to be replayable and auditable without conflating raw evidence with derived beliefs.

**How to apply:** New parsers, detectors, and UI actions should preserve source/checksum lineage and route uncertainty through the review item lifecycle.