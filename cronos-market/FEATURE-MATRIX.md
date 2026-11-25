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

## Consolidated major-update branch (local only)

New private-workspace export/deletion and transactional batching are implemented in source across local SQLite/libSQL, with D1 integration coverage. Source-verification lookup/submission/job tracking UI is implemented with matching-build checks and explicit user confirmation. Mobile pending-banner fix is included. See [MAJOR-UPDATE-WORKLOG.md](MAJOR-UPDATE-WORKLOG.md) for exact scope, exclusions and evidence. No real verification submission or deployment was performed; the existing live profile flow is unchanged. Older statements about missing automatic verification describe the previous release; the new UI automates submission but refresh is manual and provider acceptance remains external.

## Post-audit continuation evidence

Exact current build evidence: ANDROID-BUILD-REPORT.json and evidence/CONTINUED-PIPELINE.json. Local regression: 234 engineering, 7 security including Redis, 6 implementation, full browser/edge/split-creator, 42 Android JVM tests passed. Android lint: 0 errors/8 warnings. Contract clean compile and 40 tests passed; hashes in evidence/CONTRACT-POST-AUDIT-VERIFICATION.json. Instrumentation compiled but not executed. No device acceptance or independent review implied.

V2 seller confirmation now shows fresh gross/royalty/recipient/net estimates before approval for listing or accepting an offer. Rejects unsupported royalties and failed reads; royalties above 10% reject execution rather than being silently capped. Order cards disclose gross and deduction policy. Runtime estimates can change; partial-fill rounding may differ from a total-quantity quote.

Hosted source remains the earlier commit; latest local changes NOT deployed. V2 trading disabled. License choice still unresolved. These facts override any inferred completion from feature presence.

## Wallet/launch continuation (local source only)

Current local regression: 266 engineering tests and 7 security tests including Redis passed; frontend and complete implementation browser suite passed. See WALLET-FIRST-PLAN.md for batch-level limits/evidence. Wallet session hardening, foreground refresh, connection cancellation protection, bounded read-only RPC fallback and fixed-block collection snapshots are implemented locally. Launch read-provider choices are scoped to launchpad reads. Mint now requires fresh preflight/simulation and explicit mint+gas cost review, with signer/network recheck and repeat simulation before tracked submission. This is NOT full launchpad, real-wallet, device, hosted or contract-audit acceptance. None of these continuation batches is included in the previous distributed APK/archive or deployed backend.

### Consolidated v23 snapshot

The v23 APK now bundles the wallet/launch continuation described above. Exact evidence in ANDROID-BUILD-REPORT.json and RELEASE-V23.md: 267 engineering, 7 security, 6 implementation, 46 local contract and 42 JVM tests passed, full implementation browser suite passed. Instrumentation was compiled, NOT executed; no live wallet/mobile relay acceptance. Device-clock mint checks replaced by chain timestamp. Backend changes remain local, exchange not deployed/trading not activated. Historical statements about the previous distributed APK refer to v22, not this v23 build.

### Post-v23 marketplace client acceptance

Current local contract suite: 54 passed, including 8 client-to-compiled-exchange acceptance tests (isolated EDR only). Client settlement rechecks release activation/address/runtime after approval; exits remain available while disabled; private self-listings reject before approval; expiry checks use chain time. Confirmed approvals can survive later failure and must be reviewed/revoked separately. Regression: 267 engineering, 7 security, frontend build and full implementation browser passed. These source changes postdate the v23 APK; no deployed/mainnet/external-marketplace acceptance implied.

### Post-v23 royalty re-review

Seller royalty estimates are re-read after approval; changed royalty/recipient prompts renewed consent before listing/offer acceptance. Explicit block-tagged reads reduce stale latest-cache exposure but do not lock royalties on-chain. Controlled local acceptance demonstrates declining a 5% -> 10% change after approval prevents listing/escrow while leaving the approval active. Current source verification: 55 local contract and 271 engineering tests, 7 security, frontend build and full implementation browser suite passed. Not included in the existing v23 APK; no live trading/independent-audit claim.

### Post-v23 durable Node exchange indexing

Actual compiled exchange -> Node SQLite -> local API integration now verifies fills/offers/refunds, restart persistence, bounded backfill, pagination, and orphan-fill removal/replacement replay. Node index validates each event block hash, safe numeric positions and duplicate global block-log positions before commit (bounded header-read concurrency4). Current results: 59 local contract/integration and 274 engineering tests; 7 security, frontend build, full browser suite passed. This is NOT hosted/D1 quota, throughput, complete-chain or provider-truth acceptance. Source-only; existing v23 APK/backend unchanged.

### Post-v23 edge/D1 canonical validation and parity

Edge exchange now validates event block headers before range staging, pending-chunk application and receipt-row queueing. Each validation step permits <=8 distinct headers; wider event ranges reduce span before staging. Actual compiled exchange event projection agrees between Node SQLite and local D1 for the tested partial-fill scenario. Local D1 tests exercise orphan refusal, staged-header mismatch and bounded range reduction. Current evidence: 60 local contract/integration, 277 engineering, 7 security tests passed; frontend, full browser, edge browser and split creator checks passed. Hosted D1 quota/CPU/throughput, full semantic parity and real-chain acceptance remain OPEN. Existing v23 artifacts/backend unchanged.

### Local D1 persistence/restart acceptance

Disk-persisted workerd/D1 now tested across worker disposal/recreation during partially applied 25-event receipt staging, after final publication, and with unexpired/expired abandoned leases. Partial orders remain hidden; resumed publication preserves exact event/order counts and checkpoint. This is local persistence evidence, NOT abrupt mid-transaction power-loss, hosted storage durability or provider backup restoration. Current rerun: 279 engineering, 7 security and 60 local contract/integration tests passed. No production-code change this batch; browser checks were not rerun. V23 distributed package/backend remain unchanged.

### Post-v23 NFT approval recovery tools

Configured-exchange UI supports read-only token/operator approval inspection plus explicit, simulated/tracked revocation. Works with trading disabled; only current runtime-verified exchange covered. Owned-token checks prevent treating another owner's approval as the connected wallet's; unrelated token spenders are not cleared. Revocation is separate from escrow/order/offer management and costs network gas. Four compiled-client cases and controlled mobile inspection browser passed; current regression64 contract/integration,279 engineering,7 security plus frontend/full browser passed. No mainnet/device/deployment acceptance or all-approval scanner implied. Existing v23 package unchanged.

### Post-v23 submission uncertainty handling

Transaction journal no longer treats generic pre-hash send errors as proof of non-submission. It records submission-unknown, separates explicit wallet rejection and preserves known-hash uncertainty. UI includes legacy-record warnings; hashless checks never pretend to locate or retry a submission. Four unit cases and controlled mobile-browser recovery scenario passed. Current verification64 local contract/integration,283 engineering,7 security; frontend and full browser suite passed. No deployment/device/mainnet acceptance implied; existing v23 package unchanged.
