# Phase 2 — Current recovery-artifact revalidation

## Status

Implemented in source only, unverified and inactive. No tests, builds, syntax checks, revalidation commands, database inspections, checkpoints, rebuilds, services, provider requests, promotion or production actions were executed during implementation.

## Purpose

Normal `product:recovery` inspection reports stored completion records. Those records alone cannot establish that the current cold target files still match the completed rebuilds. The new separate `revalidate` action recomputes the existing projection digests from each current cold target pair and compares them with those records.

It supports collection, legacy marketplace, exchange-v2 marketplace and admitted-wallet discovery rebuild artifacts. It does not add new holdings/accounting coverage or imply that every product projection is recoverable.

## Command interface

Use the existing `npm run product:recovery -- PRIVATE_CONFIG` entry point with `action:"revalidate"`.

Other required fields remain `version:1`, jobs `database`, pinned `manifestFile` / `manifestSha256`, and pinned runtime references. Use the same manifest and strict runtime definitions as the completed workflow. All configured targets must already exist and pass Phase1 admission.

For this read-only action:

- Omit `confirm`; enrollment confirmation is rejected.
- Omit `maxJobs`; this action checks the entire declared completed workflow rather than running a partial job batch.
- Optional `timeoutMs` is 1–45000, default45000. It is a cooperative budget for the whole revalidation after the process lease is acquired, not a per-node allowance.
- The declared workflow must already have acceptable complete records for every node. Incomplete/review/dependency-invalid workflows are not certified.

No runtime reader/provider connection is opened for this action. Existing inspect-only runtime fingerprint loading validates the selected chain configuration without acquisition. No jobs are enrolled, claimed, reset or finished.

## Artifact requirements and behavior

For every target:

1. Open one no-follow read descriptor; require a private single-link regular main file of 1–536870912 bytes.
2. Require an absent/empty WAL and rollback journal. A private regular single-link shared-memory sidecar, if present, is capped at8 MiB. This command does not checkpoint or repair files. Stop writers and complete their normal checkpoint/close lifecycle separately before treating files as cold.
3. Hash the whole main file with a 256 KiB buffer and retain descriptor/path identity, size and timestamps.
4. Open SQLite with `readOnly:true`, `query_only`, untrusted schema disabled, one-second busy timeout, memory temporary storage and an8 MiB page-cache target.
5. Within one read transaction, require the expected current schema, quick-check success, exact admitted deployment/wallet binding and fixed target block/hash. Collection targets must have no pending receipt scan/staged rows.
6. Recompute the **existing** projection digest, row count and statistics from the same transaction. Compare all three with the persisted completion record.
7. Close SQLite and hash the main file again. Require the same bytes and identity/metadata; reject newly nonempty journals.

Both members of every pair must match their persisted completion projection. Their raw SQLite image hashes need not match each other: equivalent projections may have different physical file layouts. Both hashes are returned individually.

Projection digest serialization and column ordering are preserved for comparison with existing complete records. Read-only digest helpers use the real database queries, not writable index constructors or fabricated comparison results. Schema reference extraction uses the existing current index schema routines.

After all pairs, the coordinator rechecks every target identity/metadata and cold sidecar condition and verifies that the workflow completion status hash has not changed. Failure yields no success envelope and performs no automatic repair or review reset.

## Result

`rift-recovery-artifact-revalidation-v1` includes:

- manifest/status hashes and fixed target block/hash;
- per-node job IDs and per-artifact path, file identity, image/schema/projection hashes, row count and statistics;
- completion timestamp, declared capabilities and explicit exclusions;
- `completeForDeclaredCapabilities:true`, `liveFilesRevalidated:true`;
- `wholeProductComplete:false`, `chainRechecked:false`, `activated:false`;
- deterministic envelope-content `revalidationHash`.

Here `liveFilesRevalidated` means the current files at the declared **cold target** paths, not live production databases. The result is sequential point-in-time evidence, not an atomic cross-file snapshot. Its hash is an integrity identifier, not an Ed25519 signature, authenticated remote attestation or activation approval. Future promotion must recheck the selected bytes rather than trusting an old timestamp/hash envelope alone.

The command returns JSON to its caller and does not publish a receipt file implicitly. Retain any separately approved output outside protected configuration/target namespaces. No actual result or example success evidence was generated during this phase.

## Resource and concurrency boundaries

- Existing2,000,000 projection-row ceilings remain. Statistics replay loops also stop at that count.
- Hash reads and row iteration periodically check the workflow lease, file/path admission, cancellation and deadline; ordinary rebuild digest calls now propagate their job guard too.
- Synchronous SQLite operations such as quick-check, sort or aggregate queries cannot be forcibly preempted by these JavaScript checks. A timeout is cooperative, not a hard wall-clock/process-memory reservation.
- The database-size/row limits bound admitted input, not exact heap use. Large legacy order replay or in-memory sorts can consume substantial memory; no universal workload/performance guarantee is claimed.
- Read-only/query-only connections prevent main database writes through this API. SQLite can still open/create/use engine sidecars as permitted by its WAL implementation. This is not a zero-filesystem-side-effect or immutable-media contract.
- Nonzero WAL/journal causes refusal, not silent truncation. Do not delete active journals to satisfy admission.
- Cooperative locks and metadata/hash checks do not exclude arbitrary privileged/raw writers, provide a simultaneous distributed snapshot or establish physical provider independence.
- Revalidation does not contact the chain, reacquire history, establish semantic completeness beyond the existing projection contract or expand metadata coverage.

## Maintenance API compatibility

`openMaintenanceJobs` now accepts `readOnly` (defaultfalse). Read-only mode rejects creation and all transactional mutation methods; direct effect marking also rejects it. The recovery CLI uses read-only jobs handles for both inspect and revalidate. Other maintenance callers retain their default read/write behavior.

Digest helpers accept optional guard and transaction-ownership controls. Existing callers keep transaction ownership by default; the new inspector supplies its own encompassing schema/binding/projection read transaction.

## Next phase

Implement reviewed cold candidate publication/promotion plans and rollback records using freshly revalidated image pins, with no implicit production swap. That is separate Phase3 work and is not included in this phase's completion claim.
