# RIFT v20 — one Render-connected app

## Implemented

- Default backend: https://rift-q6qs.onrender.com. Gradle and the native connection policy both provide that default.
- Removed the Offline / Direct-read / Hybrid selector and the disconnected-interface entry button from normal UI. Internal legacy mode identifiers remain only for compatibility and explicit network pause.
- A fresh install opens the bundled frontend directly at the Render API origin. API requests/cookies are same-origin. Native settings and wallet vault are under Advanced settings.
- Existing explicit network pauses remain paused. Existing custom HTTPS backend URLs and provider credentials are not silently overwritten. Legacy connected direct/offline configurations migrate to the single backend-connected path.
- The status banner probes backend HTTPS /healthz with a bounded timeout, verifies chain ID 25, and offers Retry. It does not require direct RPC success just to use the backend. A passing health response is NOT proof creator/trading features are configured.
- Native wallet keys/seeds remain device-local; native signing remains unapproved/disabled. No seed/profile credential upload.
- Configured WebView assets receive a restrictive script-self CSP and no-referrer policy; file/content access, mixed content, third-party cookies and TLS bypass remain disabled.

## Profile storage

Authenticated endpoints: GET, PUT, DELETE `/api/v1/profile`. The wallet comes only from the verified server session, never from the submitted document. The profile is private by default and separate from the public on-chain address/portfolio page.

Fields: display name (48 characters), bio (500), optional credential-free HTTPS website (300), optional IPFS avatar URI (512). No other fields or credential keys accepted. Do not put secrets in these plain-text fields. Render storage is NOT a wallet backup service.

Updates/deletion require the current version; stale changes return 409 rather than overwriting newer edits. Private profile controls appear under the connected Portfolio/Account page and Creator account tools. Saving requires a wallet-message account sign-in, which costs no gas.

Schema: `creator_profiles` in the SQLite adapter; migration `edge/migrations/0011_profiles.sql` for any optional D1 deployments. The Render SQLite schema adds the table without deleting previous records. Existing snapshot tooling includes the new table automatically; restore was tested into a fresh destination.

## What the new APK does not solve

The live Render backend still needs the updated source deployed and persistent account storage configured. A new APK does not modify the hosted service. Current backend health and directory browsing can work while profile routes are unavailable. No provider setting was changed by the assistant.

A native Android WebView does not automatically have a browser wallet extension. Account sign-in needs a supported external-wallet integration, e.g. a configured WalletConnect project ID plus real-device pairing acceptance. The native testing vault is NOT a web signer. Do not claim native profile login works solely because the profile API unit/browser tests pass.

This remains a debug-signed testing build, not Play Store/production-wallet approval. App data, browser origin data and wallet material must be backed up before uninstalling or changing origins. Updating the APK must not require uninstalling if its signing identity matches.

## Required Render deployment configuration (owner-controlled)

No paid service or disk has been provisioned. A persistent Render disk/always-on plan may require payment; obtain owner approval and check current provider terms before changing a plan. Do not label free ephemeral storage durable.

Service root directory: `cronos-market`.
Build: `npm ci --include=dev --ignore-scripts && npm run build`
Start: `npm start`
Node: supported Node 22 release, >=22.13.

Replace the OLD inline/base64 Surge-CORS bootstrap build command if switching fully to the Render domain. The normal frontend build uses relative same-origin APIs. Do not use the Surge-specific hosted entry or set `VITE_PUBLIC_API_ORIGIN`/`VITE_CREATOR_API_ORIGIN` for this normal same-origin build. Keep those frontend origin variables unset for the native bundle too.

Account environment, ONLY after persistent storage and recovery have been verified:

- `PUBLIC_ORIGIN=https://rift-q6qs.onrender.com`
- `CREATOR_AUTH_TRANSPORT=cookie`
- `CREATOR_DB=/var/data/rift/creator.sqlite` (must be on the actual mounted persistent volume)
- `CREATOR_STORAGE_PERSISTENT=1` (explicit operator acknowledgement; not automatic proof)
- `NODE_ENV=production`
- `ALLOW_SINGLE_PROCESS_LIMITS=1` only for a single instance, or reviewed Redis configuration.

Without an absolute creator DB path AND the persistence acknowledgement, production creator routes return 503. Keep upload quotas at zero and storage provider secrets absent until separately configured/tested. Keep trading disabled until contract review/deployment/indexing are complete. Same-origin sessions continue using HttpOnly Secure SameSite=Strict cookies.

If persistent Render storage is not authorized/available, leave accounts disabled rather than promising saves will survive a deployment. A different durable database/provider needs an appropriate adapter; pasting a Postgres URL into this SQLite path is not supported.

## Verification scope

Engineering tests cover authentication, profile isolation, optimistic versions, persistence on reopening SQLite, snapshot/restore, and production ephemeral-storage rejection. Browser tests include a real local creator API profile save and reload. These are not deployed Render persistence/restore or device-wallet acceptance.

The Android JVM suite includes explicit default-backend and user-pause policy tests. Instrumentation is compiled unless its actual execution is separately reported. No mainnet transaction is needed or sent for profile storage or this APK rebuild.
