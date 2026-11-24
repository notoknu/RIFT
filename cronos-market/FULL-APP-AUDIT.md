# RIFT full-application audit
## Cronos-only marketplace, compared with OpenSea's NFT marketplace capabilities

**Audit date:** 22 November 2026  
**Scope:** Current workspace implementation: React interface, wallet adapters, Express APIs, Cronos data sources, SQLite worker, contracts, creator tools, tests and deployment configuration.  
**Verdict:** **NO-GO for unrestricted mainnet trading in the current state. Suitable for continued development and a clearly labelled read-only preview.**  
**Important:** This is an assistant-led code and functional audit, not an independent security certification, penetration test or proof that no exploitable bugs exist. No mainnet transactions were sent. Contract reproductions used an isolated local simulated blockchain. Audit fixtures and reports were added; application features were not fixed or changed during this audit.

---

## 1. Executive assessment

RIFT is a real implementation, not just a visual mock-up. It has working Cronos data APIs, wallet portfolio reads, useful discovery, creator metadata tools and a locally tested ERC-721 escrow marketplace contract.

However, it currently combines four unevenly mature products:

1. A visually developed Cronos collection directory.
2. A best-effort wallet portfolio viewer.
3. A specialized ERC-721 launch studio.
4. A small fixed-price escrow exchange primitive that is not deployed/configured for mainnet trading.

**That is not yet an OpenSea-equivalent NFT marketplace restricted to Cronos.** The largest gaps are the item/collection browsing model, order discovery and management, historical indexing, trust/safety, operational validation and several newly confirmed edge-case defects.

The earlier remediation report is not an all-clear. Existing tests still pass, but broader adversarial product checks uncovered issues outside their coverage. This audit supersedes any interpretation that only a domain, WalletConnect ID and admin address remain to finish the product.

### What is genuinely strong
- Cronos-only chain-25 focus; no multichain complexity is needed for this product.
- Real source data, address-based matching and explicit warnings instead of fabricated activity.
- Native CRO balance and RPC ownership/balance verification.
- No approvals/signatures required for viewing a portfolio.
- Contract checks for exact payment, ownership, escrow, reentrancy and proceeds accounting.
- Seller cancellation and withdrawal paths are not globally disabled by the marketplace pause mechanism.
- Metadata/verification exports, CID/trait checks, free-mint support and explicit gas responsibility.
- Production server, CSP, Redis protections, protected metadata/image fetching and bounded image caches.
- Zero currently reported dependency advisories in the audited lockfile.

### The immediate blockers
- Older active listings fall outside the UI's latest-100 scan.
- Unsolicited NFT safe transfers can be accepted into the marketplace with no listing or recovery path.
- Malformed NFT traits and unexpected launch-contract responses can blank the entire app.
- Wallet-by-wallet genesis scanning and anonymous job registration are not a scalable indexing architecture.
- Not all metadata caches are byte-bounded; large adversarial metadata remains a memory-pressure risk.
- No mainnet trading deployment, full backfill, real mobile-pairing acceptance or independently audited final release.

**A zero-vulnerability npm report does not resolve these application-level findings.**

---

## 2. Scope discipline: what Cronos-only means

The audit does **not** deduct points for omitting Ethereum, Solana, bridges, cross-chain portfolios or token swaps. Those are outside the agreed scope. Likewise, gas sponsorship and platform fees are not requirements: zero RIFT platform fee with user-paid gas is an intentional design choice.

The relevant OpenSea-style benchmark is instead:
- Can someone find a Cronos collection and inspect its individual NFTs?
- Can they filter items, inspect traits, owners, prices and activity?
- Can an owner reliably list, manage, cancel and recover an asset?
- Can a buyer understand the order and settle it safely?
- Are source coverage, verification, royalties and custody made clear?
- Can the backend stay accurate and available under ordinary growth and upstream failures?

Network scope can be narrow without reducing expectations for reliability and clarity.

---

## 3. Evidence and test results

### Re-executed baseline checks

| Check | Result | Interpretation |
|---|---|---|
| Contract suite | 20 passing | Specified local paths pass; not exhaustive security coverage |
| Security suite with actual Redis | 7 passing | Includes shared rate/concurrency behavior, protected-fetch rejection, cache and mocked-wallet/index tests |
| Dependency audit, full lockfile | 0 reported advisories | Point-in-time dependency result, not application safety |
| Production frontend build | Passed | Main JS remains approximately 1.15 MB minified / 342 KB gzip, plus lazy chunks |
| Existing wallet, launch, search, metadata browser scripts | Passed | Limited scripted scenarios; wallet signing is mocked |
| New production browser edge cases | Defects reproduced | See A-03, A-04, A-11 and A-17 |
| New isolated contract product checks | Defects reproduced | See A-01 and A-02 |

### Live API checks from this audit

These timings are individual observations, not an SLA or load-test result.

| Endpoint | Observed result |
|---|---|
| `/healthz` | 200, healthy server/Redis |
| `/api/collections` | 200; 135 union entries; 100 all-time and 55 positive-volume weekly entries; not stale |
| `/api/search?q=Six%20Seven` | 200; one match; about 6.4 seconds in this observation |
| `/api/crosscheck` | 200; 151 Ebisu contracts sampled, 46 matched to the Minted sample |
| `/api/wallet-nft?...&tokenId=1` | 200; Six Seven metadata, artwork reference and eight traits |
| Invalid portfolio address | 400 |
| Too-short search | 400 |
| Unknown API route | 404 |

The durable wallet index contained **zero registered wallets** when inspected during this audit. A running worker is not evidence of a completed history scan. Valid live portfolio checks from earlier work are not substituted for a network-wide backfill here; current malformed-metadata portfolio tests used isolated mocked responses to avoid creating new background scan jobs.

### Evidence files
- `checks/full-audit/contract-repros.mjs` and `.json`
- `checks/full-audit/browser-repros.mjs` and `.json`
- `checks/full-audit/layout-checks.mjs` and `.json`
- `checks/full-audit/live-checks.mjs` and `.json`
- `checks/full-audit-contracts.log`, `checks/full-audit-security.log`, `checks/full-audit-build.log`
- `checks/full-audit-dependencies.json`
- `checks/full-audit/*-browser.log`

No independent live-wallet signing, mainnet trade, sustained load test, full archival backfill or real Docker/TLS deployment was performed.

---

## 4. Feature-by-feature robustness and OpenSea comparison

**Status language:** “Functional foundation” means demonstrated selected paths, not production parity. “Partial” means substantial missing behavior or unverified edge cases. “Blocked” means it cannot currently serve the real mainnet use case. Robustness judgments below are qualitative; they are not measured percentages.

| Capability | Current RIFT implementation | Robustness / gap within Cronos scope |
|---|---|---|
| Gaming/3D visual design | Three.js portal, depth, tilt, animated artwork stages | Functional visual foundation. This is a 3D-styled interface, not an explorable 3D marketplace or native GLB item viewer. Tablet/accessibility/performance work remains. |
| Mainnet chain selection | Chain 25, CRO currency, Cronos-filtered source requests | Useful scope enforcement. Backend reads largely depend on a single hardcoded RPC host; worker RPC configuration is not consistently applied across services. |
| Collection directory | Combined Minted all-time/weekly ranking cards/table | Functional but **not top-100 Cronos volume across all marketplaces**. Current observed weekly list has 55 positive-volume entries, not 100. |
| Search | Name, typo/reordering catalogue, zero-volume collection coverage, address/ERC-165 lookup | Useful source-index search. It cannot promise every Cronos contract by name; provider outages and indexing gaps remain. |
| Collection pages | Modal with artwork, description, stats, source links and cross-market comparison | Partial. No full collection item explorer, trait filters, item pagination, owner table or integrated activity tab. |
| Item pages | Portfolio NFT modal with traits and explorer link | Partial. Not a public canonical item page with current orders, ownership history, sales and offers. |
| Collection PFP/banner | Creator URI fields, preview, contract metadata and IPFS export | Partial end-to-end. Existing discovery adapters and loaded-drop UI do not fully consume creator `contractURI` branding. No authorized post-launch page editor. |
| Wallet selection | EIP-6963 plus injected fallback, switching, events and disconnect | Selected mocked flows pass. Restore/cancel/concurrent-provider edges and real extension/device matrix need broader testing. |
| WalletConnect/mobile | Minimal adapter, local QR, expiry/cancellation and session initialization | Code exists; real relay/device acceptance is unverified and project configuration is missing. No polished wallet-specific mobile deep-link chooser. |
| CRO/ERC-20 portfolio | Native CRO and on-chain balances, manual import | Useful foundation. No pricing/valuation feed, universal token discovery, spam hiding or persistent imported-token preferences. |
| ERC-721/ERC-1155 holdings | Candidate discovery, lazy metadata, ownership/balance checks | Best effort. Partial history, stale candidates, source changes and malformed metadata remain issues. ERC-1155 display is not ERC-1155 trading. |
| Listing an NFT | Approve one NFT, then escrow it at a fixed CRO price | Local contract path works. Two transactions plus custody implications; no resumable workflow or full manage-listings view. |
| Buying/cancelling | Buy/cancel functions and UI | Mainnet blocked. UI sees only latest 100 IDs and reads via wallet signer rather than public provider. |
| Order backend | Direct contract reads | Missing persistent listing/activity index and paginated order API. No read-only public order browser independent of wallet connection. |
| Price changes / expiry / private orders | Not implemented as dedicated order features | Basic fixed-price indefinite public orders only; changing price requires cancel/relist. |
| Offers / collection offers / trait offers | Absent | Meaningful OpenSea-style marketplace gap; not a multichain issue. |
| Bulk listing / buying / sweep | Absent | OpenSea's documented Seaport interface supports multi-order fulfillment; RIFT currently settles one listing at a time. |
| Payment assets | Native CRO only | Intentional small initial scope, but no WCRO/other ERC-20 consideration or offer funding. |
| ERC-1155 trading | Absent | Meaningful NFT marketplace gap; optional for a deliberately ERC-721-only first release, but must be labelled. |
| Sales/activity/rarity analytics | Provider volume/floor samples | No own settlement-derived sales history, collection/item provenance view, rarity model or robust network-wide statistics. |
| Creator launch | Free/paid mint, supply/limits/times, allowlist, pause and withdrawal | Functional specialized ERC-721 foundation. No factory registry, collection-management inventory, full creator workspace or broad hostile-input validation. |
| Generative art | Deterministic RIFT character with token-ID-derived hue | Starter renderer, not a layered generative rarity/pixel editor. OpenSea itself documents a limitation on trait/rarity-based generation; this could be RIFT differentiation, not something already fully delivered. |
| Creator SVG | One self-contained SVG shared across an edition | Implemented bounded upload path; not per-token creator SVG composition or a drawing editor. |
| IPFS workflow | CID checks, metadata ZIP, traits, image filename/signature checks | Export is not upload, pinning or long-term availability. No built-in persistent pinning workflow. |
| Royalties | Drop ERC-2981 signal | Marketplace does not calculate/pay royalties. Zero platform fee and zero creator royalties are different business policies. |
| Favorites/profiles | In-memory saved-address list, connected-wallet view | Favorites disappear on refresh. No persistent profile customization, follows, offer management or notification settings. |
| Trust/safety | Source badges, warnings, token spam caution | No RIFT verification process, report queue, moderation, impersonation checks or hidden/spam-asset controls. An unconditional spotlight checkmark is misleading. |
| Backend safety | Redis, CSP, input checks, safe fetches, protected images | Useful defenses. Not all cache paths, dependency outages, backfill jobs and disconnects have bounded resource/latency behavior. |
| Operations | Local running services, Compose/Caddy templates, backups, test workflow | Not a production deployment; external monitoring, restore exercises, final-domain wallet tests and disaster recovery are unvalidated. |

### What the OpenSea benchmark actually establishes

Official Seaport documentation describes order-based offer/consideration settlement, ERC-721 and ERC-1155 support, native/ERC-20 payment items, criteria/partial orders and multi-order fulfillment. This is materially broader than RIFT's single-item escrow contract. It does **not** imply that OpenSea's API or UI will automatically support this Cronos deployment. [1](https://docs.opensea.io/docs/seaport-interface)

OpenSea documents item and collection offers, including trait-constrained offers for some collections and offer-management states. RIFT has no equivalent subsystem today. [2](https://support.opensea.io/en/articles/8866977-how-do-i-make-an-offer-on-nfts) [3](https://support.opensea.io/en/articles/8866980-what-is-a-collection-offer)

OpenSea also documents editable collection overview pages, banners, social links, rich sections and Studio workflows. RIFT's branding fields and immutable metadata references are not equivalent to that managed collection experience. [4](https://support.opensea.io/en/articles/8867024-how-do-i-update-my-collection-page)

OpenSea's creator FAQ states its own limits, including no trait/rarity-based generative collection creation. RIFT should preserve its Cronos/on-chain-art differentiation rather than assume every missing feature is something OpenSea already does. [1](https://support.opensea.io/en/articles/8867028-creator-faq)

OpenSea documents reporting and prohibited/disputed-item handling; RIFT has no comparable operational process. The comparison is about a trust workflow, not a claim that either platform can guarantee an NFT is authentic. [2](https://support.opensea.io/en/articles/10643369-prohibited-content-disputed-items-policy)

---

## 5. Technical findings and required remediation

Severity describes likely product/asset/availability impact in this implementation, **not a CVSS score**. “Confirmed” means reproduced or directly established by code. “Static risk” means the architecture/path is present but no destructive exhaustion test was attempted.

### A-01 — HIGH — Active escrow listings disappear from the UI after 100 newer IDs
**Evidence:** `src/main.jsx`, `loadListings()`; local reproduction in `contract-repros.json`.

The UI loops from `max(0,nextId-100)` to `nextId-1`. With 101 listings, listing 0 was still active but the scan began at 1. Cancelled/sold newer listings also consume that window. There is no UI route to load an arbitrary older listing ID.

**Impact:** An owner can lose the normal UI path to cancel an NFT held in escrow; buyers cannot see the older listing. This is not proof of on-chain theft or permanent lock: someone can call `cancel(id)` directly if they know the ID. Requiring that is unacceptable normal marketplace operation.

**Fix/acceptance:** Persistent event-derived listing index, paginated listing queries, owner-specific listing view and direct listing-ID retrieval. Test 1, 100, 101 and 1,000 IDs, including mostly inactive recent IDs. Decouple public reading from wallet signing (A-10).

### A-02 — HIGH — Unsolicited safe-transferred NFTs can become unrecoverable
**Evidence:** `contracts/RiftMarket.sol` inherits unrestricted `ERC721Holder`; local reproduction.

A standard NFT was `safeTransferFrom`-sent to the marketplace outside `list()`. Transfer succeeded, the marketplace became owner, `nextId` remained zero, and no rescue/recovery function exists.

**Impact:** Accidental direct delivery can strand an asset with no implemented redemption path. This does not show an attacker draining an ordinary valid listing.

**Fix/acceptance:** Design and independently review reception restricted to an expected listing operation. Specify how unintended transfers are handled without granting an owner power to seize active escrow. Plain `transferFrom` can bypass a receiver callback, so warnings and any carefully constrained recovery policy must account for that separately. Test unsolicited safe transfers, normal escrow, receiver reentry and recovery authorization.

### A-03 — MEDIUM — Untrusted NFT trait data can blank the entire application
**Evidence:** `server/portfolio.js`, `nftDetail()`; `src/Portfolio.jsx`, detail trait rendering; production-browser reproduction.

`attributes` is accepted as any array and sliced, without validating each entry. An array containing `null` reaches `t.trait_type` in the modal and throws. The tested production `#root` became empty.

**Fix/acceptance:** Validate/normalize inbound traits, enforce field/type/byte limits, safely handle malformed records and put error boundaries around untrusted asset panels. Test nulls, primitives, nested objects, huge strings, invalid numeric values and mixed arrays. Outgoing metadata validation does not protect inbound metadata.

### A-04 — MEDIUM — Unexpected drop responses can blank the entire application
**Evidence:** `src/LaunchStudio.jsx`, `load()` and `TYPES[drop.storage].title`; production-browser RPC fixture.

An arbitrary address returning otherwise plausible drop getters but `storageMode=3` caused an undefined `.title` access and emptied the root. A wallet is not required for loading a drop.

**Fix/acceptance:** Strictly validate all external contract outputs, bound integers, validate storage modes before storing UI state, show unrecognized contracts as unsupported, and isolate the panel with an error boundary. A factory/deployment registry or explicit unverified-contract warning is also needed before presenting arbitrary contracts as RIFT launches.

### A-05 — HIGH — Historical indexing is costly and can be queued by anonymous reads
**Evidence:** `server/index-worker.js`, `scanWallet()`; `server/index-store.js`, `track()`; `server/portfolio.js`, `table()`.

Each queried wallet can register an independent genesis-to-head scan. Four log filters are issued per chunk per wallet. At roughly 107 million blocks with the default 1,000-block span, a single full scan entails about **107,000 chunks / 428,000 log-filter requests**, before block checks, retries and other RPC overhead. This is algorithmic request count, not a measured completion time. Multiple wallets repeat the same chain history.

The persistent queue accepts arbitrary public addresses through portfolio GETs and has a fixed 1,000-wallet capacity. IP rate limits do not establish job legitimacy or prevent distributed queue exhaustion.

**Fix/acceptance:** Use an appropriate chain-wide transfer index or reliable indexed source, reusable historical processing, bounded job admission/quotas, fair scheduling, cancellation/retention policy and explicit backfill status. Public portfolio reads should remain readable without signatures; expensive historical jobs need a separate safe admission policy. Demonstrate 100+ wallets and sustained growth under realistic RPC limits before asserting scale.

### A-06 — MEDIUM — Index completeness/pagination semantics are not reliable enough
**Evidence:** `server/index-store.js`, `candidates()`; `server/portfolio.js`, page validation/status warnings; worker idle path.

The database records candidates ever observed, not just current holdings. Candidate pages may filter to zero after RPC verification. API pages are capped at 209 even though the durable candidate history can exceed 5,016 entries. “Caught up” uses the stored observed tip rather than worker heartbeat/current-head freshness. Database queries return all matching candidate history before slicing in application code.

**Fix/acceptance:** Cursor-based DB queries, current-balance/ownership materialization where appropriate, accurate visible/remaining counts, index lag/heartbeat, all-history access and stopped-worker tests. Never equate a finished candidate window with complete current holdings.

### A-07 — HIGH — Remaining metadata paths lack an aggregate byte budget
**Evidence:** `server/portfolio.js`, `detailCache`; `server/discovery.js`, cache; `server/wallet-assets.js`.

The byte-bounded caches are a real improvement, but `detailCache` still limits entries rather than total bytes and retains unnormalized attributes/data-image strings. Up to 1,500 large entries can exceed the supplied container memory budget. Discovery caches can also retain large row sets. The global request guards do not bound total retained cache bytes.

**Confidence:** Static resource-exhaustion risk. No intentional OOM or high-load attack was run against the live workspace.

**Fix/acceptance:** Byte-budget every untrusted-data cache, cap individual normalized metadata/trait/image fields, deduplicate in-flight artwork fetches, and test bounded resident memory with large valid and malformed responses. Keep overload failure graceful rather than killing the process.

### A-08 — MEDIUM — RPC/source failure handling is incomplete
**Evidence:** Hardcoded public RPCs across `server/portfolio.js`, `server/search.js`, `server/metadata-audit.js`, launch reads and wallet configuration; source fetch functions.

`CRONOS_RPC_URL` configures the worker/preflight but not the full read stack. There is no coordinated fallback/circuit breaker/provider budget. Many source fetches use whole-response JSON parsing without the protected fetcher's byte limit. Cross-market comparison fails as a unit if one required feed fails.

**Fix/acceptance:** Consistent private/public RPC configuration, fallback policy with chain checks, retry/backoff/circuit breaking, response schemas/size limits, deadline budgets and per-source degraded states. Test timeouts, malformed JSON, 429s and partial-source outages. Do not silently combine marketplace volumes.

### A-09 — MEDIUM — Shared rate limits do not make the application horizontally scalable
**Evidence:** Process-local `searchArt`/wallet image registries and caches; SQLite single-host database; Redis setup.

A data response generated by instance A can contain an artwork ID unknown to instance B. Moving API/image requests between replicas can produce missing artwork. SQLite/WAL and background job ownership are explicitly single-host oriented.

**Fix/acceptance:** Shared artwork registry/object storage or deterministic validated media references, a shared data-store/worker-lease design, and two-instance end-to-end tests beyond rate limiting. A carefully documented single-host first release is valid; do not market the current setup as general multi-replica readiness.

### A-10 — MEDIUM — Reading marketplace listings unnecessarily depends on wallet connection
**Evidence:** `src/main.jsx`, `loadListings()` calls `connect()` and `market(s)`.

A visitor is asked for account/network access just to discover listings. Reads are sequential and restricted to the latest window. Configuring a real contract address alone does not fix the public marketplace experience.

**Fix/acceptance:** Read-only provider/API for orders; request a signer only for approve/list/buy/cancel/withdraw. Test browsing with no injected wallet, denied connection and wrong wallet network.

### A-11 — MEDIUM — Saved collections are lost on refresh
**Evidence:** `src/main.jsx`, `saved` React state; production-browser reproduction.

Saving one collection, viewing Favorites and refreshing reduced the saved count from one to zero.

**Fix/acceptance:** At minimum versioned local persistence with validation and an explicit local-only label. Wallet-linked synchronization requires an authenticated ownership/session design when introduced; public balance reads do not. Test refresh, browser restart, account changes and corrupted storage.

### A-12 — MEDIUM — A spotlight checkmark is rendered independently of verification status
**Evidence:** `src/Discover.jsx`, floating-art card `CheckCircle2` is unconditional.

Other views conditionally render badges, but this visual can imply source verification for an unverified featured collection. A positive ERC-165 response also must not be confused with authenticity.

**Fix/acceptance:** One consistent badge component distinguishing source verification, interface detection and RIFT review. No verified checkmark for `providerVerified=false`. Add a fixture covering unverified featured collections.

### A-13 — MEDIUM — PFP/banner support is not fully integrated end-to-end
**Evidence:** `src/LaunchStudio.jsx`, config/`contractURI` export versus `load()`; `server/search.js`/`rankings.js` adapters; `src/main.jsx`, collection modal.

Creator fields and exports exist. The loaded-drop reader does not fetch/display those branding values; discovery adapters mainly use provider logo fields, not the launched contract's separate branding. A newly launched creator collection is not automatically registered into a dedicated RIFT collection directory/page editor.

**Fix/acceptance:** Implement collection registration/discovery and validated `contractURI` branding ingestion, then render the same identity on collection, mint, item and portfolio pages. Decide whether page branding is immutable on-chain or an authorized off-chain presentation setting. Test after deployment, refresh and re-indexing.

### A-14 — MEDIUM — WalletConnect/session robustness is not established on real devices
**Evidence:** `src/walletconnect.js`, `src/WalletContext.jsx`; mocked adapter tests.

The adapter initializes its chain variable to 25 rather than obtaining a restored provider's actual default/current state. Provider restore depends on asynchronous discovery/effect ordering. There is no real relay, device or mobile-link acceptance evidence. These are unverified integration edges, not a demonstrated loss-of-funds exploit.

**Fix/acceptance:** Test real MetaMask/Rabby/Coinbase and chosen Cronos-compatible mobile wallets, fresh/restored sessions, expired pairing, session changes, 4902/4001 errors, fast cancel/retry and account changes during operations. Reconcile session-approved chain and current wallet state explicitly.

### A-15 — MEDIUM — Transaction lifecycle/recovery UX is incomplete
**Evidence:** `src/main.jsx` two-step approve/list flow and global `run()`; launch/mint handlers.

A boolean pending state and toast do not cover transaction hash persistence, replaced/dropped transactions, reload/resume, first-step success followed by second-step failure, account changes mid-flow or a seller proceeds dashboard. A collection/drop address and raw fields are not a full transaction review.

**Fix/acceptance:** Explicit resumable step states, chain/account revalidation, transaction links/status, simulation/clear fee estimates, safe retry and a dedicated owner manage-listings/proceeds view. Test each partial-failure state. Do not automatically revoke or resubmit transactions without user approval.

### A-16 — MEDIUM — Health/operations checks are narrower than the product's dependencies
**Evidence:** `server/production.js`, `/healthz`; Compose worker/backups health checks disabled; local-only backup retention.

Health reports server/Redis state, not RPC reachability, source freshness, index lag, worker heartbeat, backup age or deployed contract readiness. A green health result can coexist with a nonfunctional marketplace. Redis command timeout/queue behavior and outage recovery have not been proven by the current happy-path shared-store test.

**Fix/acceptance:** Separate liveness/readiness/dependency probes, bounded Redis command queuing, worker/backup telemetry, user-facing degraded states, off-host backup retention and actual restore/failover exercises. Test container deployment/TLS; templates are not deployment evidence.

### A-17 — MEDIUM — Tablet layout and wallet-dialog accessibility fail targeted checks
**Evidence:** `checks/full-audit/layout-checks.json`; production UI at 375, 768 and 1440 px.

Discover and Launch had horizontal overflow at **768 px**, although the tested 375/1440 widths passed. Wallet picker had no dialog role, focus stayed outside and Escape did not dismiss it. This was not a full WCAG/assistive-technology audit.

**Fix/acceptance:** Responsive tablet breakpoints and container sizing; dialog semantics, initial focus, focus trap/return and Escape handling with appropriate transaction-state rules. Test keyboard-only use, screen readers and common device widths, not only one phone and desktop size.

### A-18 — LOW — Local deployment preflight timestamp validation is fail-open for invalid dates
**Evidence:** `scripts/deploy.js` uses only `Date.now()-Date.parse(timestamp)>86400000`.

An invalid timestamp yields NaN and bypasses that comparison; a future timestamp also passes. Other admin/hash/approval gates still apply. This is a local safety-guard defect, not a remote deployment bypass.

**Fix/acceptance:** Strict report schema, finite parsed timestamp, past/future bounds, chain/deployer binding and explicit review provenance. Test corrupt/stale/future reports and crash/retry of the deployment journal. A successful source-package export is not explorer source verification.

### A-19 — LOW — Maintainability/performance validation is insufficient
**Evidence:** Large app bundle; most source compressed into long lines; WebGL render loop; browser/CI scripts.

Three.js keeps scheduling renders even when reduced motion is requested. There is no demonstrated low-end GPU/memory budget, offscreen rendering pause or sustained performance test. Compressed source organization makes review and changes error-prone. The workflow omits browser E2E checks, and the existing wallet script logs overflow instead of failing on it.

**Fix/acceptance:** Formatted modular source, lint/type/schema checks, lazy route/3D chunks, offscreen/background rendering policy, performance budgets and production E2E in CI. Add the new reproductions as failing regression requirements before fixes.

---

## 6. Missing product capabilities, separate from bugs

These are not all security findings and should not all block a deliberately small first release. They do prevent an honest claim of OpenSea-style completeness.

### Essential to a credible Cronos marketplace
- Public paginated collection-items and canonical NFT detail pages, not only collection/portfolio modals.
- Persistent event-derived order index and owner-managed escrow listings.
- Item/collection activity, provenance and sales history with source/settlement distinctions.
- Reliable collection registration and launched-drop discovery.
- Consistent, truthful badges, report workflow and spam/hide controls.
- Documented terms/privacy/support and an operational moderation/incident process.
- Persistent favorites and clear transaction history/recovery.
- A coherent royalty policy: what ERC-2981 signals, what RIFT actually pays and what stays optional.
- Capacity, latency, reliability and data-freshness targets with monitoring.

### Required if claiming broad OpenSea-style trading tools
- Item offers, collection offers and trait offers, with cancellation/expiration/funding states.
- Bulk listing/buying/sweep and associated partial-failure handling.
- ERC-1155 order quantities/settlement, if not intentionally excluded from release one.
- Listing expiration, price management and private/reserved orders.
- Appropriate wrapped-CRO/ERC-20 settlement only if selected for offers/payments.
- A maintained order protocol/indexer and independently reviewed security model; reusing a protocol does not automatically inherit its UI, liquidity or Cronos integration.

### Creator/gaming differentiation to keep
- Original gaming/3D visual identity, without blocking mobile usability.
- A real layered/pixel-art/generative editor if that remains a promised creator feature; the current fixed renderer is a starter.
- User SVG on-chain editions, correctly labelled as shared artwork.
- IPFS upload/pinning workflow or a clear guided handoff, not a misleading “export means hosted” flow.
- Richer creator management, multi-drop inventory, collaborators/permissions and verified source handling.
- Rich media/GLB viewer if the desired “full 3D experience” includes actual 3D NFTs; the current portal is not that viewer.

Auctions, lending, staking, gaming inventory integrations and social/community tools can be roadmap choices. This audit does not assume each is necessary to launch or claim every such feature is currently offered by OpenSea.

---

## 7. Recommended remediation sequence

### Gate 1 — Asset safety and crash resistance; before deployment
Owner: development team, followed by independent reviewer.
- Fix A-01/A-02 before placing real assets in escrow.
- Fix A-03/A-04 and add panel/root error boundaries.
- Finish aggregate metadata/cache budgets and expensive-job admission (A-05/A-07).
- Remove misleading verification presentation (A-12).
- Add these exact reproductions to the regression suite and re-audit changed contracts.

**Exit condition:** No loss of UI access to valid active escrow; unsolicited-transfer policy tested; hostile metadata/contracts degrade to a contained error; cache/queue resource budgets demonstrated.

### Gate 2 — Complete a reliable small Cronos marketplace
Owner: development/data team.
- Public order API/index, owner listings/proceeds and durable transaction states.
- Collection items, token pages and activity/provenance.
- Rework/complete historical indexing and provider fallback; truthful source-specific ranking labels.
- Complete branding registration/ingestion, favorites, tablet/accessibility and wallet integration fixes.
- Keep release-one trading scope explicit if CRO-only/ERC-721-only.

**Exit condition:** Browsing works without a wallet; approve/list/buy/cancel/withdraw works end-to-end on the intended reviewed deployment, with old listings and failure recovery covered.

### Gate 3 — Production acceptance
Owner: operator + real wallet owners + independent security reviewer.
- Independent audit and reviewed artifact hash.
- Final domain, project ID, real browser/mobile wallet tests and source verification.
- Full backfill or an intentionally limited, clearly disclosed coverage policy.
- Docker/TLS deployment test, monitoring/alerts, real off-host backup/restore and Redis/source outage drills.
- Load/capacity testing and a public support/incident process.

**Exit condition:** A repeatable signed-off acceptance checklist on permanent infrastructure. A running sandbox is not this condition.

### Gate 4 — OpenSea-like breadth, still Cronos-only
Owner: product + protocol/data team.
- Offers/collections/traits, richer order types, bulk flows, selected payment assets and ERC-1155 trading.
- Stronger safety operations and creator workspace.
- Additional gaming/3D differentiation after the core marketplace is reliable.

No reliable schedule or cost can be inferred from passing 20 unit tests. Prioritize gates and acceptance criteria instead of an invented “percent complete.”

---

## 8. Final conclusion

**What exists:** a substantial Cronos-focused foundation with real backend/API code, useful data reads and locally tested contracts.

**What does not yet exist:** a fully robust, operationally validated, OpenSea-equivalent Cronos marketplace.

The most important next work is **not** adding more visual polish or merely supplying deployment credentials. It is closing the confirmed custody/UI failures, completing order/item/data infrastructure and proving behavior under malformed data, interruptions and realistic scale.

The original scope should remain intact: **Cronos only, original gaming/3D presentation, no fake collections, zero platform fee and explicit user-paid gas.** None of those choices requires compromising the reliability of the marketplace.
