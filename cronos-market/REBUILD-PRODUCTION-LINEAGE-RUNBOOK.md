# Phase5 rebuild-to-production lineage — continuation62

## State
Bounded source implementation, unverified; Phase5 remains in progress. No new CLI, database capture, rebuild, source acceptance, production or inspection action was executed. No dataset, source approval or evidence of real operational success was fabricated.

This slice connects existing completed collection-rebuild maintenance records to captured images and the previous owned-data producer. It adds restart inspection, not a continuously running scheduler, atomic publication transaction or complete accounting pipeline.

## Capture API and CLI
`captureCompletedCollectionRebuild` in `server/rebuild-production-lineage.js` opens the existing maintenance database read-only. It requires an explicit completed collection-rebuild job ID, expected runtime fingerprint and two distinct absolute existing projection DB paths. The completed result must be REBUILD_PAIR_VERIFIED and contain an ownership digest.

For each source it uses the existing read-only projection capture path (schema/binding/row/byte/storage checks), requires the recorded target number/hash and no staged/pending scan rows, then recomputes the exact authoritative ownership digest framing used by collectionProjectionDigest. Covered tables: events, movement rows, token supply/document and positive holder rows, ordered identically with the same selected columns. Metadata is excluded from rebuild agreement, but remains part of each full captured image digest. Each captured authoritative digest must match the completed job result. The maintenance record is re-read and compared after both captures.

This is a local consistency/lineage check, **not independent chain correctness**. Two local files with the same content may still share acquisition errors. The explicitly supplied runtime fingerprint is compared to the job, not independently reconstructed from runtime configuration. Paths are selected explicitly; the check proves selected contents agree, not that a pathname had a particular historical role. Sequential snapshots plus an unchanged maintenance record are not a distributed fencing lock, and raw writers/file replacement races are not universally fenced. The captured immutable images, not later mutable DB state, are the production inputs.

Added `npm run owned:lineage -- /absolute/config.json` (not run). Capture config has exact fields:
- version:1, action:capture
- jobsPath: absolute existing private maintenance store
- jobId: existing completed job SHA256 identity
- runtimeFingerprint: expected reviewed runtime digest
- paths: two distinct absolute existing collection projection databases
- outputDirectory: absolute nonexistent directory in a trusted parent

Creates a private mode0700 directory, mode0600 exclusive files `image-0.json`, `image-1.json`, `lineage.json`, and `receipt.json` last. The manifest records job/version/runtime binding, target checkpoint, authoritative digest and both full image digests. Stdout includes the canonical manifestDigest for subsequent review/pinning, not source paths or wallet associations. Files are individually fsynced; there is no parent-directory fsync or atomic multi-file group. Partial directories are preserved and never overwritten. Capture uses existing10k-row/8MiB image bounds.

## Restart inspection
Same CLI accepts exact version:1, action:inspect, outputDirectory, manifestDigest. It requires a private existing output directory, reads bounded private single-link regular files without final symlinks, checks expected manifest pin, capture receipt and both full image pins, and recomputes authoritative ownership digest/checkpoint/binding agreement. Config64KiB, per image9MiB, aggregate20MiB. It writes nothing, opens no source DB and grants no fresh source approval. Missing/incomplete receipt is not automatically repaired or interpreted as success; retain the old directory for inspection and use a new directory for a new capture.

## Producer integration
The existing `owned:produce` config now accepts optional **paired** `lineagePath` and `lineageDigest`. Omitting both preserves the prior explicit accepted-image input path and does not invent rebuild lineage. Supplying only one rejects configuration.

The bounded lineage mode supports one collection input per produced dataset in this slice. The manifest has to match the reviewed canonical digest; the selected production image must equal one of the two captured image digests, its binding/checkpoint must agree and its authoritative digest must match the rebuild record. New source acceptance remains independently required by the existing producer and must bind the exact full image, with current confirmation/expiry checks. Capture does not automatically create acceptance or extend its expiry.

The validated summary (manifest digest, rebuild job/version and ownership digest) is embedded in the generated production evidence and receipt. Dataset raw-hashes that evidence, connecting served data back to the reviewed capture. A file hash pins content, not authorized authorship. A caller can forge assertions if it controls all artifacts/pins; this design is not a signature or remote attestation.

Production stdout now includes receiptSha256, the SHA256 of exact receipt file bytes. A separate read-only restart inspection is added to `owned:produce` with exact version:1, action:inspect, outputDirectory, receiptSha256. It checks the reviewed receipt pin, exact raw dataset/evidence hashes, current dataset shape/expiry and its evidence pin, then returns sanitized identity/expiry status. It does not repeat source approval, touch maintenance state, overwrite artifacts, retry writes or activate anything. Existing older production artifacts can be inspected if their exact raw receipt hash has separately been reviewed.

## What remains
This is durable artifact handoff with explicit replay inspection, not a transactional workflow engine. Automatic scheduler enrollment/lineage progression, resuming partially written files, recurring capture/approval/production, multi-collection lineage fan-in, complete ERC20/escrow/staking/bridge holdings and market monetary/window accounting remain open Phase5 work. Acquisition completeness, capacity/retention and unattended publication also retain Phase6/7 scope. No new live configuration, services, external credentials, signing authority or trade/spend permission is introduced.

Historical Markdown/TXT and snapshots are preserved. Wallet-only signing,1CRO ceiling and no unauthorized production activation remain unchanged. No tests/builds/syntax checks/runtime imports were performed.


## Continuation66 — Phase5 marketplace rebuild/accounting lineage (in progress)
Added completed paired marketplace rebuild to read-only image/digest capture for existing legacy/exchange-v2 models, receipt-last private artifacts and reviewed manifest/receipt inspection. Optional exact marketplace lineage now composes with source acceptance, timestamps, ownership lineage and exchange accounting in owned production; pinned evidence/receipts retain separate summaries. No new legacy economics or complete accounting claim. Four phases5–8 remain open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/capture/generation/approval/activation, no unattended session. See report66 and MARKETPLACE-PRODUCTION-LINEAGE-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.


## Continuation68 — integrated work across5–8; phase permission gate removed
User authorized cross-phase work without permission stops and brief reporting. Added multi-collection lineage fan-in, shared private/pinned source loading, deterministic resumable private production with receipt-last files/directory fsync/headroom and maintenance scheduling. Hardened shared receipt acquisition transaction-list/all-log/index/status checks and carried progress in admitted paths; exposed quorum error codes and deterministic sort ordering. Four packages5–8 remain open; complete holdings/acquisition/lifecycle/integration not claimed. Source only/unverified; no tests/builds/syntax checks/imports/operational CLI/RPC/generation/enrollment/activation. No deletion or signing/spend; preserve MD/TXT/snapshots, wallet-only signing and1CRO. See concise report68 and INTEGRATED-PRODUCTION-WORKFLOW-RUNBOOK.md.
