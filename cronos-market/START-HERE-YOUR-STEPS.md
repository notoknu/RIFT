> Newest D1 collection improvements: adaptive empty ranges, committed-snapshot reads, checkpoint/undo recovery and concurrency fences (migrations 0009–0010). See the current checklist.

> Latest additions: native bounded D1 collection ingestion (migration 0008) and cryptographic CAR verification. Read the current checklist for throughput, availability and hosted-acceptance limits.

> Latest verified pass: 81 engineering tests, 38 contract tests, 7 security tests and 6 earlier regressions pass. Collection ingestion, Worker v2/public reads, receipt recovery, encrypted replication and nonce recovery were expanded. See the current checklist for unfinished parity and release gates.

> Current engineering: see [ENGINEERING-COMPLETION-CHECKLIST.md](ENGINEERING-COMPLETION-CHECKLIST.md). The newer pass adds v2 UI/index, multilayer exports, collection browsing, dense-block staging and operator tools. Full edge migration and full-network collection ingestion remain unfinished.

> **Latest local engineering update:** Read `LOCAL-ENGINEERING-UPDATE.md` first. Creator authentication/drafts/favorites, capped IPFS upload code, verified registration, shareable routes, transaction records and a tested workerd/D1 creator+market slice have now been implemented. Full roadmap completion is still not claimed.

# RIFT — what is implemented, and your next steps

**Updated: 22 November 2026**  
**Current status: tested local implementation batch; not a mainnet-ready release.**

I have implemented a substantial first part of the roadmap. **The complete roadmap is not finished.** The items below distinguish tasks that genuinely require your accounts/approval from engineering work that still belongs on the development side.

## 1. Earlier implementation batch (additional work is in the update linked above)

| Area | What changed | Activation / remaining limit |
|---|---|---|
| Escrow admission | `RiftMarket` rejects unsolicited ERC-721 safe transfers, while normal listing/purchase/cancellation tests pass. | Applies to newly deployed reviewed bytecode. Cannot patch an already deployed immutable contract. Raw unsafe `transferFrom` can still strand an NFT; users must use listing UI. No admin recovery power was added. |
| Persistent orders | Added dedicated SQLite market event index, cursor pagination and public `GET /api/v1/listings`. Removed latest-100 wallet-dependent UI scan. | Needs actual marketplace address/deployment block, persistent storage and running sync worker. Not a D1 implementation. |
| Index safety | Event replay is idempotent; uint256 IDs/wei use strings; checkpoint/hash checks and wrong-chain checks; bounded sync ranges. | Reorg detection stops progress for operator rebuild; it does not silently repair all historical forks. RPC limits/large history/load still need production acceptance. |
| Wallet historical queue | Portfolio reads no longer automatically admit arbitrary new wallets to genesis scanning. | Explorer discovery remains best-effort. Existing admitted-wallet index is not exhaustive Cronos coverage. |
| Favorites | Validated local persistence with malformed-storage handling. | Browser-local, not authenticated cloud sync. |
| Metadata robustness | Filters malformed/null traits before rendering and rejects unsupported launch storage modes. | Broader schemas and comprehensive panel error boundaries remain engineering work. |
| Trust labels | Removed the unconditional spotlight verification checkmark. | Provider labels are not independent authenticity certification. |
| Pixel creator | New original clickable 8×8 paint editor exports self-contained SVG into the supplied-art launch path. | One shared artwork per edition. A rich trait/layer generative editor remains unfinished. Existing starter deterministic on-chain mode remains available. |
| IPFS local checks | Validates numbered JSON + `contract.json`, public-IPFS image references, traits and byte limits; shows logical-file free-tier warning. | Does not upload/pin files or certify a provider quota. Large local batches are deliberately capped. |
| IPFS remote checks | Bounded `GET /api/v1/storage/verify`, linked from creator studio, retrieves up to eight token JSONs per batch via public IPFS gateway; checks collection JSON on the first batch. | Image bytes, independent replicas and continuing pin retention are NOT verified. A gateway failure is not proof content is absent everywhere. |
| Factory | New version-1 full-contract `RiftDropFactory`, creator registry event and optional frontend deployment integration; exported artifact. | Undeployed/unreviewed. Leave `VITE_DROP_FACTORY_ADDRESS` blank until a reviewed deployment is verified. Direct drop deployment remains supported. |
| Deployment gate | Invalid, stale, wrong-chain and materially future-dated preflight reports are rejected. | No independent review/approval was supplied; no transaction sent. |
| Memory limits | Discovery/search/NFT-detail caches now have aggregate byte budgets as well as entry limits. | This is not a proof that all concurrent upstream processing fits every free runtime. |
| Wallet dialog/layout | Dialog role, focus management, Tab trap, Escape and mobile navigation correction. | Real-device/mobile-wallet acceptance still required. |
| Operations/tests | Market sync CLI/worker, optional Compose trading profile, market backup scheduler wiring, regression/browser CI gates. | Docker/Compose has not been executed in this sandbox. Existing host still needs persistent storage, monitoring and restore rehearsal. |

### Tests completed
- **22 contract tests passed.**
- **7 security tests passed**, including the shared Redis test against the local Redis service.
- **6 implementation tests passed**, covering 131 historical listings, pagination, cancellation, repeat sync, wrong chain/reorg rejection, favorites, preflight timestamps, cache budgets and IPFS validation.
- **5 browser regression scenarios passed:** favorites persistence, malformed NFT traits, unsupported drop mode, wallet-free order browsing and pixel editor application.
- Discover and Launch show **no horizontal overflow at 375, 768 and 1440 px** in the current checks. Wallet dialog focus/Escape checks pass.
- Production build passed. **Large-bundle warnings remain.**
- `npm audit` reported **0 known advisories** in this dependency snapshot. That is not an independent security audit.

Test evidence: `checks/implementation-*.log` / `.json`. Browser source/chain responses use isolated fixtures where required; they are not proof of real mainnet settlement, real IPFS retention or live mobile pairing.

---

## 2. Your steps — in order

### Step 1 — Decide the hosting path

**If your priority is $0 recurring hosting:** use the free-first Cloudflare direction, **but wait for the remaining backend migration and actual-runtime tests before production deployment**. You may create your account now; no domain purchase is needed yet. Static-only deployment is not a fully functioning replacement for the existing Node APIs.

**If your priority is activating the current server architecture sooner:** you need a persistent Node 22 host with SQLite disk and suitable Redis/security configuration. Use existing infrastructure if you have it; otherwise its ongoing cost is not guaranteed free. The supplied Compose files are preparation, not proof of a free hosted deployment.

**Tell me:** “strict free-tier cloud path” or “I have a persistent Node host.” You do not need to rewrite the backend yourself.

### Step 2 — Prepare user-controlled accounts

| Account / resource | Why | What you can safely provide |
|---|---|---|
| Cloudflare account, if choosing the free-cloud path | Own the future frontend/API/database deployment | Confirm account is ready; resource IDs can be configured during provisioning. No password or broad API token in chat. |
| Reown / WalletConnect project | Real mobile QR pairing | The **public project ID**. Add the actual final HTTPS origin to its allowed origins. |
| Public IPFS pin provider, if using the IPFS launch path | Keep creator artwork/metadata available | Public CIDs after upload. Start with creator-owned pinning; never put provider root JWTs in frontend variables. |
| Reviewed administrative wallet/multisig | Own market emergency pause/ownership transfer | **Public address only**. It must be an address you control and have approved for this purpose. |

A custom domain is optional. If you use a provider's HTTPS subdomain initially, allowlist that exact origin in the wallet project. Account creation does not approve paid upgrades or guarantee free-tier eligibility.

### Step 3 — Prepare creator artwork, if you want to launch a collection

**On-chain starter/generative or shared-SVG mode:**
1. Supply your collection name, symbol, original artwork/design direction and description.
2. Choose starter generated mode, draw original pixel artwork in the new editor, or supply a self-contained SVG up to 12,000 bytes.
3. Set supply, free mint price `0` if wanted, wallet/transaction limits and mint windows.
4. Creator approves/pays deployment gas; collectors approve/pay their own mint gas.

**IPFS mode:**
1. Number artwork consecutively: `1.png`, `2.png`, etc. Match supply exactly. Use original/licensed artwork.
2. Pin the artwork folder in **public IPFS**, including any PFP/banner you want to reference. Record `ipfs://ART_CID/`.
3. Use the studio's metadata ZIP export. Extract it and pin the **metadata folder contents** so the final directory directly contains `1.json` through `N.json` and `contract.json`.
4. Enter `ipfs://METADATA_CID/`, ending in `/`. Do not paste a private/download URL, ZIP URL or an extra `metadata/` path unless that is genuinely the token directory.
5. Run the local validation and “Check pinned public metadata” batches. Independently verify image retrieval too; the metadata checker explicitly does not fetch image bytes.
6. Keep backups and a pin-retention plan. Review current storage, file-count, bandwidth and request quotas before assuming the collection fits a free tier.

You can use the existing manual-CID path without giving RIFT any pin-provider credentials. A capped sponsored-upload implementation is now available in the creator panel. It remains disabled until the operator securely configures a provider account and finite shared budget, and it still needs live-provider acceptance testing.

### Step 4 — Approve security review before mainnet trading

Arrange independent review of the exact marketplace/drop/factory versions you intend to deploy, or explicitly discuss a controlled risk-acceptance process. The new factory and escrow changes need review too.

**Do not set approval environment variables simply to bypass the gate.** Deployment is paused until the code-side release gates and your approval are complete.

### Step 5 — Approve and sign deployment locally, when the release is ready

You must control the signing wallet and have enough CRO for estimated gas. **Do not send a seed phrase/private key in chat, a repository, frontend environment variables or browser local storage.**

For the marketplace, after review and engineering readiness:
1. Run the supplied read-only `npm run deploy:preflight` in your secure deployment environment with the reviewed admin and optional public deployer address configured.
2. Inspect the report/hash, current gas estimate and exact deployer/admin.
3. Complete the explicitly gated `npm run deploy:cronos` locally using your approved signing setup. Do not reuse an obsolete preflight after the bytecode changes.
4. Preserve the transaction receipt, actual deployment block, source-verification information and deployment record.

Factory deployment is optional. Do not put an address into `VITE_DROP_FACTORY_ADDRESS` based merely on its name or code presence. Its deployment/source identity must be verified first. A dedicated reviewed factory provisioning/deployment flow is still pending.

### Step 6 — Configure the real deployment facts

After actual deployment, configure:

```dotenv
# Public frontend values — rebuild after changing
VITE_MARKETPLACE_ADDRESS=<actual reviewed market address>
VITE_WALLETCONNECT_PROJECT_ID=<public project ID>
# Optional only after reviewed factory deployment
VITE_DROP_FACTORY_ADDRESS=

# Backend / index — values come from real deployment, not a sample
MARKETPLACE_ADDRESS=<same actual market address>
MARKET_START_BLOCK=<actual deployment receipt block>
MARKET_INDEX_DB=data/market-index.sqlite
MARKET_BLOCK_SPAN=1000
```

The placeholders above are documentation, **not values to paste unchanged**. No addresses or deployment blocks are invented for you.

On the current Node host, export the runtime environment through the host's secret/configuration UI or service manager. `server/production.js` and `server/market-worker.js` read runtime `process.env`; they do not automatically load a `.env` file. `scripts/sync-market.js` loads local Vite-style environment files for the CLI.

### Step 7 — Start indexing and durable hosting after deployment

These commands describe the **current Node deployment**, not a Workers/D1 port:

```bash
npm ci
npm run contracts:export
npm run build
npm run market:sync       # one bounded, read-only RPC ingestion tick
npm run market:worker     # ongoing process, managed by your host
```

Start the web server separately using production Redis/shared-security configuration as described in `ops/RUNBOOK.md`. Persist both database and backup directories. On a host with Docker, the new market worker/backups are in the optional `trading` profile:

```bash
docker compose config
docker compose --profile trading up --build -d
```

First configure `SITE_DOMAIN`, build/runtime public addresses, deployment block and network/storage/security settings. This Compose path requires a persistent host and DNS/TLS; it is **not the promised free-cloud migration**. Container execution was not validated here because Docker is unavailable in this sandbox.

### Step 8 — Do final real-user checks

You/your chosen testers must approve/sign the financial steps:
- Connect an injected wallet and a real mobile WalletConnect wallet on the final origin.
- Test rejection, disconnect, account switch and incorrect-network recovery.
- Approve a controlled creator deployment and mint only after the relevant review/gates pass.
- For the marketplace, test approve → list → cancel; list → buy from another account → withdraw.
- Verify PFP/banner/token metadata in supported external tools. Third-party wallet gallery auto-discovery cannot be guaranteed by RIFT.
- Perform backup restore and downtime/recovery checks on the actual host, then confirm the index catches up and old listings remain reachable.

Keep the launch restricted until the full acceptance checklist passes. No real financial transactions were executed in this implementation pass.

---

## 3. Still engineering work — NOT chores being handed to you

The detailed, current list is in `LOCAL-ENGINEERING-UPDATE.md`. In brief:

1. Finish legacy discovery/search/provider-feed, media/readiness and portfolio migration; hosted CPU/quota/load acceptance is still required. The new creator + RIFT market D1 slice does not complete the whole cloud migration.
2. Offers/criteria, ERC-1155 settlement, expiry/private orders and bulk execution still require reviewed contracts, API/index and UI work.
3. A full multilayer/per-token generative builder is not yet implemented; the original generated renderer and shared pixel/SVG path are available.
4. Complete collection item/trait/owner/activity views, automatic factory backfill and branding on every surface.
5. Dense index backfill, stronger operational monitoring, off-host backups/restores, moderation administration and pin reconciliation/replication remain.
6. Further transaction recovery edges, real mobile pairing, performance/accessibility and independent security/release approval remain.

Creator authentication, persisted drafts, account favorites, report intake, capped upload code, receipt-backed registration/presentation, basic permalinks and local transaction records are no longer entirely unimplemented. See the update for exact tested coverage and remaining limitations. **You should not need to code unfinished engineering features yourself.**

## 4. The only things to send me next

1. **Hosting preference:** strict free-tier cloud, or an existing persistent Node host.
2. **Your public market admin/multisig address**, when chosen.
3. **Public WalletConnect project ID**, when created.
4. **Launch preference/details**, if you want the first collection prepared: on-chain starter, original shared pixel/SVG, or creator-pinned IPFS.

Do not send passwords, private API tokens, wallet private keys or recovery phrases. Account connection/setup can be completed securely when the appropriate provisioning flow is ready.
