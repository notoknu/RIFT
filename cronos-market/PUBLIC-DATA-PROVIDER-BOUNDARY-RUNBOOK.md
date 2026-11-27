# Public data provider and snapshot boundaries — Phase4D continuation59

## State
Source implementation only, unverified. Phase4D remains in progress. This continuation implements explicit builtin/compatible/disabled provider selection and source-scoped caching, **not** independent ownership of venue/catalog/explorer datasets or admission of arbitrary alternative data models.

No tests, builds, syntax checks, runtime imports, services, network calls, actual snapshot refreshes, publication, deployment or activation were performed.

## Selection contract
`RIFT_PUBLIC_DATA_PROVIDERS_JSON` is an optional JSON object with only `ebisu`, `minted`, `explorer` keys. Omitted entries retain the existing builtin source. An entry is either:
- Exactly `mode: disabled`; or
- `mode: compatible` with `origin`, `approvedHost`, `contract`.

The admitted protocol identifiers are:
- Ebisu: `wolfswap-ebisu-v1`, ranked and cursor catalog operations.
- Minted: `minted-graphql-v1`, the existing ranking/search/catalog GraphQL operations.
- Explorer: `cronos-next-table-v1`, the existing NFT/ERC20 address-table HTML/Next-data operations.

`origin` must be an exact root HTTPS origin with no credentials, port, path/query/fragment. `approvedHost` must exactly match its lowercase public-looking DNS hostname, excluding local/internal/test suffixes. Protocol identifiers must match the selected family; changing data models requires a real adapter, not a different identifier or URL. No authentication fields or arbitrary request-supplied endpoint overrides are supported.

Selections are operator configuration, not proof that a remote service honors the protocol or supplies truthful/independent data. Compatible endpoints must preserve the existing source/chain semantics and response shapes. Existing provider names/URLs in normalized attribution remain intentional; a mirror is not relabelled as a new independent venue. Public source figures are not added into invented whole-network totals.

`shared/public-data-providers.js` defines the executable selection and operation grammar. The support CLI's describe action exposes the protocol descriptors; it still does not activate or certify a selection.

## Node boundaries
The default live readers for venue snapshots, Ebisu/Minted search, Minted rankings, comparison, explorer discovery and Ebisu fuzzy catalog now build URLs through the shared selection contract.

`server/public-data-fetch.js` provides a bounded GET/POST transport: public-address DNS validation and pinned lookup answers, TLS, no cookies/authorization/custom request headers, no redirects, no automatic retries, at most12 active calls, at most64KiB request bodies. Default response cap2MiB; explorer uses5million bytes. DNS/network share a default12-second deadline, configurable within25seconds. Existing injected fetchers/readers remain trusted dependency-injection overrides and are not sandboxed by this transport. DNS operations are not forcibly cancelled by a raced deadline, and OS/transport cleanup is not a universal resource-reservation guarantee.

Node catalog refresh now uses the existing bounded refresh-resource implementation rather than an unbounded JSON-file fallback. It caps30 pages of100 source rows,4MiB encoded result,25-second cooperative scan deadline, detects repeated cursors and records incomplete coverage when the page cap is reached. Snapshot age is bounded to7days and stale use is explicit; this does not prove a complete catalog or stable pagination.

## Snapshot identity and compatibility
`server/public-data-snapshot.js` scopes ranking, comparison and search-catalog snapshots by selected protocol/origin identity. `RIFT_PUBLIC_SNAPSHOT_DIR` optionally selects an absolute trusted snapshot root. Default is the project's `data/public-provider-snapshots` directory. Snapshot filenames use a selection digest; path/provider identities are not added to public responses.

Existing unscoped files are preserved but not automatically loaded into a new scoped identity. This deliberate cold-start change avoids treating an old file as evidence for a new origin. It may reduce availability until a legitimate refresh occurs. No migration, remote fetch or file deletion was run here. Changing selections or snapshot locations uses a drained restart; runtime mutation is not supported. Default resource guards reject provider changes for their pinned scopes.

The snapshot implementation retains existing atomic-rename and bounded-JSON semantics. It is not fsync/off-host durability certification, a filesystem sandbox, authenticated provenance, WORM retention, capacity reservation or a full lifecycle manager. Trusted directories are required. Old namespaces are retained; lifecycle cleanup remains Phase7 work.

Disabled required sources fail before default cached/saved resource reads. Comparison requires both source families. Search can expose partial results/warnings from remaining sources or exact-address RPC; disabling explorer does not establish an empty wallet. The optional local transfer index/manual import remains a separate bounded discovery path. No stale fallback from a previous enabled identity is treated as a successful disabled source.

## Worker boundaries
Worker ranking, search, comparison, catalog advancement and explorer reads now use the same protocol URL selector. Worker fetches retain D1 shared budgets, response limits and redirect refusal, but do not gain Node DNS/IP pinning; provider/egress trust is still required.

D1 JSON cache/lease keys now include a digest of the entire provider selection policy, including builtin mode/version. Catalog cursor snapshots use exactly that namespace. Existing unscoped D1 rows remain untouched but are not automatically consumed. Policy changes cause cold cache namespaces rather than mixing source datasets. This also namespaces other JSON caches through the shared cache helper; no automatic cache deletion occurs.

Worker cached rows reject future/invalid observation timestamps and observations older than7days. Stale fallback exposes stale age. Catalog direct reads also apply age/shape checks; expired/missing catalog data is marked unavailable/incomplete, while malformed data fails closed. Search reports catalog unavailability instead of pretending complete coverage. Disabled required providers cannot use a cache to bypass the policy. Media host approval remains separate: configuring a data origin does not automatically authorize its arbitrary image hosts.

## Still required in Phase4D
- Concrete independently owned/normalized data alternatives where full provider independence is claimed; a compatible mirror is not that alternative.
- Reviewed cross-provider semantic/provenance admission, mandatory/optional/degraded behavior and precise feature-level source evidence.
- Remaining provider-specific operational/status/configuration tooling and source-consumer integration review. No claim that every historical utility, mobile/device client or offline script was rewired in this turn.

Broader complete holdings/rebuilds, acquisition density/completeness, unattended lifecycle/capacity and final integration remain Phases5–8. Wallet-only signing,1 CRO ceiling and all historical Markdown/TXT remain unchanged.


## Continuation60 — Phase4D bounded owned public-data adapter
Added Node file/Worker ASSETS hash-pinned normalized owned dataset reads for directory/dataset-local ranks, search, collection observations and wallet candidates; actual RPC ownership checks remain. Missing/expired/mismatched owned data fails without external fallback. One dataset cannot supply independent crosscheck; source support evaluator explicitly rejects that combination. Read-only evidence-pin inspection CLI added, not run. Phase4 bounded read/provider boundaries are source-implemented, not whole-product/M1 completion. Four phases/work packages remain (5/6/7/8), including automated complete data production and lifecycle. See report60 and OWNED-PUBLIC-DATA-RUNBOOK.md. No tests/builds/syntax checks/network/data publication/activation; no real dataset fabricated. Historical MD/TXT/snapshots, wallet-only signing and1 CRO ceiling preserved.
