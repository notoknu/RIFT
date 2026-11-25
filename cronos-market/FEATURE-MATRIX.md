# RIFT feature availability — audit remediation batch 1

This document is the human-readable release index, not a claim that every feature is enabled. `/api/v1/release` is the machine-readable **Node runtime configuration observation**. It is not a test-results importer and does not establish production approval. Worker/D1 runtime manifest parity is not implemented in this batch.

| Feature | Source | Latest recorded local evidence | Hosted / Android acceptance |
|---|---|---|---|
| Collection discovery | Implemented, source-scoped | Existing browser and engineering coverage | Depends on current upstream providers; not chain-wide completeness |
| Token inventory/activity/traits | Implemented for admitted indexed collections | Collection/index suites exist | Historical backfill and large-scale acceptance unproven |
| Profiles/favorites/drafts | Authenticated API + SQLite/D1 + UI | Local sessions, isolation, optimistic edits, snapshot/restore tests | Hosted durable volume and redeploy/restore acceptance outstanding |
| IPFS uploads | Limited operator-funded adapter | Local reservation/quota tests | Requires operator provider configuration; no universal free pinning |
| Creator launch | On-chain generated/shared SVG or IPFS | Contract/metadata/browser tests | External verification automation and provider integrations incomplete |
| Marketplace v1 | ERC-721 escrow source | Local/adversarial contract suite | No production-approved deployment |
| Exchange v2 | ERC-721/ERC-1155, offers, bulk logic | Local contract/model/index tests | Disabled unless explicitly configured; independent review and wallet/hosted acceptance outstanding |
| Native wallet | Encrypted experimental vault; no approved signer | JVM/build/lint baseline | No production wallet approval or real-device sign acceptance |
| Release manifest | Added to Node `/api/v1/release` and About UI | Six dedicated API/configuration tests; build passed | Not deployed in this batch; Android bundle not rebuilt |

## Corrections to the supplied documentation audit

Do not equate production-unaccepted with source-missing. Token inventory, traits/activity, transaction recovery, ERC-1155 exchange logic, offers and bulk purchase have implementations and tests in the repository. They must be reviewed and accepted, not blindly reimplemented. Auctions and complete external order aggregation must not be inferred from offer support.

The previous GitHub/Render upload included v21 frontend and creator API source. That narrows the broad source/deployment gap, but does not activate profiles, configure index workers or make the native wallet a signer. This batch makes no new live check or deployment claim.

## Evidence rules

1. Implemented: inspect concrete source paths and behavior.
2. Locally tested: retain a timestamped run and logs; never infer from code presence.
3. Configured: observe only allowlisted settings. A persistence flag is not durability proof.
4. Accepted: record exact build/commit, environment, scenario, result and reviewer.
5. Production-approved: requires completion of release-critical external/security/device gates; no environment variable grants this status.

## Remaining P0 work

- Revoke exposed credentials; inspect and remediate history without copying credentials into reports.
- Select and provision durable database/media infrastructure with owner approval; no paid resources authorized by this document.
- Hosted profile restart/redeploy and isolated recovery drill.
- Exact trading-contract review, signer/admin custody and validated deployment/index configuration.
- Real-device WalletConnect/signing lifecycle, protected release keys and app-update acceptance.
- Monitoring, incident response, backup retention and abuse/load acceptance.

No trading is enabled and no mainnet transaction is authorized by this matrix.

## Follow-up: account safety and recovery tooling

Added private-profile export (`GET /api/v1/profile/export`), scoped active-session revocation (`POST /api/v1/auth/logout-all`), UI controls and a non-destructive storage probe (`npm run accounts:storage-check -- /absolute/directory`). See [ACCOUNT-SECURITY-AND-RECOVERY.md](ACCOUNT-SECURITY-AND-RECOVERY.md).

Cookie and bearer tests cover isolation, explicit confirmation, invalidation of multiple sessions, survival of another wallet's sessions, and fresh login without losing the profile. Browser tests exercise the real local API, exported file contents and return to signed-out UI. The storage probe tests preserve a pre-existing file and confirm cleanup. No hosted durability, key recovery or production approval is inferred.

This source batch was not deployed and the APK was not rebuilt. Profiles remain subject to the existing persistent-storage gate. Account export is profile-only, not a complete account export or a wallet backup.

## Follow-up: external account database adapter

Node now has an optional authoritative Turso/libSQL account adapter (`server/remote-d1.js`) and shared production configuration validation (`server/account-storage-config.js`). It supports the existing account service without local fallback when the remote backend fails. See [REMOTE-ACCOUNTS.md](REMOTE-ACCOUNTS.md).

The adapter was tested with real SQL through an isolated local libSQL SDK database. No external database account was created, no remote token was configured and no hosted durability is claimed. Provider-aware backup/migration and remote acceptance remain incomplete. Native self-custody wallet support remains in the requested release scope, but native signing is still unimplemented/unapproved.

## Provisioning follow-up

Turso database/group `rift-accounts` were created under `aipi`, Oregon, with requested 256 MB database cap, existing starter plan and overages disabled. Real remote account-service tests passed with disposable wallets/cleanup. A separate 30-day database token is stored in Render's server environment only. GitHub source publication, live profile activation, hosted restart/redeploy and recovery acceptance remain outstanding; this is not an APK/wallet production release.
