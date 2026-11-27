> Batch12 adds a separate integrated ordinary-range→stage dispatcher, durable finite scheduling and reviewed stage/job recovery/terminal archival. This original single-block worker remains available. See EXCHANGE-JOBS-RECOVERY-RUNBOOK.md. No deployed daemon/production selection.

# Finite persisted-stage worker — Batch11

## What is implemented

`runPlatformStageCycle` in `server/platform-exchange-stage-cycle.js` is an explicit internal finite worker over the Batch10 receipt stage path. It automatically discovers unresolved stages for the configured stream, resumes acquiring/ready work, admits the next confirmed block when none exists, and publishes one completed block through the existing journal.

`PlatformReceiptStages.unresolved(binding)` reads at most17rows and rejects more than16; verifies stored checksums and returns acquiring/ready/publishing/held rows. Published and invalidated rows remain retained but are not selectable. No schema/checksum changed.

No automatic dispatch from the ordinary range scanner/cycle, CLI, cron, daemon, durable job queue, supervisor, live API or production worker was added. Calling this new worker is an explicit opt-in. It uses receipt staging for any next block, not only a block rejected as transaction-heavy by the range scanner.

## Invocation contract

Supply independent owned factories `openStore`, `openJournal`, `openStages`, exact binding/provider and owner. The exchange stream and all schemas must be initialized explicitly beforehand. Factories must provide fresh clients on each invocation; the exchange factory must also supply genuinely fresh authoritative clients for uncertain-commit observation. No automatic schema creation or stream binding occurs.

Bounds:1–8steps(default4),1–32receipts per acquisition(default32), total acquisition deadline1–45000ms(default45000), lease TTL1000–60000ms(default60000), confirmations12–256(default12). One shared bounded RPC adapter spans admission, validation and receipt reads. Default2200calls/15000ms per read; adapter limits still apply. Inner helpers can be stricter, never relax the shared cap.

Each step performs exactly one operation:
1. Admission: bind the next confirmed block into hidden staging, or return caught-up-observed.
2. Acquisition: persist at most the configured receipt batch with no partial public checkpoint.
3. Publication: publish a previously ready block through the existing journal, then return block-published.

The worker returns after at most one successful block publication. It does not use the remaining step budget to admit more blocks. Admission and publication of an empty block consume separate steps. A300transaction block requires several invocations with defaults.

Before admission it checks for pending journal intents, acquires an exchange lease, then discovers stages. Any held/publishing marker (even without a pending journal) stops as stage-review-required. More than one unresolved record also stops. It does not infer a stage was safe to replay from an absent intent, an unchanged checkpoint or a reviewed journal row.

The lease is renewed at safe step boundaries. Final publication retains repository fence/expiry checks; no write bypass, silent lease takeover or automatic write retry occurs. Deadline/abort gates read acquisition, not an already invoked commit. Transport reads may continue after the caller stops; their late result is not used to publish. All owned resources close in finally, and a usable lease is released when possible. Release failures report review required rather than proving successful cleanup.

## Results / recovery

Result contains sanitized reason codes, status, successful step count, completedBlocks(0or1), eventCount, optional lastState and compact last-observed stage metadata. No receipts, full transaction arrays, provider URLs, private keys or lease tokens are included. Stage metadata may be stale after a failed call; reopen authoritative clients to inspect before making a recovery decision. retryAllowed remains false: another scheduled finite invocation may resume acknowledged acquiring/ready progress, but must not blindly repeat a failed publication.

- step-budget-exhausted: acknowledged hidden progress remains; next invocation rediscovers it.
- block-published: exchange, journal and stage markers acknowledged; no replay.
- caught-up-observed: provider-head observation only, not independent chain completeness or fresh runtime certification.
- recovery-blocked: existing pending journal intent; use reviewed recovery tooling.
- stage-review-required: held/publishing or ambiguous stage set; marker resolution remains unimplemented.
- lease-busy: no provider reads or admission.
- stopped/cancelled/budget-exhausted: inspect sanitized reason and fresh persisted state.

Known Batch10 limits remain4096transactions/8192logs/2MiBraw/512matchingevents,2MiBdocuments/16retainedrecords/8MiBdocuments plus final repository limits. No automatic archive, eviction, >512event strategy, independent receipt-trie/consensus proof, job fairness, backoff, alerting, distributed scheduler or hosted acceptance is claimed.

## Local evidence

17new tests: cross-invocation progress discovery/publication, empty-block steps, lease contention, pending intent, orphan publishing and held markers, shared RPC budget, preabort/bounds, sanitized provider failure, caught-up admission, resumed fork invalidation, stalled-read deadline, missing schema, lost exchange acknowledgement/no replay, acquisition cancellation and SDK-client independence/close-once.

Production remains unchanged. No hosted probe/write, migration, deployment, spend, signing/trading activation or new APK.
