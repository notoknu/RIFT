# Durable receiver-retention circuit — pass 46

## Status

Source-only, unverified, inactive. No commands described here were run operationally. No tests, builds, syntax checks, service starts, repairs, resets, signatures or deletions were performed.

## Configuration

The receiver's optional `retention` configuration now accepts `circuitFile`: an absolute canonical path in a private canonical directory. It must be a dedicated state file, not a database, configuration, key, approval or receipt path. Its absence retains the previous in-memory behavior for compatibility. Supplying it enables persistent consecutive completed-outcome failure tracking.

The file contains only version, scope digest, failure count, disabled flag and update timestamp. Scope binds database, target, maintenance mode, policy path/hash and trust path/hash. A changed policy/trust scope is rejected against an existing circuit rather than silently resetting it. Keep this file with the receiver's operational state and preserve its permissions.

Loading is bounded, no-follow, private, single-link, schema-checked and scope-checked. Persistence compares the previously loaded byte hash, writes/syncs a private exclusive temporary file, checks the cooperative receiver lease, atomically renames and syncs the parent directory. This is not a security boundary against arbitrary privileged external writers.

Three recorded consecutive failures disable retention across ordinary process restarts. Successful maintenance resets the count. Receipt/queue maintenance still follows its existing idle/admission/process-lease fences. A circuit persistence failure disables maintenance in the running process and emits `RECEIVER_RETENTION_CIRCUIT_PERSIST_FAILED`; it does not claim that failed storage writes became durable. Receiving remains subject to ordinary capacity limits.

The circuit records completed outcomes, not a durable intent before every maintenance attempt. Abrupt termination before outcome persistence may lose that attempt's failure accounting. It also cannot distinguish first initialization from someone externally deleting the state file. No claim of crash-proof failure accounting is made. Pending temp files are not automatically reclaimed or executed.

## Offline inspect/reset

Use existing `archive:lifecycle` source entry point with a private configuration containing:

- `version:1`;
- action `receiver-circuit-inspect` or `receiver-circuit-reset`;
- exact canonical `database` and `targetId`;
- `retention` containing the same mode, policy/trust paths/hashes and circuit file as the receiver;
- `approvalFile` for reset only.

Both actions acquire the cooperating receiver process lease. Stop the service first; a stale lease requires the existing separately approved fenced lock recovery. Inspection does not create a circuit file and returns its current `sha256` (null if never persisted).

Reset approval fields:

- `confirm:"RESET FENCED RECEIVER RETENTION CIRCUIT"`;
- `writersFenced:true`;
- exact inspected `expectedSha256`;
- nonempty identifier `reviewer`;
- SHA-256 `evidenceHash` for the separately retained review evidence.

Reset rejects absent state and stale hashes. It writes a cleared state under the same scope and returns reviewer/evidence identifiers. Retain the approval and returned result externally; they are not an append-only audit log. It never starts the receiver or changes its standing deletion policy.

No automatic reset, lease stealing or policy migration is introduced.

## Media-maintenance hardening in this pass

Recurring media audit/repair already existed in the maintenance scheduler; it was not newly invented in this pass. Its local CAR source now uses a bounded no-follow, single-link file-descriptor capture with before/after metadata comparison and the existing pinned content hash/DAG validation. Growth cannot cause an unbounded `readFile` allocation.

Readback now rechecks the job fence when handling provider errors, so loss of a claim is not silently reduced to an ordinary unhealthy-copy result. Repair verification targets the repaired provider directly rather than auditing an unrelated second provider again. Initial audits still require independently labelled multi-provider configurations. Provider/domain labels and immediate verified readback are not a retention SLA or physical-independence proof.

## Compatibility and remaining scope

No existing receiver is enrolled or switched to durable state by these source edits. Retention config remains restart-only. Operator-selected state paths, policy/trust pins and host durability remain required external configuration, not fabricated deployment results.

This pass does not complete product/backend parity, full rebuild projections, larger complete-block acquisition, orphan-reservation cancellation, full operational metadata rotation or all remaining defects. All new paths are unverified.

## Pass 48 source-only continuation

Added exact-plan, fenced local abandonment of uncommitted multipart reservations with shared-piece protection; committed uploads are rejected. Restricted legacy standalone spool pruning to exclude every multipart record family. Multipart reads/enqueue now use bounded descriptor-captured buffers; packing holds one no-follow descriptor across both hash passes. Durable receiver retention now precharges an attempt before maintenance, so an interrupted begun attempt consumes the failure budget. See `MULTIPART-ABANDONMENT-RUNBOOK.md`. No testing/builds/syntax checks/deletions/resets/services/network sends occurred. Remote cancellation, tombstones, automatic migration, universal fencing and wider M1–M5 completion are not claimed.
