# Attested wallet retention and fenced archive recovery — pass 44

## Status

Source implementation only, unverified and inactive. No tests, syntax checks, builds, key generation, restores, attestations, retention runs, cleanup, service starts, enrollment, network delivery or deployment were performed in this pass. Commands below document interfaces, not actions already executed.

## Entry point

`npm run archive:lifecycle -- /absolute/private/config.json`

Every configuration has `version:1` and an `action`. Config/private inputs are bounded regular private files read without following their final symlinks. Unknown action options are rejected. No production policy or real credential file is supplied by this implementation.

Actions:

| Action | Purpose |
|---|---|
| `attestor-keygen` | Explicitly generate a new operational Ed25519 keypair into new private files |
| `attest-wallet-restore` | Perform a real pinned cold restore and sign its inspected result |
| `retention-plan` | Produce a deterministic bounded selection without deleting artifacts |
| `retention-apply` | Recompute an approved plan, journal intent and remove selected wallet ciphertext bundles |
| `retention-journal` | Inspect a pending retention journal and its SHA-256 |
| `retention-resume` | Resume that exact journal after explicit review |
| `lease-inspect` | Inspect a held/abandoned archive writer lock, including malformed-owner lock hashes |
| `lease-recover` | Remove the exact lock only after a caller assertion of external writer fencing |
| `scratch-plan` | Inventory old, recognized private scratch contents for exact approval |
| `scratch-apply` | Remove only those pinned scratch files after explicit external fencing approval |

## 1. Cooperative archive writer lock

Wallet and agreement archive capture now use an exclusive private `.rift-archive.lock`. Retention and scratch operations share it. The lock identifies its nonce, PID, operation and creation time, but **neither PID nor age is sufficient to steal it**. Guard calls check the original lock identity/content before bounded publication work. The lock is released on ordinary completion/failure.

A crash can leave a lock, including a partially written owner record. `lease-inspect` reports a bounded raw lock hash even if the owner JSON is invalid. `lease-recover` requires `archiveDir` and a private `approvalFile` whose object contains:

- `confirm:"REMOVE FENCED ARCHIVE LOCK"`
- `writersFenced:true`
- exact `lockSha256` from inspection
- `reviewer`, `evidenceHash`

Fencing must actually stop/prevent all relevant writers externally. This code cannot prove that assertion. No age-based automatic lock stealing is implemented. Do not remove a lock while its process is merely slow or paused. The protocol serializes participating operations, not arbitrary other filesystem writers or disk users.

A pending `.rift-retention-journal.json` blocks new participating captures, plans and scratch cleanup. Resolve the exact journal first; do not recreate deleted archive names during interrupted retention.

## 2. Operational attestor key

`attestor-keygen` accepts `privateKeyFile`, `publicKeyFile`, and `confirm:"CREATE OPERATIONAL ED25519 ATTESTOR KEY"`. Parents must be private/canonical. Targets must be new and distinct. It writes a PKCS8 DER private key and SPKI PEM public key, and returns the private-file SHA-256 pin and public key. It never prints raw private key bytes. Partial publication is reported if the private key was written before a later failure; retain and inspect it rather than retrying with overwrite.

This key is **not a wallet signing key**. Key buffers are wiped in ordinary cleanup where owned, but runtime KeyObjects/copies, OS memory and crash dumps are not guaranteed erased. Keep operational recovery credentials separate from production and user wallet secrets.

## 3. Signed actual cold restore

`attest-wallet-restore` requires:

- `confirm:"RESTORE COLD WALLET AND SIGN OPERATIONAL ATTESTATION"`
- `restore`: existing cold-recovery fields (`source`, optional `format`, new cold `target`, private decryption `keyFile`, multipart `keyId` if needed, independently retained `expectedArchiveSha256`, `expectedImageSha256`, optional `expectedCheckpointDigest`)
- `issuer`, `recoveryDomain`, `targetId`, `streamId`
- private `signingKeyFile`, its `signingKeySha256`, optional `validForMs` (1 minute–30 days, default7 days)
- absolute `output` named exactly `ARCHIVE_SHA256.restore.json` in a private canonical directory
- optional `replaceExpectedSha256` when deliberately replacing an existing attestation with the exact inspected old byte hash.

The implementation first executes the existing pinned cold restore and validates its wallet image. Only then does it sign a domain-separated Ed25519 statement binding ciphertext/image hashes, actual admission/checkpoint/observation digests, counts, stream/target identity, issuer, declared recovery domain and validity period. A failed publication can leave the valid cold target in place; errors report `coldTargetPublished`.

The stable admission digest covers the sorted admitted wallet addresses/start blocks. `streamId` is an explicit operator namespace for one backup source; do not reuse it across unrelated sources. A signed domain/stream label is an operator assertion, not proof the process ran on another physical host. Real signer custody and source/recovery-domain separation must be controlled independently.

Transport acknowledgement is not a restore attestation. The archive writer/sender needs no attestation private key. Retention verifies with public keys only. No new wallet-signing authority is introduced.

## 4. Trust and standing retention policy

Private trust JSON: `version:1`, `attestors` array (1–8). Each trusted descriptor contains `issuer`, `recoveryDomain`, `streamIds` (1–32 authorized source namespaces), SPKI PEM `publicKey`, and integer epoch-millisecond `notBefore`/`expiresAt`. Issuers must be unique. Receipts must fit the trusted key's interval and permitted stream.

Private policy JSON fields (all required):

- `version:1`, `policyId`
- canonical private `archiveDir`, `attestationsDir`
- `targetId`, `streamId`, `admissionDigest` (64 lowercase hex), `sourceRecoveryDomain`
- `keepLatest` (2–32 **distinct plaintext image groups**)
- `minAgeMs` (1–365 days)
- `maxDelete` (1–8 archive bundles per unit)
- `maxScanBytes` (32 MiB–8 GiB)
- `maxAttestationAgeMs` (1 minute–30 days)
- `reviewer`, `evidenceHash`
- `confirm:"ENABLE ATTESTED WALLET ARCHIVE RETENTION"`

Policy and trust files are each pinned by SHA-256 in the lifecycle configuration/lane. Changing them requires an explicit updated lane fingerprint/review, not silent adoption.

### Selection rules

Only exact `wallet-index-IMAGE_SHA256-KEY_ID.riftbak` artifacts are considered. Each eligible artifact must have a current trusted receipt at `attestationsDir/CIPHERTEXT_SHA256.restore.json` matching its actual captured ciphertext hash, filename plaintext pin, target, stream and admission digest. The declared recovery domain must differ from the policy's source domain. Missing/invalid/expired/unrelated receipts are skipped, not grounds for relaxed deletion.

Newest distinct attested plaintext-image groups are chosen by local archive mtime, with lexical tie-breaking; all eligible artifacts in the protected groups are excluded. Older attested groups are eligible only after minimum age, subject to scan/delete bounds. Modification time is local policy ordering, not independently proven snapshot chronology.

A journal pins at least one whole encrypted archive for each protected image group. Those whole archives are rehashed before initial execution or reviewed journal replay. Losing/changing protected ciphertext blocks further journal execution. The protected archive check does not guarantee continued decryption-key custody, remote retention or current chain correctness.

A flat multipart directory is bundled only if it contains at most87 recognized `.part`/manifest files. Every selected file is individually pinned. Unknown content, symlinks, nonprivate files or hardlinks stop the affected operation. No Markdown/TXT, live SQLite databases, receiver rows or sender outbox rows are selected. Agreement-evidence archives are **not** eligible under this wallet-specific policy.

## 5. Plan, apply and interrupted execution

`retention-plan` config supplies `policyFile`, `policySha256`, `trustFile`, `trustSha256`. It returns selected/protected artifacts, skipped reasons, resource observations and `planHash`; no ciphertext is removed.

`retention-apply` uses the same fields plus exact `planHash` and `confirm:"APPLY ATTESTED WALLET RETENTION"`. It recomputes the plan under the shared archive lock and refuses a changed hash.

Before unlinking anything it publishes a flushed journal containing exact bounded paths/byte hashes and protected whole-archive pins. Each file transitions through pending → durable intent → unlink/parent sync → durable done. Replay permits missing files only after intent/done; changed/reappeared files stop execution. Multipart directories are removed only when empty, never recursively. A durable result receipt is retained before the journal is removed.

The operation is **not an atomic multi-file deletion**. An interruption can leave some ciphertext files removed and others present. The journal is the recovery record; the lock may also require separately approved fenced recovery after a crash.

`retention-resume` requires `archiveDir` and an approval file containing `confirm:"RESUME APPROVED WALLET RETENTION"`, exact `journalSha256`, `reviewer`, `evidenceHash`. Resume rechecks protected archive pins and remaining byte pins; it does not silently create a new selection or reset the initial policy. Review must consider current retention/key custody before authorizing continuation. It does not reissue fresh remote attestations or re-evaluate all initial trust expiries. Corrupted journals/result receipts fail closed and can require manual artifact investigation.

## 6. Optional recurring supervisor lane

The existing operations config now supports `retentions` (up to8 lanes). A lane contains:

- `id`, explicit `mode:"plan"` or `mode:"apply"`;
- `policyFile`, `policySha256`, `trustFile`, `trustSha256`;
- optional `intervalMs` (1 minute–30 days, default1 hour);
- optional `timeoutMs` (1–300 seconds, default120 seconds).

The lane must be explicitly enrolled. An apply lane plus the pinned standing policy is continuing deletion authorization for that exact bounded selection algorithm; do not enroll apply mode merely to observe. Plan mode never removes ciphertext. Each apply unit still recomputes/verifies its plan, takes the archive lock and uses journaled deletion. Policy/trust pin changes or a pending journal cause an immediate supervisor pause. No lane or policy was enrolled here.

## 7. Fenced scratch reclamation

`scratch-plan` uses `archiveDir`, optional `minAgeMs` (minimum1 day), optional `maxDirectories` (1–8). It considers only recognized immediate `.wallet-capture-XXXXXX`, `.audit-capture-XXXXXX`, `.wallet-restore-XXXXXX` names and known scratch SQLite/sidecar/manifest/ciphertext/recovery-receipt filenames. Unknown files/subdirectories, links, hardlinks or resource overflows fail closed. Scan bytes are bounded to512 MiB. Omitted directories are reported.

`scratch-apply` adds a private approval file with `confirm:"REMOVE FENCED PRIVATE ARCHIVE SCRATCH"`, `writersFenced:true`, exact `planHash`, `reviewer`, `evidenceHash`. It rehashes selected files, unlinks only approved filenames, flushes directories and uses nonrecursive empty-directory removal. Failure reports partial file/directory counts. Scratch cleanup is not journaled; a partial cleanup needs a new exact plan and approval.

Age is not liveness evidence. Existing cold targets hard-linked to a restore scratch file can make its link count greater than one; the tool refuses rather than guessing. Do not circumvent that check without reviewing the actual cold target.

## Remaining scope

All paths above are untested. No physical host independence, remote receipt delivery, real restore acceptance, disk-loss durability, automatic sender/receiver-row retention, agreement-archive retention, attestation scheduling, metadata-result rotation, full backend parity or all-product rebuild activation is established. Those are separate implementation/acceptance boundaries, not completion claims. No user wallet signing or funded transaction path is added.

## Pass 45 source-only continuation

See `AGREEMENT-AND-COHORT-LIFECYCLE-RUNBOOK.md` and report45 in `/home/user/RIFT-deliverables/`. Agreement cold recovery/operational restore attestations, agreement filesystem retention, reservation-aware multipart cohort row retention, receiver process leases and opt-in periodic receiver retention are now source-implemented, not executed or verified. This supersedes earlier blanket statements that those specific source paths do not exist. No tests/builds/restores/signatures/deletions/services/deployment occurred. Full M1–M5 completion is not claimed; pending uploads can pin capacity indefinitely, cooperation does not fence arbitrary writers, and broader parity/rebuild/media/lifecycle work remains assistant-owned.
