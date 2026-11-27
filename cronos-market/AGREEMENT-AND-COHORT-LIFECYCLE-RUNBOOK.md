# Agreement recovery, multipart reservations and cohort retention — pass 45

## Status

Implementation-only, unverified and inactive. No tests, syntax checks, builds, key generation, restores, signatures, uploads, row pruning, file cleanup, service starts or deployment were run. Commands/configuration below document interfaces; they are not execution evidence or production authorization.

## 1. Shared cold snapshot recovery

`server/cold-snapshot-recovery.js` now implements the common private pinned sealed/multipart recovery path. Existing `restoreWalletIndex` is a compatibility wrapper. `server/agreement-index-recovery.js` supplies the agreement-audit profile.

Common behavior remains: required archive/image pins, bounded no-follow input capture, authenticated decryption, profile-specific inspection, no-overwrite cold publication, private receipt, explicit partial-publication reporting, no live database swap. The plaintext image is hashed both before and after inspection, rejecting inspection-time mutation.

Agreement restoration additionally requires independently retained `expectedAuditHead` and `expectedAuditCount` (0–4096; `EMPTY` only for zero). Local hash-chain validity does not identify an external latest anchor. Supplying an older anchor remains an explicit operator decision, not automatic truncation detection.

### CLI

`npm run index:recovery -- PRIVATE_CONFIG`

New actions:

- `inspect-agreement`: `version:1`, `source`, optional `expectedAuditHead` / `expectedAuditCount`.
- `restore-agreement`: existing sealed/multipart cold-recovery fields, required expected audit head/count, optional checkpoint digest, and `confirm:"RESTORE AGREEMENT AUDIT TO NEW COLD FILE"`.

Existing wallet actions remain. Agreement scratch names use `.audit-restore-XXXXXX`; bounded inventory/fenced scratch tooling recognizes them. Neither recovery profile activates a worker, replaces a live file or signs a user transaction.

`openAgreementAudit` now supports explicit read-only mode and transactional inspection, returning admission/checkpoint/observation digests. Its admission digest covers the actual normalized audited contract/runtime bindings. Read-only handles cannot append. Agreement archiving returns the actual decrypted archived image SHA-256 plus those digests, not an assumed hash of a newly captured but semantically equivalent SQLite header image.

## 2. Agreement restore attestations

`npm run archive:lifecycle -- PRIVATE_CONFIG`

New action `attest-agreement-restore` mirrors wallet attestation, with:

- `confirm:"RESTORE COLD AGREEMENT AND SIGN OPERATIONAL ATTESTATION"`;
- actual pinned agreement `restore` fields, including required audit head/count;
- existing operational `issuer`, `recoveryDomain`, `targetId`, `streamId`, private signing-key file/pin, receipt lifetime and output configuration.

The new domain-separated Ed25519 statement binds audit head/count, actual bindings/checkpoint/content digests, encrypted/plaintext hashes and signer/stream/domain/lifetime. It is signed only after the cold restore returns. It is not a chain commit certificate, immutable-history proof or physical-host independence certificate.

Wallet and agreement receipts can now bind `packagingManifestSha256`: the exact original authenticated multipart manifest inspected during actual recovery, or null for sealed recovery. Legacy wallet receipts without this field remain usable for appropriate standalone ciphertext verification, but cannot authorize multipart queue-cohort pruning. A fresh actual multipart restore is needed for a packaging-bound receipt.

## 3. Agreement filesystem retention

The existing journaled retention engine now accepts `kind:"agreement-audit"` in its pinned policy. Omitted `kind` retains wallet behavior.

Agreement confirmations:

- standing policy: `"ENABLE ATTESTED AGREEMENT ARCHIVE RETENTION"`
- exact plan application: `"APPLY ATTESTED AGREEMENT RETENTION"`
- reviewed journal replay: `"RESUME APPROVED AGREEMENT RETENTION"`

Other bounded policy/trust fields remain as documented in the pass44 runbook. Agreement filenames must match `agreement-HEAD-KEY_ID.riftbak`; groups are distinct audit heads, not incidental SQLite byte/header variations. At least two attested recovery groups are protected. Signed binding/admission digests must match the policy.

Wallet and agreement journals have family-specific formats. Journal validation rejects cross-family file selection. They share the per-directory writer lock and pending-journal barrier, so overlapping deletion/capture operations stop rather than bypassing another family's interrupted work. Legacy wallet journal shape remains recognized.

No Markdown/TXT, receiver rows, sender rows or live databases are selected by filesystem retention. All file deletion remains explicitly approved/journaled and was not executed here.

## 4. Multipart upload generations

Two optional authenticated transport records are added:

- `RIFTRS01`: bounded metadata reservation with a fresh nonce, original manifest/ciphertext hashes and piece digests/lengths.
- `RIFTCM01`: generation-specific commit wrapper containing that reservation's content-addressed row ID and the original multipart manifest bytes.

These are operational metadata, not raw keys or plaintext database images. Existing transport HMAC authenticates the entire record. Original multipart packaging HMAC/encryption remains independently checked during actual recovery.

Fresh reservations distinguish concurrent/repeated uploads of identical ciphertext. Pending reservations pin their pieces even before a commit wrapper exists, preventing an older backup's retention decision from treating those pieces as unreferenced. The original manifest remains unchanged, so a restoration receipt can pin its exact packaging bytes independently of transport generation.

### Producer option

`cohortReservations:true` is available to `enqueueMultipartBackup`, wallet/agreement archive runtime configuration, and the existing independence CLI's `multipart-enqueue` action. Default is **false** for compatibility. Archive runtime fingerprints include the chosen configuration.

Reserved enqueue orders reservation, pieces and commit. Reused outbound piece rows are put back into ready state for redelivery, invalidating older sending tokens if necessary. Late acknowledgements cannot settle those invalidated claims; callers can see stale-claim errors and retry according to their existing policy. Queue claiming prioritizes reservations, pieces, ordinary sealed records, reserved commits, then legacy manifests. Bounds on queue count/bytes/attempts remain in force.

`manifestId` in reserved mode identifies the commit-wrapper row. Existing multipart import/delivery-inspection functions unwrap it, validate the original packaging manifest and check piece references. Delivery inspection also includes reservation acknowledgement state. Acknowledgement is still not restore or retention certification.

### Receiver option

`requireCohortReservations:true` requires a received matching reservation before accepting a piece and requires a matching generation-specific commit wrapper with every referenced piece present. Raw legacy multipart manifests are rejected under enforcement. Ordinary sealed `RIFTDB01` uploads remain supported.

The guard runs after transport authentication. The receiver does not need decryption or packaging keys. Reservations are not silently expired: incomplete uploads remain pinned until separately reviewed lifecycle work resolves them. Capacity exhaustion therefore still fails closed.

## 5. Multipart-aware sender/receiver row retention

New lifecycle actions `cohort-plan` and `cohort-apply` read private pinned policy/trust documents using `policyFile`, `policySha256`, `trustFile`, `trustSha256`.

Cohort policy fields:

- `version:1`, `kind:"wallet-index"` or `"agreement-audit"`;
- canonical private-store `database`, optional `maxTotalBytes` (existing 4–512 MiB range);
- `targetId`, `streamId`, `admissionDigest`, `sourceRecoveryDomain`, private `attestationsDir`;
- `phase:"received"` or `"delivered"`;
- `keepLatest` (2–32 distinct recovery groups), `maxGroups` (1–8);
- `minReceiptAgeMs` (1–30 days), `maxAttestationAgeMs` (1 minute–30 days);
- `reviewer`, `evidenceHash`;
- `confirm:"ENABLE FENCED ATTESTED COHORT RETENTION"`.

Cohort ordering uses trusted receipt issue time, not a queue timestamp or independently proven chain chronology. Receipts must match actual ciphertext, target/stream/admission/failure-domain policy and, for multipart, the exact original manifest hash. At least two distinct recovery groups remain protected.

The planner builds a bounded same-target graph across all queue phases. It preserves shared pieces referenced by retained, incomplete or pending uploads. It preserves unknown formats. An opaque/unparseable manifest or reservation conservatively preserves all part rows. Reservations and wrappers are removed only when their references permit it. No orphan-reservation timeout is invented.

Application rechecks the exact plan and entire target-state digest. The store revalidates selected/protected row identities, content hashes, phases and sizes inside one SQLite transaction before removing anything. This is a local transactional row operation, not an atomic operation with archive files or another host. Physical compaction is not performed.

Manual `cohort-apply` adds a private `approvalFile` with `confirm:"PRUNE FENCED ATTESTED CIPHERTEXT COHORTS"`, `writersFenced:true`, exact `planHash`, `reviewer`, `evidenceHash`. External producers/receivers must actually be fenced for this manual assertion. Do not run a raw database writer alongside an approved maintenance window. Keep approvals/results outside the queue being pruned; lost caller responses can leave commit outcome unknown until inspected.

## 6. Optional automatic receiver-side retention

The receiver service now has a per-database, no-auto-steal process lease. Database identity, single-link/private permissions and lock ownership are checked before cooperating writes. The legacy independence CLI receiver shares this lease. This is cooperative local exclusion, not an OS security boundary against arbitrary privileged/raw SQLite processes.

Optional receiver config `retention` contains:

- `mode:"plan"` or `"apply"`;
- pinned policy/trust file paths and SHA-256 values;
- optional `intervalMs` (1 minute–30 days; default1 hour);
- optional `timeoutMs` (1–120 seconds; default30 seconds).

The policy must identify this exact database/target and `phase:"received"`. Apply mode additionally requires receiver `requireCohortReservations:true`; otherwise startup is rejected. The pinned standing policy is explicit continuing authorization. Nothing is automatically enrolled or configured by these source changes.

A unit starts only when no request is active, pauses new receive admission, checks process ownership/deadline, computes/verifies the policy plan, applies the bounded local transaction and resumes admission. Cross-request uploads remain protected by their generation reservations. Readiness can temporarily return503 during the pause. A busy receiver may postpone maintenance rather than aborting active requests.

Three consecutive maintenance failures disable this timer until service restart; logs/status report it. That failure counter is process-local, not a durable cross-restart circuit. Receiving can continue subject to ordinary queue capacity. SIGHUP still reloads credentials only; reservation/retention/listener/TLS changes require restart. Stop waits for an active retention unit to relinquish the store.

New lifecycle actions `receiver-lease-inspect` / `receiver-lease-recover` operate on `database`. Recovery requires the exact lock hash, reviewer/evidence, `writersFenced:true`, and `confirm:"REMOVE FENCED RECEIVER PROCESS LOCK"`. A crash does not authorize automatic stealing.

## 7. Rollout and compatibility boundaries

No rollout was performed. Before any separately authorized use:

- Compatible code must exist on both sides before enabling producer reservations. Older transport implementations do not understand the new prefixes.
- Keep reservations off by default until selected. Stop/fence legacy receiver writers before enabling a new single-owner service on the same database.
- Drain/migrate old multipart work explicitly before enforcing reserved commits. A legacy ready manifest is not silently rewritten or certified by this source.
- Enable reserved producers before requiring reserved receiver uploads; enable apply retention only with its pinned standing policy and appropriate packaging-bound actual restore receipts.
- Do not roll back to an older binary with pending new-format records and assume it can deliver them.
- Retain source ciphertext, independent keys, trust/approval evidence and at least the policy's recovery coverage. Namespace/domain labels alone do not establish actual independence.

Existing marketplace/Render/Turso/ULTCAT/SISE workflows are not selected/redeployed by these tools. No user wallet signer, funded action or live cutover is introduced.

## Remaining scope

All code in this pass is untested. This does not complete all-product backend parity/rebuild/activation, Worker/D1 work, workloads beyond documented limits, media retention, complete unattended attestation transport/scheduling, orphan reservation cancellation, metadata/result rotation, universal fencing, durable receiver-retention circuit history or actual independent-host acceptance. These remain explicit engineering/acceptance boundaries, not owner-testing substitutes or completion claims.

## Pass 46 continuation — unverified

Optional durable receiver-retention circuit state and explicit fenced inspect/reset tooling now exist in source. See `DURABLE-RECEIVER-CIRCUIT-RUNBOOK.md`. The legacy CLI receiver acquires its lease before database open. Existing recurring media maintenance now captures bounded no-follow source bytes, propagates fence loss on provider error, and verifies a repaired provider directly. No tests/builds/services/repairs/resets/deletions were run. Broader M1–M5 work remains incomplete and assistant-owned.

## Pass 48 source-only continuation

Added exact-plan, fenced local abandonment of uncommitted multipart reservations with shared-piece protection; committed uploads are rejected. Restricted legacy standalone spool pruning to exclude every multipart record family. Multipart reads/enqueue now use bounded descriptor-captured buffers; packing holds one no-follow descriptor across both hash passes. Durable receiver retention now precharges an attempt before maintenance, so an interrupted begun attempt consumes the failure budget. See `MULTIPART-ABANDONMENT-RUNBOOK.md`. No testing/builds/syntax checks/deletions/resets/services/network sends occurred. Remote cancellation, tombstones, automatic migration, universal fencing and wider M1–M5 completion are not claimed.
