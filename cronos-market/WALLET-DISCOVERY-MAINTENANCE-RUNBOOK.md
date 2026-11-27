# Wallet discovery maintenance — implementation pass 41

Status: source implementation only, UNTESTED. No syntax checks, tests, builds, network acceptance, archive execution or deployment performed in this pass. Do not treat report40 acceptance as coverage of this source.

## Components

- `server/wallet-event-quorum.js`: bounded cross-contract standard-transfer query agreement, with separately identified provider failure domains, chain/head/block checks and canonical response digests. This is provider response agreement, not a cryptographic completeness proof.
- `server/index-worker.js`: configured chain access, bounded reads, cancellation, optional independent event/header agreement, deduplication and conditional checkpoint updates. Unconfigured operation retains single-provider mode; it is not independently verified.
- `server/index-store.js`: admitted-address validation, bounded observation publication, transaction-local expected-state comparison and optional synchronous publication guard. No schema migration.
- `server/wallet-rebuild.js`: explicit two-path cold initialization and finite fixed-target paired discovery rebuilds; maintenance lease checks are passed through to publication. Pair comparison includes observation digest and candidate/contract statistics. No live activation.
- `server/wallet-index-archive.js`: bounded private online SQLite capture, exact schema/integrity/observation inspection, AES-256-GCM encryption through existing snapshot functions, decrypt/readback verification, and existing durable outbox/multipart enrollment.

## Runtime integration

Existing maintenance CLI (`scripts/maintenance-ops.js`) now accepts `wallet-rebuild` and `wallet-index-archive` runtime kinds. Read that script for the complete existing operations envelope; do not run these instructions against production as an acceptance procedure.

A wallet rebuild runtime uses `version:1`, `kind:"wallet-rebuild"`, two distinct absolute `paths`, and a private `chainConfigFile`. Use `runtime-fingerprint` to bind the runtime before explicit enrollment. The normalized maintenance spec includes `runtimeId`, `runtimeFingerprint`, lower-case `wallet`, `startBlock`, `targetBlock`, and lower-case `targetHash`. `wallet-rebuild-init` creates cold targets only, and must not point at live databases. Runtime fingerprint and job spec must agree. Target history must be available and sufficiently confirmed.

A wallet archive runtime uses `version:1`, `kind:"wallet-index-archive"`, absolute `source`, `archiveDir`, `outbox`, `keyFile`, `keyId`, and `targetId`; optional outbox `maxTotalBytes`. The source, archive directory and key must satisfy private-file checks. The existing outbox must already be initialized. Its normalized job spec contains `runtimeId`, `runtimeFingerprint`, and `intervalMs` (60 seconds–30 days). Enrollment is explicit, not automatic. `archive-delivery-status` accepts this runtime kind as well as agreement archives. Archive enrollment does not start a remote delivery worker.

## Bounds and operational limitations

- Independent event query: at most 32 blocks and 512 logs per selector; scanner default independent ceiling 16 blocks. Four selectors cover incoming/outgoing Transfer and TransferSingle/TransferBatch.
- Wallet observation publication: at most 8,192 decoded rows per scan. An oversized single block fails rather than advancing an incomplete checkpoint.
- Archive image: 32 MiB; at most 1,000 wallets and 2,000,000 observations inspected. At most 128 `.riftbak` files in archive directory; capacity exhaustion stops creation, not silent pruning.
- Small archives are directly enqueued; larger ones use existing authenticated multipart manifests. Outbox capacity remains an independent hard limit. Local readback is not remote acceptance or a remote restore drill.
- Normal completion/failure removes private scratch images; process crashes/power loss can leave scratch. No new crash-time scratch recovery or retention automation is claimed.
- Candidate discovery is not exhaustive token enumeration or current holdings/balances. Nonstandard tokens, missing/pruned history and mint/accounting rules remain outside this assurance.
- No signing keys, signing authority, broadcasts, live cutover or trading are introduced.

## Before use

This pass intentionally omits execution verification at the user's request. Source integration review alone cannot establish runtime correctness. Keep the new paths inactive until separately authorized validation and operational acceptance. Preserve source databases, historical reports and recovery keys; never point initialization at existing live files.

## Pass 42 integration note

See `WALLET-COLD-RECOVERY-RUNBOOK.md` for the new explicit sealed/multipart cold recovery command and read-only capacity inventory. Both wallet and agreement archive jobs now require a bounded, private/canonical local inventory and conservative filesystem headroom before capture. Optional `maxArchiveBytes` is part of archive runtime configuration (default 4 GiB; accepted 128 MiB–64 GiB). This is admission control, not automatic retention or a concurrent-writer space reservation. These changes are also untested; report41 predates them.

## Pass 43 integration note

See `OPERATIONS-SUPERVISOR-RUNBOOK.md`. Added an opt-in durable supervisor for existing maintenance jobs and target-scoped delivery, credential-window/pin checks, reviewed circuit resume, and an explicit receiver service with overlapping credential reload. Also added opt-in wallet complete-block receipt agreement: `completeBlockEvents:true` allows single-block scans above the ordinary 512-per-selector range ceiling, bounded by 256 advertised transactions, 8,192 total block logs, 8 MiB encoded log content and 8,192 decoded observations. Known ordinary count/byte/row overflow can trigger a one-block paired-rebuild retry; consensus/decode failures are not blindly downgraded. These changes are untested and inactive, not coverage supplied by earlier reports.
