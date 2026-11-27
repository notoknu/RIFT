> Batch12: integrated range-to-stage dispatcher and finite durable scheduler now implemented explicitly; exact reviewed stage-marker closure and terminal-stage local archive/prune added. See EXCHANGE-JOBS-RECOVERY-RUNBOOK.md. Historical limitations below are superseded only for those exact helper paths, not production or generic nonmatching recovery.

# Transaction-heavy single-block receipt staging — Batch10

## Scope

This is an explicit internal acquisition/publication path for a **single next block** whose transaction count exceeds the ordinary bounded receipt scanner. It does not make all dense blocks supported, start a service, migrate live data or select a production index.

`server/platform-exchange-stage.js` adds:
- `PlatformReceiptStages(client)` with explicit additive checksummed schema, owned client and progress CAS.
- `beginReceiptStage` to bind one next confirmed block and its provider-advertised transaction list.
- `advanceReceiptStage` to acquire at most32receipts per call with durable hidden cursor/log progress.
- `publishReceiptStage` to revalidate the complete block and route one atomic exchange publication through the existing recovery journal.

No existing exchange/journal/review schema checksum is changed. Stage initialization occurs only explicitly; runtime helpers never auto-create tables. Tests use disposable local data, not live Turso.

## Bounds / trust

- Single block at `expected.indexedThrough+1`, chain25,12–256confirmations, exact runtime hash and parent linkage when a prior indexed block exists.
- Up to4096provider-advertised transaction hashes, with uniqueness and exact order.
-1–32receipts per advance call; sequential requests. Default per-call RPC budget128, per-read timeout15000ms; caller-supplied AbortSignal is honored. No cross-invocation aggregate wall-clock timeout or transport abort is guaranteed.
- Up to8192receipt logs and2MiB raw data/topics over the whole staged block.
- Up to512matching exchange events, plus existing final repository encoding/projection/history/input bounds. More than512matching events still stops with `DENSE_EVENT_BLOCK_REQUIRES_OTHER_STRATEGY`.
- Stage document at most2MiB;16retained records and8MiB total document bytes. SQLite/index/transaction overhead is additional. No performance/free-quota certification.
- One acquiring/ready/publishing stage per stream. Terminal rows are retained and count toward capacity. No silent eviction or automatic deletion.

A single provider's transaction list, receipts and headers remain trusted observations. No transaction-root/receipt-trie, quorum or independent consensus proof is implemented. Checksums detect drift, not malicious database rewriting or provenance. These interfaces are internal and not authorization boundaries or public routes.

## Hidden-progress lifecycle

### Begin

Reads the existing bound exchange checkpoint; verifies chain/head/confirmation, block identity/transactions and exact runtime. Saves only whitelisted public binding, expected checkpoint, block identity, transaction hashes and empty progress. No lease, provider credential or private key is serialized by this helper.

The stage is acquiring, or immediately ready for an empty block. No exchange event/order/checkpoint or recovery intent is published.

### Advance / resume

Use the saved stage ID and current version. Each advance:
1. Refuses a stale version or wrong phase.
2. Rechecks the original checkpoint, chain, confirmations, runtime, block identity and complete transaction-list hash.
3. Validates receipt transaction/block/index/status, failed-receipt emptiness, log encoding and global log continuity across batches. Foreign/unrelated logs still count toward positions/bounds.
4. Detaches matching exchange events and verifies their known ABI.
5. Rechecks checkpoint/block after acquisition, then CAS-appends progress in one stage transaction. Prior identity and acquired-log prefix cannot be rewritten through progress CAS.

A failed receipt step commits no partial cursor. A lost stage-write acknowledgement requires a fresh stage client/read; stale versions cannot double-append. Concurrent clients can acquire the same batch speculatively, but only one progress CAS succeeds. An unusable SDK handle is not automatically reused.

A changed block/parent/transaction list invalidates the stage while leaving exchange projections/checkpoint untouched. A changed exchange checkpoint stops rather than rewinding it. Invalidation/restart is explicit; there is no hidden fallback to old provider data.

### Publish complete block

Requires ready phase and cursor equal to transaction-list length. Journal schema must already exist and no recovery intent may be pending. Rechecks checkpoint, chain/head/confirmations, exact runtime, block identity/transaction list, then persists publishing phase before recovery-intent preparation and the exchange write.

- Acknowledged exchange publication → journal acknowledgement → stage published marker.
- Lost exchange acknowledgement → fresh-client observation, held journal/stage and explicit review; never automatic replay.
- Journal/marker/storage failures can leave publishing state even if the exchange committed. The state is intentionally not reset to ready. Reconcile exact exchange/journal/stage evidence through fresh authoritative clients; do not blindly invoke publish again.
- Ready/active stages cannot be replaced with a second active stage. Published stages cannot be replayed.

Cancellation is checked before publication and around journal persistence; a commit already invoked is not raced against a deadline or treated as unwritten. A current valid lease/fence must be provided for final publication. Acquisition can span invocations/lease expiry; obtain the appropriate reviewed current lease before publication rather than bypassing the repository gate.

## Current integration limits / next work

- Batch11 adds a separate explicit finite stage worker that discovers/resumes stages and admits/publishes the next confirmed block. It is not automatically selected by the ordinary adaptive scanner/range cycle or production. Durable jobs, daemon/supervision and range-to-stage dispatch remain assistant work. See STAGE-WORKER-RUNBOOK.md.
- More than512matching events, larger documents or other final repository limits remain unsupported; no partial-block checkpoint is created.
- Publishing/held stage-marker resolution, retention/archival, and journal/stage-aware restore packaging are not yet implemented. A matching recovery-journal review alone does not automatically rewrite the stage marker.
- Progress remains private/internal; public exchange queries do not read stage rows. The existing public status/API has not been changed to expose them.
- Hosted primary consistency, process/power/partition behavior, transaction limits, migration/restart/independent restore and actual Cronos provider compatibility remain acceptance gates.

## Local evidence

20tests cover300transactions across bounded steps, reopen/resume, no partial exchange visibility, one active stage, fork/transaction-list changes, receipt failure rollback, cross-batch log gaps, lost progress acknowledgement, independent-client CAS race, resource bounds, confirmation/runtime changes, uncertain publication, empty block, checkpoint change, journal/stage-marker failures, immutable identity/prefix checks and an actual child-process SIGKILL after persisted progress.

The SIGKILL case resumes at cursor32, observes no partial order, completes acquisition and publishes once. This is a local file/process test, not host power loss, hosted durability, Android process death or production acceptance.

No hosted probe/write, migration, deployment, paid provisioning, CRO spend, trading/native-signing activation or new APK occurred.
