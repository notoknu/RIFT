# External account storage — Turso/libSQL integration

## Implemented

The Node creator service now supports `CREATOR_DB_DRIVER=libsql` using the official libSQL client. Existing authenticated profile, draft, favorites and session SQL uses the same prepared/bound adapter interface. The remote service is authoritative; connection failure never causes fallback to an ephemeral local account database.

Initialization is shared across concurrent first requests. Failed initialization may be retried on a later request; initialization failures close the client. Remote schema creation is idempotent. Runtime configuration observations use the same storage validator as the production API gate. They still do not assert provider durability or production acceptance.

URL validation permits only encrypted libsql/HTTPS database origins under `.turso.io`, without inline credentials, custom ports, paths or query strings. Credentials remain server-side. The adapter adds a bounded fetch timeout. This is an initial Turso-specific adapter, not a universal SQLite/Postgres URL interpreter.

## Owner setup required

1. Create a Turso account and free database using the official dashboard/CLI. Verify current limits and keep paid overages disabled. No account or billable resource has been provisioned here.
2. Obtain the database connection URL and a database-scoped authorization token. Do NOT send a personal organization-management token if a database token suffices.
3. Set these privately in the Render service environment (not in source, GitHub or VITE_*):

```
CREATOR_DB_DRIVER=libsql
CREATOR_LIBSQL_URL=<database's libsql://...turso.io URL>
CREATOR_LIBSQL_AUTH_TOKEN=<database-scoped token>
PUBLIC_ORIGIN=https://rift-q6qs.onrender.com
CREATOR_AUTH_TRANSPORT=cookie
NODE_ENV=production
```

With this driver, `CREATOR_STORAGE_PERSISTENT=1` and a local `CREATOR_DB` are not used as evidence of remote storage. The existing SQLite driver still requires its absolute persistent path and persistence acknowledgement in production. Never change the flag to bypass the database configuration check.

4. Keep uploads/trading disabled unless separately configured and accepted. A profile database does not host NFT images or make a wallet safe.
5. Publish the updated source and deploy through the owner's approved path. Merely setting environment variables on older source will not install this adapter.
6. Use a disposable wallet: sign in, save/reload, restart/redeploy, verify profile retention, test cross-wallet isolation, conflict detection and session revocation.
7. Establish provider-aware backups/export and an isolated restore drill before production. The local SQLite snapshot CLI does NOT automatically back up a remote Turso database. No migration of pre-existing SQLite/D1 account records is implemented by switching drivers.
8. Review quota monitoring, token rotation/revocation, availability and retention. Free-tier limits are not a guarantee of unlimited storage or production service levels.

## Evidence and remaining work

Adapter tests execute real libSQL SQL locally with the official SDK and exercise wallet authentication, two-wallet isolation, version conflicts, reopen persistence, profile export and session revocation. Tests also reject unsafe database endpoints and validate fail-closed initialization. They do NOT connect to a real Turso account or prove remote network/redeploy durability.

The native self-custody wallet scope is retained as a separate workstream. This adapter does not upload device entropy/keys, implement native signing or change wallet production approval. Native signer authorization, recovery, real-device testing and independent review remain outstanding.

## Provisioning update

The owner-supplied organization authorization was used to confirm organization `aipi` on the API-reported `starter` plan with overages disabled. Created group `rift-accounts` in `aws-us-west-2` and database `rift-accounts` with requested size cap `256mb`. No plan or overage change was made.

The actual remote adapter/account service passed schema initialization, disposable wallet-message auth, profile CRUD/isolation, concurrent version conflict, client reopen retention, export and scoped session revocation. Fixture records were cleaned up. These checks do not establish Render redeploy retention, off-host recovery or Android acceptance.

A 30-day database-scoped token was stored directly in the existing Render service environment along with `CREATOR_DB_DRIVER` and `CREATOR_LIBSQL_URL`. It was not put in source, output, or workspace files. Rotate the database credential before expiration through Render's environment; do not wait for an outage. The organization-management credential shared in chat should also be rotated.

At this update GitHub main `e2a4604cf8e43cd1032ec6485530e986a25b0815` lacks the adapter. No deploy was triggered and no account origin was enabled by this provisioning step. Upload the prepared latest source first, then deploy and perform live HTTP/redeploy acceptance. A direct database test is not a live-profile launch.
