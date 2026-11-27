# Unified encrypted candidate recovery — Batch14

## What is implemented

`platform-unified-validation.js`, `platform-unified-recovery.js`, `platform-unified-cli.js` and `scripts/platform-unified-recovery.js` add a **local, co-located SQLite** recovery path that includes exchange state, journal intents, receipt stages, durable jobs, reviews and archive audits in one image.

It is not a hosted/Turso backup implementation, not a split-database transaction protocol, not an off-host transfer/retention service and not production recovery acceptance. No live target or service was changed. All new restore/schema/audit mutations in this pass used disposable test copies. Runtime operator/production selection is unchanged.

## Consistency contract and supported layout

All required namespaces must already be initialized explicitly in the **same SQLite file**: exchange, recovery journal, receipt stages, jobs, matching-intent review/archive, stage review, job review and terminal-stage archive. The backup helper never initializes or migrates the source. A trusted reference schema is generated in memory using existing initializers; actual table/index/SQL objects and schema checksum records must match. The new restore-audit table is optional but must match its exact known SQL when present.

Unknown/missing tables, extra views/triggers/indexes, schema/checksum drift or unrelated application namespaces refuse backup. This is intentionally narrower than the multi-file operator layout: there is no automatic relocation or safe live merge of split databases here. Source schema evolution needs a reviewed format/compatibility update, not a bypass flag.

SQLite's backup API captures one consistent database image, including committed WAL transactions. Source may remain online for capture. This is a physical database point in time, **not** an application-wide atomic publication protocol: journal/stage/job commits can surround an exchange commit. Their exact intermediate evidence is preserved rather than discarded or declared complete. A test with an active separate WAL writer verifies transactionally related checkpoint/audit generations are not mixed across repeated captures.

## Capture and validation

`createUnifiedBackup({source,target,key,keyId,maxBytes,signal})`:
1. Requires absolute regular source file, fresh target and no target WAL/SHM/rollback-journal names. Source symlinks and destination collisions refuse.
2. Creates0700private temporary directory in target parent. Opens source SQLite read-only and uses online backup to a private image.
3. Validates exact known schema/checksum rows, SQLite integrity and foreign-key consistency, bounded rows/documents, JSON/digests, canonical journal entries, stage/job bindings and exchange event→reducer/order/checkpoint snapshots for every included stream.
4. VACUUMs only the private copy, using secure-delete configuration, to rebuild a standalone image without copying unused database free pages as the recovery representation. This is not secure erasure of source/host storage.
5. Streams private image into an authenticated encrypted artifact.
6. Decrypts that artifact to another private image, verifies authentication/hash/schema/semantics, then publishes ciphertext exclusively by hard link and fsyncs the containing directory.
7. Removes private working copies on ordinary success/failure. No plaintext database or unprotected sidecar is published as the backup deliverable.

Every existing exchange projection is revalidated with bounded snapshot logic; export limits remain4096events/512orders/32checkpoints per stream and8MiB logical snapshot, at most32streams. Journal256rows/8MiB, stages16rows/8MiB, jobs32rows/1MiB, review/archive counts/document bounds retained. Record integrity checks are not independent chain/receipt proof or malicious-keyholder evidence certification.

## Encryption / keys

Envelope magic `RIFTUN01`, format `rift-unified-recovery-v1`, AES-256-GCM with random96bit IV and128bit tag. Bounded JSON header(max4096bytes) includes public key identifier, backup ID, image bytes/SHA-256 and schema fingerprint. Entire prefix/header is authenticated as AAD. Ciphertext, header tampering, wrong keys and tag/truncation faults refuse before any plaintext can be published as a restored database.

Header is authenticated but **not encrypted**: IDs, size/schema/image fingerprints are visible. It is not a signature or independent provenance/freshness proof. Anyone holding the symmetric key can author a valid artifact; a valid old backup is not automatically the latest authoritative one. Expected key ID and exact file-hash review commitments help select the intended artifact, not prove global freshness. Preserve an independently protected inventory/retention policy before operational use.

Keys are caller-owned32byte buffers. CLI reads a separate absolute, regular, non-symlink private key file, exactly32bytes and no group/other permission bits; read is bounded and temporary key-read buffer cleared. CLI clears its key buffers on ordinary exit. It does not generate/request owner keys, put keys in CLI arguments, persist them in metadata or print them. Caller APIs retain responsibility for clearing their own key buffers. Native crypto internals, OS caches, crash dumps, swap and underlying storage erasure are not guaranteed scrubbed.

Keep keys separate from backups with reviewed custody/recovery access. Key identifier is a public label, not secret material. No production key was generated, loaded or requested in this pass.

## Bounds / temporary plaintext

Default/max plaintext image256MiB; optional lower API limit≥512bytes. Envelope size/header is bounded before allocating payload buffers; data encryption/decryption streams rather than loading the whole image into memory. Table/document validation still materializes bounded logical rows; this is not an audited constant-memory implementation or hosted-quota certification.

Capture checks source page count and resulting image size. Concurrent source growth/SQLite backup restarts can temporarily consume more disk/time before final refusal; do not treat this as a hard disk/time quota against a malicious continuously growing writer. VACUUM/readback/restore may require several image-sized temporary files, SQLite journals and filesystem overhead; reserve roughly4×image size or more and apply host quotas/monitoring.

Normal cleanup removes private scratch directories, but SIGKILL/power loss can leave0600plaintext images inside0700scratch directories. Use trusted protected/encrypted working storage and reviewed stale-work cleanup. No automatic broad directory deletion or guaranteed secure wipe is supplied. Owner-controlled path substitution after checks, hostile local administrators, storage snapshots and host compromise are outside these helpers' isolation guarantees.

## Verify

`verifyUnifiedBackup` authenticates/decrypts into a private temporary directory, validates image and returns file hash, authenticated metadata and bounded summary only. No image is retained on success. Default work directory is OS temp; caller can supply an absolute protected `workDir`. The ciphertext parent need not be writable. Do not use an unprotected work volume just because ciphertext is encrypted.

Summary contains namespace counts, phase counts, public checkpoint/projection commitments and digest commitments over exact journal/stage/review/archive rows and job configuration. No claim tokens, leases, full logs, reviewer documents or keys are returned. These commitments are audit aids, not authorization or independent consensus proof.

## Plan and quarantined restore

`planUnifiedRestore` authenticates the artifact and commits exact file hash/backup ID/key ID/image hash, target-path hash, schema/namespace/checkpoint/evidence summary and prescribed quarantine action. Source/target paths are not printed in the plan. Plan is read-only with respect to source/target databases but uses removable private working files.

`restoreUnifiedBackup` requires:
- Fresh absolute target with no existing database/WAL/SHM/rollback journal.
- Exact repeated plan and artifact/target match.
- Confirmation `RESTORE QUARANTINED RIFT COPY`, exact planHash, restricted reviewer ID and64hex evidenceHash.
- `servicesStopped=true` acknowledgement for all services that could activate source/target copies during recovery. This is a caller assertion, not remote service shutdown, fencing across forks or a production authorization grant.

After authenticated decryption, mutate **only the private working image** in one SQLite transaction:
- Preserve exchange events/orders/checkpoint revision and timestamp unchanged.
- Clear all exchange leases and increment fences, refusing unsafe/exhausted values.
- Invalidate every job claim version, clear owner/token/until/busy fields and mark ready/running jobs review. Paused/review jobs remain non-runnable; result records restored quarantine.
- Preserve pending journal phases, staged receipt progress, held/publishing markers, reviews and archive audits exactly.
- Insert restore audit(256rows/1MiB cap), preserving prior restore audits. Original claims/lease/result evidence remains in the original encrypted artifact; restored mutable authority/result fields are intentionally changed.

Revalidate restored projections, exact pending/review/archive row commitments and job configuration, checkpoint/truncate private WAL and use standalone DELETE journal mode. Fsync verified image, recheck target absence, publish exclusively and fsync directory. No live overwrite, automatic replay, stream binding, job rearm, intent acknowledgement or production activation.

A later explicit reviewed job rearm and unresolved journal/stage recovery are still necessary. Advancing a fence in a copy does **not** stop workers on the original database; source shutdown/cutover coordination remains an external operational gate. Restoration creates a quarantined independent copy, not authoritative selection.

If publication or cleanup acknowledgement fails, a target may already exist. Never infer "not written" or retry/overwrite blindly: inspect/validate the exact target/artifact/audit with fresh clients. No partial/unverified plaintext is deliberately published before authentication/validation/quarantine completes.

## Local rotation

`rotateUnifiedBackup` requires a distinct32byte key and different public key ID, authenticates the old artifact, streams the same private database image under a new random IV/key, verifies it, then exclusively publishes new ciphertext. Original ciphertext is retained. No old key/copy revocation, remote re-encryption, deletion, off-host transfer or automatic retention policy occurs. Never delete the last usable key/copy based only on local success.

## Isolated drill

`runUnifiedRecoveryDrill` requires an explicit protected work directory plus confirmation `RUN ISOLATED RECOVERY DRILL`, approved exact ciphertext file hash, reviewer/evidence. It generates a fresh private target never used by services, plans/restores a quarantined copy, independently reopens and validates it, checks no ready/running jobs and verifies exact projection/pending/review/archive/job-configuration commitments. Emits a bounded receipt and removes the temporary copy on ordinary return.

The internal services-stopped assertion is true for this newly generated never-activated test target; it is not a claim that production services were stopped. Receipt explicitly says local ephemeral drill, not off-host, power-loss, hosted or production acceptance. Persist receipt through reviewed logging if needed; CLI does not silently append files.

## CLI

`npm run platform:recovery -- COMMAND ...`

Environment: `RIFT_UNIFIED_KEY_FILE`(private32byte file) and `RIFT_UNIFIED_KEY_ID`(public label). Rotation additionally uses `RIFT_UNIFIED_NEW_KEY_FILE` and `RIFT_UNIFIED_NEW_KEY_ID`. No key argument is accepted. Requires Node22 with node:sqlite support.

- `backup --source /abs/co-located.sqlite --target /abs/new.riftbak --confirm 'CAPTURE COLOCATED RIFT STATE'`
- `verify --source /abs/copy.riftbak [--work-dir /abs/protected-work]`
- `plan --source /abs/copy.riftbak --target /abs/fresh.sqlite` → bounded JSON plan; save separately in protected storage if restoring.
- `restore --source /abs/copy.riftbak --target /abs/fresh.sqlite --plan /abs/plan.json --approve PLAN_HASH --confirm 'RESTORE QUARANTINED RIFT COPY' --reviewer REVIEWER --evidence EVIDENCE_HASH --services-stopped`
- `rotate --source /abs/old.riftbak --target /abs/new.riftbak --confirm 'ROTATE LOCAL RIFT BACKUP'`
- `drill --source /abs/copy.riftbak --work-dir /abs/protected-work --approve VERIFIED_FILE_HASH --confirm 'RUN ISOLATED RECOVERY DRILL' --reviewer REVIEWER --evidence EVIDENCE_HASH`

Plan input is O_NOFOLLOW/size+1 bounded≤64KiB; unknown/repeated commands/arguments refuse. Exit0success,1sanitized failure,130checked cancellation. Signal checks do not abort synchronous SQLite validation/backup/commit operations or provide a hard-deadline guarantee. Cancellation immediately before publication is checked; once publication starts its result must be inspected, not raced into a false unwritten state. CLI outputs JSON with no raw exception/path/key material.

Examples document commands only; no actual owner/live target/key/scope is supplied or authorized. All CLI executions in tests used disposable data/test keys. No RPC, cloud app, paid service, live database or blockchain call is performed by this local recovery code.

## Evidence and remaining work

43new tests: authenticated roundtrip/quarantine, pending stage/journal preservation, lease/claim invalidation, between-commit intent evidence, wrong key/ID, ciphertext/header/tag/truncation faults, unsupported headers/schema/trigger/checksum/projection drift, bounds/permissions/symlinks/overwrite/WAL refusal, stale plans/approvals, rotation/rebackup, CLI workflow/drill, copied-file verification, live separate WAL writer consistency and actual child SIGKILL after restored-copy acknowledgement.

Local copy/rename verification is not off-host acceptance. SIGKILL test is after acknowledged restore, not a host-power-loss/during-fsync proof. Remaining assistant work includes split-database/hosted recovery strategy, off-host transport/immutable inventory/retention/key-custody integration, operational scheduler/alerts and broader nonmatching recovery/audit rotation. Real hosted consistency/quotas/restore, independent cryptographic/security review and live recovery/cutover require separate acceptance. Existing >512matching-event strategy and remaining platform/API/SDK work remain open. No production activation, deployment, spend or new APK.
