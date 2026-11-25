# Ranking reliability update — Android remains v27

## Implemented
- Shared bounded acquisition for Node and edge: two periods, at most two50-row pages per period; validates page shape, boolean pagination, cursor size/progress, edge shape and GraphQL errors. Partial GraphQL failures reject acquisition. Records page/row/remaining-source information and explicitly marks the observation non-atomic.
- Canonical lower-case address deduplication with exact unsigned uint256 decimal-string ranking amounts. Negative, fractional, exponent-form, unsafe numeric, oversized and wrong-chain data fail closed. Missing amounts remain null in output rather than fabricated zero.
- Conflicting duplicate volume observations reject refresh; volumes are never summed. Metadata variants choose a deterministic complete normalized row, not an asserted newest observation. Duplicate/metadata-conflict counts are permutation-independent.
- Positive-volume top100 all-time plus top100 weekly union remains bounded to200. Exact integer ordering and deterministic address tie-breaking prevent floating-point rank loss.
- Bounded collection text/counts, credential-free HTTPS image normalization, and bounded reviewed category/source overrides. Description-derived categories remain labelled as inferred.
- Node upstream response is capped at2 MiB and disallows redirects/credentials. Edge retains its existing upstream/security/media/cache limits. Shared acquisition semantics do not imply identical platform resource limits or user overrides (Node local category configuration is not automatically deployed to edge).

## Regression/evidence
16 new ranking unit/Node integration tests plus one Node/edge parity-and-stale-retention scenario. Current execution results are in RANKING-UPDATE-REPORT.json. The parity test uses controlled provider data with no Node category overrides. A read-only live Minted observation returned135 union collections (100 all-time,51 positive-volume weekly), from200 acquired rows/183 unique addresses/17 duplicate observations. This is one provider's current sample, not complete Cronos coverage. More source rows were available in both periods; requests intentionally stop at the configured cap.

## Release boundary
Changes are server/shared-ranking/edge logic and tests/docs, not Android/native or frontend UI source. No new Android APK was built. The preserved v27 APK/test APK may accompany the delivery as unchanged artifacts with their original report. Current source includes this backend update beyond the v27 source snapshot. It requires authorized backend publication/deployment to affect the hosted app. The v27 Android build report remains historical evidence, not a current Android rebuild claim.

## Limits
Provider pagination is not a fixed-block/atomic snapshot. Conflicting duplicate rank observations can cause a refresh to fall back to prior data; this favors consistency over live availability. A successful observation does not establish provider quota/uptime or full network-wide rankings. No venue trading adapter, native signing, synchronization, hosted/device acceptance or license selection is implied.
