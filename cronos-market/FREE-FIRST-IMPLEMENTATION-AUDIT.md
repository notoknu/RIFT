# RIFT — free-first backend/API/hosting implementation audit
## How to implement the missing marketplace features and both NFT launch options

**Date checked:** 22 November 2026.  
**Scope:** Cronos mainnet only, chain ID 25. Zero RIFT platform fee; creators pay deployment gas and collectors pay mint/trade gas.  
**Status:** Architecture/implementation audit and proposed development artifacts. **Not a deployed cloud migration, not an IPFS upload integration already running, and not closure of the previous application audit findings.**

## 1. Decision in plain language

A **free-tier-first, bounded-use marketplace and dual-path launchpad is feasible**. A permanently free, unlimited OpenSea-scale service—with complete Cronos history, unrestricted uploads, unlimited image bandwidth and an independent audit—is not a credible promise.

Recommended direction:
1. Keep the existing original 3D/gaming React frontend and Cronos wallet flows.
2. Repair the asset-safety/crash defects before activating trading.
3. Move lightweight API reads and persistent marketplace records to an edge/database free tier, after a measured compatibility spike.
4. Index **RIFT market and launch-factory events from their deployment blocks**, not the entire chain again for every wallet.
5. Keep wider discovery source-labelled and best-effort until there is a funded or demonstrably sufficient indexed-data source.
6. Offer two clear creator paths: **fully on-chain token artwork/metadata** and **public IPFS content with creator-owned or capped platform pinning**.
7. Prefer a free provider subdomain initially. A purchased domain is optional, not a prerequisite for an HTTPS preview/release candidate.

The implementation must display **quota/degraded states**, rather than silently billing or falsely claiming complete data when free limits are reached.

---

## 2. Verified free-tier choices and their limits

These are published terms observed during this audit, not contractual guarantees. Account eligibility, product availability, commercial-use/acceptable-use terms and future changes must be checked at signup. No accounts or billable subscriptions were created.

| Layer | Recommended candidate | Published allowance / practical boundary | Decision |
|---|---|---|---|
| Frontend | Cloudflare Workers Static Assets | Static-asset requests are free and unlimited; free plan has 20,000 asset files and 25 MiB per asset. Routing a request through Worker code can count against dynamic limits. [S1–S3] | Good fit for the built frontend. Route static files without API execution. |
| Lightweight APIs | Workers Free | 100,000 requests/day, 10 ms CPU per invocation, 128 MB/isolate, 50 subrequests and six simultaneous outgoing connections/request. Network waiting is not CPU time, but JSON/ABI/signature processing is. [S1–S2] | Candidate, **subject to performance/security proof**. No promise every current handler fits. |
| Persistent app/query state | D1 Free | 5 million rows read/day, 100,000 rows written/day, 5 GB total; **500 MB maximum per free database**, 10 free databases. Index writes count too. [S4–S5] | Fit for a bounded RIFT index and indexed queries, not unlimited chain history. |
| Shared coordination/quotas | SQLite-backed Durable Objects Free | Free plan supports SQLite-backed objects; 100,000 requests/day, 13,000 GB-s duration/day and separate storage/read/write limits. Exceeded free operations fail. [S6] | Candidate replacement for Redis admission/locks; keep objects short-lived/hibernatable and budget their own limits. |
| Optional cache/backups | R2 Standard | 10 GB-month, 1 million Class A and 10 million Class B operations/month included; egress is free. R2 requires subscription checkout and usage beyond allowances can be billed. [S7–S8] | **Optional, not a hard-zero-cost dependency.** Do not activate billing automatically. R2 is not IPFS pinning. |
| Public IPFS pinning | Pinata Free | 1 GB storage, 500 files, 10 GB bandwidth, 10,000 requests and one gateway in the current pricing table. [S9] | Good small-collection starting option; creator account/manual CID import first, then securely scoped integration. |
| Cronos JSON-RPC | Public endpoint | Official FAQ: mainnet 300 requests/minute/IP; exceeding it can block that IP for one minute. [S12] | Suitable for budgeted reads and small targeted index work, not an unlimited historical service/SLA. |
| Existing Docker stack | Current Express/Redis/SQLite deployment | Software has no licence/server subscription fee here, but it still requires a persistent machine, storage, electricity/network and operations. | Retain as development/reference or optional paid/self-hosted deployment; do not call it free hosting. |

### Options not selected as the default
- **Render free backend:** Render explicitly says free instances should not be used for production; idle services sleep, local files are lost on restart/spin-down, and free Postgres expires after 30 days. That is unsuitable for the existing local SQLite history as permanent production storage. [S13]
- **Storacha's historical “5 GB free” claims:** Current root URL redirected during this audit to Fil One advertising a 30-day trial and paid storage. Older search snippets are not sufficient evidence of a current perpetual-free IPFS plan. Re-evaluate a specific current product before integrating it. [S14]
- **NFT.Storage as unlimited free new-upload hosting:** Its current website describes preservation for a small one-time fee. Do not assume old free-upload tutorials describe the current product. [S15]
- **A public IPFS gateway as our storage service:** A gateway retrieves content; it does not commit to pinning our files. [S10]
- **Trial credits/free VM capacity as guaranteed infrastructure:** Capacity, expiry, payment eligibility and reclamation terms would need separate verification. Not the baseline architecture.

---

## 3. The important migration warning

**The current backend cannot be labelled Cloudflare-ready merely by uploading the Docker image.**

Current implementation depends on:
- Express middleware, Node HTTPS/DNS lookup and specific SSRF protections.
- Local filesystem snapshots and a Node `DatabaseSync` SQLite file.
- A persistent Node worker loop and local backup scheduler.
- Redis rate limits/leases.
- Process-local media registries and caches.

Workers supports many Node APIs, but its filesystem is virtual and temporary—not our persistent server disk. Node compatibility does not make the current file database, background process and pinned-DNS fetching architecture equivalent. [S11]

### Proposed target responsibilities

```text
Browser: React / wallet / local art builder / ZIP validation / previews
          |
          +-- static assets -> edge static hosting (no API invocation)
          |
          +-- /api/v1/* -> thin Worker routes
                          |-- D1: collections, items, orders, events, traits,
                          |       creator records, nonces, bounded jobs, coverage
                          |-- Durable Object: quotas / coordination / leases
                          |-- budgeted Cronos RPC and approved source adapters
                          |-- approved metadata/image destinations + byte limits
                          |-- optional pin-provider signing control endpoint

Scheduled bounded jobs -> RIFT marketplace/factory event ranges -> D1 projections
Creator files ---------> pin provider directly, via scoped upload authorization
Wallet signatures/tx --> Cronos directly; server never receives private keys
```

### Mandatory portability spike before adopting the free edge runtime
- Measure CPU for authentication signature verification, RPC ABI decoding, metadata normalization and JSON responses on the actual edge runtime.
- Respect six simultaneous connections and the total subrequest budget; batch RPC calls where supported, cap page sizes and split stages if needed.
- Prove safe metadata fetching. Do **not** replace pinned-DNS protection with an unrestricted URL proxy. Begin with approved IPFS gateways/media hosts and fail closed on unknown hosts until equivalent egress protections are proven.
- Use database bindings/repositories, not a local SQLite path.
- Replace endless loops with resumable jobs/checkpoints. Scheduled free invocations also have tight CPU budgets; keep each chunk small and measured. No hidden paid queue dependency.
- Test shared quotas, aborts, fail-closed behavior, D1 exhaustion and complete API shutdown while static browsing still loads.

If these tests fail the free runtime's limits, optimize/reduce scope or choose an explicitly approved paid backend. The honest outcome is not to claim a port works when only its imports compile.

---

## 4. Data/indexing strategy that can actually start cheaply

### A. Authoritative coverage for RIFT-native activity
Index the marketplace and a new launch factory **once from known deployment blocks**. Store:
- Created, sold and cancelled listings; seller proceeds and transaction references.
- Factory-created drops, creator/config/template version and contract address.
- Mint/transfer activity for registered collections, with bounded admission and known creation blocks.
- Confirmation progress, block hashes, idempotent event identifiers, rollback state and freshness.

Verify active orders/ownership before execution. Read-only browsing must not request a wallet signer. Source contracts remain the settlement authority; D1 is the searchable projection.

This directly solves the latest-100 listing problem without a full Cronos genesis index.

### B. Wider Cronos discovery
Continue source adapters for Minted/Ebisu/catalogues with explicit timestamps and coverage. Never add overlapping venue totals and call the result network-wide volume.

For arbitrary wallet holdings, offer best-effort source discovery plus RPC verification and manual imports. **Do not automatically register a full genesis scan for every anonymous portfolio lookup.** Expensive historical expansion needs separate bounded job admission.

### C. What remains impossible to guarantee at $0
- Exhaustive discovery of every named NFT contract from bare RPC.
- Full-chain historical portfolio/sales indexing with unlimited wallets on the documented public RPC limit.
- Complete cross-market sales/offer history without reliable provider coverage and venue-specific event decoding.
- An uptime/performance guarantee from third-party free APIs.

Use labels such as `RIFT indexed`, `provider indexed`, `partial history`, `asOfBlock` and `lastSuccessfulSync`. A metadata-ready badge is not an authenticity badge.

---

## 5. Dual-path launchpad: precise product specification

The two opportunities should be equally visible, but their storage/cost tradeoffs must be explicit.

### Path A — Fully on-chain token art + metadata
**Analogy:** the embedded JSON/SVG pattern observed on ULTRA CAT; not copied artwork or a promise to reproduce that creator's contract.

**Already present:** ERC-721 drop, on-chain JSON/SVG modes, deterministic starter renderer, shared creator SVG, free/paid mint, limits/time windows, allowlist, ERC-2981 signal and verification export.

**Still to implement/harden:**
1. Original visual generative/pixel/layer builder, palettes, bounded traits and deterministic preview/export. The current fixed hue renderer is not a full editor.
2. Validated self-contained SVG import with stricter schema/size limits and hostile-input tests.
3. Factory/deployment registry with a versioned, reviewed template and an emitted `DropCreated` event. Use the event and known factory identity for registration, not “some code exists at this address.”
4. Persistent creator draft/deployment lifecycle and post-confirmation registration; transaction resume/replacement handling.
5. Consistent `tokenURI`, `contractURI`, traits, original creator/royalty signal and marketplace rendering checks.
6. An explicit on-chain branding policy. Current HTTPS/IPFS PFP/banner strings are externally hosted references. For a fully self-contained branding choice, generate PFP/banner from the renderer or introduce a reviewed bounded inline-art format; do not falsely label an external banner on-chain.
7. Gas/byte-size preflight before user approval. Never quote a fixed CRO deployment price without an actual estimate.

**Cost:** zero external token-art storage subscription, but deployment/mint gas remains real. Free mint means mint price = 0, not transaction fee = 0. Predictable generation is not verifiable randomness; fair-random rarity would need a separately designed mechanism.

**Implementation caution:** Do not convert the existing constructor/immutable-based contract directly into an EIP-1167 clone and assume it initializes correctly. A clone/initializer/shared-renderer optimization is a separate contract redesign/audit. A full contract-per-drop factory is a clearer first version, with higher creator gas disclosed.

### Path B — Public IPFS art + metadata
**Analogy:** off-chain artwork/metadata publishing, with real content-addressed IPFS rather than just HTTPS.

**Correction:** The checked Six Seven token points to `https://six-seven-official.surge.sh/meta/1.json`; that JSON's image is another HTTPS Surge URL. This is a real hosted-offchain example, **not evidence of free IPFS**. [S16]

**Already present:** Numbered artwork selection, metadata/trait JSON export, IPFS URI/CID validation and immutable directory-based token URIs.

**Still to implement:**
1. Upload/pinning adapter with two entry points: **bring already-pinned CIDs** and **guided public-IPFS upload**.
2. Preflight actual provider quotas: storage, file count, gateway bandwidth, request count and reserve. Do this before telling a creator a collection fits the free plan.
3. Pin artwork + collection PFP/banner first. Generate metadata pointing to those immutable `ipfs://ART_CID/path` references. Pin metadata folder and `contract.json` second.
4. Validate the final root/directory and every expected token filename; verify metadata and actual file bytes, not just that CID text parses. Return explicit states: uploaded, pin pending, retrieval checked, ready.
5. Export a creator recovery bundle with original files, metadata, CID manifest and repinning instructions.
6. Estimate gas and deploy only after the final metadata directory is pinned/validated, unless a separately reviewed reveal design is intentionally chosen.
7. Register the confirmed drop, ingest branding and show its mint/item/collection pages automatically.
8. Optional independent replication of the **same CIDs**, without changing token metadata. Repinning identical UnixFS content requires consistent import settings; don't assume re-uploading the same visible files with different settings yields the same directory CID.

**Public IPFS is essential:** Do not use authenticated/private-provider URLs as token metadata. Do not use expiring upload/download signatures as permanent token URIs.

### Storage responsibility model

**Default — creator-controlled pinning:** Creator uses a suitable free provider account and pastes verified CIDs; no credential needs to enter RIFT. This is the safest free-first path and already fits the existing contract design. A later provider-authorized integration must use genuinely supported scoped delegation; do not invent an OAuth capability.

**Optional — capped RIFT-sponsored free quota:** The platform operates one provider account, stores its secret server-side, reserves a small upload allocation and issues short-lived restricted upload URLs only after wallet authentication and admission checks. That account's free allowance is shared by all creators—not renewed per wallet. Once capacity is exhausted, stop new sponsorship and offer creator-owned CIDs; never unpin minted collections merely to make room.

Provider docs describe presigned uploads with expiration, type and size restrictions; implement provider-specific integration and entitlement tests rather than exposing the root JWT. [S17]

### Why “1 GB free” is not enough information

Illustrative arithmetic, not a provider guarantee:
- A 67-item collection with 250 KB/item art uses about 16.75 MB for token images, plus metadata/branding. It has at least 137 logical files if every image/JSON is separate and there are two branding files plus `contract.json`.
- A 1,000-item collection can fit comfortably below 1 GB in bytes yet have more than 2,000 logical files. It can exceed a 500-file plan first.
- Folder/DAG/provider accounting must be measured via the actual upload response. One folder CID does **not** prove a plan counts it as one file. No quota-bypass assumptions.
- Requests/bandwidth and continued pinning may be the limiting factors even after storage fits.

Pinning keeps content available on participating storage; a CID alone does not pay for or guarantee continued availability. [S10]

---

## 6. API/route implementation plan

**All `/api/v1/*` routes below are proposed**, not live routes in the current Express app. Existing unversioned read routes remain in place until migration is built and tested. `BACKEND-API-IMPLEMENTATION.csv` records the complete route catalogue and phases.

### Public read routes — no wallet signature
- Status/readiness, collection search/detail/items/traits/owners/activity.
- Canonical item metadata, ownership and activity.
- Paginated listings, listing by ID, wallet active listings and proceeds summary.
- Wallet balances/assets and explicit coverage/index lag.
- Provider-specific rankings with time windows and provenance.
- Drop/mint state, public launch directory, supported storage-provider capabilities.

**Requirements:** bounded page/cursor; shared caching where safe; canonical addresses/token IDs; response schemas; no anonymous genesis jobs; truthful absence vs unavailable; no wallet popup just to browse.

### Authenticated off-chain changes
- Single-use nonce and SIWE-style wallet session bound to origin/domain, chain 25 and expiry. Support smart-contract wallets through appropriate signature verification, not EOAs only.
- Creator drafts, owner-authorized collection page presentation, favorites and reports.
- Upload allocation/presigned URL issuance and finalization.
- Deployment receipt registration verified against factory events/current chain state.

**Requirements:** public reads stay signature-free. Mutations use POST/PATCH/DELETE as appropriate; update the current global GET-only middleware accordingly. Authentication is not a spending approval. Nonces must be consumed atomically, sessions secure/HttpOnly where cookie-based, CSRF protection and ownership checks mandatory. Verify signature CPU cost on the chosen free edge runtime.

### Financial routes must not take custody
- Prepare/simulate **unsigned** approve/list/buy/cancel/withdraw/mint/deploy intents.
- Verify receipts from the chain; do not trust client-submitted success, owner, price or `verified` flags.
- User wallet performs signing/broadcast; server never stores a seed/private key or silently pays gas.
- Quotes expire and include chain/contract/version/value; revalidate ownership/order state at execution.

### Later broader trading features
Item/collection/trait offers, expiry/private orders, bulk execution and ERC-1155 need both API/index changes **and compatible reviewed settlement contracts**. Adding an `/offers` endpoint alone does not implement offers. Typed signed orders need domain separation, expiry, counters/cancellation, funding/approval checks, EIP-1271 and replay protection.

Zero platform fees can remain; royalty behavior requires a separately explicit policy. Do not present ERC-2981 detection as actual royalty payment.

---

## 7. Database plan

Proposed D1 tables/repositories:
- `collections`, `items`, normalized `traits`, owner balances/projections.
- `listings`, `chain_events`, `index_checkpoints`, collection activity and RIFT-native sales rollups.
- `launch_drafts`, verified `launches` and template/factory versions.
- `auth_nonces`, sessions (hashed identifiers), optional persisted favorites.
- `upload_allocations`, pinning/verification state, bounded jobs and budget counters.
- Moderation reports and server-authorized collection presentation settings.

Use chain/address/token-ID keys; hard-enforce chain 25. Use idempotent `(chain, txHash, logIndex)` event identities and checked block hashes. Store uint256 token IDs and wei amounts as canonical decimal **text**, not floating-point/SQLite 64-bit numbers; use a fixed-width normalized decimal sort key where indexed numeric ordering is needed. Store media outside D1, never large base64 blobs in item rows.

Queries must be cursor-paginated and indexed. Prune disposable metadata/cache/job history, not ownership-critical events without a reconstruction/backup policy. Budget database index writes and privacy-sensitive reports/sessions separately.

`design/free-first/schema.sql` is a validated **draft migration**, not a database already connected to the application. Additional repositories, authorization, ingestion and tests remain required.

---

## 8. Free-tier budget and graceful degradation

Initial **product guardrails**, not vendor limits or measured capacity:
- API target budget: at most 60,000 dynamic invocations/day, leaving headroom below the published Workers allowance.
- D1 target budget: at most 3 million rows read and 60,000 rows written/day, including index amplification; tighter limits if profiling requires it.
- Single primary DB planning ceiling: 350 MB before maintenance/migration, below the published 500 MB free DB maximum.
- Initial registered-collection admission and historical jobs are bounded by measured rows/RPC/CPU, not an unlimited self-service promise.
- Public API pages initially 20–24 records; expensive metadata resolved lazily with per-record byte limits.
- On free-tier-only operation, quota exhaustion pauses optional refresh/upload/index work and reports partial data; it does not switch on paid services.

Example traffic arithmetic: 1,000 daily visitors making 20 dynamic API requests each = 20,000 requests/day before crawlers, refreshes, uploads and internal work. That fits the request allowance arithmetically but does **not** prove the CPU, DB, RPC, storage or provider quotas fit. Loading 24 images through API routes adds requests; static routing/CDN design matters.

A five-minute cache can drastically reduce upstream requests, but a request to Worker code still counts as a Worker invocation. Do not confuse fewer provider calls with free dynamic requests. [S1–S3]

Keep intensive ZIP creation, SVG previews and generation in the creator's browser with cancellation/size caps. Never host a free unrestricted image proxy or global anonymous pinning service.

---

## 9. How the previous audit findings map into this work

| Findings | Implementation action |
|---|---|
| A-01/A-10 | Persistent paginated order API and read-only browsing; no latest-100 window |
| A-02 | Review and fix escrow receiver/unintended-transfer policy before any deployment; edge hosting does not fix custody |
| A-03/A-04 | Shared schemas, metadata normalization, bounded contract outputs and frontend error boundaries |
| A-05/A-06 | Replace per-wallet genesis jobs with targeted reusable indices, DB cursors, heartbeat/lag and explicit coverage |
| A-07/A-08 | End-to-end byte/CPU/RPC budgets; source adapters, fallback and secure portable fetching |
| A-09 | Persistent/shared references and DB bindings instead of process-local registries/local SQLite assumptions |
| A-11/A-12 | Local favorites first, optional authenticated sync; centralized truthful badge component |
| A-13 | Factory/collection registration plus `contractURI` PFP/banner ingestion across all pages |
| A-14/A-15 | Real wallet/session/transaction lifecycle tests; unsigned intents and resumable confirmation state |
| A-16 | Layered health, source freshness, index telemetry, tested recovery and backups within chosen platform limits |
| A-17/A-19 | Tablet/accessibility fixes, performance budgets, modular code and production browser CI |
| A-18 | Strict deployment report schema/time bounds, reviewed bytecode and receipt checks |

---

## 10. Phased implementation with acceptance gates

### Phase 0 — Safety and stable boundaries
Fix escrow/custody and crash defects; normalize schemas; byte-budget caches; correct badges; define domain repositories and API contracts. Keep contracts undeployed until reviewed.

**Pass:** previous negative reproductions become regressions that cannot reproduce the failures. Normal escrow/cancel/withdraw and valid artwork paths still pass.

### Phase 1 — Free edge feasibility, not a blind rewrite
Build one vertical slice: static frontend + collection/detail/order query + D1 + quota coordination. Test edge CPU, signature verification, RPC batching, SSRF behavior and quota exhaustion. Retain existing Express implementation until the slice proves viable.

**Pass:** actual-runtime behavior fits chosen limits and security semantics; otherwise explicitly revise architecture/cost assumptions.

### Phase 2 — Complete small marketplace backend
Order/event projection from deployment block, collection/item routes, owner listings/proceeds, cursor pagination, registered collections, activity and managed transaction lifecycle. Broader venue statistics remain separate from executable RIFT orders.

**Pass:** >1,000 listing IDs remain discoverable and manageable; public browsing needs no wallet; interrupted transactions recover; reorg/retry ingestion is idempotent.

### Phase 3 — Complete dual-path launchpad
Versioned factory + registry; creator drafts; improved original generative/pixel/SVG tools; on-chain branding option; public-IPFS import/upload adapters, quota checks and recovery export. On-chain gas always estimated/user-approved.

**Pass:** both modes deploy/mint in local integration tests; every item/branding reference resolves correctly; uploads cannot expose credentials, exceed reserved sponsorship silently or deploy with partial metadata. Real user-approved chain acceptance follows independent review.

### Phase 4 — OpenSea-style breadth within Cronos
Offers/criteria, selected ERC-20 consideration, expiry/private orders, ERC-1155 and bulk execution, plus moderation/creator management. Use reviewed contract versions and true index support, not just buttons.

**Pass:** protocol, API and UI tests cover replay/cancellation/partial failures and real budget behavior. Defer features that cannot meet free-tier limits rather than fabricating availability.

### Phase 5 — Production acceptance
Independent review, final provider account configuration, real mobile/injected wallets, source verification, backup restore, alerting and published coverage/fee/royalty policies.

**Pass:** deployment is repeatable on user-controlled accounts, no unapproved paid activation, realistic small-launch usage fits free quotas, and over-limit behavior is tested.

---

## 11. What is free, conditional or not free

**Can reasonably target $0 recurring platform spend at a small initial scale:** static UI, quota-limited edge API/DB, local development/tests, browser-side creator tools, creator-pinned small public-IPFS collections and provider-subdomain hosting.

**Conditional:** public RPC reliability, pinning file/bandwidth/request quotas, authentication CPU, metadata gateway capacity, database growth, logs/backup retention and any chosen third-party free API terms.

**Not honestly guaranteed free:** Cronos deployment/mint/trade gas; a purchased custom domain; independent security services; unlimited pins/bandwidth; full-chain archival indexing; always-on production VMs; and operations exceeding any selected allowance. Some can be sponsored/grant-funded, but no sponsorship is assumed.

“Free mint” and “zero platform fee” remain supported policies. They must never be used to imply free transaction gas or permanent unlimited storage.

---

## 12. What was completed in this pass versus what remains

### Completed now
- Re-audited the existing backend/runtime against the previous findings.
- Checked current primary provider documentation and pricing; rejected stale free-storage assumptions.
- Verified again that the inspected Six Seven metadata is HTTPS-hosted, not IPFS.
- Produced this migration/implementation audit, a phase-tagged API route catalogue and a locally validated draft SQL schema.

### Not completed or claimed
- No Cloudflare/Pinata account was created or connected.
- No edge API, D1/DO resources, provider billing, pinning upload or factory was deployed.
- No application audit defect was marked fixed merely by writing this plan.
- No private credentials were collected, no content uploaded and no mainnet transaction sent.

### User input needed when provisioning begins
A user-controlled hosting account and free pinning account (if guided uploads are desired), public WalletConnect project ID and final approved public addresses/origin. Private API tokens go into the host's secret store—not chat, frontend `VITE_*` variables, Git or local-storage drafts. A custom domain can wait; start with the host's HTTPS subdomain if a strict $0 launch candidate is desired.

---

## Primary sources, checked this audit

- **S1:** Workers pricing — https://developers.cloudflare.com/workers/platform/pricing/
- **S2:** Workers runtime/free limits — https://developers.cloudflare.com/workers/platform/limits/
- **S3:** Static asset billing/routing caveats — https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- **S4:** D1 pricing — https://developers.cloudflare.com/d1/platform/pricing/
- **S5:** D1 per-database and account limits — https://developers.cloudflare.com/d1/platform/limits/
- **S6:** Durable Objects pricing/free SQLite support — https://developers.cloudflare.com/durable-objects/platform/pricing/
- **S7:** R2 pricing — https://developers.cloudflare.com/r2/pricing/
- **S8:** R2 subscription setup — https://developers.cloudflare.com/r2/get-started/
- **S9:** Pinata pricing — https://pinata.cloud/pricing
- **S10:** IPFS pinning/availability — https://docs.ipfs.tech/how-to/pin-files/
- **S11:** Workers Node compatibility and virtual filesystem — https://developers.cloudflare.com/workers/runtime-apis/nodejs/ and https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/
- **S12:** Cronos official public RPC limit and gas/chain scope — https://docs.cronos.com/cronos-chain-protocol/cronos-general-faq
- **S13:** Render free-instance caveats — https://render.com/docs/free
- **S14:** Storacha root fetched during this audit redirected to https://www.fil.one/ ; not evidence of the old advertised free plan
- **S15:** Current NFT.Storage preservation model — https://nft.storage/
- **S16:** Six Seven sample metadata — https://six-seven-official.surge.sh/meta/1.json
- **S17:** Pinata presigned uploads and public folder/API support — https://docs.pinata.cloud/files/presigned-urls and https://docs.pinata.cloud/files/uploading-files

## Appendix A — Every major app surface and its public-route target

The current frontend principally uses tabs/dialogs; the URLs here are **proposed deep-link routes**, not routes already implemented. They require router integration, refresh fallback, shareable state and not-found handling.

| Current surface | Proposed browser route | Required work / acceptance |
|---|---|---|
| Main market / active listings | `/market` | Public cursor-backed orders; sorting/filtering; no signer prompt to browse; old escrow orders reachable. |
| Discover / graphical catalogue | `/discover` | Preserve 3D cards, real artwork and clear collection identity; loading/error/empty states; reduced-motion support. |
| Top collections | `/rankings` | **One deduplicated list containing the union of all-time top 100 and weekly top 100**, with both rank badges/categories. Can contain up to 200 unique collections. Filter each cohort in the same list; label provider coverage instead of claiming unproven whole-network completeness. |
| Crosscheck | `/compare` | Graphical venue comparison; freshness and scope; never add duplicated venue sales; unavailable sources remain visibly unavailable. |
| NetworkSearch | `/search?q=…` | Name/address search with cursor, verified contract identity and explicit partial-source coverage. No promise of every Cronos name being searchable without an index. |
| Collection detail / PFP / banner | `/collection/:address` | Validated contractURI/custom presentation, item grid, traits, owners, activity and exact collection address. Branding consistent in cards/search/wallet/mint page. |
| Item detail | `/assets/25/:address/:tokenId` | ERC-721/1155-aware display; ownership verification, metadata/traits and order actions; unsupported execution disabled honestly. |
| Portfolio / connect wallet | `/account` and `/profile/:address` | Injected + real WalletConnect pairing/session tests; CRO/ERC-20/NFT balances, manual imports, listing/proceeds state; provider-index coverage. No chain other than 25 allowed for financial actions. |
| Favorites | `/favorites` | Validated local persistence without login; optional authenticated per-wallet sync; deterministic account switching behavior. |
| LaunchStudio | `/create` | Choice of on-chain generated art, on-chain supplied SVG or IPFS; gas estimate, supply/allowlist/time/royalty settings; user approval before deployment. |
| Creator drafts / management | `/studio` and `/studio/:address` | Creator authorization; draft/version recovery; withdrawal and supported contract controls; prohibit falsely implying immutable settings remain editable. |
| Mint page | `/mint/:address` | Live price/supply/window/allowlist proof, transaction limits, mint simulation and confirmation; actual free price with collector gas disclosure. |
| MetadataInspector | `/tools/metadata` | Bounded URI parsing/fetching; wallet/explorer/marketplace compatibility report. Wallet gallery discovery is third-party controlled, so do not guarantee automatic display everywhere. |
| Wallet / transaction dialogs | Route-independent components | Focus/role/Escape, keyboard operation, account/chain changes and recovery from rejection/replacement/disconnect; no tablet overflow. |

All routes retain the initial gaming/3D design, but use lightweight fallback images, lazy loading and accessible flat/reduced-motion modes rather than blocking useful data behind costly animation. No demonstration collections or invented volume are admissible.

## Appendix B — Exact current launch-contract compatibility

The current `RiftDrop.sol` accepts mode 0 (starter generated SVG), mode 1 (one shared supplied SVG of at most **12,000 bytes**) and mode 2 (IPFS directory ending in `/`). Collection supply is bounded to 100,000; this is a **contract ceiling**, not a promise that a free storage account or all-at-once generation can support that supply.

Mode 2 constructs **`ipfs://METADATA_CID/1.json` through `N.json`**, with token IDs beginning at 1. Its collection metadata resolves to **`ipfs://METADATA_CID/contract.json`**. A wizard exporting zero-based files, missing `.json`, a missing trailing slash or `collection.json` alone will not match the current contract. These must be explicit automated compatibility tests.

Mode 1 currently shares the supplied art; it is not already a per-token uploaded generative layer system. A richer renderer/layer program needs a reviewed new template/version. “Fully on-chain” requires self-contained image data and metadata; an SVG with remote references is not self-contained simply because the SVG string lives on-chain.
