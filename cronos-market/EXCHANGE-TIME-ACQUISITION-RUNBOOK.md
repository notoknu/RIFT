# Phase5 resumable quorum timestamp acquisition — continuation65

## State and execution boundary
Implemented source only, unverified. No RPC, CLI, maintenance job, capture, artifact generation, service, source approval, dataset production or activation was executed. No tests/builds/syntax checks/runtime imports were run. No five-hour unattended agent/session was started or promised. Phase5 remains in progress.

This replaces the prior missing **timestamp acquisition implementation** with automatic, resumable finite work. It does not automatically approve its own source evidence, publish it or grant settlement authority.

## Timestamp-aware quorum
`createChainReadQuorum` now exposes `readTimedCheckpoint(number)` in addition to the existing `readCheckpoint(number)`. Standard checkpoint results preserve their existing shape/semantics. Timed reads additionally require a positive safe-integer Unix-second timestamp no later than local now. Provider identities compare hash, parent hash and timestamp. Successful contradictory observations are rejected, including stale-head successes, rather than silently outvoted. Wrong-chain, invalid-block/timestamp and timeout observations cannot count toward quorum. Existing2..5 distinct configured failure-domain identities, quorum and head-lag policies remain in force. `openChainReadQuorum` forwards timed reads and enforces its existing closed-reader guard.

This is provider agreement, not independent failure-domain attestation or cryptographic header verification. A matching block hash/timestamp claim is not independently recomputed against a raw header. Configured distinct provider domains may share infrastructure. Local clock skew can reject otherwise valid timestamps. Per-provider Promise-race deadlines do not universally cancel in-flight transport work.

## Source and durable plan
`server/exchange-time-acquisition.js` validates an existing bounded exchange image using the newly exported shape-only `validateProjectionImage`. This checks schema/binding/image bounds, not source acceptance or chain completeness. It derives exactly the event-block hash set plus the pinned checkpoint and rejects conflicting/out-of-range hashes.

Initialization creates an exclusive private directory and fsynced `plan.json`, binding:
- canonical image digest and target checkpoint/hash set;
- canonical normalized provider-policy digest (including configured provider details, not printed URLs);
- creation and fixed expiry, lifetime1minute..24hours.

It does not create provider adapters or perform network reads. Final timestamp evidence remains `rift-exchange-time-evidence-v1`, directly compatible with continuation64 accounting. Source acceptance must later review/pin it; initialization is not source approval.

## Finite acquisition and restart
Each advance unit attempts at most1..32 **new** samples within a cooperative deadline up to45seconds; default16. Existing samples are checked and reused. For each new block it asks the configured timed-checkpoint quorum, requires exact image hash agreement and minimum observed head at least the target checkpoint+12, validates provider IDs/count and timestamps, then writes an exclusive fsynced `block-<number>.json`. Samples record sanitized provider identities, parent/hash/time, observed head, plan digest and capture time. No endpoints or credentials are logged.

All samples must be present and timestamps nondecreasing before `timestamps.json` is finalized. Receipt is written last, pinning the exact canonical evidence and all sample digests, policy and plan. Evidence expiry stays fixed to the plan rather than extending on every retry. Successful completion says **captured-awaiting-source-review**, sourceApproved:false, verified:false and activated:false.

A crash after complete evidence write but before receipt can resume: only exact existing evidence content with an admissible original generation time is reused. Existing complete receipts must match exactly. Partial/truncated sample/evidence/receipt files, altered plans, changed images/policies, expired plans or hash disagreement fail for review; no file is overwritten, silently repaired or deleted. Use a separately reviewed new directory for a new plan. Concurrent writers are not globally locked: exclusive-file conflicts fail safely, but do not establish distributed transactional execution. Trusted parent directories remain required.

Private file admission: absolute paths, final-component O_NOFOLLOW, regular singly-linked files, mode0600-compatible restrictions, bounded reads and post-read size/mtime/ctime checks. Root directory must be private and nonsymlink. Per-file fsync is not parent-directory fsync or atomic multi-file publication. Plan/evidence caps2MiB, sample cap8KiB on read, receipt cap1MiB, maximum10001 blocks inherited from10k-row image bounds. Resuming can scan existing samples; deadlines are cooperative, not a hard whole-process I/O cancellation guarantee.

## CLI
Added `npm run time:evidence -- /absolute/config.json` (not run).

All commands require version:1 and an exact action-specific configuration:
- **initialize:** action, directory, imagePath, chainConfigPath, lifetimeMs.
- **advance:** action, directory, imagePath, chainConfigPath, planDigest, maxSamples, timeoutMs.
- **inspect:** action, directory, planDigest, receiptDigest.

Image/config inputs are private existing absolute files, max9MiB and16KiB respectively. Chain policy uses the existing parseChainReadConfig contract, chain25,2..5 configured providers and timeoutMs no more than10seconds. Policy normalization is hashed and compared on every advance. Only advance constructs ethers read-only RPC adapters. It exposes no wallet, signing, transaction submission or arbitrary RPC method interface. Provider URLs are explicit trusted operator configuration; this path does not add a DNS/IP egress sandbox or authorize a host/provider selection on the user's behalf.

Inspection performs no RPC and writes nothing. It checks reviewed plan/receipt pins, exact evidence/sample hashes and checkpoint timestamp sequence/expiry. It does not renew evidence, reapprove source truth or repair partial files. The receiptDigest is canonical projectionPublicationHash, not raw-byte SHA256. Completion stdout supplies timestampEvidenceHash and receiptDigest for separate review. This is distinct from the raw SHA256 production receipt format in owned:produce.

## Existing maintenance scheduler integration
Added job kind `exchange-time-acquisition`, supported by existing maintenance enrollment, finite runner and runtime-fingerprint CLI.

Exact job spec: runtimeId, runtimeFingerprint, planDigest, providerPolicyDigest, maxSamples. All digest fields are lowercase SHA256; maxSamples1..32. Runtime fingerprint must match the opened runtime as for existing jobs.

Exact runtime config: version:1, kind:exchange-time-acquisition, directory, imagePath, chainConfigFile. Fingerprint commits the runtime config, full canonical image digest and normalized provider-policy digest. Inspect-only fingerprinting reads/validates files but does not create adapters. Running opens the timed reader with the same policy and existing resource cleanup path.

A maintenance unit guards its cooperative claim around acquisition/writes. Progress is ready with a1second delay; complete records TIME_EVIDENCE_CAPTURED_AWAITING_REVIEW, never a source-approval claim. Complete evidence can be re-inspected/resumed after a lost finish record without rewriting it. Existing lease/version checks, review behavior and unknown outcomes remain in force; raw filesystem writers are not fenced. Files are derived local evidence, not remote side effects or trading transactions.

A host still has to invoke the finite maintenance runner on its authorized cadence; no daemon, cron job, deployment, enrollment or long-running session was installed here. An empty/unconfigured runtime is not treated as running. This is automatic per-job acquisition implementation, not a claim of an active unattended service.

## Approval/production handoff and remaining work
After capture, a real separately reviewed exchange source acceptance must include the emitted timestampEvidenceHash among its evidenceDigests, bind the same image and have acceptedAt no earlier than timestamp document generation. Existing time admission also caps timestamp expiry at acceptance expiry, so policy/review must be consistent. Acquisition never invents or rewrites that approval. The existing optional timestampEvidencePath/hash descriptor then supplies owned production; malformed/absent supplied artifacts follow the previous fail-closed/null contracts.

Still open Phase5: complete holdings/ERC20/escrow/staking/bridge accounting, applicable legacy economics, automatic reviewed workflow progression/fan-in, marketplace paired-rebuild linkage, and production/publication integration. Phase6 acquisition completeness is not solved by sampled header agreement. Phase7 unattended capacity/retention/credential lifecycle and Phase8 integration defects remain open. Wallet-only signing,1CRO ceiling, no unauthorized production/trading/spend activation and historical Markdown/TXT/snapshot preservation are unchanged.
