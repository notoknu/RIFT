# Explicit multipart abandonment and lifecycle safeguards — pass 48

## Status and purpose

Source-only, unverified, inactive. No tests, builds, syntax checks, services, deletion, resets, delivery or maintenance execution occurred.

This adds a reviewed way to abandon an **uncommitted local multipart upload**. It is deliberately separate from attested backup retention: the operator explicitly accepts permanent loss of the selected local partial upload. It does not certify another usable recovery copy.

## Offline plan/apply interface

The existing archive lifecycle CLI accepts:

- `multipart-abandon-plan`
- `multipart-abandon-apply`

Private configuration fields: `version:1`, `action`, canonical absolute `database`, `targetId`, exact `reservationId`, optional existing delivery `maxTotalBytes`, and `approvalFile` for application.

Both actions acquire the cooperating receiver process lease before opening the store. The same database-path lock can fence a cooperating receiver, but it does not fence independent producers or sender workers. Stop/fence those separately before planning/application. Do not recover a stale lock without the existing explicit fencing approval.

Planning checks a bounded same-target store snapshot and parses the selected reservation. A selected reservation in `sending` state is rejected. Any valid commit wrapper referencing it rejects abandonment, regardless of commit phase. A malformed commit wrapper also blocks abandonment rather than guessing whether it references the selected reservation.

Other reservations and valid legacy/reserved manifests protect their referenced pieces. Opaque reservation/manifest metadata preserves all pieces. Pieces currently being sent are preserved. Only valid matching unshared part rows are selected with the reservation; duplicates are deduplicated. Selected parts must have compatible sender/receiver roles. No unrelated standalone ciphertext is selected.

Application approval fields:

- `confirm:"DESTROY FENCED UNCOMMITTED MULTIPART UPLOAD"`
- `writersFenced:true`
- `acceptPermanentLoss:true`
- exact `planHash`
- identifier `reviewer`
- SHA-256 `evidenceHash`

Application replans under the same SQLite transaction, checks the exact plan hash, deletes only the selected target/phase rows and checks the cooperating lease before commit. A changed queue state invalidates the plan. Results return deleted row count, logical bytes reclaimed and preserved piece identifiers. Physical database compaction is not performed.

Retain plan, approval and result outside this queue. A lost response after SQLite commit leaves the caller's observed outcome unknown; inspect the reservation/selected IDs before retrying. No separate durable result journal is added by this operation.

## Important nonclaims

- No timeout-based or automatic abandonment is enabled.
- No remote queue or receiver copy is cancelled.
- No cancellation tombstone is distributed. A producer/retry can recreate the reservation after unfencing, so stop the specific source job and resolve retries before approving abandonment.
- Shared and opaque-reference pieces can remain after the reservation is removed. This command is not a universal orphan-piece sweeper.
- A commit that exists only elsewhere cannot be discovered from this local store.
- Cooperative leases do not prevent arbitrary raw/privileged writers.
- Existing complete/committed backups must use the appropriate attested cohort retention path, not this partial-upload destruction path.

## Standalone outbox prune restriction

The older `outbox-prune-plan` / `outbox-prune` path now excludes all multipart pieces, legacy manifests, reservations and wrapped commits. Its insertion-order `keepLatest` selection applies only to acknowledged standalone ciphertext. This prevents that older path from bypassing shared-reference cohort planning.

Existing saved prune plans must be regenerated because eligibility and scope text changed. This safety restriction can leave more rows than before; it does not silently certify or migrate legacy multipart work.

## Bounded multipart source reads

Manifest and part reads used by inspection/reassembly/enqueue now use bounded no-follow, single-link file-descriptor capture with size and before/after metadata checks. Enqueue submits the exact validated part buffer instead of validating one read and enqueueing a second unvalidated pathname read. Existing signed manifest/hash checks remain.

Packing now also holds one no-follow, single-link source descriptor across header validation, streaming part creation and a second hash pass, with before/after metadata checks. It no longer reopens the source pathname between passes. This does not claim universal filesystem fencing or proof against arbitrary privileged mutation; failed packing can still leave an explicitly uncommitted partial directory.

## Durable circuit attempt accounting

The optional durable receiver circuit now persists an incremented failure budget **before** runtime loading/planning/application. A process interruption after that durable begin consumes an attempt across restart. Only successful completion clears it. Three consecutive unsuccessful/interrupted attempts disable future starts until the existing fenced reset.

A fresh in-process token binds begin/finish; a stale completion cannot clear another attempt. The third allowed attempt can clear its precharged disabled state only by successfully finishing with its own token. Failure to persist the begin prevents that maintenance operation from starting in the current process.

The on-disk schema remains version1; pass46 circuit files are accepted. This supersedes pass46's completed-outcomes-only limitation. Missing/deleted state, failed storage durability, external tampering and the absence of a separate immutable operational audit remain explicit boundaries. No source change can guarantee persistence when storage itself refuses it.
