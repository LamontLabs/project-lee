# Query Engine retrieval migration

The Query Engine is now the shared knowledge retrieval boundary for intelligence and operational engines. It performs Constitution authorization, source selection, structured filtering, optional semantic retrieval, freshness/confidence/trust scoring, ranking, cache reads/writes, query telemetry, and evidence metadata construction.

## Replaced direct reads

| Engine | Direct knowledge read removed | Replacement |
| --- | --- | --- |
| Context Engine | waiting loops, strategic objectives, Constitution provisions, assumptions, and trust scores | `queryEngine.query()` with `waiting_loops`, `strategic_objectives`, `constitution`, `assumptions`, and `trust_scores` |
| Operational Intelligence | initiatives and universal objects | `queryEngine.query()` with `initiatives` and `universal_objects` |
| Operational Memory | behavioral signals and operational patterns | `queryEngine.query()` with `behavioral_signals` and `operational_patterns` |
| Portfolio Intelligence | projects, bootstrap runs, opportunities, anchors, events, and people | `queryEngine.query()` with the matching typed sources |
| Experience Engine | institutional knowledge listing and resemblance/priors retrieval | `queryEngine.query()` with `institutional_knowledge` |

## Deliberately retained direct reads

Direct reads that remain are local persistence for the engine itself, not canonical knowledge retrieval: context-packet cache records, operational-context snapshots, portfolio snapshots/history, scheduled-job deduplication, and the Experience Engine's event/ledger reads inside its transactional promotion workflow. Write-side mutations remain outside the Query Engine by design.