# Node directory refresh coordination — Android remains v27

## Implemented
- A reusable single-resource coordinator is now used by Node getDirectory(), including callers inside the comparison endpoint. Concurrent stale/missing reads share one in-flight refresh; returned objects are detached so callers cannot mutate the cached result.
- Failed refreshes enter exponential cooldown (5-second base, capped exponential base60seconds plus up to20% jitter). Requests during cooldown do not contact the source. There are no scheduled/background retries; the next eligible caller triggers a refresh. This cooldown does not yet consume provider Retry-After hints.
- Valid last-good snapshots remain explicitly stale during failures, with retry interval and cache-observation age. Default retention is seven days; expired, invalid or future-dated saved observations do not become fallback data. No usable snapshot produces503 and a Retry-After hint, not fake collections.
- Diagnostics contain pending/fresh/usable status, retry interval, failure count and persistence category, not provider URLs, filesystem paths, data payloads or upstream error messages. This is an internal API, not a new UI dashboard.
- Saved normalized directory data is checked for Cronos chain binding, unique addresses, independent contiguous ranks/counts, exact formatted amounts, bounded names/descriptions/categories/counts and credential-free HTTPS images.
- JSON snapshots use private same-directory temporary files followed by replacement rename. Reads/saves are bounded. Failed publication cleans its temporary file. This prevents partial JSON visibility but is not fsync/power-loss or off-host durability certification.
- A successful live load remains fresh even if persistence fails; the failure is visible in internal diagnostics rather than falsely labelling the provider data stale.

## Scope and limits
This is coordination for one Node directory resource per process, shared by its existing callers. It is NOT all-provider/global connection control, cross-replica coordination, a Redis distributed lease, native wallet networking, or an edge cooldown change. Edge directory lease/cache behavior remains as before. Source data remains Minted-only and bounded; no extra network-wide discovery or external order execution is implied.

This update changes server/shared validation and tests/docs only. Android/native/frontend UI source is unchanged, so no new APK was built; unchanged v27 artifacts may accompany the source/evidence kit. Current source goes beyond the earlier v27 build snapshot. Backend publication/deployment is still required and has not occurred.

Exact current verification is recorded in REFRESH-UPDATE-REPORT.json, not the historical v27 Android build report. Device19 instrumentation tests remain compiled/0executed. Native signing remains disabled/unapproved. No paid resource, account creation, mainnet spend or license decision is inferred.
