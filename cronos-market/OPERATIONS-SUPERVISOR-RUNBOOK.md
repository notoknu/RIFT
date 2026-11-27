# Operations supervisor, credential receiver and dense wallet receipts

## Implementation status

Pass43 source implementation only: no tests, syntax checks, builds, daemon starts, receiver starts, network sends, job enrollment or deployment performed. These interfaces are unverified. Existing historical acceptance does not cover them. All service templates are uninstalled.

## Supervisor interfaces

`npm run ops:supervisor -- ACTION /absolute/private/config.json`

Actions: `describe`, `init`, `enroll`, `inspect`, `review`, `once`, `run`.

- `describe`: validate config and display normalized lane IDs/kinds/fingerprints; no credential reads or sends.
- `init`: exclusively create a private operations-state SQLite database. Does not enroll lanes or initialize existing maintenance/outbox databases.
- `enroll`: explicitly bind lanes to configuration fingerprints; existing mismatched bindings are rejected, not overwritten. Multi-lane enrollment is incremental, not atomic.
- `inspect`: inspect durable lane/circuit/lease metadata plus local delivery queue counts/logical-byte capacities. No payloads or raw keys are printed. Opening SQLite may create/update SQLite sidecars; this is not a read-only filesystem operation.
- `review`: approve resume or fingerprint replacement with expected version, reviewer, evidence hash and explicit confirmation. Review is never automatic.
- `once`: run one finite sequential cycle of due, enrolled lanes. This can perform explicitly configured archive/media operations and real HTTPS delivery; it is not a dry run.
- `run`: opt-in non-root repeating worker; re-read private configuration between cycles. SIGTERM/SIGINT stop admission and signal active work. There is no automatic initial enrollment or production activation.

### Main configuration

Top-level fields: `version:1`, absolute `database` (supervisor state), optional `pollMs` (1 second–1 hour, default5 seconds), optional `maintenance`, optional `deliveries` (array, maximum16). At least one lane is required. Unknown fields are rejected.

The operations database must be under a canonical private existing parent directory. Existing maintenance/outbox databases are separate schema-bound files and must already be initialized with their own tooling. Do not reuse any live product database as supervisor state.

A maintenance lane contains `id`, absolute maintenance `database`, `runtimes` mapping runtime IDs to absolute private runtime files, optional `maxJobs` (1–8, default4), `timeoutMs` (1–45,000, default45,000), `intervalMs` (1 second–30 days, default60 seconds). Existing maintenance jobs retain their own explicit enrollment, runtime fingerprints, leases and side-effect review semantics. Runtime secret changes require existing maintenance fingerprint rotation; rereading files does not bypass that gate.

A delivery lane contains:

- `id`, absolute `outbox`, `targetId`;
- public HTTPS `url`, exactly `/v1/backups`, with no credentials/query/fragment/nonstandard port;
- absolute private `keyFile`, `keyId`, lowercase SHA-256 `credentialSha256` of that 32-byte **transport authentication key**;
- integer epoch-millisecond `notBefore` and `expiresAt`;
- optional `timeoutMs` (default10 seconds, maximum60 seconds), `intervalMs` (default5 seconds), `maxTotalBytes` (4–512 MiB, default64 MiB);
- optional `maxFailures` (default8, maximum100), `baseBackoffMs` (default5 seconds), `maxBackoffMs` (default1 hour, maximum24 hours).

Each due delivery lane claims only its own target's ciphertext. One blob is attempted per lane per cycle. Separate lane credentials must never be wallet signing keys. The key is read and pinned on each attempt and its buffer is wiped on normal cleanup. Credential validity is checked before sending. Before-valid and expired/mismatched credentials pause the lane immediately for review; they are not silently adopted when a file changes.

### Durable state and retry semantics

The new operations state stores lane fingerprint, version, phase, failure count, next due time, lease token/expiry, outcome code and last review identifiers. It stores no raw secret or payload. There is a 64-lane bound. It is operational state, not an append-only forensic history: retain logs and approvals independently.

Failures use bounded exponential backoff; reaching the configured threshold pauses the lane. Credential policy failures and maintenance jobs requiring review pause immediately. A maintenance review pause stops that supervisor maintenance lane, including other jobs in it, until the operator resolves job reviews and explicitly resumes the lane. Other delivery lanes remain independently eligible.

`review` uses a private JSON document with `version:1`, absolute state `database`, `id`, and `approval` containing `expectedVersion`, new/current `fingerprint`, `reviewer`, `evidenceHash`, and `confirm:"RESUME REVIEWED OPERATIONS LANE"`. Review requires no unexpired lane lease. Retain the approval/evidence externally. New config plus reviewed fingerprint is required for deliberate delivery-key rotation.

On shutdown/interruption the current supervisor lease may be left to expire. Delivery queue tokens and idempotent receiver IDs separately protect replay. Leases rely on local clock/filesystem behavior, not distributed consensus or guaranteed cancellation of every dependency. A single long cycle can delay later lanes; execution is deliberately sequential and bounded by configured per-lane limits.

## Receiver service and key rotation

`npm run backup:receiver -- init|inspect|run /absolute/private/receiver.json`

`init` creates an empty receiver ciphertext store; `inspect` reports queue capacities without listening. `run` requires a non-root process and explicitly opens a listener. No invocation was made in this pass.

Receiver configuration fields:

- `version:1`, absolute existing receiver `database`, `targetId`;
- `host`: `127.0.0.1` for an approved local TLS reverse proxy, or `0.0.0.0` with explicit direct TLS;
- nonprivileged `port` (1024–65535);
- optional paired absolute private `tlsKeyFile`/`tlsCertFile`, required for `0.0.0.0`;
- optional `timeoutMs` (maximum60 seconds) and `maxTotalBytes`;
- `credentials`: one to three descriptors, each containing `keyId`, private `keyFile`, pinned `credentialSha256`, `notBefore`, `expiresAt`.

The loopback HTTP option is for a locally controlled HTTPS reverse proxy only. Sender transport still requires public HTTPS and performs existing DNS/public-address pinning. Proxy trust and actual host/firewall/TLS configuration are not installed by this source.

POST `/v1/backups` uses the existing authenticated bounded ciphertext protocol. GET `/healthz` reports only current readiness, not queue details or restore certification. Request concurrency is bounded to two across credential reloads. Credential validity is rechecked immediately before authentication/storage, so an upload admitted shortly before expiry can still be rejected at completion.

SIGHUP rereads and validates the private configuration and key pins, then swaps the ring. Listener/store/timeout/TLS descriptor changes require restart. Invalid reloads retain the prior ring; credential expiry still applies. Old rings retire, finish admitted requests and then best-effort wipe their cloned buffers. Use overlap windows while rotating sender and receiver. TLS file contents are not reloaded through SIGHUP; restart for certificate renewal.

The receiver has no decryption keys by protocol requirement, but the operator must actually maintain separation; this source cannot establish off-host custody. Acknowledgement means ciphertext accepted into the receiver store, **not** decryption, independent retention or remote restore acceptance. Queue capacity remains bounded; no automatic receiver deletion is introduced.

## Uninstalled service templates

- `deploy/user-services/rift-operations.service`
- `deploy/user-services/rift-backup-receiver.service`

These opt-in user-service templates assume code under `%h/cronos-market`, private config under `%h/.config/rift`, and writable operational data under `%h/.local/share/rift`. They specify restrictive umask, bounded restart policy, memory/task limits and a read-only filesystem except the data directory. Node must satisfy the project runtime. Paths, platform/user-namespace support, resource ceilings and shutdown timings require environment-specific selection. They are not installed, enabled or validated here. No existing Render/Turso hosting behavior is replaced.

## Opt-in dense wallet complete-block receipts

`completeBlockEvents:true` in the existing private chain-read configuration now also exposes `readWalletCompleteBlock` through the configured reader.

New `server/wallet-block-receipts.js` enumerates every receipt for each transaction advertised in one block, with a 256-transaction / 8,192-total-log / 8 MiB-total-log-content ceiling. It validates receipt positions/status/fork bindings, checks contiguous global log indexes, detaches log fields, filters cross-contract wallet standard-transfer observations, and rechecks the block/list after enumeration. Work has a cancellation/deadline and explicit RPC-call budget.

Independent provider sets compare block hash, advertised transaction-list digest and canonical wallet-event digest. The scanner uses this method for single-block independent scans when available, retaining header/ancestry verification and conditional database publication. A paired rebuild that gets the explicit ordinary event-count/content-byte/decoded-row overflow can retry a one-block receipt unit; other disagreement/decode failures are not blindly retried as a downgrade.

Ordinary range queries retain their 512-events-per-selector bound. Complete-block mode is not enabled by default. Decoded observation expansion remains bounded at8,192; an ERC-1155 batch can exceed that even with fewer logs. Bigger blocks fail closed. Truncated getLogs responses are not automatically detected in ordinary range mode. Provider-advertised transaction/receipt agreement is **not a trie proof, consensus/finality proof, or exhaustive holdings discovery**.

## Remaining implementation boundaries

No automatic archive retention/deletion, safe crash-time scratch reclamation, full all-product rebuild/activation, unlimited dense acquisition or complete Worker/D1/backend parity is claimed. These remain assistant engineering work. Real host/provider selection, credentials, budget and production authorization remain user-controlled. No funded transaction/signing path was added.

## Pass 44 integration note

See `ATTESTED-RETENTION-AND-FENCED-RECOVERY-RUNBOOK.md`. New unverified `retentions` lanes can plan or explicitly apply a pinned standing wallet-archive retention policy. A successful pinned cold restore can produce an operational Ed25519 attestation; retention checks the public signer/stream/admission/failure-domain bindings and protects at least two distinct attested image groups. Participating wallet/agreement captures and retention now share a no-auto-steal writer lock. Retention uses a durable deletion-intent journal; abandoned locks, interrupted journals and stale scratch require the documented explicit recovery approvals. No lane/policy/key was created or run. This supersedes the blanket pass43 statement that no archive-retention source exists, but does not claim generic/all-product retention or automatic crash reclamation is complete.

## Pass 45 source-only continuation

See `AGREEMENT-AND-COHORT-LIFECYCLE-RUNBOOK.md` and report45 in `/home/user/RIFT-deliverables/`. Agreement cold recovery/operational restore attestations, agreement filesystem retention, reservation-aware multipart cohort row retention, receiver process leases and opt-in periodic receiver retention are now source-implemented, not executed or verified. This supersedes earlier blanket statements that those specific source paths do not exist. No tests/builds/restores/signatures/deletions/services/deployment occurred. Full M1–M5 completion is not claimed; pending uploads can pin capacity indefinitely, cooperation does not fence arbitrary writers, and broader parity/rebuild/media/lifecycle work remains assistant-owned.
