# RIFT operations

## Runtime and reproducibility
Use Node 22.13+ (Node 22 LTS image supplied). `npm ci` installs the lockfile; `npm run contracts:test`, `npm run test:security`, `npm run contracts:export`, `npm run build`. The bundled development Node package lets npm scripts use Node 22 on this sandbox; production Docker uses the Node 22 base image. Patched dependency overrides include cross-major changes: maintain the regression gate before updating them. Hardhat config/scripts/tests are ESM; obsolete .cjs paths are no longer used.

## Local production server
Set REDIS_URL to a private Redis instance and run `NODE_ENV=production npm start`. A deliberately single-instance installation may instead set `ALLOW_SINGLE_PROCESS_LIMITS=1`; never use that setting for multiple replicas. Only set TRUSTED_PROXY to the actual proxy IP/CIDR. Do not trust arbitrary X-Forwarded-For headers or expose Redis publicly. Health is `/healthz`; aggregate request/error/inflight metrics are emitted as JSON every minute without wallet addresses or URLs. Monitor uptime, 5xx/429/503, Redis health, worker errors, DB size, backup age and index lag through your infrastructure's log/alert service. This repository cannot provision an alert destination automatically.

## HTTPS container deployment
1. Configure the final domain's DNS and allow inbound 80/443.
2. Set SITE_DOMAIN, VITE_WALLETCONNECT_PROJECT_ID and the independently reviewed VITE_MARKETPLACE_ADDRESS in a local uncommitted environment file. Client VITE variables are public and require a rebuild; never put secrets/private keys there.
3. Validate `docker compose config`, then `docker compose up --build -d`. Caddy terminates TLS. Redis is on a private network. Pin container image digests under your image-management policy before launch.
4. Check `docker compose ps`, HTTPS `/healthz`, CSP/network behavior, real wallet pairing, QR/mobile disconnect/rejection and indexed asset coverage. Container deployment and certificate issuance were not tested in the coding sandbox.
5. Compose enables the indexer. It may take a long time and substantial RPC capacity to scan Cronos from genesis. Native balances still load directly; partial-history labels remain until caught up.

## Durable index/backfill
Set INDEXER_ENABLED=1 for the app, use a shared local INDEX_DB for app and worker, and run `npm run index:wallets` separately. A wallet is registered when its portfolio is queried; cap is 1,000 registered wallets. SQLite WAL is suitable for the supplied single-host app/worker setup, not a network filesystem or an unbounded multi-host indexer. Use a production indexed database/service for greater scale.

Default history starts at block zero. INDEX_START_BLOCK>0 intentionally gives partial historical coverage. Worker scans standard Transfer/TransferSingle/TransferBatch events with a 12-block confirmation boundary; candidate balances are checked through RPC before showing ownership. Staked/escrowed, nonstandard/no-event and unseen unindexed contracts are not guaranteed. RPC filtering correctness and archival access remain trust assumptions. Reorg checkpoint mismatch resets that wallet's history safely; RPC/decode errors do not advance its checkpoint. Observe last/tip in portfolio warnings and worker logs. A reliable mainnet backfill has not been performed in the sandbox.

## Backups and recovery
Schedule `npm run index:backup` on the host or invoke `node scripts/backup-index.js` in the worker with an attached BACKUP_DIR. The script uses SQLite's online backup API, validates integrity and writes mode-0600 snapshots. Copy snapshots encrypted to your off-host retention store; the script does not upload them or schedule itself. Test restoration regularly.

To restore, stop both app and worker, preserve the current database/WAL/SHM as a recovery copy, use a validated snapshot as INDEX_DB with correct ownership, remove only the old associated WAL/SHM after preserving them, and restart. Never copy a live raw SQLite main file alone and assume a consistent backup. Cache files are disposable; deployment records, index snapshots and environment configuration need separate retention. Wallet addresses in the index are public but still privacy-sensitive operational data.

## Deployment approval
No private key goes in chat or frontend variables. Set actual MARKET_ADMIN_ADDRESS and run `npm run deploy:preflight` (read-only). Independently review current source, audit findings, owner powers, gas, fees and artifact hash. Deployment needs fresh matching preflight, APPROVED_MARKET_BYTECODE_HASH, CONFIRM_MAINNET=YES and SECURITY_REVIEW_APPROVED=YES and a locally configured funded signer. A lock and submitted record prevent accidental repeat broadcasts; on failure, inspect the signer nonce and chain transaction before manually clearing anything. A confirmed deployment checks the expected owner and runtime bytecode. Configure its resulting frontend address and rebuild only after source verification. Owner transfer requires nominee acceptance; renunciation is disabled.

## Incident response
Remove compromised public UI/service from traffic and preserve logs/records. The reviewed owner can pause new marketplace listings/purchases; sellers can still cancel and withdraw. There is no owner function to seize escrow or user proceeds. Verify actions directly on chain and follow your multisig incident process. Do not imply that changing this repository upgrades existing deployments.

### Scheduled-backup update
`npm run index:backup-scheduler` now runs a consistent backup immediately and then every 24 hours, retaining seven successful local snapshots by default. Compose includes a `backups` service and an `index-backups` volume; the runtime image includes the required backup scripts. Override BACKUP_INTERVAL_HOURS/BACKUP_RETENTION_COUNT/BACKUP_DIR as needed. This supersedes the earlier manual-scheduling-only note. Off-host replication, production deployment validation and a real restore drill remain operator steps.

## Implementation update — 22 November 2026

Read `START-HERE-YOUR-STEPS.md` before following deployment examples above. This update supersedes the old assumption that every portfolio lookup automatically creates a wallet-index job: anonymous admission has been removed. The optional wallet index only processes already admitted wallets; its history remains partial.

A separate RIFT-native marketplace index now exists in `server/market-index.js`. Set `MARKETPLACE_ADDRESS`, the actual `MARKET_START_BLOCK`, and `MARKET_INDEX_DB` in the runtime environment. The web server does not implicitly load `.env`. `npm run market:sync` performs one bounded sync; `npm run market:worker` runs the managed loop. It is Node SQLite, not a cloud/D1 implementation. Never run multiple uncoordinated indexers intentionally; optimistic checkpoint checks reject concurrent commits.

`GET /api/v1/listings` is public, cursor-paginated and reports its indexed block/time. Check worker progress logs and age/block lag; `/healthz` remains server/Redis liveness, not complete index readiness. On a canonical checkpoint mismatch, stop, preserve the database for investigation, and rebuild a new database from the verified deployment block before switching the API and worker together. Do not delete a database while either process is using it.

Compose's optional `trading` profile adds `market-worker` and `market-backups`; these have not been Docker-tested here. Backups use the existing consistent SQLite backup script, stored separately under `/app/backups/market`. Its historical `wallet-index-…sqlite` filename prefix is reused there; the source is the market DB configured in that service. Off-host encrypted copies and restore drills still need implementation/operation. Local scheduled backup files alone are not disaster recovery.

The optional factory contract and frontend artifact are new and unaudited; no mainnet deployment is implied. `VITE_DROP_FACTORY_ADDRESS` remains blank until a reviewed source-verified factory exists. No automatic sponsored IPFS uploads or free-cloud backend port is live.

## Creator backend / edge pass 2

Read `LOCAL-ENGINEERING-UPDATE.md` for the latest scope. Creator services now accept authenticated writes under versioned routes; legacy APIs remain read-only. Configure exact `PUBLIC_ORIGIN` and persistent private `CREATOR_DB` for sessions/drafts/favorites/registration. Cookies use Secure on HTTPS and exact-origin CSRF checks; do not add wildcard CORS to make cross-host cookies appear to work. Open the preview as a first-party page if an embedded viewer blocks third-party cookies.

`PINATA_JWT` is server-only and optional; sponsorship is off at zero budgets. Use an exclusive provider account, finite conservative quotas, provider usage monitoring and independent original-file backups. Uncertain uploads are never automatically retried or unpinned; use the allocation ID/provider pin name to reconcile. Do not manually reset reservation totals without reconciling provider usage and permanent minted references.

Creator SQLite and any new cloud/D1 database need their own backup/restore and privacy/retention operations. Existing wallet/market scheduler wiring does not automatically back up `CREATOR_DB`; generalize the configured source into a separate tested backup job before production. This remains an operational release gate.

`edge/README.md` describes an actual locally tested creator + RIFT index Worker/D1 slice. It does not serve all legacy APIs. Never deploy it as a complete replacement for the current app until unmigrated routes and hosted Free-plan CPU/quota checks are resolved.

## Checked SQLite snapshots (wallet, market and creator databases)

Run using Node 22. This tool works on any of the local SQLite databases; use a
separate destination for each. A WAL-consistent backup may run with the service
up. Both the SQLite file and `.manifest.json` are required for restore.

```sh
npm run database:snapshot -- backup data/creator.sqlite backups/creator-YYYYMMDD.sqlite
npm run database:snapshot -- backup data/market.sqlite backups/market-YYYYMMDD.sqlite
```

Use the actual `CREATOR_DB`, `MARKET_DB`, and `INDEX_DB` paths from your configuration,
not an assumed default. Copy snapshots and manifests to a separate encrypted
operator-controlled location. Local snapshots alone do not survive host loss.
Creator snapshots include authentication and private draft data: restrict access,
encrypt off-host copies, and apply a retention/deletion policy. The SHA-256
manifest detects corruption, not malicious alteration by someone who can rewrite
both files. Keep an authenticated off-host copy of the manifest.

Restore drill: stop **all** readers/writers and scheduled workers first, then
restore to a fresh filename (the command refuses existing DB/WAL/SHM files):

```sh
npm run database:snapshot -- restore backups/creator-YYYYMMDD.sqlite data/creator-restored.sqlite --services-stopped
```

The tool verifies checksum, byte length and SQLite integrity before restoring,
creates mode-0600 files, then checks integrity again. Point the appropriate DB
environment variable at the restored file and restart. Verify sessions, drafts,
index head/canonical checkpoint, and chain configuration before enabling writes.
Do not delete the original until the drill has passed. Restored sessions may be
older than logout/revocation actions; invalidate creator sessions/nonces after a
production rollback. D1 requires its own export/Time Travel recovery procedure;
this local SQLite command is not a D1 restoration tool.

## V2 exchange (separate release, disabled by default)

Do not enable merely because tests pass. After independent review and explicit
mainnet deployment approval, record the real deployment address/block and verify
runtime against `public/exchange-contract.json`. Set `EXCHANGE_ADDRESS`,
`EXCHANGE_START_BLOCK`, `EXCHANGE_RUNTIME_HASH`, `EXCHANGE_INDEX_DB`. Start
`npm run exchange:worker` (or the opt-in Compose `exchange-v2` profile), let it
catch up, and inspect `/api/v1/exchange/capabilities`, `/listings`, `/offers` and
`/activity?nft=...`. Only after release approval set `EXCHANGE_TRADING_ENABLED=1`.
Disabling that flag stops new UI trades, not the underlying public contract;
refund/cancel/withdraw controls remain usable while configured. No proxy upgrades
are supported. Do not replace the original market address with the v2 address:
their ABIs and event indexes differ. The 32-checkpoint automatic recovery window
is bounded; deeper forks require a verified rebuild into a fresh database.
Snapshot `EXCHANGE_INDEX_DB` using the checked backup tool before rebuilds.

## Creator moderation and uncertain-pin reconciliation

These are trusted-shell commands, not public web-admin routes. Protect shell and
DB access; back up first. Notes (10–1,000 characters) are written to a private
attempt audit trail. A failed mutation may still have an attempt audit entry.

```sh
npm run creator:ops -- reports
npm run creator:ops -- hide ACTUAL_COLLECTION_ADDRESS "Evidence and reason for registry removal"
npm run creator:ops -- unhide ACTUAL_COLLECTION_ADDRESS "Evidence and reason for restoration"
npm run creator:ops -- resolve ACTUAL_REPORT_ID dismissed "Investigation and resolution evidence"
npm run creator:ops -- reconcile-pin ACTUAL_ALLOCATION_ID "Provider inventory reviewed for recovery"
```

Set the actual `CREATOR_DB`; only reconciliation needs server-only `PINATA_JWT`.
The last command reads at most five 100-row provider-inventory pages, matches
`RIFT-<allocation ID>` exactly, validates CID/storage, and recovers only a single
unambiguous pinned result. No match is NOT proof an upload failed. Reservations
stay consumed and no retries, unpins or quota releases occur. Over-budget size
pauses sponsorship. Verify actual provider file-count/bandwidth/retention policy
separately. Recovered CID does not prove independent replication or permanence.
Reference adapter endpoint: https://docs.pinata.cloud/api-reference/endpoint/ipfs/list-files

Visibility affects the RIFT factory registry only; it does not alter ownership,
contracts or independent source marketplaces. Public reports never auto-hide.
The CLI operates on local SQLite, not remote D1. Remote operator mutations need
the account's approved audited database workflow; do not expose this module as
an unauthenticated HTTP admin endpoint.

## New mandatory D1 migrations

Apply all four ordered files in `edge/migrations/` before running the updated
Worker: creator, market, dense-market staging, creator operations. Merely applying
the first two is no longer sufficient. Back up/export D1 first and use the real
account/resource ID. Local workerd acceptance does not certify hosted free CPU.

## Latest additions — supersede older migration/recovery limits above

The current Worker requires **seven** ordered migrations (0001–0007). Legacy
committed checkpoint forks now have bounded automatic recovery, and oversized
blocks can use resumable receipt discovery. V2 also has a native D1 implementation.
Full native D1 collection ingestion and fuzzy-catalog backfill remain unfinished.
See `edge/README.md` and `ENGINEERING-COMPLETION-CHECKLIST.md`; do not deploy only
the older four-file migration set with the new code.

## Deployment-scoped collection ingestion

Set `COLLECTION_INDEXES_JSON` to an array of actual address/startBlock/standard
entries (optional private database path), then run `npm run collection:worker`.
The opt-in Compose profile is `collection-ingestion`. Alternatively,
`INDEX_REGISTERED_COLLECTIONS=1` admits already receipt-verified factory registry
entries from `CREATOR_DB`; it does not admit anonymous supplied addresses.

Use actual deployment blocks. The standard transfer history must include mints:
a later arbitrary start block may be incomplete and can cause fail-closed balance
underflows. This index understands ERC721/ERC1155 standard transfer events, not
all custom accounting. API/UI holdings are confirmed event projections, not live
ownership certificates. Metadata/traits are timestamped, mutable snapshots.
Inspect `/api/v1/collection-items?address=...` and views `owners`, `traits`,
`activity`. Keyset token cursors are prefixed `i:` so token ID zero is never skipped.

## Monitoring and notifications (explicit opt-in)

`GET /api/v1/status` exposes only sanitized freshness/coverage. Unknown or
unconfigured is not ready. Set `MONITOR_BASE_URL` if checking HTTP process health,
then use `npm run ops:monitor`. No alert is sent unless `MONITOR_WEBHOOK_URL` is
explicitly configured as a trusted HTTPS destination. Destination URLs and secrets
are not printed. Monitor state is private, locked and atomically replaced.

`npm run ops:supervisor` runs periodic checks and, only when configured, encrypted
replication. Run it under the chosen host's process supervisor. A stale `.lock`
after a crash requires operator investigation before removal; do not blindly
start parallel jobs. Hosted notification delivery has not been tested here.

## Encrypted independent database copies and restore drill

Provide a **32-byte random key file outside the repository**, readable only by
its owner (0600). Keep an independent protected key backup: losing the key loses
the encrypted backups. Never commit it, put it in frontend config or print it.

Set `BACKUP_SOURCES_JSON` (unique safe kind names + actual SQLite paths),
`BACKUP_LOCAL_DIR`, `BACKUP_REPLICA_DIR`, `BACKUP_KEY_FILE` and retention (2–90).
`BACKUP_REPLICA_DIR` must be an operator-controlled mount whose off-host
independence and capacity you have verified. Two directories on the same disk
are not disaster recovery. No cloud storage subscription or remote mount is
created or paid for by this tool.

```sh
npm run ops:replicate
npm run database:encrypted -- decrypt /actual/replica/archive.riftbak /private/drill/snapshot.sqlite
# With all production readers/writers stopped, restore to a fresh destination:
npm run database:snapshot -- restore /private/drill/snapshot.sqlite /private/fresh/restored.sqlite --services-stopped
```

Replication first takes a WAL-consistent local snapshot, then streams an
AES-256-GCM authenticated encrypted copy. SHA-256 and SQLite integrity are checked;
files are private and publication refuses overwrites. Decryption authenticates
before publishing a usable snapshot/manifest. Each database snapshot is
individually consistent, not a cross-database atomic transaction. The tool caps
individual snapshots at 1 GiB. Retention prunes only its own named files after a
successful copy. Unrelated files are not deleted. Verify restore and retained-key
access before relying on this pipeline; encrypting a corrupt source is rejected.

These are **SQLite database** tools. They do not automatically archive IPFS DAGs,
validate independent pins, or export/restore remote Cloudflare D1 SQL. Those need
the provider's approved account workflow and separate hosted acceptance drills.
Local tests exercised encryption, tamper/wrong-key refusal, retention and recovery
after deleting the original isolated database, not a real remote outage.

## Browser-loss EOA replacement investigation

New journal entries record sender nonce, pre-prompt block and transaction-shape
hashes. Manual receipt checks can resume a bounded binary search over historical
account nonces and inspect the canonical replacement transaction. Same-semantic
replacements, cancellations and different transactions are distinguished. The
check does not sign, resend or run a dependent step. Providers may perform
additional internal chain validation beyond explicit method reads.

Old records, cleared local storage, relayed/smart-account transactions, missing
archive history/full-block support or canonical changes may still require manual
wallet/explorer investigation. No recovery code can reconstruct a deleted private
browser journal or guarantee arbitrary provider archive availability.

## Bounded Worker catalog backfill (new)

`EDGE_CATALOG_ENABLED=1` enables one Minted Cronos catalog page per scheduled tick.
The cursor and rows publish together under a D1 cache lease. Name normalization,
substring and trigram matching augment live venue search, including when live
search is unavailable. Coverage is **Minted only**, capped at 1,000 rows; check
`catalogComplete`, `catalogLimited`, `catalogCount` and `catalogUpdatedAt` rather
than treating this as a whole-network inventory. Completed/capped passes restart
after 24 hours. Partial passes are explicitly incomplete; upstream errors keep
only prior real results. This adds upstream calls, D1 writes and CPU; measure
hosted budgets before enabling. It is off by default, with no new migration.

## D1 SQL export and disposable-database restore tooling (new)

Install/review the account-approved Wrangler CLI separately and authenticate it
outside this repository. The tool never invokes a shell, auto-installs packages,
creates databases or changes account billing. Commands below explicitly authorize
remote operations; they were **not executed against a remote account here**:

```sh
npm run database:d1 -- export ACTUAL_SOURCE /private/backup.sql ALLOW-REMOTE-READ
npm run database:d1 -- restore ACTUAL_DISPOSABLE_DEST /private/backup.sql RESTORE-TO-ACTUAL_DISPOSABLE_DEST
```

Exports publish private SQL + a SHA-256 manifest without overwriting existing
files. Restore refuses the recorded source name, requires exact destination
confirmation and copies verified bytes to a private staging file before invoking
Wrangler. **You must independently ensure that the destination is disposable and
empty.** The helper does not prove that or roll back a partly failed SQL import.
Do not point it at another live production database. Run application queries,
row-count checks and owner/asset spot checks on the isolated restored database
before any separately authorized cutover. Database names are constrained to safe
letters/digits/underscore/hyphen identifiers.

SQL dumps can contain personal/account data. These files are private but **not
encrypted**: use approved encrypted storage and independent retention/access
controls. The existing SQLite-only encryptor must NOT be used on SQL text.
SHA-256 detects corruption against a trusted manifest, not a malicious actor who
can replace both files. Keep that manifest independently protected. Provider
export consistency/size/runtime constraints still apply; the helper caps exports
at 256 MiB and subprocess duration at three minutes. Local fixture tests prove
command construction and safety refusals, not a real hosted disaster recovery.

## Native D1 collections / CAR verification — newest continuation

Apply **all eight migrations**, including `0008_collections.sql`. Set explicit
`COLLECTION_INDEXES_JSON` entries with genuine address, deployment block and
ERC-721/ERC-1155 standard. Worker bindings permit at most 100 collections; Node's
optional registry auto-admission is not silently enabled on Worker.

Cron now rotates one configured legacy, v2, catalog, collection-ingestion or
collection-hydration job per tick. Collection selection advances independently of
the job rotation to avoid starving bindings with common schedule divisors.
Collections process one block over multiple invocations, four movements/reduction,
one receipt/slice and one token/hydration. APIs deliberately return 503 while a
block is pending or replay is rebuilding. A fork clears that collection and
replays from its deployment; it does not retain Node's checkpoint optimizations.
Do not expect rapid catch-up of years-old collections. Holder documents cap at
50 KB, pending state at 900 KB; overly large events fail closed. Metadata retries
after one hour, snapshots refresh after six hours, and only 16 traits/token hydrate.
This is conservative coverage, not high-throughput parity or hosted quota proof.

To verify operator-supplied CAR exports without contacting or pinning at providers:

```sh
npm run storage:verify-car -- EXPECTED_ROOT_CID /private/provider-a.car
npm run storage:verify-car -- EXPECTED_ROOT_CID /private/provider-a.car /private/provider-b.car
```

All block digests and supported-codec reachable links are verified. Missing blocks,
corrupt data or unsupported codecs/hashes fail closed. Raw, DAG-PB and DAG-CBOR
are supported with SHA-256/SHA-512; caps are 128 MiB/archive, 8 MiB/block and 100k
blocks. Two verified local files are NOT proof of separate failure domains,
pinning or future retention. Obtain exports through independently approved
provider workflows; verify actual host/provider/account independence and run
remote-loss drills. No download/upload/unpin or paid account is used by this CLI.

## D1 collection staging/recovery upgrade — migrations 0009–0010

Stop scheduled indexing before applying these migrations; back up/export actual
D1 first through the explicitly approved account workflow. Apply all ten ordered
migrations. 0009 invalidates any old, partially applied pending collection state
and marks that collection for safe replay; do not expect an old half-block to
resume as if it used deltas. No hosted migrations were run by this pass.

Normal processing now writes only token/holder/log deltas. A single D1 batch
publishes them with their checkpoint; readers can keep using the previous
committed snapshot. Coverage exposes `processing` and its true indexed boundary.
Initial ingestion and committed-fork recovery still return 503. A monotonically
increasing revision rejects multi-query pages crossing a publication or metadata
update. Indexers reread state after acquiring a lease to avoid stale pre-lease
state races.

Empty ranges adapt from 32 to at most 128 blocks; eventful/oversized ranges narrow
to a single block without skipping history. Dense single blocks retain receipt
fallback. Thirty-two checkpoints and token before-images allow four-token undo
slices toward a retained canonical ancestor; at most eight checkpoints are probed.
Pending-only forks discard deltas without deleting committed holdings. Retention
prunes undo data older than the oldest retained checkpoint. Short uncheckpointed
history can replay from deployment; forks beyond the retained/replay safety window
fail closed for operator recovery, never silently advance.

This supersedes the older always-one-block, always-503 and always-full-replay
limitations. Event-heavy backfills remain bounded and potentially slow; holder
projection/metadata caps and actual hosted quotas still apply. These changes are
not a CPU/quota certification or proof that every Node workload fits Workers Free.
