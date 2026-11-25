# RIFT — categorized remaining implementation and release work

## Basis and limits

Targeted review of current local source inventory, FEATURE-MATRIX.md, ACCOUNT-SECURITY-AND-RECOVERY.md, RELEASE-V21.md and ENGINEERING-COMPLETION-CHECKLIST.md. This is a backlog reconciliation, not a new exhaustive line-by-line/security audit. No external services were checked for this report. Hosted status below refers to the last verified deployment, not a fresh live probe.

Last recorded local regression: 215 engineering tests and 6 implementation checks passed, with browser, Worker/D1 and split-auth checks. Passing existing tests does not implement absent features or certify production readiness.

Last verified hosted baseline: v21 Create workspace live, creator accounts disabled, indexes unconfigured. Subsequent local release-manifest and account-security batches have not been deployed or bundled into a new APK.

Status types: **Build** = missing implementation; **Finish** = partial implementation/integration; **Operate** = code exists, infrastructure/configuration needed; **Accept** = behavior must be independently or end-to-end verified. Several tasks have multiple types. P0/P1 are release-critical for the applicable product scope; P2/P3 are improvements/expansion, not prerequisites for every safe launch.

## A. Accounts, privacy and durable storage

| ID | Priority/type | Remaining work | Completion evidence |
|---|---|---|---|
| A1 | P0 Operate | Select durable database architecture: persistent-volume SQLite or implement an adapter for an external durable database | Owner-approved architecture, costs/limits, provisioned storage |
| A2 | P0 Operate/Accept | Activate exact-origin auth and profile database on hosted backend | Wallet-message login and private profile save/read on hosted origin |
| A3 | P0 Accept | Restart/redeploy retention and isolated restore | Same profile after redeploy; protected snapshot restored off the active DB |
| A4 | P0 Operate/Accept | Off-host encrypted backup schedule, retention and failed-backup alerts | Restore drill from retained off-host backup; alert evidence |
| A5 | P1 Finish | Complete account data export/deletion policy across drafts, favorites and personal records | Clear scope/retention rules and cross-wallet tests; current export/delete is profile-only |
| A6 | P2 Build | Optional public creator identity, visibility settings and verified-creator process | Explicit opt-in public fields; no conflation with holdings or private profile |

Already implemented: private profile CRUD, authenticated favorites/drafts, optimistic profile edits, profile-only export, scoped active-session revocation, local storage/recovery probe. No Discord dependency. None of this authorizes server storage of wallet secrets.

## B. Wallet and Android

| ID | Priority/type | Remaining work | Completion evidence |
|---|---|---|---|
| B1 | P0 Finish/Accept | Supported external-wallet pairing, reconnect, account/network switching and session lifecycle on physical Android | Device/OS/wallet acceptance matrix with actual outcomes |
| B2 | P0 Build/Review | Decide external-wallet-only production scope versus native signing. Native signing requires a separately engineered/reviewed signer and recovery/security design | Written threat model, key lifecycle, transaction authorization and independent review |
| B3 | P0 Finish/Accept | Review transaction/signature clarity across every enabled spending/approval path | Contract, method, chain, NFT, CRO value, approval target and risk visible before signing |
| B4 | P0 Operate/Accept | Owner-controlled protected release key, reproducible Android release build, upgrade/data-migration acceptance | Release-signed non-debug APK and verified update path |
| B5 | P1 Accept | Device export/restore, lifecycle, accessibility, low-memory and poor-network behavior | Physical-device results; build/JVM tests alone insufficient |

Already implemented: experimental encrypted device vault, WalletConnect/web connection source, transaction/receipt/replacement recovery source, JVM/build baseline. Native vault is not an approved web signer. A safe external-wallet marketplace release can exclude native signing; a claimed native wallet release cannot.

## C. Trading contracts and execution

| ID | Priority/type | Remaining work | Completion evidence |
|---|---|---|---|
| C1 | P0 Review | Freeze selected market/exchange version and exact contract behavior; independent review; resolve findings | Reviewed source/settings/bytecode and remediation record |
| C2 | P0 Operate/Accept | Admin/multisig custody policy, deployment budget, verified deployment/runtime hashes and public roles | Owner authorization, deployment receipts, exact runtime checks and role disclosure |
| C3 | P0 Operate/Accept | Configure exchange and durable index worker without enabling early trading | Validated contract/index configuration and recovery evidence |
| C4 | P0 Accept | End-to-end supported list/buy/cancel/withdraw/offer flows, royalties and failure recovery | Integrated wallet/API/index/contract receipts; bounded mainnet acceptance only after approval |
| C5 | P1 Finish/Accept | Reconcile stale/expired listings, index freshness, escrow inventory and pending/replaced transactions in the UI | Adversarial/reorg and user-visible recovery scenarios |
| C6 | P2/P3 Finish/Build | Extend documented external venue execution; auctions and other explicitly selected mechanisms | Current permitted interfaces, approvals/domain verification, fee policy and execution tests |

Already implemented: ERC-721 escrow market; separate ERC-721/ERC-1155 exchange source with offers, partial fills and bulk operations; local adversarial/model tests. These should not be blindly rebuilt as absent features. They are not production-approved merely because source/tests exist.

## D. Creator launchpad and NFT storage

| ID | Priority/type | Remaining work | Completion evidence |
|---|---|---|---|
| D1 | P1 Finish | Creator-owned direct pin-provider adapters with secure credential/account model and quota/error handling | Real permitted provider integration; no API secrets in browser bundles or metadata |
| D2 | P1 Operate/Accept | Activate existing bounded sponsored-upload adapter if desired; retain quotas and reconciliation | Provider configuration, quota/abuse tests, retrieval and retention checks |
| D3 | P1 Finish | Automatic exact-source verification submission and job status/retry tracking | Supported verifier accepts exact build; exported ZIP alone is not verification |
| D4 | P1 Finish/Accept | Fully reconciled launch progress/recovery across deployment, verification, registration, indexing and publication | Reload/restart-safe stage evidence; uncertain transactions are not blindly resubmitted |
| D5 | P1/P2 Build/Review | Rich unique multi-trait on-chain renderer and provenance if ULTRA CAT-equivalent generation is promised | Deterministic trait/art correspondence, duplicate/rarity checks, gas/size limits and source review |
| D6 | P1 Accept | Independent pin retrieval/replication, complete art/metadata validation and compatibility acceptance | All-token manifest coverage, recovery and external indexer checks |
| D7 | P1 Finish/Operate | Upload reporting/moderation, malicious media handling and operator abuse process | Safe media pipeline, review queue/actions, quotas and incident process |

Already implemented: on-chain generated SVG, shared creator SVG and IPFS-directory modes; free/paid mint configuration, limits/allowlists, multilayer IPFS exports, metadata packs, collection metadata, local validation/manifests, verification ZIP, launch-workspace guidance. Current built-in on-chain palette is not guaranteed unique multilayer art. Free mint is not free gas; an IPFS CID is not durable pinning. Provider links are not direct upload integration.

## E. Indexing, discovery and operational reliability

| ID | Priority/type | Remaining work | Completion evidence |
|---|---|---|---|
| E1 | P0/P1 Operate/Accept | Durable workers, configured collection scope and historical backfill | Checkpoints, known scope, measured lag and catch-up time |
| E2 | P0/P1 Accept | Hosted reorg/restart, duplicate-event and checkpoint recovery | Controlled recovery scenarios, owner/listing state reconciliation |
| E3 | P1 Finish | Consistent provenance/coverage/freshness on every statistic | Source, time window, timestamp and coverage exposed without chain-wide overclaims |
| E4 | P1 Operate/Accept | Monitoring/alert destinations, uptime policy, job supervision and incident runbooks | Delivered alerts, recovery drill, explicit hosting service-level limits |
| E5 | P1 Accept/Optimize | Load tests, p95/p99 latency, large collections, dense blocks, disk growth and multi-instance limits | Reproducible benchmark reports; Redis fail-closed/concurrency acceptance |
| E6 | P2 Finish | Search/token discovery quality, trait/rarity methodology and portfolio valuation coverage | Defined supported queries, completeness limits and price provenance |

Already implemented: collection/market/exchange indexer source, token inventory/activity/traits for admitted collections, reorg/recovery logic, monitoring and backup tooling. Full-chain coverage and production throughput remain unproven. Existing tools still need deployment and operational acceptance.

## F. Release security, documentation and UX

| ID | Priority/type | Remaining work | Completion evidence |
|---|---|---|---|
| F1 | P0 Operate/Review | Revoke exposed credentials; safely assess repository/history exposure and remediate | Owner rotation confirmation and sanitized remediation record |
| F2 | P0/P1 Finish/Operate | Deploy latest local changes; simplify Render-only build; rebuild Android; pin release identities | Exact commits/artifact hashes and hosted/device results |
| F3 | P1 Finish | Extend release manifest to evidence artifacts, frontend/backend compatibility and Worker parity | Per-target status without user-controlled approval bypass |
| F4 | P1 Finish/Review | Synchronize architecture/API/contracts/indexing/deployment/recovery/Android docs and license/rights status | Current reviewed documents linked from a concise release index |
| F5 | P1 Operate/Accept | Dependency/SBOM automation, security review, CSP/egress/privacy and abuse acceptance | Reviewed release report and incident/security contacts |
| F6 | P1/P2 Finish/Accept | Consistent unavailable/retry/empty states, wallet permissions, accessibility and performance | Journey-based browser/device evidence; no fake content or cosmetic ready badges |
| F7 | P2/P3 Build | Optional saved searches, watchlists, follow/notifications and social expansion | Explicitly scoped requirements, privacy and abuse design |

Already implemented locally: Node release-manifest endpoint, About-screen status, feature matrix, no-secrets public output and explicit non-approval semantics. These newer changes are not in the last deployed v21 baseline or existing APK.

## Recommended dependency order

1. F1 credential hygiene + A1 durable storage decision.
2. A2–A4 profiles and operational recovery, with F2 source/deployment reconciliation.
3. B1/B3 external wallet acceptance; decide whether B2 native signing is in the first production scope.
4. C1/C2 exact contract review/deployment policy, then C3/E1/E2 indexing integration.
5. C4/C5 integrated trading acceptance and F5/F6 security/UX acceptance.
6. D1–D7 launchpad integration in parallel where safe; do not open uploads or claim universal verification prematurely.
7. B4/B5 Android release acceptance; bounded approved mainnet checks; final release decision.
8. P2/P3 expansion after the selected safe production scope is accepted.

## Ownership boundaries

**Can implement locally:** adapters, UI/state/recovery, API hardening, metadata/verification workflows, tests, reproducibility and documentation.

**Needs owner access/decisions:** storage provider/cost, credentials, hosting configuration, approved source publication, device access, custody/release keys and spending limits.

**Needs external evidence:** independent contract/wallet review, provider/marketplace acceptance, genuine host-redeploy persistence and physical-device results.

No percentage-complete estimate is defensible from test counts. The key remaining work is infrastructure, integration and acceptance, not a blank codebase.
