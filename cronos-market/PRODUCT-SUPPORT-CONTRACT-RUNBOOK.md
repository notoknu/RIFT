# Phase 4A — Product support contract and gateway boundary

## Status

Source-implemented, unverified and inactive. No tests, builds, syntax checks, support/evidence commands, servers, network requests, deployments, trading activation or spending were run.

Phase4 remains **in progress**: this part establishes the reviewed source contract, connects production registration to it and implements the Node public-IPFS gateway boundary. It does not complete projection repository replacement, Worker parity or independent venue/discovery data.

## Executable source contract

`shared/product-support-contract.js` contains:

-15 existing Node production feature/plugin definitions, registration order, logical API routes/methods, scope exclusions and per-request/optional/full-feature dependency classifications;
- exact shared creator-route policy descriptors exported from `shared/creator-routes.js`, avoiding a separate hand-maintained creator authorization route list;
- accounts/RPC/uploads/projections/metadata/venue/discovery/snapshot/release dependency boundaries;
- explicit source-level deployment profiles and policy evaluation;
- platform contracts for middleware ordering, rate limiting, frontend/API delivery, user-wallet signing and unchanged spend ceiling.

`server/product-plugin-registry.js` binds these feature IDs to the existing concrete factories. Production now uses that registry in the same registration order. Missing factory IDs, count drift, mismatched plugin names or absent configuration methods fail closed. No alternative database/profile is silently activated.

### Profile matrix

| Profile | Accounts | Projections | Hosting arrangements | Security/process contract |
|---|---|---|---|---|
| `node-sqlite` | Existing SQLite account adapter | Existing local SQLite indexes | Node static/API or static frontend with Node API | Single process with explicit local limits, or Redis; multiple processes on one host require Redis |
| `node-libsql-accounts` | Existing reviewed libSQL account adapter | **Still local SQLite**, not remote projection parity | Same Node arrangements | Same process/rate-limit restrictions |
| `worker-d1` | Existing shared creator service over D1 | Separate D1 implementations | Worker assets/API or static frontend with Worker API | Worker-isolate model and D1 budgets; Node Redis/security semantics are not implied |

These are admitted source arrangements, not hosted compatibility or conformance certificates. External frontend origins/auth transport/CSP, persistent storage, credentials, deployment bindings and provider independence still require actual configuration. No arbitrary SQL backend, multi-host SQLite coherence or universal Node/Worker equivalence is admitted.

### Feature matrix

| Feature ID | Logical route group | Worker source contract relative to Node |
|---|---|---|
| `creator` | Shared account/auth/profile/favorites/drafts/reports/collections/uploads policy | Implemented shared-service slice; configuration/transport constraints remain |
| `status` | `/api/v1/status`, `/api/v1/release` | Partial: no equivalent Node release route |
| `venue-snapshot` | `/api/v1/collection-market` | Implemented bounded provider snapshot slice |
| `collection-profile` | `/api/v1/collection-profile` | Implemented bounded read slice |
| `collections` | `/api/v1/collection-items`, view/query variants | Partial: ingestion/query/resource contracts differ |
| `exchange` | Capabilities, listings/offers, activity and Node detail paths | Partial: Node listing/offer detail paths and query semantics are not identical |
| `ipfs-preflight` | `/api/v1/storage/verify` | Partial: Worker gateway/preflight policy differs from new Node policy |
| `legacy-market` | `/api/v1/listings` and Node listing detail | Partial: Node detail path is not implemented by the Worker route |
| `portfolio` | Portfolio, NFT detail, manual import | Partial: discovery/pagination/coverage contracts differ |
| `wallet-art` | `/api/wallet-art` | Implemented media slice, not identical handle persistence |
| `rankings` | `/api/collections` | Implemented source-reported directory slice |
| `images` | Image/search-art/market-art paths | Implemented bounded media slice |
| `crosscheck` | `/api/crosscheck` | Implemented source comparison slice |
| `search` | `/api/search` | Implemented bounded external/catalog/address lookup slice |
| `metadata-audit` | `/api/nft-readiness` | Implemented point-in-time readiness slice |

“Implemented” here is an authored source contract, **not execution verification or complete runtime parity**. Logical route declarations are not a claim that every Express mount-prefix, trailing-slash, case or computed query variant has identical semantics across runtimes. Creator regexes apply after the existing query/single-trailing-slash normalization. Shared middleware and frontend fallback remain part of the platform contract, not omitted merely because they are not plugin routes.

## Support tooling

Unexecuted entry point: `npm run product:support -- JSON_CONFIG`.

Commands:

- `{version:1,action:"describe"}` returns the feature/dependency/profile/platform contract.
- `{version:1,action:"evaluate",selection:...}` applies the source selection policy below.
- `{version:1,action:"evidence"}` compares curated source files to the reviewed baseline and reports literal route/environment-name candidates.

Evaluation selection has exactly these fields:

- `version:1`;
- `profile`: one of the three profile IDs;
- `hosting`: admitted hosting from that profile;
- `processModel`: `single-process`, `multi-process-single-host`, or `worker-isolates`;
- `rateLimiter`: `single-process`, `redis`, or `d1` as admitted;
- `uploads`: `disabled`, `pinata`, or `pinata-compatible`;
- nonempty distinct `requiredFeatures` from the feature IDs;
- distinct `allowPartialFeatures`, a subset of required features;
- boolean `requireCompleteIndependence`.

Partial Worker features require explicit acceptance in `allowPartialFeatures`; they are not silently certified. Incompatible hosting/process/rate-limit combinations produce explicit reasons. Requiring complete independence fails while selected dependencies retain declared gaps. Unknown fields/IDs and malformed requirements are rejected.

`requiredFeatures` expresses required support, not a runtime feature-disable list. The existing production application still registers its existing15 plugins. The evaluator does not change environment settings, read credentials, configure origins, instantiate application factories, authorize trades or start services.

A compatible result still reports `configurationReady:false`, `verified:false`, `activated:false`. CLI evaluation incompatibility or evidence drift returns exit code2; malformed input/read errors return1. No such command was executed during implementation.

## Source baseline

`config/product-support-source-baseline.json` records curated Node/shared/Worker source hashes used for this review. It includes production registration, handlers/policies, relevant adapters and Worker entry/read/index boundaries. The evidence command uses bounded no-follow reads and reads only those source paths, not environment values, credential files or production data.

This is not exhaustive transitive analysis, dynamic route discovery, a signature or immutable evidence. Matching hashes mean the curated bytes match that baseline—not that code is correct, all paths were reviewed or every dependency was found. Future changes require review and a deliberate new baseline, not automatic certification.

## Actual provider-boundary implementation

`server/public-ipfs-gateways.js` adds `RIFT_PUBLIC_IPFS_GATEWAYS`, a JSON array of1–5 distinct credential-free HTTPS gateway origins. Origins must have no custom port, path prefix, query or fragment. Omission keeps the existing `https://ipfs.io` and `https://gateway.pinata.cloud` default pair; invalid explicit configuration fails closed rather than silently reverting.

The resolver validates CID syntax and bounded path segments, rejects traversal, embedded separators/controls and nested percent encoding, and encodes the selected IPFS path for `/ipfs/` gateways. Public-address/DNS/redirect/byte safety remains enforced by the existing `safeFetch`, not by trusting an environment URL.

Wired into Node:

- wallet/collection NFT metadata reads;
- wallet artwork gateway fallback;
- public metadata-directory preflight.

Ordinary HTTPS metadata/art continues through existing bounded safe fetches; embedded data handling is retained. Gateway fallback shares a per-read deadline rather than multiplying the previous timeout by the number of configured gateways:7 seconds for wallet metadata,8 seconds for artwork/preflight. A first gateway that consumes the budget leaves no guaranteed attempt at a later gateway. Metadata caches distinguish selected gateway URL lists. Ordinary default artwork handle IDs retain their primary URL hashing scheme.

These reads do **not** verify returned JSON/image bytes against an IPFS DAG. Existing CAR verification/recovery is a separate content-verified path. Configurable HTTPS origins and fallback do not prove operator independence, complete availability or durable pinning. Worker metadata policies have not been silently changed.

## Narrow middleware correction

Source review found that the release handler accepted HEAD, but the earlier general API method guard rejected it. The guard now permits HEAD only for the canonical `/api/v1/release` route (optional trailing slash/query), while other unowned non-GET API methods remain blocked. Creator write ownership and body-consumption rules are retained. This is an unverified source fix, not a claim of a passed request test.

## Remaining Phase4 work

-4B: concrete collection/market/exchange projection repository boundaries and admitted alternative backend adapters; creator libSQL is not a substitute for this work.
-4C: explicitly admitted Worker detail/status/media/query parity and distinct resource constraints.
-4D: remaining venue/explorer/snapshot provider boundaries and semantic replacement coverage; endpoint substitution cannot manufacture independent venue data/history.

All-product holdings/accounting, acquisition completeness, lifecycle automation, production activation tooling and integration/defect closure remain later work. The contract records exclusions instead of relabeling them as finished.


## Continuation57 — bounded Phase4B source scope completed, unverified
Added required source review/evidence pins and v2 publication plans, selected-backend asynchronous status, production plugin draining and a bounded hybrid read-snapshot source profile. Earlier v1 publication instructions are superseded: plan/apply require acceptedSourceHash and evidencePaths; plan also requires acceptancePath. See PROJECTION-SOURCE-ADMISSION-RUNBOOK.md and report57. Five top-level phases / six work packages remain (4C/4D/5/6/7/8). Broader remote ingestion, semantic evidence automation, wallet/cold-selector integration and recurring credential lifecycle remain excluded/incomplete, not silently closed. No tests/builds/syntax checks/network/activation; wallet-only signing and1 CRO ceiling preserved.


## Continuation58 — Phase4C bounded Worker read/media alignment
Worker exact legacy/exchange detail reads, legacy NFT filter, common collection envelopes/cursors, shared configurable gateway fallback, sanitized preflight, GET/HEAD release observations, bounded D1 status and shared read admission implemented in source. Primary sessions/state bracketing are not snapshots. Collection enumeration/discovery and portfolio remain partial; acquisition/maintenance/lifecycle limits retained. Five top-level phases / five work packages remain (4D/5/6/7/8). See report58 and WORKER-READ-MEDIA-PARITY-RUNBOOK.md. No tests/builds/syntax checks/services/network/migrations/activation. MD/TXT, wallet-only signing and1 CRO ceiling preserved.


## Continuation59 — Phase4D provider selection/scoped snapshot slice
Shared builtin/compatible/disabled public-data protocols, Node pinned-public-DNS GET/POST transport, Node source-scoped snapshot root/resources and Worker provider-policy cache/catalog namespaces implemented in source. Required-source disable checks and bounded stale observations retained. Independent normalized/owned alternatives and semantic admission remain; Phase4D is not complete. Five open top-level phases/work packages (4D/5/6/7/8), no percentage. See report59 and PUBLIC-DATA-PROVIDER-BOUNDARY-RUNBOOK.md. Historical snapshots/MD/TXT retained; no tests/builds/syntax checks/network/activation; wallet-only signing and1 CRO ceiling unchanged.


## Continuation60 — Phase4D bounded owned public-data adapter
Added Node file/Worker ASSETS hash-pinned normalized owned dataset reads for directory/dataset-local ranks, search, collection observations and wallet candidates; actual RPC ownership checks remain. Missing/expired/mismatched owned data fails without external fallback. One dataset cannot supply independent crosscheck; source support evaluator explicitly rejects that combination. Read-only evidence-pin inspection CLI added, not run. Phase4 bounded read/provider boundaries are source-implemented, not whole-product/M1 completion. Four phases/work packages remain (5/6/7/8), including automated complete data production and lifecycle. See report60 and OWNED-PUBLIC-DATA-RUNBOOK.md. No tests/builds/syntax checks/network/data publication/activation; no real dataset fabricated. Historical MD/TXT/snapshots, wallet-only signing and1 CRO ceiling preserved.
