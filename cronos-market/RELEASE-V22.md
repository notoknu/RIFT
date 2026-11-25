# RIFT v22 — consolidated creator/privacy preview

This is a complete clean source bundle plus a newly built Android testing APK, not a production wallet/trading approval.

## Included changes

- Private workspace snapshot export and typed-confirmation atomic deletion of profile/drafts/favorites/stored sign-in challenges/sessions.
- SQLite/libSQL transactional batch support and D1 integration coverage.
- Source-verification center: read-only lookup, confirmed matching-build submission, saved job receipt, manual refresh and honest pending/failed/matched states.
- Mobile pending-banner fix so status does not obstruct the wallet picker.
- Previous remote account adapter, release manifest, account-security/recovery and creator workflow integrations.

## Deployment boundary

Installing this APK does not update the Render backend. The last verified hosted commit was 3ae9e3dbcaa23ed3c40f08ff943b3d1ae11e8bea, where private profiles were activated against Turso and survived a tested redeployment. New workspace export/deletion endpoints in this package remain local until source publication and backend deployment. The new APK can display these controls while an older backend rejects them; do not describe those errors as data loss or blindly retry deletion.

No Render deployment or GitHub publication is performed by building/downloading this release. Upload the source once when ready for a consolidated deployment. Keep environment credentials in Render only. The database token configured during earlier setup has a 30-day lifetime; owner rotation is required before expiry.

## Safety

Debug-signed preview package io.rift.cronos.preview, version code 22, minimum Android 8.0/API26. Preserved signing identity supports updating earlier provided preview APKs without uninstalling. Back up important data before updating; do not clear data or uninstall to fix backend errors. No real-device acceptance was performed by this build.

Native vault signing is not implemented/approved. Do not import funded-wallet recovery phrases. Profiles never back up wallet keys. Gas, royalties, approvals, external providers and trading remain independently gated. No mainnet transaction was sent for this release.

Workspace export is plaintext and excludes retained public/provider/moderation/log/backup records and device/on-chain assets. Deletion does not erase those retained classes or cancel already-authorized in-flight requests. Source verification does not constitute an audit; verifier submission was mocked during automated tests, with no real verification job published.

## Excluded from all deliverables

Private testing wallet, seeds/keys, provider/management tokens, signing/ADB keys, environment secrets, runtime databases/backups, node_modules, SDK/JDK and caches. The secret-bearing project reference attachment is not included. Source heuristic checks are not a guarantee of absence of secrets or legal licensing clearance.

## Build

Source archive root contains cronos-market/ and repository-level files. Use supported Node 22 >=22.13. In cronos-market run npm ci --include=dev --ignore-scripts, npm run contracts:export when regenerating contract artifacts, then npm run build. Start npm start with reviewed server environment. Native build needs JDK17 and Android SDK35; npm run android:prepare bundles frontend assets. Review environment examples and remote account documentation before enabling services.

Remaining release-critical work is recorded in REMAINING-WORK.md and MAJOR-UPDATE-WORKLOG.md. This release does not claim completion of all roadmap items or of a multi-hour unattended work session.
