# Recovery vault: local/mounted-filesystem adapter (Batch 15)

## Purpose and boundary
Extends Batch 14 encrypted unified backups with a separately keyed authenticated inventory, reviewed publication, explicit readback verification, and non-destructive retention advice. It does not provision a cloud account, turn Filebin into a private backup service, prove host independence, implement WORM, or delete/revoke artifacts or keys.

Use a private, trusted filesystem directory owned by the operator. Vault directories must not be group/world writable. Hostile same-user replacement of ancestor directories remains outside the threat model: final-component O_NOFOLLOW checks do not pin every ancestor. Storage confidentiality/access policy, disk quota, mount durability, filesystem hard-link/fsync support, backup encryption key custody and an independently stored vault ID/head are operational responsibilities.

## Environment and CLI
`npm run platform:vault -- COMMAND ...` accepts only explicit option/value pairs. Never pass key bytes as CLI arguments. Set RIFT_VAULT_CATALOG_KEY_FILE to an absolute private 32-byte file and RIFT_VAULT_CATALOG_KEY_ID to its non-secret identifier. Artifact operations also require RIFT_UNIFIED_KEY_FILE and RIFT_UNIFIED_KEY_ID. Artifact and catalog keys must differ. CLI reads private key files, clears its own key buffers, and reports stable reason codes rather than arbitrary error details.

1. Create an empty private directory. Run `init --vault ABS_PATH --confirm "INITIALIZE EMPTY RECOVERY VAULT" --approve CATALOG_KEY_ID --reviewer REVIEWER --evidence SHA256`. Save the returned vaultId independently. Initialization is not atomic across all mkdir/write/fsync steps: a failed partial setup must be inspected, never blindly reset over existing data.
2. Inspect with `inspect --vault ABS_PATH --vault-id VAULT_ID --head EMPTY` (or the last independently pinned head). Inventory authenticates receipt chaining and checks referenced file type/size; it does **not** read/decrypt every object. An omitted inspect head is diagnostic only, not rollback protection.
3. Create an encrypted unified backup using Batch 14. Run `plan --vault ABS_PATH --vault-id VAULT_ID --head PIN --source ABS_BACKUP [--work-dir PRIVATE_ABS_DIR]`; save only JSON output as a plan file. Review its file hash, backup ID, schema/projection commitment, vault identity and previous head.
4. Run `publish` with the same vault/ID/head/source, `--plan ABS_PLAN --confirm "PUBLISH VERIFIED ENCRYPTED ARTIFACT" --approve PLAN_HASH --reviewer REVIEWER --evidence SHA256`. Approval/checksums record reviewed intent, not identity authentication or a multi-person quorum. Trust the operator authorization boundary.
5. On success, independently pin the new returned head. Run `verify --vault ABS_PATH --vault-id VAULT_ID --head NEW_PIN --file-hash HASH`. This decrypts and validates the selected stored artifact and compares exact receipt commitments. Perform a separately reviewed restore drill on independent infrastructure before claiming off-host recovery acceptance.
6. `retention-plan --vault ABS_PATH --vault-id VAULT_ID --head PIN [--keep N] [--protect HASH,HASH]` returns retain/candidate-review lists only. No automatic deletion, retirement, key revocation or last-copy safety is implemented. Deleting referenced objects makes this append-only inventory incomplete, so do not execute deletions from this advice alone.

## Commit, concurrency and interruption
Exclusive `.writer-lock` directory serializes cooperating publishers. No lock timeout or automatic takeover exists: a stale lock requires operator inspection and proof the writer is stopped. Partial `.vault-work-*` directories and orphan encrypted objects are reported, never auto-replayed or auto-deleted. A publication copies to a private staging file, validates/decrypts the exact staged bytes, checks the reviewed plan again, links a content-addressed object without overwrite, fsyncs it, then exclusively links a signed receipt. Receipt publication is the commit point. Errors after commit or cleanup failures require inventory/head inspection; do not blindly retry against old evidence.

Artifacts/receipts are mode 0600 and directories created by this adapter are 0700. Catalog and object names expose hashes/IDs/sequence; receipt metadata is authenticated, not encrypted. Symmetric catalog-key holders can forge records. A valid-prefix rollback is detectable only with the independently pinned latest head; complete replacement additionally needs the pinned vaultId. No globally trusted timestamp or provenance is claimed. Catalog key rotation/multiple catalog generations and signed retirement remain future work.

## Bounds and limitations
256 receipts, 512 named objects, 1 MiB total catalog, 4096 bytes/receipt and the Batch 14 encrypted image cap. No unsupported directory/object layouts are silently accepted. Cancellation is cooperative, not a hard syscall/disk/time quota; publication is not cancelled into a false uncommitted result after receipt publication. Verification uses Batch 14 private plaintext scratch: normal cleanup does not guarantee secure erase, and abrupt termination can leave plaintext. Use encrypted protected working storage and a real quota. Retain independently verified local artifacts; public temporary export is not custody acceptance.

## Tests
`node --test checks/platform-recovery-vault.test.mjs` covers complete transfer/readback, separate keys, authentication/identity pins, rollback, tamper, missing objects, plan/source changes, concurrent writers, stale lock refusal, duplicates, verified orphan reuse, sequence/name/type/size bounds, advisory retention, cancellation and CLI redaction/key-file flow. These are controlled local tests, not independent security review, remote service acceptance or power-loss filesystem certification.

## Batch 16: bounded whole-vault audit

`npm run platform:vault -- audit --vault ABS_PATH --vault-id PINNED_ID --head PINNED_HEAD [--max-artifacts 256] [--max-bytes 1073741824] [--work-dir PRIVATE_ABS_DIR]`

Provide RIFT_VAULT_CATALOG_KEY_FILE / RIFT_VAULT_CATALOG_KEY_ID as before, plus RIFT_VAULT_AUDIT_KEYRING_FILE: an absolute **0600 JSON file** mapping non-secret artifact key IDs to absolute private 32-byte key-file paths. No raw key bytes, credentials or vault files belong in the public export. The keyring is capped at 64 KiB/256 entries. No dynamic provider lookup, network key service or fallback key guessing is implemented. Missing IDs return explicit unavailable results; unsafe/missing referenced key files produce failed checks. A key ID change across artifacts is supported, but catalog rotation is not implemented by this command.

The audit authenticates the pinned catalog before checking artifacts serially, resolves each artifact's exact key ID, decrypts and validates schema/projection/backup/file commitments, then inspects the same pinned catalog again. Key buffers allocated by the CLI and audit's temporary key copies are cleared in finally blocks; the API does not mutate resolver-owned original buffers. Keys are never placed in reports. Normal scratch cleanup and filesystem assumptions are unchanged.

- Exit **0**: non-empty catalog; every artifact verified; no observed stale lock, orphan object or interrupted work directory.
- Exit **2**: structured attention-required report: missing key, artifact failure, budget omissions, empty inventory or housekeeping warnings. This is not an invitation to delete anything.
- Exit **1**: command/identity/catalog/head/keyring inspection cannot proceed safely. Missing referenced objects and malformed/authentication-invalid catalogs stop inspection rather than yielding a seemingly complete partial inventory.
- Exit **130**: observed cooperative cancellation. A partial complete-looking audit is not returned.

Defaults allow 256 artifact attempts and a 1 GiB cumulative encrypted-byte allowance. Explicit policy bounds are 1–256 attempts and 1–64 GiB cumulative allowance. All attempted artifacts—including failed or unavailable keys—consume count/declared-byte budget. An artifact that cannot fit remaining budget is not checked and does not invoke the resolver; later entries that fit may still be checked. These are scheduling bounds, **not hard physical-I/O, disk-space, memory or time quotas**: verification may read/write more bytes internally, and no hard cancellation of an in-flight filesystem syscall/resolver is promised. Use a real storage quota and protected encrypted working area.

Reports include counts, per-artifact status, scheduling-budget accounting, observed issues, scope and a deterministic canonical SHA-256 reportHash. The report hash is an integrity commitment, not a signature, trusted timestamp, authorization or independent attestation. Independently pin/archive the report if needed. No key paths/raw error messages are reported.

**Not a point-in-time snapshot:** start/end pinned catalog checks detect observed catalog advances, but do not prevent arbitrary object mutation after that object was read, transient lock changes or hostile same-user swapping. Cooperating operator coordination and trusted directories remain required. A successful audit is local-copy verification, not certified off-host durability or application recovery acceptance.

## Batch 16: selected vault restore drill

`npm run platform:vault -- drill --vault ABS_PATH --vault-id PINNED_ID --head PINNED_HEAD --file-hash EXACT_HASH --work-dir PRIVATE_ABS_DIR --confirm "RUN ISOLATED VAULT RECOVERY DRILL" --reviewer REVIEWER --evidence SHA256`

Uses the normal RIFT_UNIFIED_KEY_FILE / RIFT_UNIFIED_KEY_ID for the selected artifact. Requires the exact review phrase/hash/reviewer/evidence, validates the catalog entry and stored artifact, performs the Batch 14 ephemeral quarantined restore drill, verifies projection/evidence preservation and job quarantine, and checks the original pinned catalog again. No live database is overwritten, no service is activated and no job/transaction is replayed. Temporary restored plaintext is removed normally before success; abrupt termination may still leave private scratch and secure erasure is not guaranteed. This can demonstrate a local ephemeral restore of a recorded copy, **not infrastructure independence, complete application lifecycle recovery or production failover readiness**.
