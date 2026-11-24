# Keep every user-facing page on https://rift.surge.sh

## Current result

The public Surge site is working, including the sampled collection images. This update adds an **opt-in, staging-grade cross-site creator session transport** so the frontend can remain on Surge while its creator API runs elsewhere. It is NOT live, independently security-reviewed or a production launch approval. Do not upload this source patch directly to Surge.

### Architecture

- Frontend and all navigation: `https://rift.surge.sh`.
- Existing public directory/media/portfolio API: Render at `https://rift-q6qs.onrender.com`.
- Creator API: either a persistent Node backend or an API-only Cloudflare Worker with D1.
- `VITE_PUBLIC_API_ORIGIN` controls public reads. Separate `VITE_CREATOR_API_ORIGIN` controls creator calls. Neither value is a secret.
- Browser creator calls go directly to that HTTPS API, with exact frontend-origin CORS and `credentials: omit`; no cross-site cookie dependency.
- Sign-in remains a wallet message, not an approval, transfer or gas transaction.

### Security properties and tradeoffs

The default mode remains unchanged: public-only split hosting, same-origin HttpOnly cookie sessions on conventional deployments. Bearer transport requires explicit backend `CREATOR_AUTH_TRANSPORT=bearer` and an explicit frontend creator API origin.

The new mode uses random 256-bit opaque sessions, stores only their hashes server-side, expires them after one hour and holds the browser copy only inside a module closure. It never writes the session token to localStorage, sessionStorage, IndexedDB or cookies, and removes it from responses returned to UI callers. Refreshing the page requires signing in again. Logout revokes the server session. Wallet account/disconnect/network changes clear the in-memory token, but are not a server-side revocation of a previously stolen token. The server TTL remains important.

Every creator request must carry exact `Origin: https://rift.surge.sh`. Only registered creator routes/methods and Accept/Content-Type/Authorization headers receive CORS permission. No wildcard origins or credentialed-cookie CORS. Non-creator cross-origin writes stay blocked. Challenge replay, wrong signatures, expiry and per-wallet data isolation remain enforced. Cancellation and stale-response races are tested.

A JavaScript-accessible bearer token is not equivalent to an HttpOnly cookie: an XSS or compromised frontend dependency can act as the user or steal it while the page is open. This change therefore needs security review, dependency discipline and hosted acceptance. The Surge builder now adds a script-self/object-none/base-none CSP meta tag and no-referrer policy, but this does not eliminate XSS, malicious dependency, extension or compromised-device risk. CSP connect/image access remains HTTPS-wide to support user-configurable RPC/media providers.

## Persistent backend: recommended free-tier-compatible path

An API-only Worker plus D1 avoids depending on an ephemeral free Render SQLite filesystem. This is an alternative for the CREATOR API only, not a website move. Account eligibility, quotas, retention/backup and any provider billing settings must be checked by the account owner. Do not enable paid/automatic upgrades just to follow these instructions.

The assistant has not provisioned or deployed a provider resource and has no authorized management credentials in this session.

From the project directory `cronos-market` after merging this source update:

1. Install dependencies with `npm ci` and log in to your own Cloudflare account locally using `npx --yes wrangler@4 login`. Never share that login or API token in chat.
2. Create a D1 database with `npx --yes wrangler@4 d1 create rift-core`. If you already have the appropriate database, list it instead and use its actual ID. Do not create duplicates blindly.
3. Set `D1_DATABASE_ID` in your local terminal to the REAL ID returned by your account, then run `node scripts/configure-creator-edge.mjs`.
   - Bash/macOS/Linux: `export D1_DATABASE_ID='YOUR_ACTUAL_DATABASE_ID'`
   - PowerShell: `$env:D1_DATABASE_ID='YOUR_ACTUAL_DATABASE_ID'`
   These are placeholders to replace locally, not working IDs. The ID is configuration, not a signing credential.
4. Inspect `wrangler.creator.generated.json`. It must use `PUBLIC_ORIGIN=https://rift.surge.sh`, `CREATOR_AUTH_TRANSPORT=bearer`, the actual D1 binding, no assets binding, no schedules, zero upload quotas and disabled exchange trading.
5. Apply all migrations: `npx --yes wrangler@4 d1 migrations apply rift-core --remote --config wrangler.creator.generated.json`.
6. Deploy: `npx --yes wrangler@4 deploy --config wrangler.creator.generated.json`.
7. Record the ACTUAL HTTPS workers.dev API origin printed by your account. Do not guess it. Keep generated config private/untracked; both gitignore files now exclude it.

Uploads intentionally stay disabled. Enabling them additionally requires a server-only storage provider credential, explicit finite file/byte quotas, retention/bandwidth/abuse policies and hosted failure/recovery tests. Never put a Pinata JWT in frontend build variables. D1 persistence is not an independent backup; configure and test recovery before a public creator launch.

### Rebuild Surge only AFTER the creator backend is ready for acceptance testing

Set both variables locally:

- `VITE_PUBLIC_API_ORIGIN=https://rift-q6qs.onrender.com`
- `VITE_CREATOR_API_ORIGIN=the ACTUAL HTTPS creator API origin from step 7`

Run `npm run build:surge`. Publish only `dist` using `npx --yes surge@0.58.0 dist rift.surge.sh`, authenticated under your own Surge account. Never publish this source tree, database, generated provider config or wallet files. Do not rebuild with an invented/inactive creator origin.

The user remains on `rift.surge.sh`; browser API calls still necessarily contact the backend provider.

## Alternative: persistent Node/Render backend

Only use a backend with verified persistent DB storage and recovery. Set exact `PUBLIC_ORIGIN=https://rift.surge.sh`, `CREATOR_AUTH_TRANSPORT=bearer` and an absolute persistent `CREATOR_DB` path. Preserve other reviewed runtime limits and disabled trading flags.

The existing live Render build command embeds an OLD bootstrap that overwrites CORS helpers; it must not be reused for this mode. After the updated source is present, the reviewed replacement build command is:

`npm ci --include=dev --ignore-scripts && node deployment/apply-render-preview.mjs && npm run build`

Start command remains `npm start`; repository root directory remains `cronos-market`. `server/production.js` remains byte-identical to the pinned source. The patch script opts in to creator CORS only when the runtime env selects bearer mode. Do not claim free Render SQLite is durable without verifying the actual storage setup. No Render setting was changed by this update.

## Tests completed

- 193 integrated engineering tests passed.
- 6 implementation checks and 7 real-Redis security checks passed.
- Existing same-origin creator browser login/draft persistence and other implementation browser scenarios passed after resolving a stale-401 session race; a regression test covers it.
- Existing built frontend + Worker/D1 browser session passed.
- New real local HTTPS Chromium test across different sites passed: CORS/preflight, wallet-message login, draft save/list, logout, no reload restoration.
- New real Worker/D1 emulator test passed: exact-origin CORS, hostile-origin rejection, bearer login, D1 draft save/list and logout revocation.
- Surge build with CSP passed; candidate decoded three real Render-hosted collection images without cross-origin blocks.
- Source audit had no heuristic findings. No independent audit or licensing review is implied.

These tests use isolated temporary databases and disposable local test wallets. They do not establish deployed-backend persistence, disaster recovery, all-image availability, multi-user capacity, real-device wallet security, or marketplace contract readiness. The funded mainnet testing wallet was not loaded or used for signing by this change. No mainnet transaction was sent.

## Still not activated or solved by this update

Creator hosting account provisioning, hosted security/acceptance tests, backup/restore and quotas, launch factory/marketplace contract review/deployment and indexing, production mobile/self-custody-wallet security, legal/licensing and monitoring remain separate work. A creator-session bearer token authenticates an account; it is not a wallet private key and cannot sign blockchain transactions.
