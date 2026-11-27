> **Batch14 update:** unified single-co-located SQLite recovery now includes exchange/journal/stage/job/review/archive state, streaming authenticated encryption/readback, exact quarantine restore, local key rotation and isolated drill. This is not split-database/hosted backup, actual off-host retention or production authority. See UNIFIED-RECOVERY-RUNBOOK.md and updated WORK-OWNERSHIP.md. Older lists below are historical.

> **Batch13 update:** validated local-candidate operator CLI and bounded foreground supervision now implemented/tested (offline validate/plan, explicit config+endpoint commitment, queue-only health, code-only events, fresh clients, circuit stops and graceful SIGTERM). Actual deployed service/hosted support, external alert transport and long-duration soak remain open. See PLATFORM-OPERATOR-RUNBOOK.md and WORK-OWNERSHIP.md. Earlier remaining lists are historical.

# Range dispatch, durable jobs and reviewed recovery — Batch12

## Explicit, not production-selected

New internal modules:
- `platform-exchange-dispatch.js`: ordinary receipt-range scanning, pre-publication-only fallback to persisted staging, resume/publication under one exchange lease and one shared RPC budget.
- `platform-exchange-jobs.js`: caller-owned explicitly migrated32job queue with database-time due/claim/completion, contention backoff, inspection, pause and expiry quarantine.
- `platform-exchange-scheduler.js`: finite scheduler using a supplied runtime Map; persists completion/next-due and never selects one job twice in an invocation.
- `platform-exchange-stage-review.js`: explicit reviewed closure of a held/publishing marker only after an exact acknowledged journal/publication match.
- `platform-exchange-job-review.js`: explicit audited rearm of review/paused jobs under a fresh exchange fence and fresh checkpoint/journal/stage evidence.
- `platform-exchange-stage-archive.js`: exclusive verified local terminal-stage archive and explicit audited prune; not encrypted/authenticated/off-host backup.

Existing production API, local indexes, worker entrypoint and deployed services are unchanged. No automatic migrations, enrollment, provider failover, cloud calls, service installation or paid provisioning occur. All initialization/reviews/archive deletion executed in tests only. Helpers are internal, NOT public routes or authorization boundaries.

## Explicit setup

Use disposable reviewed targets before hosted acceptance. Supply independent owned SDK factories for exchange, journal and stages, and a separate caller-owned `PlatformExchangeJobs` client. Initialize existing exchange/journal/stage schemas and exact stream binding through existing reviewed tooling. Explicitly initialize job schema and enroll whitelisted binding/policy. Initialize supplemental stage-review, stage-archive and job-review schemas only when needed. No released schema checksum changed.

Factories must return fresh authoritative clients for uncertain-publication observation and never share one SDK client across transactional namespaces. Queue/runtime Map contains provider/client handles only in memory; persisted job documents contain only exact public chain25binding and bounded policy. Credentials/URLs/keys are neither required in job documents nor accepted from them as runtime configuration.

## Dispatcher

`runPlatformExchangeDispatch` defaults4units, max8; range span1–32, receipt batch1–32, confirmations12–256.45s maximum acquisition deadline,2200default shared RPC calls,15000ms default per-read timeout,1–60s lease TTL(default60s). Existing inner RPC/helper bounds may be stricter.

1. Assert all schemas and original binding. Pending journal stops before RPC or lease work.
2. Acquire lease, then renew at safe unit boundaries. Recheck pending intents and unresolved stages before each unit.
3. Held/publishing markers or more than one unresolved stage stop both ordinary and staged paths.
4. Existing acquiring stage gets one bounded receipt step; ready stage gets one journaled complete-block publication.
5. With no stage, run ordinary journaled adaptive receipt scan. **Only** `SINGLE_BLOCK_REQUIRES_REVIEWED_STAGING`, raised before publication, admits a next-block stage. No other provider, ABI, runtime, lease, semantic, journal/storage or publication error may trigger fallback.
6. The same RPC adapter covers shrink attempts, fallback admission and later units. Completed acknowledged ranges are counted; remaining units may publish further ranges. `maxUnits` is not a one-block limit.

No partial-block checkpoint. Final stage bounds still4096transactions/8192receiptlogs/2MiBraw/512matchingexchangeevents plus existing final repository bounds. Stage retention16rows/8MiBdocuments,2MiB per document. More than512matching events is unsupported; larger-event strategy still needs engineering. Single-provider observations are not independent completeness/trie/consensus proof.

Cancellation/deadline controls admission/acquisition. An invoked commit is never raced into a false "not written" result. A non-cancellable RPC transport can continue a read; late result is ignored. SDK/database calls have no hard wall-clock abortion guarantee. Returned stage metadata is last-observed and may be stale after failure. No automatic write retry; reopen authoritative clients to review uncertain outcomes.

## Durable jobs and finite schedule

`PlatformExchangeJobs.initialize()` creates a separate additive checksummed namespace. `enroll(binding,policy)` refuses duplicates even if only policy/startBlock/runtime differs; no silent configuration overwrite. At most32jobs, no automatic deletion. Policy whitelists maxUnits/batchSize/span/confirmations and delays. Delays1000–86400000ms; defaults progress1s, idle30s, busy2s capped60s.

`claim(owner,{ttlMs,exclude})` uses database time and one write transaction. Only due ready jobs may be claimed. Claim increments version and persists random token/owner/until time. It does not reclaim running jobs, even expired ones. Claim token/owner are omitted from `inspect()`. Selection order due-time/last-finish/stream plus bounded per-invocation exclusions gives deterministic due-work rotation, not a certified distributed fairness/performance SLA.

`finish(claim,result)` requires exact token, version, owner and unexpired claim. Stores a small whitelisted result without receipts/provider URLs or lease tokens. Only acknowledged successful progress, caught-up observation or lease-busy results with no reason/error and clean resources return to ready:
- progress → configured progress delay;
- caught-up → idle delay;
- repeated lease-busy → bounded exponential delay;
- other errors/cancellation/uncertain cleanup → review, not an automatic retry.

`expireToReview()` explicitly moves expired running jobs to review with `JOB_EXECUTION_UNCERTAIN`. It NEVER resets to ready. Inspect identifies expired running jobs but performs no mutation. A process can die after exchange publication and before job completion; that is why TTL expiry alone is not replay permission.

`runPlatformExchangeSchedule({jobs,runtimes,owner,maxJobs,signal})` runs1–8jobs(default4) sequentially. Runtime Map is supplied by trusted code, keyed by stream, holding provider and independent factories. Job binding/policy override runtime hints; no stored URL becomes executable configuration. Missing runtime quarantines the claimed job. At most one claim per stream per invocation; successful completion persists next due time. Caller owns/closes queue; dispatcher owns/closes its resources. Cancellation before a claim stops; cancellation after a claim still attempts durable completion/quarantine rather than racing that write.

Each dispatch has a45s acquisition cap and each job a60s claim. With8jobs total read-acquisition budget can reach360s, plus database/cleanup latency. No service-loop timer, automatic cron/daemon, systemd/Render service, network liveness/readiness endpoint, outbound alerting, jitter/circuit-breaker policy or unattended recovery is installed. These remain engineering/activation work. Inspection supplies state for future supervision, not an operational alert delivery guarantee.

## Reviewed stage-marker closure

Explicit `initializeStageReview(stages)`, then `planPublishedStageReview({stages,journal,id,intentId,openFresh})`:
- stage must be complete and held/publishing;
- supplied journal entry must be acknowledged with committed or reviewed-matching-publication observation;
- exact canonical binding/checkpoint/block/hash/log content digest must match the stage;
- no pending journal may exist;
- fresh authoritative exchange state/revision/events must match exactly, not merely appear superseded.

Approval requires `CLOSE VERIFIED PUBLISHED STAGE`, exact planHash, restricted reviewer identifier and64hex evidenceHash. `acceptPublishedStageReview` repeats plan/evidence and reobserves exact exchange state while holding the stage marker transaction, then atomically inserts audit and changes only marker to published. No exchange writes, intent acknowledgement/replay or deletion.256audits/1MiB total;16KiB per audit. Lost acknowledgement requires fresh read of marker+audit; never retry blindly.

If a journal is still held, perform the existing matching-publication journal review first; then marker review. If journal already pruned or exchange superseded/different/unchanged/unresolved, this path refuses. It is NOT a generic nonmatching recovery mechanism. Archive reviewed stage evidence before pruning its acknowledged intent when later recovery might need it.

## Reviewed job rearm

Initialize supplemental job-review schema explicitly. `planJobRearm` is read-only: queue phase must be review/paused, no pending journal, no held/publishing/ambiguous stage. Any resumable stage must bind the current exact checkpoint and binding. Plan commits job version/config/last result, checkpoint and stage versions/digests.

Approval requires `REARM VERIFIED EXCHANGE JOB`, exact planHash, restricted reviewer and64hex evidenceHash. Acceptance acquires a fresh exchange lease/fence before repeating the plan. An active unexpired exchange worker blocks rearm. The new fence invalidates earlier expired workers' publication authority. Reobserves checkpoint/stage/journal while holding job marker transaction, then atomically audits and changes job to ready/due. It does NOT replay a range, acknowledge/delete intents, alter event/order/checkpoint data, repair semantic failures or certify live chain correctness. Fresh fence is a coordination mutation, not an exchange event publication. Resource release is attempted; a remaining lease makes the next dispatcher busy until release/expiry.

256review audits/1MiB,16KiB per audit. No automatic pruning. Paused/review jobs require explicit caller authorization/review; running jobs first require explicit expiry quarantine and investigation. Repeated/stale/tampered approvals fail. Lost acceptance acknowledgement requires fresh queue/audit inspection.

Review commitments and evidence hashes are NOT authentication or independent review. The invoking service must enforce authorization/evidence policy. Fresh observations plus a local marker transaction do not create cross-database/chain atomicity. Normal dispatcher/journal/fence checks remain mandatory on subsequent execution.

## Terminal-stage archive / prune

Explicit stage-archive schema initialization, plus initialized stage-review table so supplemental evidence can be copied. Export1–16unique terminal IDs; only published/invalidated stages. Acquiring/ready/publishing/held can NEVER be archived/pruned by these helpers. Archive includes exact stage rows and any stage-review row, each digest-checked, plus manifest digest. Maximum8MiB JSON file, choose smaller selections if needed.

`writeTerminalStageArchive` requires absolute path, exclusive0600creation, file fsync, directory fsync and bounded readback. It refuses overwrites/symlink targets. No existing documents are removed by archive creation. Returned receipt commits path/file hash/manifest/size/count.

Prune approval requires `PRUNE VERIFIED TERMINAL STAGES`, exact file hash and reviewer/evidence. Readback uses O_NOFOLLOW and size+1 bounded reads; rejects changes, corruption or receipt drift. Transaction compares every archived stage and optional review row exactly against current database, inserts archive audit, then deletes only terminal stage rows. Stage-review rows remain retained.256archive audits/1MiB, no automatic audit rotation. Lost acknowledgement requires fresh row/audit inspection.

This reclaims bounded stage retention but is **not** encrypted/authenticated/off-host backup, independently verified restore, protected directory retention or a universal recovery format. Local owner-controlled file mutation/loss after verification remains possible. No archive restore/import or automatic retention daemon is provided. Source-only tests delete disposable test stages only; no user/production data was pruned.

## Evidence / limitations

78new tests, including an actual child-process SIGKILL after acknowledged dispatch but before job completion, plus existing stage SIGKILL tests. Tests exercise bounded fallback, no write replay, queue CAS/acknowledgement faults, safe quarantine/rearm/fencing, reviewed exact closure, races/capacity and terminal archive integrity/pruning. All hosted consistency/limits/restart/restore, independent security and actual device tests remain separate acceptance gates. No hosted probes/writes, deployment/migration, CRO spend, paid provisioning, trading/native-signing activation or new APK occurred.
