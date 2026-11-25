# Local SQLite recovery evidence and operator limits

## What the current regression actually does
checks/sqlite-crash-recovery.test.mjs forks a child using the real server IndexStore against a unique temporary SQLite database, sets FULL synchronous/WAL mode, commits one synthetic wallet observation/checkpoint and optionally begins an uncommitted conflicting update. The parent confirms a nonempty WAL, kills the child using SIGKILL without closing the database, reopens it and verifies the committed checkpoint/candidate survived while the uncommitted state did not. It then creates a consistent snapshot, restores it to a separate path, opens the restored application store and compares state/candidates. Both cases are disposable, local and network-free; test data is not a funded wallet and no real user database is opened.

This is stronger than orderly close/reopen, but NOT host power-loss/disk-loss, Render redeployment, remote libSQL/Turso restore, D1 provider restore or Android process-death evidence. It checks IndexStore, not every application database/service. SQLite/filesystem semantics may differ on a real host.

## Hardened snapshot/restore behavior
- Online SQLite backup uses a private temporary file, integrity check, SHA-256, table manifest and default 256 MiB limit (caller can select a smaller valid bound).
- Existing backup data OR manifest prevents publication. A target collision does not overwrite an existing file. Backup data and manifest publication are not a multi-file crash-atomic operation; an abrupt crash between publication steps can leave a manifest without data. Verify both and choose a fresh path after inspecting an interrupted attempt.
- Restore requires explicit stopped-service acknowledgement; the script cannot prove services are stopped.
- Manifest is capped at 64 KiB, validates version/hash/size/table types, and data is bounded before and after reading.
- Restore validates a private staged copy of the exact checksummed bytes, checks the table list, then publishes to a fresh path without overwrite. Existing destination/WAL/SHM blocks restore.
- Main snapshot/restored files are mode0600. IndexStore creates new directories0700 and its main database0600 before WAL initialization. Existing directory permissions and preexisting sidecars are not automatically rewritten; inspect them separately when migrating an old deployment.
- SHA-256 proves consistency with the manifest, not authenticity against an attacker who can alter both. Snapshots are plaintext sensitive data and require private access controls and approved encryption/retention for off-host copies. Never put real snapshots on public Filebin.

## Local operator commands
Run with the project's supported Node22 runtime:

    node --test checks/database-snapshot.test.mjs checks/sqlite-crash-recovery.test.mjs
    node scripts/database-snapshot.js backup /private/source.sqlite /private/fresh-backup.sqlite
    node scripts/database-snapshot.js restore /private/fresh-backup.sqlite /private/fresh-restored.sqlite --services-stopped

Use approved private paths and stopped readers/writers before restore; never point a drill at production. Compare application-level records and test credentials/account isolation separately before any production cutover. A valid schema/table list alone is not semantic business-data validation. Snapshot intentionally rejects files beyond its cap rather than claiming all production database sizes are supported.

## Still required for hosted acceptance
Authorized account/provider access, confirmed persistent mount or remote database configuration, restart/redeploy tests, off-host encrypted retention, independent restore on a disposable hosted target, application/account-isolation validation, token rotation/expiry, quota/overage checks, and documented RPO/RTO/rollback. No such hosted acceptance is established by local tests.
