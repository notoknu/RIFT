> Batch12 adds exact acknowledged stage-marker review, fenced job rearm and verified terminal-stage archive/prune in separate explicit modules. These do not replace this journal review or provide nonmatching-intent recovery. See EXCHANGE-JOBS-RECOVERY-RUNBOOK.md.

# Recovery review, acknowledged-intent archival and bounded worker cycle

## Scope / safety

Batch9 internal source interfaces; not production HTTP endpoints, a deployed daemon or approval to mutate live Turso data. Existing exchange/journal schema checksums are unchanged. Supplemental review/audit tables require explicit initialization on a reviewed target; no factory/startup implicitly migrates.

Tests use disposable local SDK databases and fixture reviewer approvals. A fixture approval is not owner authorization for a real production action.

## 1. Schemas and owned clients

- Exchange store, recovery journal and review/audit namespaces must be explicitly initialized/reviewed before use. `initializeRecoveryReview(journal)` adds only `rift_recovery_review_schema`, `rift_recovery_reviews` and `rift_recovery_archives` with a separate checksum. It does not alter the released exchange/journal v1 schema definitions.
- Journal and exchange store need independent owned clients against the intended database. Fresh observation factories must open the authoritative primary, not a stale replica/cache or the failed handle.
- No schema initialization happens in `runPlatformExchangeCycle` or review planning.
- Hosted primary consistency, transaction limits and migration/restore acceptance remain open. Local tests do not prove these.

## 2. Read-only review plan

`planMatchingIntentReview({journal,id,openFresh})`:

1. Reads and validates the persisted exact candidate/digest.
2. Requires phase `held` or `attempting`; prepared records are not silently promoted.
3. Uses fresh-client reconciliation and produces a hash-bound plan with phase, candidate digest, outcome and observed public checkpoint state.
4. Does not publish, resolve, clear or archive anything.

Only `matching-publication-observed` is eligible. Unchanged, conflicting, superseded and unresolved observations remain blocked. A matching observation means content was observed, not which worker wrote it, live chain canonicality or non-lagging hosted durability.

## 3. Explicit matching-publication acceptance

`acceptMatchingIntentReview({journal,plan,approval,openFresh})`:

- Requires exact confirmation `ACCEPT MATCHING PUBLICATION`, commitment to the reviewed plan hash, a bounded reviewer label and an evidence SHA256 commitment.
- Repeats the observation and refuses a changed plan/checkpoint/phase.
- In one journal transaction, inserts the review audit and CAS-transitions the intent to phase `acknowledged` with observation `reviewed-matching-publication`.
- No exchange write, replay or lease acquisition occurs.

**Meaning of the phase:** `acknowledged` plus `reviewed-matching-publication` is explicit reviewer acceptance of observed content; it is not retroactive proof that the original network acknowledgement arrived. Normal publication still uses observation `committed`. Consumers must preserve this distinction.

Approval objects and hashes are **not authentication, signatures or independent review**. These are internal operator primitives. Future tools/routes must authenticate/authorize the reviewer and establish evidence provenance and primary-read policy. A caller able to invoke an internal function can construct a confirmation object. Never expose this as an unauthenticated public API.

Review and exchange state are not atomically locked with the blockchain. The next worker unit reads current state and still uses lease/revision fences. Concurrent chain/provider/unauthorized DB changes cannot be certified away by the plan hash.

Held/prepared cases without exact matching content still need separately designed resolution paths. There is no force-clear, automatic retry, abandon or rollback button in this module.

## 4. Export before acknowledged-record pruning

- `exportAcknowledgedIntents({journal,ids})`: consistent bounded export of at most64 explicitly selected acknowledged intents, their exact sanitized candidate documents and any review audits. Pending/held/prepared records are refused. No database deletion occurs.
- `writeAcknowledgedArchive({journal,ids,path})`: absolute destination, exclusive0600file creation, file sync, directory sync and bounded readback/hash verification. Never overwrites a file. A failed/partial file is not authority to prune.
- Archive cap8MiB. Data contains public-chain addresses/activity but can still be privacy-sensitive; do not publish casually. No lease/auth/private-key fields are exported from valid journal documents.

These are plain JSON local archives. Encryption/authenticity, independent off-host replication, retention and durable storage location remain operator/tooling work. File existence/fsync is not proof of an independently retained backup. A trusted operator must approve the destination/retention policy.

## 5. Explicit verified acknowledged-record pruning

`pruneAcknowledgedArchive({journal,receipt,approval})`:

1. Requires exact `PRUNE VERIFIED ACKNOWLEDGED INTENTS`, commitment to the saved file SHA256, bounded reviewer label and evidence hash.
2. Refuses final-component symlinks; reads at most the bounded declared file size plus one byte, then verifies size/hash/manifest/content.
3. Rechecks every database record and corresponding review against the archive. Every selected intent must still be acknowledged.
4. Atomically records the archive audit and deletes only those exact acknowledged intent rows. Review audit rows remain.

No unresolved intent or exchange event/order/checkpoint is deleted. Changed/missing records, audit-capacity limits or storage failures stop the operation. Lost transaction acknowledgement requires a fresh authoritative audit/database read; there is no blind retry wrapper.

The archive could be removed or altered after verification; this function cannot guarantee future retention or a remote filesystem's durability. A plain digest is not a digital signature or malicious-DB defense.

Audit bounds:1024review records/1MiB review documents;256archive receipts/1MiB archive-audit documents. Admission stops rather than silently dropping audit evidence. Audits themselves need a future reviewed rotation/retention workflow.

## 6. Finite worker cycle

`runPlatformExchangeCycle({...})`:

- Caller supplies primary store/journal factories, explicit binding/owner and read-only provider. No stream binding creation or migration.
- Checks schemas and pending intents before lease/RPC acquisition. Busy lease or pending recovery returns without chain reads/publication.
- Acquires a fenced database-clock lease; renews between safe units, not inside an uncertain commit.
- Runs at most8journaled adaptive scan units; default4. Default receipt span32, shared2200RPC calls,45000ms aggregate acquisition budget and60000ms lease TTL.
- Shares RPC budget across units, preserves already committed progress and never retries an uncertain/semantic/RPC failure automatically.
- Stops on idle confirmed-head observation, range/call/deadline/cancellation limits, lost lease or recovery hold.
- Best-effort releases a usable lease and closes owned resources. Release uncertainty is exposed in cleanup metadata; failed/poisoned handles are not reused to publish.

`caught-up-observed` is only the checkpoint versus one observed confirmed RPC head, not independent network completeness or production readiness. Acquisition timers do not race database commits. Factory opens, DB operations and cleanup depend on their transport timeouts; this is not a universal hard wall-clock timeout or guaranteed HTTP abort.

This is an explicit bounded operation, not a continuously running Render service, durable job queue, fair multi-stream scheduler, alerting system or automatic deployment. Production selection remains unchanged.

## 7. Local evidence

Review/archive tests cover plans, manual commitment binding, changed observations, conflicting eligibility, concurrent reviewers, missing migrations, capacity stops, atomic rollback, lost review acknowledgement, pending refusal, exclusive permissions/overwrite refusal, symlink/file/database drift and late prune failure.

Worker tests cover bounded multi-unit progress, lease busy/pending/idle paths, shared call budget, provider faults, cancellation/deadline, factory cleanup, lost publication acknowledgement, lease takeover and an end-to-end held→explicit fixture review→archive→next fresh checkpoint cycle without replay.

Local reviewer fixtures are not real owner approvals. No hosted schema write/probe, migration, deployment, spend, trading/native signing or new APK occurred.
