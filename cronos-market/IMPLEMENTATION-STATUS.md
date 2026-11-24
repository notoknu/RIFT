> Newest D1 collection improvements: adaptive empty ranges, committed-snapshot reads, checkpoint/undo recovery and concurrency fences (migrations 0009–0010). See the current checklist.

> Latest additions: native bounded D1 collection ingestion (migration 0008) and cryptographic CAR verification. Read the current checklist for throughput, availability and hosted-acceptance limits.

> Latest verified pass: 81 engineering tests, 38 contract tests, 7 security tests and 6 earlier regressions pass. Collection ingestion, Worker v2/public reads, receipt recovery, encrypted replication and nonce recovery were expanded. See the current checklist for unfinished parity and release gates.

> Current engineering: see [ENGINEERING-COMPLETION-CHECKLIST.md](ENGINEERING-COMPLETION-CHECKLIST.md). The newer pass adds v2 UI/index, multilayer exports, collection browsing, dense-block staging and operator tools. Full edge migration and full-network collection ingestion remain unfinished.

> **Newest implementation status:** `LOCAL-ENGINEERING-UPDATE.md` supersedes older descriptions of creator/auth/upload/route features. No full-roadmap/mainnet approval is claimed.

> **22 November 2026 update:** See `START-HERE-YOUR-STEPS.md` for the current implemented batch, exact test results, remaining engineering and user-only setup steps. Older status below is historical where it conflicts. No mainnet deployment has occurred.

# RIFT — implementation, activation and launch checklist

Checked 22 November 2026. **Not “perfect,” not independently audited, and not yet a live mainnet trading service.** The backend exists and is running in this workspace. Sandbox processes are not permanent hosting and are not guaranteed to survive session shutdown.

## What is implemented and what actually works

| Area | Implementation | Current activation / limits |
|---|---|---|
| Backend + website | Standalone Express production server, built React UI, `/healthz`, API middleware | Running on port 4173 in the workspace; Redis health check passed. Not a permanent deployed website. |
| Collection rankings | `/api/collections`, deduplicated all-time/weekly lists | Live check returned 135 combined entries, fresh response. **Minted-volume coverage only**, not network-wide Cronos volume. Weekly lists contain available positive-volume collections, not fabricated filler to reach 100. |
| Collection search | `/api/search`, name/contract lookup, source aggregation and catalogue | Live Six Seven name search returned a match. Not guaranteed to discover every unindexed contract by name. |
| Collection artwork | Collection image proxies, launch PFP/banner preview and metadata | Implemented. New contract deployment and/or pinned `contract.json` required for the creator's real collection. Existing deployed contracts do not upgrade automatically. |
| Wallet connection | Injected wallets, selection, Cronos switching, account/network events, disconnect | Implemented and browser-tested using a mock injected provider. Real hardware/browser-wallet transaction acceptance still needs human validation. |
| Portfolio | `/api/portfolio`, CRO/ERC-20/ERC-721/ERC-1155 reads, ownership checks, lazy metadata and manual import | Live public-wallet smoke check returned readable CRO and 24 NFT cards on the first page. Reading assets never requires token approvals or signing. |
| Metadata / images | `/api/wallet-nft`, `/api/wallet-art`, search/art proxies, `/api/nft-readiness` | Implemented, protected fetches and bounded caches. Third-party metadata/IPFS hosts can be slow or unavailable. |
| Durable indexing | SQLite standard-transfer observations, resume/checkpoints, reorg reset, RPC range backoff | **Activated now** in the backend and worker. Recent-range real Cronos log/checkpoint smoke test passed in an isolated in-memory database. Persistent index currently has zero registered wallets. A queried wallet is registered automatically; historical backfill has not been completed. |
| QR/mobile wallet | WalletConnect UniversalProvider adapter + local QR, cancellation, expiry, reconnect/session handling | Code and mocked adapter tests pass. **Inactive until a valid public project ID is configured and frontend rebuilt.** Real mobile/relay tests remain. |
| Buying/selling | Fixed-price ERC-721 listing/escrow, purchase, cancel, proceeds withdrawal contract and UI | Implemented/tested locally, but **unavailable on mainnet until marketplace deployment/address configuration**. RIFT orders only; third-party collection discovery is not integration with third-party order execution. ERC-1155 trading, offers and auctions are not implemented. |
| Creator launch | Generative SVG/shared SVG/IPFS, free/paid mint, allowlist, metadata/verification exports | Implemented with deployment/mint paths. Not deployed by the assistant. Creator/collector pays gas; zero platform fee. IPFS mode does not upload or pin content automatically. |
| Security controls | CSP, Redis shared limits, cross-instance concurrency, SSRF defenses, bounded caches, deployment gates | Implemented and tested. Zero current full/production npm audit advisories; not proof of absence of vulnerabilities. |
| Admin safety | Two-step ownership, renunciation disabled, pause controls | Implemented for new marketplace deployments. Requires an actual reviewed admin/multisig. |
| Backups | SQLite consistent online backup, integrity validation, daily scheduler, seven-snapshot local retention | **Scheduler started now**, initial backup succeeded. Container configuration includes backup service. Off-host encrypted retention still requires your storage destination. |
| Infrastructure | Dockerfile, app/worker/Redis/backups/Caddy Compose, TLS template, health checks, CI workflow | Files implemented, but Docker/real DNS/TLS/container deployment have not been exercised here. CI file is not an executed remote pipeline. |

## What I completed automatically in this pass
- Rechecked the real backend, Redis, collection/search and public-wallet portfolio APIs.
- Added `npm run check:readiness`; details saved to `checks/readiness.json`. “Blocked” features remain marked blocked rather than treated as passes.
- Ran a real recent-block Cronos log scan and persisted an isolated test checkpoint without pretending to have backfilled the chain.
- Activated the persistent wallet-index worker and backend integration. No user account was invented or connected; wallet registration begins when a portfolio is queried.
- Added/started daily consistent backups with seven-snapshot retention, and included the scheduler/scripts in the production container configuration.

## What happens automatically after proper deployment/configuration
- APIs start with the app; Redis limits apply across instances.
- Visiting a connected wallet's portfolio queries balances and registers its public address for historical indexing. Worker resumes from saved checkpoints while running.
- New confirmed standard transfers are discovered as the worker catches up; ownership/balance reads still verify candidates through RPC.
- Backup scheduler runs daily and prunes old local snapshots after successful backups.
- Caddy attempts HTTPS certificate issuance **only after** you point a real domain at the host and open ports 80/443.
- WalletConnect works **only after** project ID/origin configuration and rebuild; pairing/signing always needs the wallet owner's consent.

## What I need from you

### 1. Permanent domain and hosting
Send your intended domain (or say you do not have one) and whether you already have a Docker-capable VPS/server. If not, choose/provision a host and domain in your own accounts. The existing sandbox preview is not that host. Do not paste account passwords or SSH private keys into chat. The deployment runbook is `ops/RUNBOOK.md`.

### 2. WalletConnect public project ID
Create a project in your WalletConnect/Reown dashboard and allowlist the final HTTPS domain. Send only its **public project ID**. Set `VITE_WALLETCONNECT_PROJECT_ID` and rebuild. Then test actual QR/mobile pairing, denial, network/account changes, disconnect and reconnect.

### 3. Marketplace admin address
Send the public Cronos admin address or preferred multisig address. Do not send a seed phrase/private key. This enables read-only deployment preflight and gas estimation. After an independent review, you approve and sign the deployment locally; the resulting marketplace address is configured in the frontend and rebuilt. No contract gas cost is charged by a read-only preflight.

### 4. Independent review and live acceptance
Commission an independent contract/application audit, review findings and approve the final artifact hash. I can prepare the sources, test reports and deployment package but cannot certify my own work as independent. Real transaction testing requires a wallet owner and real gas; it is not automatic from this workspace.

### 5. RPC, metadata and operational storage
- Public RPC is sufficient for current smoke reads, but a reliable archival/indexing endpoint may be necessary for a timely full historical scan. If public endpoints throttle/fail, choose an appropriate provider/plan and configure the URL privately on the host. Do not share private RPC credentials publicly.
- For IPFS-mode launches, pin actual art and metadata, verify `ipfs://` URIs, and keep them pinned. On-chain artwork modes do not require off-chain token art hosting; separate externally referenced collection branding still does.
- Select off-host backup retention and monitoring/alert destinations. Local scheduling is implemented; remote storage provisioning and a production restore drill are not yet completed.

## Acceptance before opening trading
1. Independent review accepted and deployment inputs/artifact hash approved.
2. Permanent HTTPS site healthy with private Redis and persistent storage.
3. Real injected-wallet + QR/mobile tests pass on the final domain.
4. Correct mainnet marketplace deployed, source verified, admin verified, frontend rebuilt.
5. Owner-approved list → approve → escrow → buy → withdraw flow tested; cancellation and error paths checked.
6. Index progress/lag visible and no false “all assets” claim while backfill is partial.
7. PFP/banner/metadata availability checked, backups restored in a drill and alerts tested.

No noncustodial service can silently approve/spend/deploy on your behalf just by reading a wallet. Those user confirmations are intentional security boundaries, not missing automation.
