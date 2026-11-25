# Consolidated major update — local work in progress

## Release policy

Accumulate changes locally; no per-fix GitHub upload requests, no Render deployment, no paid changes and no mainnet transactions during this batch. This document does not claim a completed two-hour autonomous session or a finished production platform. Existing hosted profiles remain separate from these new local endpoints/UI.

## Implemented in this batch

### 1. Private workspace privacy center

- `GET /api/v1/account/export`: transactionally consistent snapshot of the signed-in wallet's profile, launch drafts and account favorites. Bounds: at most 50 drafts and 1000 favorites; oversized legacy datasets fail rather than silently truncate.
- `POST /api/v1/account/delete-private`: typed exact confirmation, existing same-origin authentication protection, atomic removal of profile/drafts/favorites/stored nonces/sessions, followed by sign-out.
- Atomic batch support in local SQLite and libSQL adapters; real D1 uses its own native batch implementation.
- UI download and typed-confirmation deletion, with explicit retention disclosure. No wallet signing key, NFT transfer or IPFS unpinning involved.
- Deletion is not global erasure: public collections, upload/provider/moderation records, logs, backups, device files and chain records remain. Already-authorized in-flight requests are not canceled; fresh wallet sign-in remains possible.
- No account-wide automatic restore/import is implemented in this batch. Export is a plaintext private-workspace snapshot, not every retained service record or a wallet backup.

### 2. Source-verification center

- Read-only Cronos contract status lookup against the fixed official Sourcify API.
- User-confirmed submission of matching bundled Standard JSON/compiler inputs for this app's recorded deployment.
- Matching build hashes required; old/mismatched builds must use their original artifacts.
- Saved job identifier, manual refresh, reload recovery and job-receipt export.
- Pending/accepted jobs are never displayed as successful verification; failed jobs stay failed. Response chain/address/job identity is checked and response size/time are bounded.
- No automatic submission, repeated polling, blind resubmission, wallet signature or gas payment. A network timeout is an uncertain submission; check public status first.
- Explicit CSP allowance for `https://sourcify.dev`; no broad new egress wildcard.
- Browser CORS/provider availability can still fail. Verification ZIP remains a fallback. Source matching does not constitute independent security review or marketplace approval.

### 3. Mobile profile/wallet-picker fix

The previous targeted fix is included in this consolidated source: noninteractive pending status cannot intercept clicks; mobile placement resets the desktop top coordinate. Browser regression now performs the actual initial wallet selection at 393×852 before continuing desktop scenarios. This fix is not deployed during this batch.

## Evidence

- 229 engineering tests and 6 implementation checks passed in the consolidated regression run.
- Tests cover atomic rollback, adapter statement ownership, per-wallet isolation and retention, exact confirmation and cookie/bearer behavior through SQLite and libSQL SDK databases.
- Real workerd/D1 test additionally exercises the new workspace export and deletion routes.
- Browser scenarios cover workspace download, typed deletion, fresh empty-account sign-in, mobile wallet selection, source-verification submit/job failure and job recovery. Verifier submission is mocked: no real verification job was published.
- Worker/D1 browser and split-auth suites passed. Frontend build passed.
- Final browser regression rerun passed; all 7 security checks passed, including real Redis shared rate/concurrency limits. Logs: `/home/user/RIFT-major-update-tests.log` and `/home/user/RIFT-major-update-final-checks.log`.

## Still unfinished

- Native signing, signer recovery/threat-model review, real-device acceptance and production Android signing.
- Provider-aware independent remote database backup/restore and migration acceptance.
- Direct creator-owned pin-provider integrations and production upload/moderation operations.
- Complete launch recovery and provider/marketplace acceptance beyond these implemented paths.
- Exact contract review, production indexing and integrated trading acceptance.
- Full performance/security/abuse acceptance and remaining backlog items in REMAINING-WORK.md.

No new APK or source release archive is issued for this intermediate batch. Consolidate and review before one major release handoff.
