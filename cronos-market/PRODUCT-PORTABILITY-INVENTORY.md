> **Report40 source update:**213 modules now inventoried in `../RIFT-records/continuation40-portability-inventory.json`. Candidate/ordinary Node exchange density findings are superseded for the explicitly selected bounded profile in `CANDIDATE-COMPLETE-BLOCK-RUNBOOK.md`; backend/runtime parity is still not globally certified.

> **Report39 update:** see `INDEPENDENCE-ADAPTER-AND-DENSITY-RUNBOOK.md`. Public Node search/metadata/portfolio/collection/creator read clients now share explicit read-only RPC configuration/failover; the hardcoded-client findings below describe report38 source and are superseded for those modules. Creator uploads now have a reviewed Pinata-compatible endpoint adapter in Node/Worker. Marketplace legacy/v2 pair rebuilds and emitted-volume comparisons are implemented. Full product/backend parity is still not certified. Updated static inventory:212 modules in `../RIFT-records/continuation39-portability-inventory.json`.

# Product portability — source inventory and explicitly incomplete parity

This is an engineering inventory, **not a completion certificate**. Reproduce the static evidence with `node scripts/portability-inventory.js`; the report38 evidence copy is `../RIFT-records/maintenance-portability-inventory.json` (207 JS-family source files at capture). Every entry includes source SHA-256, imports, literal API paths, environment identifier names (never environment values), literal upstream origins, and heuristic SQLite/D1 coupling flags. Computed routing, dynamic imports, indirect network calls and mandatory-versus-optional classification need manual review; absence of a static flag is not proof of portability.

## Current admitted combinations versus nonclaims

| Runtime/storage area | Source boundary / tests | Current scope and nonclaim |
|---|---|---|
| Node creator accounts | `server/creator-api.js`, `server/local-d1.js`, `server/remote-d1.js`, `shared/creator-service.js`; creator-service, remote-accounts and account-storage-probe tests | SQLite and reviewed libSQL-compatible account adapter. Remote account tests are not all-product remote database parity. |
| Worker creator/accounts | `edge/worker.js`, shared creator service, D1 bindings; edge-runtime/split-creator tests | D1 schema/config is explicit. Worker backend still assumes Worker/D1 bindings; not an arbitrary SQL runtime. |
| Node collection/market/exchange | collection-index, market-index, exchange-index; collection-independence and exchange tests | SQLite projections and configured worker chain readers; not a common arbitrary remote SQL repository. |
| Candidate exchange repository/lifecycle | platform-exchange-store/queries/sync/cycle/stage/scheduler/recovery modules and suites | Explicit CAS/recovery workflows; do not imply parity for every legacy/API feature. |
| Worker projections | edge/collections, market-sync, exchange, dense-market and D1 migrations; edge-collections/edge-exchange tests | Alternate D1 path with bounded jobs; behavior is not proven identical for every Node feature or density. |
| Frontend hosting | server/production, edge/frontend, release-manifest; frontend-delivery and edge-frontend-runtime tests | Node static delivery and Worker assets plus static output; hosting changes still need origin/CSP/wallet/app-link/config acceptance. |
| Read-only wallet and chain | src wallet/session/read modules, server worker-chain-access, chain-read-* suites | Wallet remains signing authority; worker independent reads/failover do not automatically cover every public read helper. |
| Recovery/media maintenance | backup-delivery/multipart, split-recovery, Kubo provider, maintenance modules; respective tests | Local bounded contracts, no real off-host retention/independence certification. |

## Every plugin admitted by Node production entrypoint

`server/production.js` registers the following15 plugin factories. These are all the named application plugin entries at capture, not a statement that every computed subroute has full conformance coverage.

| Plugin / module | Dependency area requiring parity review |
|---|---|
| creatorAPIPlugin / creator-api | Account SQL/authentication, signature verification RPC, upload-provider quotas |
| statusAPIPlugin / status-api | Deployment/index/resource status and coverage reporting |
| venueSnapshotPlugin / venue-snapshot | External marketplace venue snapshots/caches |
| collectionProfilePlugin / collection-profile | Collection profiles, metadata, admitted registry and external reads |
| collectionAPIPlugin / collection-api | Deployment-scoped local projection SQL and refreshable metadata |
| exchangeAPIPlugin / exchange-api | Exchange query/projection and contract binding |
| ipfsAPIPlugin / ipfs-api | Media resolution, gateway policy, bounded network fetching |
| marketAPIPlugin / market-api | Legacy market projection/query behavior |
| portfolioPlugin / portfolio | Wallet discovery, explorer and optional transfer index, live chain reads |
| walletArtPlugin / wallet-assets | Owned artwork/metadata discovery and remote reads |
| rankingsPlugin / rankings | Provider-specific ranking source contracts/caches |
| imagePlugin / images | Public-image fetching, content safety and byte-cache behavior |
| crosscheckPlugin / crosscheck | Cross-source comparisons and coverage |
| searchPlugin / search | Ebisu/Minted/catalog search plus exact-address chain lookup |
| metadataAuditPlugin / metadata-audit | NFT interface/metadata/royalty readiness reads |

Additionally: `/healthz`, security middleware/Redis-or-explicit-single-process limits, private-path guard, unknown `/api`404 and SPA/static delivery. These middleware contracts belong in any whole-runtime conformance matrix, not just successful API response tests.

## Concrete remaining coupling found in the inventory

- `server/search.js` and `server/metadata-audit.js` still construct hardcoded Cronos public RPC clients. Their configuration/failover boundary is not completed by worker-chain-access.
- `server/portfolio.js` supports `CRONOS_RPC_URL` but constructs its own provider and explorer/index discovery combination; it is not independent quorum coverage for every live wallet read.
- Creator service upload selection still instantiates the existing Pinata provider in Node and Worker. The new concrete Kubo replication adapter does not silently replace that account upload/quota contract.
- Search/rankings/catalog/venue paths consume specific external marketplace/explorer data models; alternative origins alone do not implement semantic source compatibility or independently owned complete ranking statistics.
- Local collection/legacy projections directly use SQLite; D1 counterparts are separate implementations. Creator libSQL compatibility does not remove those boundaries.
- Worker scheduled maintenance still uses Worker/D1 quotas/bindings and is not this Node maintenance runner.
- Server production security requires Redis for multiple processes or explicit single-process selection. A replaceable datastore does not justify process-local limits across multiple hosts.

## Engineering completion criteria still owned by assistant

1. Turn static candidates into a reviewed feature/subroute and mandatory/optional upstream dependency manifest, including feature-level failure/degraded contracts.
2. Select and document actually supported combinations rather than promising arbitrary database substitution.
3. Introduce remaining repository/provider boundaries without breaking account semantics, marketplace/ULTCAT/SISE/Render workflows, wallet-only signing or1CRO ceiling.
4. Execute common success/failure/restart/coverage conformance per supported runtime/database/media/hosting combination and report every explicit exclusion.
5. Complete all-product historical rebuild/statistics and higher-density complete-block publication. Collection pair certification alone is not that requirement.

These are unperformed engineering tasks, not requests that the owner compensate for them by external testing. Owner-controlled provider selection, credentials, budgets, policies and production authorization remain separate.

## Phase 4A — executable source contract and Node public-IPFS boundary

Added a shared15-feature route/dependency/profile contract, concrete production factory registry, bounded source-drift evidence tooling and explicit partial Worker exclusions. Added configurable HTTPS public-IPFS metadata/artwork/preflight gateway selection/fallback and narrowly allowed intended release HEAD requests through the API method guard. Source-only; no tests/builds/syntax checks/support CLI/server/network/deployment actions were run. See `PRODUCT-SUPPORT-CONTRACT-RUNBOOK.md`. Phase4 remains in progress: projection repositories/backends, Worker parity and remaining venue/discovery/snapshot/frontend boundaries are pending4B–4D. No full-independence or production-readiness claim.


## Continuation56 — bounded owned remote projection publication
Implemented source for local snapshot export, target-pinned remote plan, hash-reviewed transactional libSQL provisioning/replacement/readback and retry outcome reporting. Private CLI/receipts and conservative remote-selection status added. Not executed; accepted-source/coverage admission, full backend-aware status/consumer coherence and credential lifecycle remain. Five top-level phases and seven work packages remain open. See report56 and PROJECTION-PUBLICATION-RUNBOOK.md. MD/TXT preserved; wallet-only signing and1 CRO ceiling unchanged.


## Continuation57 — bounded Phase4B source scope completed, unverified
Added required source review/evidence pins and v2 publication plans, selected-backend asynchronous status, production plugin draining and a bounded hybrid read-snapshot source profile. Earlier v1 publication instructions are superseded: plan/apply require acceptedSourceHash and evidencePaths; plan also requires acceptancePath. See PROJECTION-SOURCE-ADMISSION-RUNBOOK.md and report57. Five top-level phases / six work packages remain (4C/4D/5/6/7/8). Broader remote ingestion, semantic evidence automation, wallet/cold-selector integration and recurring credential lifecycle remain excluded/incomplete, not silently closed. No tests/builds/syntax checks/network/activation; wallet-only signing and1 CRO ceiling preserved.


## Continuation58 — Phase4C bounded Worker read/media alignment
Worker exact legacy/exchange detail reads, legacy NFT filter, common collection envelopes/cursors, shared configurable gateway fallback, sanitized preflight, GET/HEAD release observations, bounded D1 status and shared read admission implemented in source. Primary sessions/state bracketing are not snapshots. Collection enumeration/discovery and portfolio remain partial; acquisition/maintenance/lifecycle limits retained. Five top-level phases / five work packages remain (4D/5/6/7/8). See report58 and WORKER-READ-MEDIA-PARITY-RUNBOOK.md. No tests/builds/syntax checks/services/network/migrations/activation. MD/TXT, wallet-only signing and1 CRO ceiling preserved.


## Continuation59 — Phase4D provider selection/scoped snapshot slice
Shared builtin/compatible/disabled public-data protocols, Node pinned-public-DNS GET/POST transport, Node source-scoped snapshot root/resources and Worker provider-policy cache/catalog namespaces implemented in source. Required-source disable checks and bounded stale observations retained. Independent normalized/owned alternatives and semantic admission remain; Phase4D is not complete. Five open top-level phases/work packages (4D/5/6/7/8), no percentage. See report59 and PUBLIC-DATA-PROVIDER-BOUNDARY-RUNBOOK.md. Historical snapshots/MD/TXT retained; no tests/builds/syntax checks/network/activation; wallet-only signing and1 CRO ceiling unchanged.


## Continuation60 — Phase4D bounded owned public-data adapter
Added Node file/Worker ASSETS hash-pinned normalized owned dataset reads for directory/dataset-local ranks, search, collection observations and wallet candidates; actual RPC ownership checks remain. Missing/expired/mismatched owned data fails without external fallback. One dataset cannot supply independent crosscheck; source support evaluator explicitly rejects that combination. Read-only evidence-pin inspection CLI added, not run. Phase4 bounded read/provider boundaries are source-implemented, not whole-product/M1 completion. Four phases/work packages remain (5/6/7/8), including automated complete data production and lifecycle. See report60 and OWNED-PUBLIC-DATA-RUNBOOK.md. No tests/builds/syntax checks/network/data publication/activation; no real dataset fabricated. Historical MD/TXT/snapshots, wallet-only signing and1 CRO ceiling preserved.


## Continuation61 — Phase5 in progress
Added bounded accepted collection-image to owned normalized dataset production, common-checkpoint enforcement and internal supply/holder reconciliation, with evidence pins, conservative null market metrics and requested-public-wallet NFT candidates. Added owned:produce private artifact CLI (not executed). No automatic source approval/publication/activation. Phase5 remains open: orchestration, complete accounting/holdings, market statistics and integration remain. Four open phases5–8. Source only/unverified, no tests/builds/syntax checks/network/services or real dataset generated. See report61 and OWNED-PROJECTION-PRODUCTION-RUNBOOK.md. Historical MD/TXT preserved, wallet-only signing and1CRO ceiling unchanged.


## Continuation62 — Phase5 rebuild/production lineage (in progress)
Implemented completed collection-rebuild record to paired read-only image capture with authoritative digest/checkpoint checks, private receipt-last lineage artifacts, restart inspection and optional exact-image lineage admission in owned production. Production now prints a raw receipt hash and supports read-only pinned dataset/evidence/expiry inspection. No automatic source acceptance, partial-write recovery, multi-collection lineage fan-in or full accounting completion. Four phases5–8 remain. Source-only/unverified; no tests/builds/syntax checks/runtime imports/operational CLI/network/capture/generation/activation performed. See report62 and REBUILD-PRODUCTION-LINEAGE-RUNBOOK.md. Preserve wallet-only signing,1CRO and historical MD/TXT.


## Continuation63 — Phase5 admitted exchange accounting (in progress)
Added ABI-validated accepted RIFT v2 event replay, lifecycle/value/refund checks and exact persisted-order reconciliation; derived gross native-CRO deployment/collection trade totals, fill events and units. Optional exchangeAccounting input now feeds owned production at a common checkpoint, expiry capped to both source types, with scoped source/evidence pins. No timestamps means daily/weekly/floor/live inventory remain unknown. No bytecode/denomination attestation, net economics or complete cross-venue/accounting claim. Phase5 and four phases5–8 remain open. Source only/unverified; no tests/builds/syntax checks/runtime imports/CLI/network/dataset generation/activation. See report63 and OWNED-EXCHANGE-ACCOUNTING-RUNBOOK.md. Preserve wallet-only signing,1CRO and historical MD/TXT.


## Continuation64 — Phase5 checkpoint time-window accounting (in progress)
Added exact image/source-acceptance-pinned timestamp evidence admission for every exchange event block plus checkpoint; optional24h/7d gross CRO and fill-event totals now derive in replay over checkpoint-anchored open-lower/closed-upper intervals. Historical/deployment scope is explicit; no timestamp input retains nulls. No automatic header/timestamp acquisition, consensus proof or current-wall-clock statistics claim. Full automation/holdings/accounting remains open across four phases5–8. Source only/unverified; no tests/builds/syntax checks/runtime imports/CLI/network/data generation/activation. See report64 and EXCHANGE-TIME-EVIDENCE-RUNBOOK.md. Preserve wallet-only signing,1CRO, historical MD/TXT and snapshots.


## Continuation65 — Phase5 resumable quorum timestamp acquisition (in progress)
Implemented timed checkpoint agreement, bounded immutable sample acquisition, pinned plan/evidence/receipt artifacts and read-only restart inspection. Added time:evidence CLI and durable maintenance job/runtime/finite-runner integration. Acquisition completion awaits source review; no approval fabrication or live activation. This supersedes the earlier missing timestamp-acquisition implementation, not complete accounting/independence. Four phases5–8 remain. User requested five hours; no continuous five-hour or unattended agent was promised/started, and no background service was left running. Source-only/unverified: no tests/builds/syntax checks/imports/CLI/network/RPC/enrollment/artifact generation/activation. See report65 and EXCHANGE-TIME-ACQUISITION-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.


## Continuation66 — Phase5 marketplace rebuild/accounting lineage (in progress)
Added completed paired marketplace rebuild to read-only image/digest capture for existing legacy/exchange-v2 models, receipt-last private artifacts and reviewed manifest/receipt inspection. Optional exact marketplace lineage now composes with source acceptance, timestamps, ownership lineage and exchange accounting in owned production; pinned evidence/receipts retain separate summaries. No new legacy economics or complete accounting claim. Four phases5–8 remain open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/capture/generation/approval/activation, no unattended session. See report66 and MARKETPLACE-PRODUCTION-LINEAGE-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.


## Continuation67 — Phase5 legacy gross accounting (in progress)
Added accepted legacy event/order replay with strict canonical listing/action checks, unique positions/identities, exact persisted-order reconciliation and gross native-CRO purchase totals. Optional legacyAccounting is mutually exclusive with v2 exchangeAccounting in owned production; optional exact marketplace lineage remains separately approved. Same-checkpoint/expiry safeguards and legacy ERC721 consistency preserved. Stored legacy buyers/event hashes/timestamps are absent: no attribution or daily/weekly statistics invented. Four phases5–8 remain; complete holdings/workflow and richer acquisition still open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/capture/generation/approval/activation or unattended session. See report67 and OWNED-LEGACY-ACCOUNTING-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.


## Continuation68 — integrated work across5–8; phase permission gate removed
User authorized cross-phase work without permission stops and brief reporting. Added multi-collection lineage fan-in, shared private/pinned source loading, deterministic resumable private production with receipt-last files/directory fsync/headroom and maintenance scheduling. Hardened shared receipt acquisition transaction-list/all-log/index/status checks and carried progress in admitted paths; exposed quorum error codes and deterministic sort ordering. Four packages5–8 remain open; complete holdings/acquisition/lifecycle/integration not claimed. Source only/unverified; no tests/builds/syntax checks/imports/operational CLI/RPC/generation/enrollment/activation. No deletion or signing/spend; preserve MD/TXT/snapshots, wallet-only signing and1CRO. See concise report68 and INTEGRATED-PRODUCTION-WORKFLOW-RUNBOOK.md.


## Continuation69 — integrated wallet discovery publication
Connected paired completed wallet rebuilds to bounded reviewed public20/721/1155 candidate artifacts, private capture/inspection/reuse and durable maintenance scheduling. Owned production now admits/merges pinned snapshots at a common checkpoint/expiry, with public-wallet acknowledgement and preserved balance-vs-discovery distinction. Bounded observation expansion and strict canonical store/log checks close related acquisition/integration defects; arbitrary density/full holdings not solved. No phase permission gate. Four packages5–8 remain open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/artifact generation/enrollment/activation or unattended service. See report69 and WALLET-DISCOVERY-PUBLICATION-RUNBOOK.md. Historical MD/TXT/snapshots, wallet-only signing and1CRO preserved.


## Continuation70 — all four remaining packages addressed, not finished
5: optional historical custody/selected RIFT listing escrow beneficiary accounting with vault reconciliation.6: explicit256..2048 wallet/generic receipt transaction policies, default/strict platform profiles preserved.7: pinned expiry/evidence/intent/headroom audit and recurring non-destructive scheduler lane.8: shared integration and missing enrollment-digest output fixed without inspect-time RPC adapters. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/artifact generation/enrollment/activation/signing/spend. All5–8 remain open for full coverage/acquisition/lifecycle/integration. No phase permission gate or unattended service. See concise report70 and ALL-REMAINING-PACKAGES-PASS-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.
