# RIFT account security and recovery

## Implemented source behavior

Accounts use wallet-message authentication. A public address identifies the session; there is no Discord dependency and no server-held wallet seed/private key.

### Private profile export

`GET /api/v1/profile/export` requires the same authenticated session as the editor. It returns only the caller's private profile, address, version and timestamps in `rift-private-profile` format version 1. It is `no-store`, contains no session credential, and does not export other wallets' data.

The profile UI offers a confirmed local download using the existing browser/Android export transport. The file is plaintext private data: store it securely. This is **not** a full account export, wallet backup or automatic restore package. Drafts, favorites, uploads and collection registration records are not part of this export.

### Revoke active account sessions

`POST /api/v1/auth/logout-all` requires a valid session, the existing exact-origin/CSRF rules, and JSON `{ "confirm": "REVOKE ACTIVE SESSIONS" }` with no extra fields.

The service deletes all currently stored session records for the authenticated wallet in one SQL statement, clears the current cookie where applicable, and the UI clears the optional in-memory bearer session and returns to sign-in. Another wallet's sessions remain valid. Profiles/drafts/funds remain unchanged.

This operation does NOT disconnect wallet applications, revoke on-chain token approvals, cancel already running authorized requests, invalidate pending sign-in challenges or prevent someone holding the wallet key from signing in again. A compromised wallet key requires a separately designed, owner-approved identity/asset migration; profile session revocation is not key recovery.

## Local storage capability probe

Run with supported Node 22:

```
npm run accounts:storage-check -- /absolute/intended/storage/directory
```

The probe creates a unique disposable child directory, writes a fixture profile database, verifies close/reopen and 0600 database permissions, snapshots it, verifies fresh-destination restoration, and removes the probe directory. It never opens an existing account database and does not expose its directory in the report. Files already in the target directory are left alone. If needed, the supplied base directory is created; no paid volume is provisioned.

A successful probe means SQLite and recovery operations work **right now on that filesystem**. It does not verify persistent mount configuration, retention across a host replacement/redeploy, off-host backup retention, encrypted backups, or production readiness.

## Hosted acceptance — still required

1. Owner authorizes durable storage architecture and any hosting cost.
2. Verify actual persistent mount, exact HTTPS origin and database path; then apply existing production gate configuration.
3. Run the capability probe on the intended volume.
4. Use a disposable wallet to save a non-sensitive profile through the real API.
5. Restart/redeploy and verify retention and session behavior.
6. Take a protected backup and restore into an isolated destination; never overwrite the active database for testing.
7. Test cross-wallet isolation, conflict handling, expiry and active-session revocation.
8. Establish encrypted off-host backups, retention, monitoring, access control and incident response.

No hosted storage is provisioned or activated by this document. Android's account UI shares these APIs, but real-device pairing/export/lifecycle acceptance remains separate. This batch does not change the device vault, enable signing or approve a production wallet release.

## Local major-update extension

The new privacy center adds `/api/v1/account/export` and `/api/v1/account/delete-private` with transactional profile/draft/favorite export and atomic removal of stored private workspace records, sign-in challenges and sessions. Typed confirmation is `DELETE PRIVATE WORKSPACE`. See MAJOR-UPDATE-WORKLOG.md for retained record classes and in-flight request limits. This is not full retained-service-data export/erasure or wallet recovery, and the new endpoints have not been deployed in this batch.
