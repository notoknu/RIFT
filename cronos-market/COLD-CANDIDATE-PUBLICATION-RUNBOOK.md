# Phase 3 — Reviewed cold-candidate publication and rollback

## Status and safety boundary

Source-implemented, unverified and inactive. No tests, builds, syntax checks, plans, artifact copies, pointer changes, rollbacks, services, provider requests, signatures, deletions, production selection or spending were executed during implementation.

The new tool creates private cold recovery generations and updates **only** a catalog-local `CANDIDATE.json` selector. Existing application entry points are not changed to consume that selector. This is not a live database replacement, service restart, production promotion or distributed cutover implementation.

## Source interfaces

- `server/cold-candidate-catalog.js`: guarded catalog inventory, generation validation/readback, publication plans/application, transition intents and rollback plans/application.
- `scripts/recovery-publication-ops.js`: strict private pinned-input CLI with finite deadlines.
- `npm run recovery:publication -- PRIVATE_CONFIG` is the unexecuted entry point.

## Catalog setup and limits

Choose an existing canonical private directory with no symlinked ancestry. The command does not create a root implicitly. Keep it separate from source databases, job databases, manifests, runtime/chain configuration, approvals and command files. Sources under the catalog root are rejected. The catalog contains plaintext SQLite copies; private modes are not encryption. Keep it outside web/static roots and manage host access separately.

Every command requires `version:1`, `action`, `root` and explicit `maxBytes`:

- `maxBytes`: 134217728–68719476736 (128 MiB–64 GiB).
- optional `maxEntries`:16–10000, default4096.
- optional `timeoutMs`:1000–1800000, default300000. The monotonic deadline is cooperative and does not forcibly interrupt synchronous SQLite operations.

Inventory streams directory entries and is bounded to the root and one generation/staging level. Unknown root artifacts, directories, symlinks, special files, hardlinks or nonprivate entries fail closed. Uncommitted staging and pending pointer files count against capacity. No automatic deletion, eviction, retention or temporary-file cleanup is performed.

The catalog uses the existing `.rift-archive.lock` with no automatic stealing. A stale lock requires the existing explicitly fenced archive-lease recovery path. Root identity and canonical path are checked throughout. This coordinates participating tools, not arbitrary privileged/raw writers.

## Publish plan

`action:"plan"` additionally requires:

- `recoveryConfigFile`: canonical private Phase2 recovery-command file;
- `recoveryConfigSha256`: exact SHA-256 of that file.

The referenced command must use `action:"revalidate"`, with its existing pinned manifest and runtime definitions and no enrollment confirmation/job budget. Every publication plan runs fresh Phase2 revalidation; it does not accept a saved untrusted success envelope as evidence.

The plan contains the exact source image hashes, file identities, sizes, projection digests/statistics, admitted specs, workflow/status hashes, target fork, required capabilities, exclusions, destination generation ID, current pointer pin and catalog-layout state digest. A generation ID is the canonical content hash of its generation document. Timestamps from revalidation are not used as unstable plan identity.

The layout digest describes names/types/sizes plus the current pointer bytes. It is not a cryptographic verification of every unselected catalog file. Selected generations receive separate full image/projection validation.

Planning can take a cooperative lock and perform read-only SQLite work. It does not copy artifacts or change the selector. SQLite may use sidecars according to the Phase2 boundary.

## Publish apply

`action:"publish"` uses the same recovery configuration reference plus `approvalFile` and its exact `approvalSha256`. Approval has exactly:

- `confirm:"PUBLISH FENCED COLD RECOVERY CANDIDATE"`;
- exact `planHash`;
- `writersFenced:true`;
- identifier `reviewer`;
- SHA-256 `evidenceHash`.

The fencing assertion must reflect an actual approved maintenance window for the source jobs/writers, not merely a JSON flag. Application reruns fresh recovery revalidation and recomputes the publication plan under the catalog lock. Any plan mismatch is rejected before copying.

For a new generation:

1. Check catalog quota/entry headroom and reported filesystem available space. The estimate includes full selected source bytes, an8 MiB sidecar allowance per image and2 MiB metadata allowance. It is not a filesystem capacity reservation.
2. Create an exclusive private `.candidate-stage-UUID` directory.
3. Stream each pinned source into a distinct exclusive private file with bounded buffers and partial-write handling. Require expected source identity/metadata and exact image digest; sync every output.
4. Revalidate each staged copy's schema, binding, target checkpoint, projection and image hash.
5. Write and sync `GENERATION.json` last, sync the stage directory, then rename the stage into the absent `candidate-GENERATION_ID` destination and sync the root.
6. Revalidate the published generation again before selector transition.

Existing same-ID generations are never overwritten; they must pass full manifest/image/projection inspection before reuse. Physical pair image hashes may differ while projection digests agree, as permitted by Phase2.

## Durable transition and selector semantics

Publication and rollback both write an exclusive content-addressed `transition-ID.json` **intent** and sync it before selector replacement. The intent binds operation, exact approved plan, reviewer/evidence, destination generation, previous pointer bytes hash and previous pointer object. It is not falsely marked committed before the pointer changes.

A private exclusive pending pointer is written/synced, the previous pointer hash is rechecked and `CANDIDATE.json` is atomically replaced, followed by root sync. This gives an atomic selector file update on the local filesystem, not an atomic transaction across all files/hosts/services.

The selector references both the selected generation and transition ID. Inspection validates the referenced intent's content hash and destination. Prior pointers/intents and generation files remain retained. Hashes and private permissions are integrity/coordination mechanisms, not signatures, immutable storage or host-independence proof.

A failure after copy, generation rename, intent write or selector rename can leave durable partial/completed effects despite a lost caller response. Do not assume an exception means no change. Preserve staging/pending files and intents, then inspect the selector and selected generation before planning a retry. Any changed catalog/pointer requires a freshly reviewed plan. No stage is silently resumed, discarded or certified.

## Inspection

`action:"inspect"` needs only the catalog configuration. It:

- reports an empty selector if none exists, plus retained generation IDs, staging paths, transition IDs and pending pointer filenames (layout discovery, not verification of every unselected generation);
- otherwise validates current pointer/intent and fully revalidates every selected generation artifact;
- checks that the pointer did not change during inspection;
- returns current byte/entry inventory and `activated:false`, `liveDatabaseReplaced:false`.

Generation inspection requires exactly the expected manifest/main/SQLite-sidecar names, valid pair structure, supported admitted specs, pinned image hashes and matching projections. Nonzero data journals are rejected by Phase2. Unexpected content is preserved and refused, not repaired or deleted.

## Rollback plan/apply

`action:"rollback-plan"` additionally requires a retained target `generationId` different from the current selection. If there is no selector after an interrupted first publication, the plan explicitly sets `recoverUnselectedGeneration:true` and can recover selection of a fully validated retained generation without original source files. It validates current pointer provenance, then fully revalidates the target generation without needing original rebuild sources or their job database.

`action:"rollback"` uses that target plus pinned approval file. Its exact fields are the publication approval fields with:

`confirm:"ROLL BACK FENCED COLD RECOVERY CANDIDATE"`.

It recomputes the exact rollback plan before writing a new transition intent and switching only the cold selector. Both generations remain retained. Repeating rollback after the target is already selected is not silently treated as an unobserved new success; inspect the state and resolve the previous result.

The old selected generation's image health is **not** a precondition for switching to a good target. Plans explicitly set `previousGenerationRevalidated:false`; they do not claim the old selection remains recoverable. Current pointer/intent corruption still fails closed and requires separate forensic recovery, rather than inventing approval to overwrite an untrusted catalog history.

## Scope exclusions and remaining engineering

- No live activation, application configuration swap, online migration, service control or production rollback is implemented/executed by this catalog. Cold selection is not production promotion.
- Generations are immutable by convention, not filesystem-enforced WORM storage. Later inspection/promotion must recheck pins.
- Revalidation is sequential point-in-time evidence. It does not create an atomic cross-file/host snapshot or reacquire canonical history.
- Capacity checks do not reserve disk space; concurrent nonparticipating writers, quotas and storage failure can still interrupt publication.
- Partial-stage reclamation, catalog metadata rotation, history compaction and distributed replication remain broader lifecycle work. Nothing silently deletes user documents or historical evidence.
- Existing supported projection/density limits and no-testing verification boundaries remain. No universal real-world readiness, full accounting coverage or full product/backend independence is claimed.

## Next phase

Phase4: review the production feature/subroute/upstream inventory into an explicit supported backend/runtime matrix, then identify and implement the remaining repository/provider boundaries against that finite contract.
