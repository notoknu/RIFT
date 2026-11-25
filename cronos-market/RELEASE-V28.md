# RIFT v28 — comparison refresh resilience and honest stale/gap UI

## Implemented
- Node cross-market comparison now uses the bounded refresh coordinator: shared in-flight requests, detached results, failure cooldown, marked stale fallback within retention, validated private saved data and atomic JSON replacement. Successful provider results remain fresh if saving fails. No data yields503with retry hint, not substitute figures.
- Venue acquisition is limited to100rows per period and2MiB per response; redirects/credentials are disabled. Chain/address/period duplicates, conflicting rank observations, unsafe amounts, oversized labels/history and bad saved bindings fail closed.
- Provider CRO volumes are normalized to decimal strings for display; this cannot recover precision already lost by the provider's JSON numeric values. No venue totals are summed or treated as executable prices. Zero floor and unknown amounts remain distinct.
- Nullable labels use the real contract address instead of invented metadata. Unsafe/unsupported venue image URLs are omitted, not fetched or substituted. Source-specific image safety remains enforced by media transport.
- Null floor-history samples remain null. The UI declines a continuous chart when samples have gaps, rather than connecting across missing observations or inventing zeroes.
- UI shows STALE COMPARISON and both source indicators as stale when the entire saved comparison is stale; fresh transition clears that state. A failed HTTP refresh also marks any comparison retained in the current view stale, rather than leaving green live-looking indicators. Minted-only stale status still works independently.

## Tests/observations
Nine new Node comparison tests cover binding, amounts, limits, duplicate/conflicting observations, unknown/zero preservation, stale refresh/recovery, HTTP privacy/retry hints, nullable metadata and history gaps. A new mobile controlled-browser scenario covers stale/fresh indicators and gap notice, included in the full browser runner. Current exact build/test evidence is in ANDROID-BUILD-REPORT.json.

A read-only live observation returned139venue collections,43matched Minted addresses and110histories with gaps. It was non-atomic and source-scoped, not uptime/quota/trading/network-coverage acceptance. Early observation attempts exposed nullable history/name and unsupported artwork forms; those are now explicitly represented as missing/omitted, while invalid metric/rank data still fails closed. No live snapshot was published by the direct observation helper.

## Boundary
This Node comparison resource is per-process; it is not all-provider/cross-replica coordination or a new edge comparison implementation. Edge retains its existing cache/lease behavior, and benefits from the shared UI stale/gap notices. No external venue execution adapter was added.

Frontend changes require a newly built v28 APK. Use matched source/app/test artifacts and the exact report; older v27 APKs do not contain the notices. Instrumentation suite remains19 compiled-only until authorized device execution. Native signing remains disabled/unapproved. No hosted deployment, paid resources, mainnet spend or license choice is inferred.
