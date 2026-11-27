# Candidate authoritative exchange repository — independence batch2

## Implemented source, not production activation

`server/platform-exchange-store.js` and `shared/platform-index-schema.js` add the exchange repository foundation for the B01–B05 roadmap work. Production HTTP handlers and workers still use their existing local SQLite indexes. No hosted Turso credentials were used, no cloud schema was changed, and no mainnet transaction was sent.

## Data model

Version1 uses additive `rift_` tables, separate from existing creator-account tables:
- `rift_index_migrations`: schema version/checksum; unknown versions/checksum drift rejected.
- `rift_exchange_streams`: chain25/address/start-block/runtime binding, canonical-candidate checkpoint, revision and lease/fence.
- `rift_exchange_events`: exact transaction/log identity, unique block/log position, block hashes and decoded event payloads.
- `rift_exchange_orders`: derived listing/offer documents, exact uint256 ID keys and amounts.
- `rift_exchange_checkpoints`: last32committed range boundaries per stream.

The source checksum is a compatibility/drift check, not cryptographic proof that a writable database is trustworthy. No all-platform migration, media storage or new public API is claimed.

## Internal interface

`new PlatformExchangeStore(client)` accepts a libSQL SDK client. Production-safe factory `openPlatformExchangeStore(env)` validates the selected existing Turso configuration, opens only an already-migrated schema, and never falls back to SQLite. These are internal interfaces, not stable external developer APIs yet.

Methods:
- `initialize()`: EXPLICIT transactional additive migration. Idempotent only for known version/checksum. Never called by production startup or the open factory in this batch. A reviewed backup/migration procedure remains required before live use.
- `assertSchema()`: checks supported version/checksum without implicitly creating tables.
- `bind({chainId:25,address,startBlock,runtimeHash})`: insert or verify exact stream binding; no resetting history because configuration changed.
- `state(binding)`: detached public checkpoint/revision view without lease-owner internals.
- `acquire(binding,owner,{ttlMs})`, `renew(...)`, `release(...)`: database-clock TTL and monotonically increasing fencing generation. Already-held lease is not implicitly renewed by reacquiring. Same worker label does not defeat the fence.
- `commitRange(binding,{lease,expected,toBlock,blockHash,logs,rollbackTo})`: validate bounds/encoding; open write transaction; verify lease and exact checkpoint revision/hash; optionally remove orphaned data from a retained rollback boundary; store events; recompute affected orders with the existing pure exchange reducer; insert/prune checkpoints; recheck lease/time; advance revision/checkpoint; commit all-or-nothing.
- `order(binding,type,id)`: exact listing/offer document lookup; stable paginated production/API readers remain future work.
- `close()`: stop new operations and drain already queued work before closing.

## Required caller responsibilities — NOT implemented by this repository

The repository does not contact Cronos. The future synchronizer must validate chain25, exact deployed runtime, confirmation policy, range completeness, every relevant block hash, reorg ancestry and provider truncation BEFORE submitting a range, then reconcile ambiguous outcomes through a fresh authoritative state read. Caller-supplied block hashes are not independent chain proof. Rollback tests verify storage consistency, not actual live fork detection.

New production wiring must preserve safe exit/withdrawal behavior, API contract compatibility, freshness/coverage reporting and operator activation gates. Setting the creator DB driver does not migrate indexes automatically.

## Atomicity, lease and failure model

All events, affected projections, checkpoint history and revision changes are in one SDK write transaction. Lease take/renew/release are also transactional. Database time is queried inside transactions, not trusted from competing worker clocks. A worker must present both owner and the current fence; a reused owner string cannot authorize an expired generation. Expected revision/checkpoint is an additional compare-and-swap gate.

Independent-client tests prove at most one lease grant in a local SQL race and fail closed on expired/stale ownership. A long transaction rechecks lease time before publication. Remote network partitions/replica clock behavior and actual hosted transaction limits remain unaccepted.

Unexpected storage/transport errors sanitize messages and mark the connection `STORE_REOPEN_REQUIRED`. Do not automatically replay a possibly committed write. Close/reopen and reconcile stream revision/checkpoint/events first. The local libSQL SDK exhibited an unusable handle after `SQLITE_BUSY` in a real race; the tests verify fresh-client recovery rather than assuming same-handle retry. Semantic validation errors with successful rollback do not normally poison the store.

## Resource bounds

- Chain25; immutable stream identity by contract address/start/runtime.
- Lease TTL1–60seconds; safe integer fencing/revisions, restricted bounded worker labels.
- Commit range1–2000blocks; at most512provided order events; bounded topics/data encoding and1MiBcombined raw/decoded input budget.
- Up to512affected order projections; up to10000history events per order replay; overflow fails transactionally instead of truncating.
- Retain32range checkpoints. Missing rollback boundary requires reviewed rebuild; no invented ancestor. Explicit original predeployment rollback is possible and must be caller-reviewed.
- Requests/projections are serialized on one client; independent workers contend through database transactions/fences.

These bounds prevent unbounded repository work, not prove efficient remote throughput. Many per-event statements may exceed hosted transaction time/lease capacity at large bounds. Measure and reduce/split verified ranges before accepting cloud operation; never silently drop logs or raise paid quotas. Receipt fallback for a dense block, adaptive scanning, optimized incremental projections and operational backfill/rebuild tooling remain follow-up work.

## Tests / evidence scope

22new focused tests exercise actual local libSQL SDK files: migration preservation/drift rejection; binding; reopen; uint256 IDs and independent offer IDs; projection failure rollback; injected late storage failure; two-client lease ownership/takeover; expiry during commit; revision replay prevention; retained/predeployment rollback; malformed/duplicate logs; contract namespace separation; no implicit schema creation; closed/reopen-required handling; concurrent publication and bounded checkpoint pruning.

These use disposable data and mock blockchain logs. They do not certify hosted Turso durability, all-provider behavior, independent backups, mainnet security, production concurrency performance or device acceptance.

## Next integration steps

1. Add paginated read/status/checkpoint interfaces and parity tests against the existing local index.
2. Extract canonical acquisition/reorg policy into a synchronizer that feeds this repository, with fresh-session outcome reconciliation and bounded retry scheduling (no signing retries).
3. Test remote-store/local-store reducer and query compatibility, full rollback/replay, dense-block handling and fault injection.
4. Add explicit opt-in migration/import plan and backup/restore acceptance using disposable remote data.
5. Wire worker/API to the same authoritative store only after review; do not start both stores as competing truths.
6. Extend interfaces to collection/wallet projections and durable job admission, then accept actual Render worker topology/capacity.

Existing v30 APK and native-signing approval state are unchanged. No deployment, trading activation, paid provisioning or CRO spend.

## Batch3 — read parity and bounded RPC acquisition

Implemented (still source-only):
- `page(binding,{type,account,nft,cursor,limit,includeClosed,revision})`: max48, exact uint256 descending cursor, expiry at database time. Returns `{items,nextCursor,coverage}`. Supplying the prior coverage revision rejects changed indexed projections; expiry continues advancing between requests.
- `activity(binding,{nft,cursor,limit,revision})`: collection-scoped event/order join, descending block/log cursor, max48. Existing index item/cursor parity; coverage is additional internal information.
- `checkpoints(binding)`: max32 retained boundaries and coverage; `status(binding)`: projection/checkpoint counts, database-clock age. Neither asserts a live worker, synchronized head, or trading readiness.
- Multi-query reads, including exact order lookup, use one read transaction. A concurrent-writer test checks that page documents and revision come from the same snapshot.
- `syncPlatformExchange({store,binding,lease,provider,span=128,confirmations=12})`: one bounded acquisition step, not a daemon or production selection. Accepts an injected ethers-compatible provider; validates chain25, head, confirmations12–256, span1–2000, exact runtime at range end, range/header shapes, address/topics/encoding, duplicate identities/positions, event-block hashes, stable final and recovery boundaries. A retained canonical checkpoint drives atomic rollback/reprojection; a full32-checkpoint recovery miss stops for explicit rebuild.

The synchronizer detaches provider-owned logs before asynchronous verification and caps concurrent event-header requests at4. It never retries a possible commit, signs, starts a background loop, initializes schema, renews leases implicitly, spends, or chooses a provider from untrusted input. Provider URL/timeouts/failover are the future operator integration's responsibility. Provider failures are sanitized; storage failures preserve the repository's reopen-required semantics.

### Remaining safety/acceptance gates

Single-provider header checks are NOT independent chain proof or log-completeness proof. Fewer than512 results may still be silently incomplete. At512 or more the entire range stops (reduce span or implement receipt fallback); this is a defensive limit, not complete truncation detection. Empty/intermediate headers are not all traversed; only event-bearing, end and recovery/checkpoint headers are checked, with direct adjacency checks when available. Proxy implementation/admin behavior is not certified by an exact runtime hash. Runtime is not re-probed on idle steps (explicitly reported).

Automated fresh-session ambiguous-commit outcome reconciliation remains **unimplemented**; callers must stop and reconcile with a fresh authoritative client, never blindly replay. Also still open: deadline/cancellation-aware provider wrapper, adaptive/dense-block receipt scanning and completeness policy, durable worker scheduling, explicit migration/import, disposable hosted restore and transaction-limit tests, public API/SDK wiring and compatibility acceptance. Production still uses local SQLite. No remote credentials or hosted writes were used for batch3 tests.

Batch3 adds7 query/snapshot tests and19 synchronizer/fault tests using actual disposable local libSQL plus deterministic RPC fixtures. These are engineering tests, not live mainnet synchronization or hosted acceptance.

## Batch4 — linked ancestry and RPC read budgets (supersedes batch3 header limits)

`server/platform-exchange-rpc.js` now wraps only five read methods: network, head, block, code and logs. `syncPlatformExchange` accepts `signal`, `rpcTimeoutMs` (default15000, allowed1–60000ms per call) and `rpcMaxCalls` (default2200, allowed1–5000 per step). A timeout, abort, budget exhaustion or provider failure stops further read admission; messages are sanitized. No retries, failover or write methods are exposed.

The synchronizer now traverses **every header** in its bounded range, including empty intermediate blocks, with at most4 requests in flight. It checks adjacent parent hashes, connects the first header to a prior retained boundary when present, matches every event block and checks that the traversed end matches the initial/final range boundary. Thus batch3's incomplete-intermediate-ancestry limitation is addressed for each successfully acquired range. This still trusts one provider's responses and does not prove independent consensus, receipts or complete logs.

Cancellation is checked immediately before invoking `commitRange`. Once publication starts, it is deliberately **not** raced against a timeout/abort: the caller must receive a definite result or follow the existing uncertain-storage-outcome policy. Aborting after invocation may therefore still yield a successful commit. Never interpret cancellation as proof no write happened. Automatic fresh-client reconciliation remains follow-up work.

Limits: ethers-compatible provider methods may not support aborting the underlying HTTP request. Late results/rejections are ignored safely and cannot publish a cancelled acquisition; underlying transport work may continue until the provider finishes. These are per-read deadlines plus a call-count budget, not an aggregate wall-clock deadline, transport cancellation, hosted quota certification or database transaction timeout. The bounded adapter is internal and read-only; it is not a public arbitrary-RPC proxy.

12 additional tests cover read allowlisting, invalid budgets, pre/in-flight/final-gate cancellation, late settlement, call/deadline exhaustion, complete empty-block ancestry, concurrency bounds, sanitized no-retry failures and cancellation after publication starts. No production wiring, cloud migration, device execution or spend.

## Batch5 — explicit fresh-connection outcome observation

`server/platform-exchange-recovery.js` adds two internal opt-in helpers (not wired into production or automatically selected by the synchronizer):
- `publishPlatformRange({store,binding,request,openFresh})`: validates/prepares a bounded detached candidate, makes exactly **one** `commitRange` call, and returns `committed` on acknowledged success. Only uncertain storage/reopen-required errors trigger best-effort close/drain of the failed store followed by fresh-connection observation. Lease/revision/semantic failures propagate without recovery or replay.
- `reconcilePlatformRange({binding,request,failedStore,openFresh})`: read-only observation for an explicit saved candidate; never publishes or acquires/renews leases. Callers must retain the exact candidate before attempting publication; no persistent recovery journal is introduced here.

`inspectRange(binding,{fromBlock,toBlock})` is a snapshot-consistent, bounded repository read: max2000blocks/512events, returning public state and exact decoded event rows. It is an internal recovery interface, not a public log API. Namespace/schema binding is checked; no migration or schema change is needed.

Recovery outcomes always set `retryAllowed:false`:
- `unchanged-observed`: exact expected revision/checkpoint observed. Not a definitive proof of failed publication in a lagging remote replica.
- `matching-publication-observed`: exactly expected revision+1, requested endpoint/hash and the entire replacement-range event content match. Content fingerprint includes transaction identity, position, block/hash, kind/type/order ID and decoded payload, with canonical key ordering. This does not attribute the write to a worker or certify current chain canonicality.
- `conflicting-content-observed`: intended revision/endpoint but different event content.
- `changed-or-superseded`: another checkpoint/revision is observed; no reconstruction or claim that the original attempt succeeded.
- `unresolved`: fresh open/schema/read failed, or the factory reused the failed store/client. Errors are sanitized; fresh observation handles are closed.

`openFresh` must open a genuinely new, authoritative client against the same intended primary database and must not reuse a stale embedded/read replica. The helper rejects identical store/client objects but cannot establish remote replication consistency, distinguish another process's equivalent write, or defend against a malicious custom factory/database. Failed-client close is best effort. Hosted read-after-write and partition behavior remain unaccepted. No automatic replay, worker restart scheduling, persisted recovery journal, public endpoint or production API wiring is claimed.

13new tests use real local libSQL transactions and injected failures before commit and after successful commit acknowledgement was lost; also cover replacement-range reorgs, empty ranges, changed/conflicting state, same-handle refusal, sanitized recovery failure, connection cleanup and semantic failures without retry. Production and hosted migration remain untouched.

## Batch6 — opt-in bounded receipt enumeration

`syncPlatformExchange({... , acquisition:'receipts', span:5})` opts into `server/platform-exchange-receipts.js`. Default remains `acquisition:'logs'`; invalid modes or receipt spans above32 fail before network work. The internal RPC read allowlist now also permits `getTransactionReceipt`, using the same per-read deadline/cancellation/call-budget controls.

Receipt mode does NOT use `getLogs`. It enumerates every transaction hash advertised by each block, fetches every receipt (max4 concurrently), validates receipt identity/block/index/status, and verifies all returned log positions in canonical transaction order. Failed receipts must contain no logs. Foreign-address and unrelated-topic logs count toward positional/byte bounds but are not exchange projections. Matching exchange events are detached before further async checks. Every receipt acquisition header must match the later full linked-header traversal, and range-end/recovery boundaries are rechecked before publication.

Resource limits: at most32blocks,256total transactions,8192total receipt logs,2MiB raw data/topics, and512 matching exchange events. Blocks/ranges exceeding limits stop entirely; nothing is truncated or partially committed. Receipt mode can accept exactly512 matching events, unlike the legacy log-query path's defensive stop at512; larger blocks still need reviewed staging or another explicit strategy. Lease expiry, query/revision gates, storage transaction limits and existing event encoding limits remain in force. No automatic shrink/retry or receipt fallback is implied; callers must explicitly select a bounded receipt span. Cloud throughput/quota/timeout performance is unmeasured.

This removes dependence on `eth_getLogs` completeness for an accepted receipt scan, **not** dependence on the provider: a provider can omit transactions or receipt logs consistently. No independent block transaction root, receipt trie/root, consensus or second-provider proof is implemented. RPC response/body transport bounds and aggregate deadlines remain an integration task; provider objects already exist when the adapter receives them. Receipt scans may exceed lease/cloud limits and must stop rather than bypass the lease.

12new deterministic-RPC/local-libSQL tests cover an entirely omitted getLogs response, empty blocks, missing/mismatched/failed receipts, invalid transaction lists, log gaps/identity errors, foreign/unknown-topic filtering, receipt/header race, deadlines, concurrency and over-limit refusal. No mainnet/provider compatibility or hosted acceptance is claimed. Production selection remains unchanged.

## Batch7 — explicit adaptive scanner and shared acquisition budgets

`scanPlatformExchange` in `server/platform-exchange-scan.js` is an internal opt-in wrapper around the single-step synchronizer. Defaults: receipt acquisition, span32, max14attempts, shared2200RPC calls and45000ms aggregate acquisition deadline. Valid bounds: attempts1–16, totalTimeoutMs1–60000; existing RPC/per-mode span limits remain. It returns after **one successful range publication at most** (or an idle result), with a bounded span/mode/result attempt trace. It is not a daemon, scheduler or production store selection.

Only typed acquisition-density/receipt-resource limits are eligible for retry. Range span halves to1; a capped single-block getLogs query can switch to receipts. A single-block receipt overflow stops with `SINGLE_BLOCK_REQUIRES_REVIEWED_STAGING`; max-attempt exhaustion stops. Schema, runtime, canonicality, receipt inconsistency, RPC/network faults, lease/revision and uncertain commit failures propagate without automatic retry. No provider failover, lease reacquisition, journal resolution or write replay is added.

One outer read-only RPC adapter shares a call budget across all attempts, while an AbortController bounds total acquisition time across range reductions. Outer/inner adapter layering does not reset the outer budget. Underlying ethers HTTP reads may continue until the provider finishes; their late results cannot publish a cancelled acquisition. The deadline is deliberately not raced against a database commit: acknowledged publication after the deadline still returns success, and uncertain storage errors remain uncertain. The lease/database-time publication gate remains mandatory; the scanner never extends it implicitly.

13new tests cover default receipt publication, size-driven shrinking, single-block log-to-receipt switch, receipt-resource reductions, reviewed-staging stop, attempt/call/deadline bounds, cancellation, semantic no-retry failures, one-write uncertain outcome and success after commit has already started. These are local/controlled tests, not hosted throughput or live-provider acceptance.

See `REMAINING-ACTIVATION-GATES.md` for cumulative source versus outstanding production/hosted/device gates and a non-executed disposable migration/restore acceptance sequence. Durable staging/journal/lifecycle integration remains unimplemented. No hosted write, migration, deployment, spending or new APK.

## Batch8 — persisted recovery intents, bounded lifecycle and local independent restore

### Separate explicit recovery journal
`PlatformRecoveryJournal` owns a **separate client** to the same designated database. It has an independent additive namespace (`rift_recovery_schema`, `rift_recovery_intents`, unique outstanding-stream index) and checksum; existing exchange schema v1 is unchanged. `initialize()` is an explicit migration, never called by startup/lifecycle. `assertSchema()` never creates tables. No cloud migration was performed.

Intents contain only whitelisted public binding, exact expected checkpoint, endpoint, rollback boundary and raw event fields. Lease/fence/owner, provider credentials, arbitrary input extras and secrets are not serialized. Records are immutable except CAS phase/observation changes: prepared → attempting → acknowledged for an acknowledged commit; uncertainty/semantic failure remains held. A partial unique index permits one outstanding intent per stream across clients. Admission stops at256 total records or8MiB document bytes; each intent is at most2MiB. Nothing is silently deleted or auto-pruned. Archival/resolution policy is follow-up work, not unbounded quota growth.

### Explicit bounded lifecycle integration
`runJournaledExchangeScan` checks pre-migrated schemas and outstanding intents, then uses the adaptive scanner's internal publication handler to persist prepared/attempting markers **before** the exchange write. Journal persistence/acknowledgement failure stops publication or leaves a blocking recoverable intent. Exact acknowledged publication may acknowledge the journal; lost exchange acknowledgement is fresh-client observed and held for review. Journal failure after exchange success leaves the intent blocking rather than replaying.

`observePendingExchangeIntents` reads the saved candidate on restart and consults a fresh exchange client; it never republishes, clears, resolves or automatically releases an intent—even matching/unchanged observations. Prepared records remain prepared; attempted/held records remain held. The fresh factory must target the authoritative primary; identical-object checks and local tests do not establish hosted consistency. Both helpers are explicit source interfaces, **not production-selected daemons or a full job scheduler**. Caller owns lease/store/journal resources. Cancellation is checked around journal persistence before write invocation; an already-invoked publication is not raced against cancellation/deadline. Unknown publication-handler errors are sanitized.

Outstanding lifecycle work: reviewed resolution/archival workflow, renewal between safe units, durable backfill/jobs, fairness, process supervisor/alerts and hosted consistency/partition acceptance. A held record is intentionally not automatically converted to acknowledged. No blind write replay.

### Bounded snapshot export / absent-stream-only restore
`exportPlatformSnapshot` reads public state/events/projections/checkpoints in one transaction. Bounds:4096events,512orders,32checkpoints,8MiB snapshot data. It verifies projection replay and exact checkpoint consistency; no lease/auth material is included. `restorePlatformSnapshot` checks digest/schema, reconstructs every event through the known ABI and pure reducer, verifies exact order documents and imports in one transaction only if the target stream and its child tables are absent. Existing streams are never overwritten, even if empty. Target schema must already be explicitly initialized; unrelated creator tables are untouched. Leases/fences are not restored. Journal history is **not** included: restoring projections must not erase unresolved intents on any target.

Checksums/digests detect accidental drift, not malicious database forgery, trusted provenance or live canonicality. No independent blockchain/trie proof, backup encryption/signature, object-store replication, streaming large export or remote restore CLI is claimed. Source must be trusted and rescanned/reconciled against accepted chain policy before production use. Export refuses over-limit histories instead of truncating; larger backups require streaming/chunk manifests. A cloud transaction may exceed hosted limits even within these engineering caps.

### New local evidence
28tests:19journal/lifecycle (including a real separate process SIGKILL after the exchange commit but before journal acknowledgement),9snapshot/restore. They verify persistence on reopen, concurrent journal admission, phase CAS, record/byte limits, no secret/lease serialization, pre-write journal failure, lost acknowledgements, pending-startup refusal, semantic holds, restart observation without replay, independent-file restore equality, projection tamper detection, namespace preservation and transaction rollback on late restore failure.

This establishes bounded **local** recovery/restore evidence, not hosted Turso durability, replica freshness or power-loss certification. Production still uses existing local indexes; no cloud writes, migration, activation, signing, spend or APK rebuild.

## Batch9 — explicit review/archival and bounded worker-cycle integration

`server/platform-exchange-review.js` adds a separately checksummed, explicitly initialized review/archive audit namespace; released exchange and journal schema v1 checksums are unchanged. Plan generation is read-only. Exact matching publication content can be accepted only with an explicit hash-bound confirmation/reviewer/evidence commitment, a repeated matching observation and atomic phase-CAS plus audit insert. Prepared/unchanged/conflicting/superseded/unresolved cases have no force-clear or automatic replay path. The `reviewed-matching-publication` observation distinguishes operator acceptance from the original commit acknowledgement.

Acknowledged records can be exported with review evidence (max64records/8MiB), written exclusively0600/fsynced and read back, then pruned only with another explicit approval and exact file/database revalidation. Symlinks, changed content, pending records and capacity limits are refused. Prune audit/delete is atomic; review evidence remains. Review/audit caps stop rather than silently deleting evidence. This is not authentication, encrypted/off-host backup, independent primary consistency or proof of future archive retention. No public unauthenticated route exists.

`server/platform-exchange-cycle.js` composes independent pre-migrated clients, pending checks, fenced lease acquisition and renewal between safe units, journaled adaptive scans, shared RPC budget, bounded range count, stop conditions, best-effort release and owned-client shutdown. At most8units per cycle (default4); no implicit bind/migration, daemon startup, auto-replay or production selection. Completed progress remains reported on later failures. Acquisition deadlines do not race commits or guarantee factory/DB/HTTP shutdown timing.

36new tests (22review/archive,14worker) include concurrent reviewers, stale plan/approval rejection, rollback/lost review acknowledgement, archive file/DB drift, symlink/overwrite/limit refusal, atomic prune rollback, multi-unit progress, shared budgets, deadline/cancellation, lease takeover, uncertain-publication stop and local held→explicit fixture review→archive→next checkpoint progress without replay. See `RECOVERY-REVIEW-RUNBOOK.md` for exact semantics and remaining work.

## Batch10 — persisted transaction-heavy single-block receipt staging

`server/platform-exchange-stage.js` adds an explicitly migrated, separately checksummed stage namespace. Binds the next confirmed block and exact provider-advertised transactions; acquires at most32receipts/step; persists hidden progress via version CAS and immutable identity/log-prefix checks. No partial exchange projection/checkpoint is visible. Ready complete-block publication rechecks chain/head/runtime/checkpoint/block/transaction list and uses a publishing marker plus existing recovery journal before one atomic exchange write.

Bounds:4096transactions,8192receipt logs,2MiB raw data/topics,512matching events and existing final repository bounds;2MiB stage document,16retained stages/8MiB documents. More than512events still stops; no partial-block checkpoint or automatic eviction. Single-provider observations are not receipt-trie/consensus proof. Helpers are explicit and not automatically chosen by scanner/cycle/production. Stage publishing/held resolution, archival, job integration and hosted restore/transaction acceptance remain follow-up work.

20new local tests cover300transactions in bounded steps, no partial visibility, resume after actual process SIGKILL, CAS races/stale versions, lost progress acknowledgement, fork/list/checkpoint changes, invalid/missing receipts, log gaps, bounded refusal, runtime/confirmation rechecks and no replay after uncertain publication or marker failures. See RECEIPT-STAGING-RUNBOOK.md for exact limits. No live migration, deployment, spend, trading/native signing or new APK.

## Batch11 — finite persisted-stage worker

Added `runPlatformStageCycle` and bounded `PlatformReceiptStages.unresolved(binding)` discovery, without schema drift. The explicit worker automatically selects persisted acquiring/ready progress, admits the next confirmed block if absent, persists bounded receipt steps across finite invocations and publishes at most one complete block. Shared RPC budget/deadline, safe-step lease renewal and final release/owned-client cleanup. Pending journal intents and held/publishing/ambiguous stage sets stop instead of replaying. No credentials or full stage documents in results.

17new tests cover restart discovery, complete publication, empty block steps, busy lease, pending intent, orphan publishing/held markers, cross-step RPC budget, cancellation/deadline, bounds/schema refusal, sanitized failure, caught-up observation, resumed fork invalidation, uncertain exchange acknowledgement/no replay and client close-once.199focused exchange/integration tests PASS. Full verification recorded separately.

Not a daemon/job queue or automatic range-to-stage dispatcher. Production API/worker selection unchanged. Stage-marker review/archival, >512event blocks, durable job fairness/backoff/supervision, independent consensus/completeness and hosted durability acceptance remain open. See STAGE-WORKER-RUNBOOK.md. No hosted probe/write, migration, deployment, spend, signing/trading activation or new APK.

## Batch12 — integrated dispatch, durable jobs and reviewed stage/job recovery

Added explicit integrated ordinary receipt-range→persisted-stage dispatch under one lease/shared RPC budget. Only recognized single-block pre-publication acquisition gate can select staging; semantic/storage/publication faults never fall back. Existing acquiring/ready stages have priority; held/publishing/ambiguous stages and pending intents block both paths.

Added explicitly checksummed32job namespace and finite scheduler (1–8jobs, one claim/stream/invocation), DB-clock due/claim/finish, exact claim token/version/owner, idle/progress delays, bounded lease-busy exponential backoff, inspect/pause and expiry→review with no automatic running-job reclaim. Missing runtime/errors/cleanup uncertainty quarantine. Runtime credentials are not persisted. Actual child SIGKILL after acknowledged exchange dispatch but before job finish leaves running job and no automatic replay.

Added supplemental audited exact stage-marker closure after acknowledged canonical journal match and fresh exact exchange revision/events; no replay. Added explicit reviewed job rearm under a fresh exchange fence and no unresolved journal/marker evidence; only scheduling marker changes, no event replay. Added exclusive0600fsync/bounded-readback terminal-stage archive and reviewed atomic audit+prune, retaining stage-review rows. Acquiring/ready/publishing/held rows cannot be pruned; local file is not encrypted/authenticated/off-host backup. Original schema checksums unchanged.

78new tests;277focused exchange/integration tests PASS. Full evidence recorded separately in audit/independence/batch12-results.json. All reviews/archive pruning used disposable test data only. No production selection, hosted probes/writes, migration/deployment, paid provisioning/spend, signing/trading activation or new APK.

Still assistant work: operational CLI/daemon/supervision/alerts/soak, larger event-dense strategy (>512matching events unsupported), unified secure journal/stage/job-aware backup/restore, nonmatching recovery/audit rotation, hosted acceptance/cutover and remaining platform projections/dependency removal/API/SDK. Ownership split in WORK-OWNERSHIP.md; full lifecycle/bounds in EXCHANGE-JOBS-RECOVERY-RUNBOOK.md.

## Batch13 — operator CLI and bounded supervision

Added strict64KiB/O_NOFOLLOW candidate configuration, offline validation/planning with endpoint fingerprints, exact approved config+endpoint commitment before run, existing regular local-file checks, queue/enrolled-binding preflight, read-only health/inspection and foreground finite run command (`npm run platform:operator`). No auto-migration/enrollment/rearm/prune or hosted database support.

Bounded supervisor opens fresh owned queues each tick, gates review/expired/unconfigured readiness, emits sanitized count-only heartbeat/alert events, stops on schema/storage/provider/cleanup/sink uncertainty, and responds to SIGINT/SIGTERM without racing commits. Default1tick, max1000/1hour budget; no installed service. Queue-ready explicitly does not certify chain/hosted/production readiness.

30new tests cover offline/no-creation validation, strict config/endpoints/commitments, symlink/missing files/binding drift, actual CLI child validate/SIGTERM, circuits, fresh clients, graceful cancellation, lost completion acknowledgement and short12tick idle resource soak. Detailed scope in PLATFORM-OPERATOR-RUNBOOK.md. Remaining: actual service/external alert/health transport/long-duration soak, unified secure backup/restore, broader recovery, >512event strategy, hosted acceptance/cutover and remaining independent platform/API/SDK. No hosted probe/write, migration/deployment, spend/paid provisioning, signing/trading activation or new APK.

## Batch14 — co-located unified encrypted recovery

Added exact known-schema/checksum/semantic validation, one-SQLite-image WAL-consistent capture including all exchange/journal/stage/job/review/archive namespaces, AES-256-GCM streaming encryption/AAD/readback and exclusive fsynced ciphertext publication. Unknown/split/missing schemas refuse; no source migration.

Authenticated restore plans bind artifact/key/target/state evidence. New independent copies retain event/checkpoint/pending/stage/review/archive/job-config evidence, clear leases/increment fences, invalidate job claims and quarantine ready/running jobs. Restore audit added only to private working copy; no automatic replay/activation. Added private key-file loading, local distinct-key rotation, isolated ephemeral recovery drill and strict local CLI (`npm run platform:recovery`).

43new tests include tamper/key/header/size/schema/trigger/projection faults, permissions/overwrite/WAL/stale-plan refusal, pending stage/journal preservation, authority invalidation, copied artifact/rotation/rebackup/drill, live separate WAL writer consistency and actual child SIGKILL after restored-copy acknowledgement. No during-fsync/power-loss/hosted/off-host acceptance implied. Detailed contract/bounds in UNIFIED-RECOVERY-RUNBOOK.md.

Remaining assistant work: split-database/hosted capture protocol, off-host transport/inventory/immutable retention/key-custody operations, operational integration/long-duration acceptance, broader recovery/audit rotation, >512event strategy, hosted authority acceptance and remaining collection/wallet/stats/dependency removal/API/SDK. Owner/joint gates unchanged; no immediate owner action needed for next local engineering. No hosted probe/write, migration/deployment, paid provisioning/spend, signing/trading activation or new APK.
