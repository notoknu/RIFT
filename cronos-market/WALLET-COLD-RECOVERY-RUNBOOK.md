# Wallet cold recovery and archive capacity — pass 42

**Implementation-only / unverified.** No commands below were run as part of this implementation pass. They describe newly added operational interfaces, not acceptance evidence. No production enrollment or cutover is authorized by this document.

## Entry point

`npm run index:recovery -- /absolute/private/config.json`

The command reads a bounded private JSON configuration, rejects unknown options, and emits structured JSON. Use the project's supported Node runtime with `node:sqlite` support. Configuration and key files must be regular files with no group/other permissions; final symlinks are not followed. Never put raw key bytes in the JSON, shell arguments, reports or logs.

Actions:

- `inspect-image`: `version:1`, `action:"inspect-image"`, `source` (absolute private SQLite image). Performs existing wallet schema/integrity/checkpoint/observation inspection. Does not verify canonical chain history or current ownership.
- `archive-capacity`: `version:1`, `action:"archive-capacity"`, `archiveDir` (canonical absolute private directory), optional `staleAfterMs`, `maxEntries`, `maxBytes`. Metadata-only bounded observation; no deletions or remote checks.
- `restore-cold`: fields described below. Explicitly writes a new cold database plus local receipt; it never activates it.

## Cold restore configuration

Required fields:

| Field | Meaning |
|---|---|
| `version` | `1` |
| `action` | `"restore-cold"` |
| `source` | Canonical absolute sealed archive path or authenticated multipart directory |
| `format` | `"sealed"` (default) or `"multipart"` |
| `target` | New canonical absolute cold SQLite pathname in an existing private directory |
| `keyFile` | Absolute private 32-byte decryption key file |
| `keyId` | Required for multipart, matching its authenticated manifest |
| `expectedArchiveSha256` | Independently retained lowercase SHA-256 of the whole encrypted archive, not a multipart piece |
| `expectedImageSha256` | Independently retained lowercase SHA-256 of the plaintext SQLite image |
| `confirm` | `"RESTORE WALLET INDEX TO NEW COLD FILE"` |

Optional `expectedCheckpointDigest` binds the inspected wallet checkpoints to a separately retained checkpoint digest. The archive producer returns these pins. Retain them outside the archive directory and outside the same failure domain; obtaining hashes from an untrusted archive immediately before recovery does not establish provenance.

## Publication behavior

1. Refuse an existing target, existing target recovery receipt, or existing `-wal`, `-shm` or `-journal` sidecar.
2. Create a private scratch directory under the destination parent.
3. For sealed input, open a private bounded regular input with no-follow semantics and copy/hash from that descriptor. For multipart, authenticate the manifest, enforce size/pin bounds, reassemble using the existing multipart helper, then descriptor-copy/hash the result.
4. Decrypt through the existing authenticated snapshot API, compare the required plaintext SHA-256, and inspect schema/integrity/checkpoints/observations. Check the optional checkpoint digest if supplied.
5. Flush the cold image and local receipt. Publish the image through an exclusive hard link, flush the parent, then publish `TARGET.recovery.json` through another exclusive hard link and flush again.
6. Remove this operation's scratch directory on ordinary exit.

The image and receipt are **not an atomic two-file transaction**. If a later flush/receipt/cleanup fails after image publication, the CLI reports `coldTargetPublished:true`. Retain the target for inspection; never retry by overwriting it. Process death may leave a cold image without a receipt or scratch files without a final image. Existing live paths must never be selected. Parent directories are private/trusted; sidecar checks are not a lock against another process opening the same target during publication.

The receipt is an unsigned local record, not a remote attestation or signature. Its returned SHA-256 can be retained independently. No chain reader, wallet signer, server process, scheduler enrollment or live-database swap is invoked by recovery.

## Archive capacity admission

Wallet-index and agreement-evidence archive jobs now perform a bounded local metadata inventory and filesystem-free-space preflight before creating capture scratch.

- Default local directory budget: 4 GiB.
- Optional maintenance runtime `maxArchiveBytes`: 128 MiB–64 GiB, committed through the existing runtime fingerprint.
- Conservative capture headroom: 100,794,368 bytes (approximately 96 MiB), covering several bounded image-sized artifacts.
- Existing 32 MiB image and 128 archive count ceilings remain separately enforced.
- Inventory defaults to 4,096 entries; it does not recurse arbitrarily. It traverses recognized capture/restore scratch and multipart directories within bounded depth.
- Unsafe/incomplete inventory, private-file violations, insufficient policy capacity or insufficient reported filesystem headroom stop archive admission.

This preflight is **not a capacity reservation**. Concurrent writers, filesystem quotas and subsequent errors can still cause failure. Multipart helper partials and abandoned scratch consume observed bytes; nothing is silently pruned. An unknown subdirectory can make inventory incomplete and block admission. Inspect and resolve explicitly rather than weakening checks without review.

Scratch `staleCandidate` is based on directory modification time. It is an observation only: neither age nor a filename proves the producer is dead. Do not delete an active capture. No automatic scratch deletion/retention policy is introduced. All Markdown/TXT and historical reports remain preserved.

## Recovery acceptance still outside this implementation

The code has not been executed in this pass. Live chain comparison, remote-host restore acceptance, availability under actual disk pressure, crash/power-loss behavior, target activation and full all-product rebuild equivalence remain unverified or unfinished. Discovery observations are not complete holdings, balances, escrow or portfolio accounting.

## Pass 43 integration note

`OPERATIONS-SUPERVISOR-RUNBOOK.md` describes newly implemented optional maintenance/delivery supervision and a transport-credential receiver service. Neither is started or installed. The cold recovery command remains separate: a receiver acknowledgement or an operationally healthy daemon does not authorize a live swap or attest remote restoration.

## Pass 44 integration note

`ATTESTED-RETENTION-AND-FENCED-RECOVERY-RUNBOOK.md` adds an explicit operational signer around actual pinned cold restoration. Wallet image inspection now also returns a stable admission digest over admitted addresses/start blocks. Signed receipts can gate a separately approved retention policy; a domain/stream label remains an operator assertion, not physical-host independence proof. No restore, signature/key generation, retention or cleanup was executed in this pass. Cold restoration still never performs a live swap.

## Pass 45 source-only continuation

See `AGREEMENT-AND-COHORT-LIFECYCLE-RUNBOOK.md` and report45 in `/home/user/RIFT-deliverables/`. Agreement cold recovery/operational restore attestations, agreement filesystem retention, reservation-aware multipart cohort row retention, receiver process leases and opt-in periodic receiver retention are now source-implemented, not executed or verified. This supersedes earlier blanket statements that those specific source paths do not exist. No tests/builds/restores/signatures/deletions/services/deployment occurred. Full M1–M5 completion is not claimed; pending uploads can pin capacity indefinitely, cooperation does not fence arbitrary writers, and broader parity/rebuild/media/lifecycle work remains assistant-owned.
