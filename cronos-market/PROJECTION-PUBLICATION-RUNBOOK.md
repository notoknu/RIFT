# Owned projection publication — Phase4B continuation56

## State and scope
Implemented source only, not executed, tested, or production-admitted. No endpoint was contacted and no remote database was changed during implementation.

This is an explicit bounded alternative to writing the ingestion engines directly against remote databases: retain existing local ingestion, capture a stable SQLite snapshot, review a publication plan, then transactionally publish that image to a dedicated libSQL projection database. It covers collection, legacy-market and exchange schemas. It is not automatic replication, a complete remote ingestion engine, a cold-candidate activation mechanism, an independent history verification, or whole-product database portability.

## Components
- `server/projection-publication.js`: local capture, content hashing, remote planning and transactional compare-and-replace.
- `scripts/projection-publication-ops.js`: private-document CLI, `export`, `plan`, `apply`.
- `npm run projection:publication -- /absolute/private/config.json`: command interface. This command was added, not run.
- Shared remote endpoint validation now lives in the read adapter export; credentials and endpoint rules are consistent across reads and publication.
- Status endpoint conservatively reports nonempty remote projection selection as `remote-not-inspected`; fresh local indexes no longer imply an overall ready status when remote selection is present.

## Preconditions
Use trusted private local directories and a dedicated remote database for each deployment binding. Obtain a write-capable credential for publication and a distinct server-enforced read-only credential for public APIs. Both are environment references, not values embedded in documents. Provider/endpoint approval, credential provisioning and any execution require separate authorization. No such execution is authorized by this implementation report.

Source data must be accepted under the operator's chain/finality/coverage policy before planning. Capturing a structurally valid snapshot does not prove chain completeness, freshness, independent agreement or semantic correctness. The command does not read/validate the cold-candidate catalog and must not be presented as promoting a verified candidate. A source with unfinished work tables can be structurally captured; policy approval must address that state. Integrating an explicit accepted-source artifact/coverage admission gate remains Phase4B work.

## Private configuration documents
All commands take exactly one JSON configuration path. Configurations, images and plans must be private regular single-link files, mode0600 or stricter, without symlink final components; documents are bounded to9MiB and read with size/change checks. Outputs are created exclusively, mode0600, and file-fsynced; existing files are never overwritten. Parent directory persistence is not fsynced, so a machine crash can lose newly created names. A failed/partial output remains for inspection; no automatic deletion occurs.

Each config has `version: 1` and `action`:

### export
Required fields: `kind`, `binding`, `sourcePath`, `outputPath`.
`kind` is `collection`, `legacy-market` or `exchange`. Binding is exact normalized chain25 address/startBlock and, for collection, standard. Source must be an existing SQLite database, not an in-memory target. The command captures under a read transaction, verifies exact schema/binding and writes the image. It does not initialize or migrate the source.

### plan
Required fields: `imagePath`, `outputPath`, `remote`.
Remote has `url`, `approvedHost`, `authTokenEnv`; optional `writeAuthorized` has no write effect in plan. Planning reads the remote database in a read transaction and writes a plan containing the complete image and expected prior content digest. An empty remote database is accepted for initial provisioning. A nonempty remote database must have exact supported schema and matching deployment binding. No migration of other schemas is performed.

The printed summary contains `reviewedHash`, `targetId`, `imageDigest` and `expectedDigest`. Review the full private plan and scope, not just a CLI success message. The target ID pins normalized remote URL plus projection kind/binding, excluding credentials so planned read credentials can differ from apply credentials.

### apply
Required fields: `planPath`, `reviewedHash`, `receiptPath`, `remote`.
Remote must include `writeAuthorized: true`, alongside `url`, `approvedHost`, `authTokenEnv`. Apply rejects a mismatched plan hash or target before creating the remote client. It then begins one write transaction, rereads the target and compares its content digest with the reviewed expectation. Changed targets are rejected. On an empty target it creates the exact captured tables/indexes. Otherwise it replaces all rows in the supported schema. Inserts use parameters; table/column names are checked. Full readback is compared with the desired image before commit.

This is destructive replacement of the dedicated target's projection data, not an append or merge. It can intentionally publish an older image if separately approved; no implicit monotonic block policy is asserted. Never share this target with other applications or uncontrolled writers. Readers rely on provider transaction/snapshot semantics to see committed snapshots.

After commit, an exclusive local receipt records the result. Receipt creation is not atomic with the remote commit. An existing/unwritable receipt path can therefore produce an error after successful publication. The error result retains the known publication outcome. Do not infer rollback from a nonzero CLI exit.

## Retry and uncertainty
There are no automatic writes or retries. Apply recognizes identical desired target content as `already-applied`, allowing a repeat of the identical reviewed plan to resolve a lost commit response. If commit was requested but no result returned, the error says `unknown-inspect-or-retry-identical-plan`; inspect the target or retry the identical plan rather than preparing an unrelated replacement. Before a commit request, errors say `commit-not-requested`; this is not a global claim that no other writer changed the database. Rollback/close failures are retained as cleanup markers where possible.

## Limits and known gaps
- At most10000 total rows across all tables, at most8MiB serialized image, at most128 schema objects. Source/target over limits fails; it is not silently truncated or partially committed.
- Only null/string/safe-integer SQLite scalar values; binary blobs, floating-point values and unsupported schema additions are rejected.
- Remote capture limits rows but the SDK receives result sets before byte checks; this is not a hard network/memory cap. SQLite capture/sorting is synchronous and can block. Large fields, hostile filesystems, parent symlinks, provider-specific system tables, SDK transaction lifetimes and provider request limits remain constraints.
- Exact SQL schema matching is strict. Provider-added objects may prevent admission. No automatic loosening, migration or deletion of unrelated schemas is allowed.
- No hard remote cancellation, cross-database atomicity, online cutover, unattended scheduler, encrypted document store, publication history service or rollback archive is supplied. Preserve previous approved images/plans to prepare a separately reviewed rollback against current target state.
- Write credentials are loaded for one CLI lifetime and the client is closed; recurring custody, rotation and revocation workflows remain to integrate. Public API clients retain their existing close/reopen lifecycle.
- Backend-aware freshness inspection, accepted-source publication admission and full supported-combination evidence remain unfinished. Local status marks remote selection uninspected instead of certifying it.

Wallet-only signing, the1 CRO ceiling, all historical MD/TXT, and the prohibition on unauthorized trading/deployment remain unchanged.


## Continuation57 — bounded Phase4B source scope completed, unverified
Added required source review/evidence pins and v2 publication plans, selected-backend asynchronous status, production plugin draining and a bounded hybrid read-snapshot source profile. Earlier v1 publication instructions are superseded: plan/apply require acceptedSourceHash and evidencePaths; plan also requires acceptancePath. See PROJECTION-SOURCE-ADMISSION-RUNBOOK.md and report57. Five top-level phases / six work packages remain (4C/4D/5/6/7/8). Broader remote ingestion, semantic evidence automation, wallet/cold-selector integration and recurring credential lifecycle remain excluded/incomplete, not silently closed. No tests/builds/syntax checks/network/activation; wallet-only signing and1 CRO ceiling preserved.
