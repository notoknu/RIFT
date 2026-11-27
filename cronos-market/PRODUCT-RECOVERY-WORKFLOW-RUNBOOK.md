# Declared-projection recovery workflow coordinator

## Status

Source-only, unverified and inactive. No tests, builds, syntax checks, initialization, enrollment, rebuild execution, network acquisition, promotion, services or production actions were run.

This coordinator advances the recovery orchestration backlog. It does not complete whole-product independence, accounting, backend parity or recovery. Output deliberately distinguishes declared projection completion from whole-product completion and live file revalidation.

## Supported nodes and capabilities

- `collection-rebuild`: `collection-events`, `token-supply`, `collection-balances`.
- `marketplace-rebuild`: `marketplace-events`, `event-order-state`, `gross-emitted-volume`.
- `wallet-rebuild`: `wallet-transfer-discovery`.

These are the existing cold pair rebuild components. A wallet discovery job cannot claim live holdings, balances, escrow, valuations or complete asset coverage. Marketplace emitted volume cannot claim cross-venue statistics, net proceeds or expiry-aware active inventory. Unsupported required capabilities are rejected, not silently approximated.

## Workflow manifest

A private pinned JSON document has exactly:

- `version:1`, `chainId:25`, identifier `name`;
- fixed nonnegative `targetBlock` and lowercase 0x-prefixed `targetHash`;
- `requiredCapabilities`: nonempty distinct capability list;
- `exclusions`: nonempty bounded descriptions of missing coverage;
- `nodes`: 1–64 entries.

Each node has exactly `id`, `kind`, canonical existing maintenance `spec`, `dependsOn`, and nonempty `capabilities` drawn from that node kind. Each spec must pin the manifest's exact fork/target. Existing spec normalization rules apply. Duplicate IDs, duplicate underlying job identities, unknown dependencies and cycles are rejected. Every required capability must be supplied by a node.

Dependencies are part of the workflow graph, while individual rebuild job IDs retain their existing deterministic maintenance identities. A matching completed job can be reused; this is not proof that it was historically executed under this graph. Completion is a claim about persisted results for declared projections, not an immutable execution history.

## Runtime and cold targets

Use a unique runtime ID and distinct already initialized target pair per node. Existing maintenance runtime configuration pins the chain configuration through its fingerprint. The workflow also pins the runtime file bytes. Every pair must already exist and be private, single-link, bounded regular files under canonical parent directories. Target/configuration path collisions are rejected. The existing rebuild initialization commands remain separate; this coordinator never guesses whether a partial/live target is safe to create or reset.

Runtime paths and manifest pins are operational inputs, not generated acceptance evidence. Neither plan inspection nor a completion record establishes physical RPC/provider independence.

## CLI

`npm run product:recovery -- PRIVATE_CONFIG`

Configuration fields:

- `version:1`, `action`: `inspect`, `enroll`, or `run`;
- canonical absolute `database`: existing initialized maintenance jobs database;
- canonical absolute `manifestFile`, exact byte `manifestSha256`;
- `runtimes`: object mapping each node's runtime ID to exactly `{file,sha256}`;
- optional existing scheduler `maxJobs` (1–32, default4), `timeoutMs` (1–45000, default45000);
- for enrollment/run: `confirm:"ENROLL AND REBUILD DECLARED COLD PROJECTIONS"`.

The CLI acquires the existing cooperative database-path process lease before opening the maintenance store. Stop competing workflow controllers first. Direct legacy maintenance commands do not automatically acquire this outer lease; individual job claims still coordinate participating workers, not arbitrary raw writers.

All runtime definitions/fingerprints and path selections are checked before enrollment. Inspect-only runtime fingerprint loading does not run acquisition. Normal execution opens runtime readers only for currently runnable manifest nodes.

### Inspect

Returns each node's stable job ID, phase, result, dependency blockers and eligibility, plus workflow/status hashes and explicit exclusions. Completed records require the expected kind-specific completion code, target fork, digest and inactive result.

`completeForDeclaredCapabilities:true` means every selected node has an acceptable persisted completion record and no unmet dependency. Output always includes `wholeProductComplete:false`, `liveFilesRevalidated:false`, and `activated:false`.

### Enroll

Idempotently enrolls currently dependency-ready missing jobs. It does not enroll blocked descendants in advance. An interruption can leave a prefix enrolled; deterministic IDs make repeating enrollment safe at this layer. Existing cold-target/job semantics still apply.

### Run

Enrolls ready nodes, then executes a bounded maintenance schedule restricted to runnable job IDs from this manifest. Unrelated maintenance jobs are not claimed or lease-recovered by this selected run. A dependency completed during this finite run allows descendants on the next invocation, not a hidden unbounded loop.

The existing jobs database persists progress and completion across restarts. Review/paused nodes remain explicit; this coordinator never auto-resumes a side-effect review. Dependencies incomplete while a descendant is already running/complete produce a dependency violation instead of a success claim.

The schedule checks the outer process fence before claiming/finishing and propagates its deadline/fence through the job check/effect interface used by rebuild/media units. Loss of the outer lease can leave a job to normal claim recovery rather than permitting an unfenced completion update.

## Compatibility and shared reader hardening

The maintenance scheduler's new optional `include` selection defaults to all jobs for existing callers. Selected runs filter both claim eligibility and expired-claim recovery. Optional outer `guard` defaults to a no-op for compatibility.

Private maintenance file reads now handle short reads with a bounded loop, require a single-link file and compare before/after size/mtime/ctime. Existing private/no-follow checks remain. Hardlinked configuration/key files that were previously accepted now fail closed; provision distinct private files rather than weakening checks.

## Explicit remaining boundaries

- This is declared cold-projection orchestration, not full all-product recovery, backend substitution or accounting implementation.
- Complete records do not re-open/recompute every cold target's current digest during status inspection. A file modified after completion can invalidate actual recovery despite a retained result; output flags this honestly.
- No activation/rollback of a live deployment, restore attestation automation, new holdings projection, runtime parity or larger acquisition profile is added here.
- Cooperative leases and pinned paths are not universal OS-level writer fencing.
- No durable workflow enrollment transaction spans all jobs; a partial enrollment is explicit and resumable.
- No separate immutable workflow audit or distributed graph execution certificate is claimed.
- All source changes remain unverified under the standing no-testing instruction.

## Phase 1 admission continuation — source-only

Recovery command/reference/budget validation now precedes enrollment, and coordinator admission reserves SQLite main/sidecar namespaces with protected-source/writable-target separation. File/directory identity and source metadata guards propagate through enrollment/run; cleanup attempts all resources. Strict supported rebuild runtime fields are enforced. See `INDEPENDENCE-RECOVERY-PHASE-STATE.json` and `/home/user/RIFT-deliverables/50-PHASE-1-RECOVERY-ADMISSION-IMPLEMENTATION.md`. No tests/builds/syntax checks/services/enrollment/rebuild/operational activation ran. Current-artifact revalidation remains Phase2; whole-product completion is not claimed.

## Phase 2 — source-only artifact revalidation

Added a separate recovery `revalidate` action for current completed collection/marketplace/wallet cold target pairs. It uses read-only SQLite snapshots, expected schema/binding/checkpoint checks, existing projection digests/row counts/statistics, before/after image hashes and a final identity/metadata/record-state sweep. It rejects nonempty WAL/journal and incomplete workflows. Normal inspect remains stored-record status; only successful explicit revalidation sets the current-artifact flag. Read-only maintenance handles reject mutation. No tests/builds/syntax checks/revalidation/provider requests/checkpoints/promotion were executed. See `RECOVERY-ARTIFACT-REVALIDATION-RUNBOOK.md`. Phase3 publication/promotion/rollback remains pending; whole-product completion is not claimed.

## Phase 3 — source-only cold candidate publication

Added guarded private cold candidate catalogs, fresh-revalidation-bound exact publication plans, streamed copy/readback, manifest-last generation publication, atomic catalog-only selectors, durable transition intents and reviewed retained-generation rollback/recovery. No application entry point consumes the new selector; live database/service promotion is not implemented by this catalog. Source code also propagates publication guards into nested recovery revalidation. No tests/builds/syntax checks/plans/copies/pointer changes/rollbacks/services/deployment were executed. See `COLD-CANDIDATE-PUBLICATION-RUNBOOK.md`. Partial stages/intents are intentionally preserved on interruption; no automatic cleanup or deletion is added. Phase4 feature/backend contract review remains next, with broader engineering incomplete.
