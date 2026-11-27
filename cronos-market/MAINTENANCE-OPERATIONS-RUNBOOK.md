> **Report40 update:** `CANDIDATE-COMPLETE-BLOCK-RUNBOOK.md` adds an explicit1024-event complete-block candidate receipt-stage/repository/journal/recovery/review path, v2 projection snapshots and complete-block narrowing in ordinary Node market/exchange indexes. The earlier statements that these Node paths necessarily stop at512 are historical for unselected/default profiles and superseded only where the new runbook explicitly admits the larger profile. Worker/D1 and declared workload/resource bounds remain separate.

> **Report39 extension:** `INDEPENDENCE-ADAPTER-AND-DENSITY-RUNBOOK.md` adds `marketplace-rebuild` jobs, explicit complete-block collection agreement, archive multipart acknowledgement status and reviewed outbound spool pruning. Collection density is no longer limited to512 when the separately bounded complete-block profile is selected; other stated512 limits remain where documented.

# Durable independence maintenance — bounded local operations

These are opt-in tooling and **uninstalled** service templates. Nothing here selects production, signs a transaction, provisions a host, grants spend approval or proves provider independence. Use Node >=22.13. Keep all configs/approval/key files private (0600) at absolute paths, all writable recovery directories private (0700). Do not put wallet keys in these files.

## Command and initialization

`npm run ops:maintenance -- /absolute/private/config.json`

Every command config has `version:1`. The CLI prints sanitized structured results; callers must inspect `reviewRequired` and each item, not assume exit zero means healthy replicas. Unknown errors are redacted.

- `{"version":1,"action":"init","database":"/var/lib/rift-recovery/jobs.sqlite"}` creates an absent private WAL/FULL-sync maintenance DB, never overwrites.
- `inspect` uses the same `database`, returns bounded current state/attempts/results. Claim tokens are omitted.
- `runtime-fingerprint` takes `runtimeFile` instead of a DB. It validates a runtime and outputs its exact fingerprint without opening live RPC clients, doing network work, or opening/migrating a delivery store.
- `enroll` takes `database`, `kind`, `spec`, and optionally `approvalFile`. Exact normalized specs below; unknown spec fields fail. Repeated enrollment is idempotent.
- `run` takes `database`, `runtimes` mapping runtime IDs to private runtime JSON paths, optional `maxJobs` (1–32, default4), `timeoutMs` (1–45000, default45000). Each call claims each due job at most once, not an infinite loop. Missed work remains durable. No service was enabled here.
- `review` takes `database`, `id`, `approvalFile` containing `{version,decision:"resume"|"pause",reviewer,evidenceHash}`. Version must match inspected state; evidenceHash is a SHA-256 commitment to operator's separately retained review evidence. This is explicit local operator authority, not a cryptographic multi-party approval system.

All specs contain `runtimeId` and `runtimeFingerprint` (64 lowercase hex). Actual execution compares the fingerprint before any task work. Fingerprints commit configuration, selected chain config contents and hashed credential/key material; endpoints/secrets are not printed in job results. Fingerprints are integrity commitments, not proof that administrators/providers are independent.

### Collection cold rebuild

First `rebuild-init` with `paths` (two distinct absent absolute SQLite paths) and `binding:{chainId:25,address,startBlock,standard:"ERC-721"|"ERC-1155"}`. Addresses in job specs must be lowercase. This never overwrites an index. Initialization can leave one created target if the second filesystem operation fails; inspect explicitly, do not reuse live targets.

Runtime JSON:

```json
{"version":1,"kind":"collection-rebuild","paths":["/var/lib/rift-recovery/a.sqlite","/var/lib/rift-recovery/b.sqlite"],"chainConfigFile":"/etc/rift/chain-read.json"}
```

The chain config is the existing explicitly selected quorum configuration including primaryId (see independence continuation runbook). Single-provider fallback is not permitted in this runtime.

Enroll kind `collection-rebuild` spec with runtime fields plus `binding`, `targetBlock` and exact `targetHash`. Choose a confirmed target, not a moving head. Each scheduled unit advances one lagging replica with independent header/event checks, resuming staged receipts where applicable. Once both reach the exact target, verify the independent checkpoint and stream-compare chain events, movements, tokens and balances plus token/owner/supply statistics. Schema/binding drift, fork differences and projection differences enter review. Nothing swaps active databases.

Bounds: 512 MiB per target on open, two million comparison rows; ordinary independent event acquisition retains its 512 matching-event limit. These are operational limits, not a complete solution to higher-density blocks. Metadata/traits are deliberately excluded from deterministic comparison. This is collection event/ownership/supply replay, **not** complete product marketplace statistics or adapter parity. Filesystem path aliasing and untrusted concurrent local writers are outside the cold-target contract; keep targets private and unused by other workers. Individual index commits are atomic; the pair is not a distributed atomic commit.

### Recurring media audit / explicitly approved repair

Runtime JSON:

```json
{"version":1,"kind":"media-maintenance","archive":"/var/lib/rift-recovery/media.car","timeoutMs":10000,"providers":[{"id":"a","failureDomain":"operator-a","apiUrl":"https://a.example","authorizationEnv":"RIFT_MEDIA_AUTH_A"},{"id":"b","failureDomain":"operator-b","apiUrl":"https://b.example","authorizationEnv":"RIFT_MEDIA_AUTH_B"}]}
```

Use real approved HTTPS Kubo-compatible operators, not example domains. Authorization references must start `RIFT_MEDIA_AUTH_`. Duplicate IDs/failure domains/declared API origins fail. Public-network guarded POST, CAR import, recursive-pin observation and CAR export are reused. Real operational independence still needs external evidence.

Enroll spec adds `root`, `archiveSha256`, `required` (2–5), `allowRepair`, `intervalMs` (60000–2592000000). Verify original archive digest and CID/DAG closure on every unit. Without repair authority, failed replicas produce attention status, never writes. Repair enrollment also requires a private approval file with `{"confirm":"ALLOW RECURRING CID REPAIR","archiveSha256":"<exact64hex>"}`. This can consume operator bandwidth/storage: only enroll after resource approval. No repair jobs were enrolled against real providers in this session.

Before each pin request persist an effect marker. A failed/unknown pin or expired claim with a marker enters review rather than automatic retry. Successful pin requests require actual cryptographically verified CAR readback. Adapters receive abort signals and timeouts, but an abort cannot undo an already sent provider request. CAR/archive limit is8 MiB. Readback proves bytes at that time, not retention SLA or future availability.

### Recurring agreement evidence encryption / outbox enqueue

Initialize agreement DB and durable outbox separately using existing independence commands. Create archiveDir privately before scheduling.

```json
{"version":1,"kind":"agreement-archive","source":"/var/lib/rift-recovery/agreement.sqlite","archiveDir":"/var/lib/rift-recovery/audit-archives","keyFile":"/etc/rift/audit-backup.key","keyId":"audit1","outbox":"/var/lib/rift-recovery/outbox.sqlite","targetId":"secondhost","maxTotalBytes":67108864}
```

Enroll spec has runtime fields plus `intervalMs`. Each unit captures a consistent SQLite backup, verifies the previous archived head/count as a prefix anchor, encrypts/authenticates, independently decrypts and verifies the exact captured head/count, then queues the sealed artifact. Larger artifacts use authenticated commit-last multipart transfer. The latest anchor is retained in the durable job result and returned for independent retention. An anchor kept only on the same host is not an independent trust root.

Snapshots are bounded at32 MiB; archive retention stops at128 sealed `.riftbak` files; outbox defaults64 MiB with an explicit supported maximum512 MiB. No automatic eviction or policy invention occurs. Capacity exhaustion enters review and needs an approved retention/export workflow. The first run has no prior independent anchor unless the caller supplies one through the programmatic archive function. Export/retain an initial trusted anchor before relying on truncation detection.

Scratch snapshots/decrypted checks live in private `.audit-capture-*` directories and are removed on ordinary completion/failure. SIGKILL/power failure can leave private plaintext scratch; no broad auto-deletion is performed. Inspect and securely handle these under the approved host policy. Local snapshot readback and queue receipts are **not remote acknowledgement**. Configure authenticated delivery/receiver separately; preserve remote receipt, restore and retention evidence externally. Archive is not WORM, audit is prepublication evidence rather than a commit certificate, and data is not auto-pruned from the live audit DB.

### Reviewed credential/runtime rotation

Get the new runtime fingerprint privately after changing credentials/config. `rotate-runtime` takes `database`, current job `id`, and a private approval file:

```json
{"version":2,"runtimeFingerprint":"<new64hex>","reviewer":"operator","evidenceHash":"<review64hex>","confirm":"ROTATE MAINTENANCE RUNTIME"}
```

Here `version` is the current **job CAS version**, not config schema version. The transaction creates a ready successor with the same approved work spec and new fingerprint, preserves prior archive anchor/result, and pauses the old job. It refuses duplicate successors, unchanged fingerprints, stale versions, running jobs and unresolved effect markers. Resolve uncertain effects through explicit evidence review first. Media root/archive/repair authority cannot be changed through this operation. Credential revocation at actual providers and host secret distribution remain owner-controlled actions; this local transition does not certify them. For archive key rotation, preserve older keys as required by approved recovery policy.

## Scheduling and restart

`ops/independence/rift-maintenance.service` / `.timer` are templates only. Match Node path, service user, directories, environment and configured per-run workload before installation. The240s service timeout accommodates the default four finite45s units plus overhead; increasing maxJobs requires reviewing this budget. Hard service termination while a repair is in flight intentionally results in review after lease expiry. Expired read/derived work resumes; stale claims cannot finish. Do not run against unfenced live collection targets. Logs/results are bounded and exclude arbitrary provider exception text.

Remaining engineering includes full product backend parity, all-product rebuild coverage, dense complete-block strategies above512 events, owner-approved retention automation and off-host acceptance/observability. Local tests are not a substitute for those implementations or real environment acceptance.
