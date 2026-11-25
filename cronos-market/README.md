# RIFT — Cronos NFT application

**Release status: public preview, not approved for funded-wallet or mainnet-trading production use.**

Start with [FEATURE-MATRIX.md](FEATURE-MATRIX.md), [RELEASE-V21.md](RELEASE-V21.md), and [LOCAL-PRETEST.md](LOCAL-PRETEST.md). The runtime release endpoint `/api/v1/release` reports allowlisted configuration observations and the Render commit when supplied. Its flags are not evidence of an audit, successful transaction, storage durability or Android acceptance.

Source includes discovery, creator tools, profiles, indexers, contracts and Android. Availability differs by deployment. Profile storage, uploads and trading must remain disabled until their individual gates are met. No Discord account or server-side wallet key storage is required.

## Historical engineering records

The notes below describe earlier milestones. They are not the current release contract; numeric test counts apply only to their recorded run.

> **Current: hybrid v8.** Read [HYBRID-V8-IMPLEMENTATION-REPORT.md](HYBRID-V8-IMPLEMENTATION-REPORT.md) and [PACKAGE-START-HERE.md](PACKAGE-START-HERE.md). Native/web personal SQLite integration, encrypted manual backups and stricter transaction/reorg recovery are implemented; 128 engineering + 40 local contract tests passed. Android runtime, remaining native pipelines, production hosting/signing and mainnet acceptance are NOT complete. Older continuation notes below are historical.

> **Latest continuation:** See [ENGINEERING-SESSION-RESULTS.md](ENGINEERING-SESSION-RESULTS.md) for implemented deployment/session/security improvements and actual verification (103 engineering, 40 contract tests). This is not a mainnet launch or a completed five-hour claim. See SECURITY.md before reporting issues and DEPLOY-NEXT.md before deploying.

> Newest D1 collection improvements: adaptive empty ranges, committed-snapshot reads, checkpoint/undo recovery and concurrency fences (migrations 0009–0010). See the current checklist.

> Latest additions: native bounded D1 collection ingestion (migration 0008) and cryptographic CAR verification. Read the current checklist for throughput, availability and hosted-acceptance limits.

> Latest verified pass: 81 engineering tests, 38 contract tests, 7 security tests and 6 earlier regressions pass. Collection ingestion, Worker v2/public reads, receipt recovery, encrypted replication and nonce recovery were expanded. See the current checklist for unfinished parity and release gates.

> Current engineering: see [ENGINEERING-COMPLETION-CHECKLIST.md](ENGINEERING-COMPLETION-CHECKLIST.md). The newer pass adds v2 UI/index, multilayer exports, collection browsing, dense-block staging and operator tools. Full edge migration and full-network collection ingestion remain unfinished.

> **Newest engineering pass:** [LOCAL-ENGINEERING-UPDATE.md](LOCAL-ENGINEERING-UPDATE.md) documents the implemented creator backend, IPFS upload code, deep links, transaction records and tested workerd/D1 slice, with exact remaining scope.

> **Latest implementation/status:** See [START-HERE-YOUR-STEPS.md](START-HERE-YOUR-STEPS.md). This is a tested local development batch, not a mainnet-ready release or completed free-cloud migration.

> **Current remediation status:** See [SECURITY-REVIEW.md](SECURITY-REVIEW.md) and [operations runbook](ops/RUNBOOK.md). These supersede older status/limitation notes below. Node 22 / Hardhat 3 is now used; both dependency audit scopes report zero advisories. WalletConnect now uses the local UniversalProvider adapter, production has CSP and shared Redis limits, and optional durable transfer indexing is implemented. External audit, real QR-wallet tests and live infrastructure/backfill remain launch gates.

# RIFT — real Cronos collection directory & marketplace foundation

## Current status
All fictional collections and demo NFTs have been removed. The hero background is generated environmental artwork, not an NFT listing. Real Minted-sourced Cronos collections now populate the directory without API credentials.

## Start
Node 20+: `npm install`, then `npm run dev`. Preview listens on port 5173.
`npm run build` compiles the frontend. `npm run contracts:test` runs the initial 5 contract tests.

## Keyless live directory — enabled
No NodeReal or NFTScan credentials are needed. The application now reads Minted's publicly accessible storefront GraphQL endpoint at https://api.minted.network/graphql. This is an unauthenticated storefront interface, not a guaranteed supported integration SLA. No access controls or authentication are bypassed. If Minted changes the interface or restricts access, adapt the integration or obtain supported access; do not bypass restrictions.

Four serial paginated reads fetch the first 100 Cronos collections sorted by each of VOLUME_ALL and VOLUME_SEVEN_DAY, with verifiedOnly:false. Each page is limited to 50. The server deduplicates contract addresses and independently calculates both ranks using exact BigInt native-volume comparisons. Wei-to-CRO conversion uses ethers formatEther. Source-side statistics provide sales volume and floor; this is NOT an independent raw-chain sales indexer. Transfers are NOT treated as sales. Floors represent Minted active listing statistics, not lowest historical sale prices or global floors.

Only positive-volume entries receive rankings for each period. Latest validation returned 100 all-time ranked collections and 62 positive-volume weekly collections, combined into 142 unique addresses. Data changes over time. Rankings are limited to Minted's indexed Cronos marketplace, NOT chain-wide. Local tie-breaking uses address among the fetched rows; source pagination controls the top-100 boundary.

Refresh results cache for five minutes. Successful results persist in data/collections.json; failed refreshes may return that timestamped snapshot with stale:true and a visible warning. No generated or mock collections are used. There is no perpetual scheduler: refreshes are request-driven while the server runs.

The response includes actual collection logos, descriptions, volume, floor, owners, and supply where returned. NFT token metadata, individual transfer histories and individual sales ingestion are not implemented in this directory integration.

### Categories
Categories are automatically inferred from collection descriptions using transparent keyword rules, explicitly marked Auto-classified (not verified). They may be incorrect. Unmatched collections remain Uncategorized. Reviewed address-specific overrides can be placed in config/collections.json with category and source fields. Collection verification badges reflect Minted's status only and are not RIFT endorsements.

## Buy & sell
Collection discovery is distinct from order aggregation. Only NFTs explicitly listed in RIFT escrow can be purchased here. External marketplaces' orders are not imported and cannot be executed through this implementation.

Implemented ERC-721 only: owner approval, native CRO fixed-price escrow listing, purchase with explicit confirmation, seller cancellation, pull-payment proceeds withdrawal. The live view reads the latest 100 RIFT listing IDs; a production indexer/pagination is still required. Wallet and chain checks run before transactions.

### Contract deployment
Contracts are NOT deployed or audited. Rehearse on testnet; frontend is currently configured for mainnet and needs matching testnet chain configuration for rehearsal.
- Testnet: `npx hardhat run scripts/deploy.cjs --network cronosTestnet`
- Reviewed mainnet deployment: `CONFIRM_MAINNET=YES npm run deploy:cronos`
- Deployment script reads DEPLOYER_PRIVATE_KEY from secure local environment only; use hardware-backed signing for production operations.
- Set VITE_MARKETPLACE_ADDRESS and VITE_NFT_ADDRESS from actual deployment output in .env.local and restart/rebuild.
- Verify contracts on Cronoscan and transfer pause administration to an operationally secured multisig.

## Production limitations
The rankings API currently runs as Vite development-server middleware. A static frontend build alone does NOT include the API; port this handler to a proper production Node/serverless backend before deployment.

No event indexer, external-order aggregator, metadata hosting, token inventory browser, auctions, offers, ERC-1155, royalties, platform fees, production moderation, persistent accounts, or WalletConnect support. Favorites are session-only. Five initial tests are not a security audit. Full wallet-browser integration and real provider validation remain outstanding.

Arbitrary malicious ERC-721s may misbehave: collection risk controls and adversarial testing are needed. NFTs transferred directly to the market outside list() can become stuck; no admin rescue/seizure capability is included. Cancellation and withdrawal remain enabled while trading is paused.

Initial npm install reported 45 dependency vulnerabilities (26 low, 11 moderate, 8 high); review/remediate before production. Complete security review, endpoint rate limiting, monitoring, reorg handling, incident response and legal/compliance review before using real funds.

## Verification this revision
Frontend production build succeeded; all five initial contract tests passed. `node test/directory.mjs` verifies deduplication, independent ranks, exclusion of zero weekly volume, floor conversion, metadata classification and rejection of non-Cronos data. A real HTTP call to /api/collections was validated: 142 unique contracts, 100 all-time and 62 positive weekly-volume collections. Mainnet trading remains undeployed and unaudited.

## Discovery redesign
The default route now opens an OpenSea-inspired discovery experience under RIFT branding: category navigation, featured real-collection carousel, two-column top-ten trending section, 7d/all-time switch, image-led collection grid, global collection search, and larger collection-detail presentation. Full directory supports grid/table switching. This is not a pixel-identical OpenSea clone and does not claim all of its platform capabilities.

3D includes a Three.js WebGL portal/particle environment with pointer-responsive camera-like group movement, layered floating collection artwork and CSS perspective tilt. Browsers without WebGL retain the artwork layout. Reduced-motion preferences disable CSS animation and portal motion. Collection cards use collection logos, not individual NFT inventory; no fake individual token assets are shown. Categories remain auto-inferred, and market statistics remain Minted-only.

Browser validation: `node checks/browser.mjs` exercised featured details, closing details, collection grid (142 contracts), table switch (143 including header), WebGL canvas presence, and mobile document width (390px matching viewport); no page errors observed. Screenshots are in checks/. Contract transaction signing was not exercised by this visual test.

## Image loading fix
Collection artwork is now requested through /api/image?hash=… on our own origin. Only 64-character lowercase hex image IDs on the fixed Minted image host are accepted; arbitrary proxy URLs are not allowed. Responses have image-type validation, an 8 MiB limit and upstream timeouts. Successful bytes persist under data/images/ and are browser-cached for one day. Artwork components retry twice and display an unavailable state rather than leaving empty cards. No artificial replacement NFTs are generated.

Verified in Chromium: all 23 spotlight, trending, and featured-grid images loaded with nonzero intrinsic dimensions through the same-origin endpoint, with no page errors. Frontend build passed. Like rankings middleware, the image handler needs a production backend when hosting a static frontend build.

## Ebisu / Crovia cross-check
The discovery homepage and collection detail now contain Across the ecosystem comparisons. A keyless server endpoint `/api/crosscheck` reads Ebisu's public storefront ranking API at api.wolfswap.gg/factions/ebisus/collections-ranked for Cronos chain 25, 100 all-time and 100 weekly entries. Results are cached for five minutes, unioned by lowercase contract address, and compared against the Minted directory snapshot. Source stats stay separate: no summed/chain-wide rank is invented. Ebisu numeric CRO values have provider floating-point precision, rounded only for display. Last validation: 151 unique positive-ranked Ebisu contracts, 46 shared with our Minted sample and 105 outside it. This is sample overlap, not proof of absence from Minted. Additional Ebisu contracts appear in the comparison data, not the main Minted-only collection directory.

Crovia's publicly readable collections page was manually reviewed through page retrieval: it labels aggregated sources such as ebisusbay, minted and cryptocom, and shows 30-day sales context. Direct server access returned a Cloudflare block; no bypass attempted. Crovia is marked manual-review-only, not live or automatically validated. No Crovia volume is added to either source. Independent sale-event identifiers and aligned windows are required before any deduplicated aggregate volume claim.

Browser checks verified eight homepage comparison rows, a contract-matched collection detail comparison and no page errors. Frontend build passed. The comparison handler is Vite server middleware and needs a production backend alongside the other handlers for static deployments.

## Visual market intelligence revision
Replaced the Across the ecosystem text/table section with an interactive marketplace dashboard: a levitating perspective artwork card, rotating CSS orbital rings, source-separated volume bars (7d / all time), actual Ebisu floorSpark7d line samples with low/high CRO labels, floor panels, and a ten-collection selectable artwork rail. Tabs switch between weekly movers, shared contracts and Ebisu discoveries outside the Minted sample. The same dashboard adapts inside collection details. Source scope and Crovia's unconnected status are in an expandable Sources disclosure, not a fabricated live panel.

Images for Ebisu cards now use a server-side address lookup `/api/market-art`; fetched artwork is restricted to four explicitly allowed source hosts, with redirects rejected, image-type/size validation and disk/browser caching. Arbitrary client URLs cannot be passed through this route. Same production backend requirement as other middleware.

Verified: all ten initial rail images loaded through the local artwork route; collection selection changed chart content; shared view and all-time switch worked; floor chart rendered; no mobile page overflow at 390px; no page errors; production build passed. Run `node checks/pulse.mjs` for the browser smoke check. Stats are request-refreshed with five-minute source caches, not a streaming feed. No interpolated fake historical sales or charts are used; floor samples have source-reported ordering, not independently timestamp-verified candles.

## Launch Studio
New Launch navigation provides generative on-chain, creator-supplied SVG edition and immutable IPFS-directory launches with zero RIFT fees and optional zero mint price. Creator/collector still pay their own gas. Details, verified reference patterns, immutable configuration, proofs, costs, tests and limitations are in LAUNCHPAD.md. This is an unaudited launch foundation, not an assertion that every launchpad feature or permanent free IPFS hosting is complete. Regenerate browser deployment artifacts with `npm run contracts:export` after Solidity changes.

## Live collection search
Both desktop global search and the collection-view search now query `/api/search?q=…&page=0` after a 400ms debounce, rather than limiting name searches to the top-volume lists. Old requests are aborted on query changes. Results preserve the existing image-led/tilt card design, open collection details, and support loading additional pages.

Sources: Ebisu's keyless collections-ranked search (zero-volume/unverified collections allowed), Minted's public omnisearch (filtered strictly to CRONOS collection results, never tokens/users/Ethereum), and direct mainnet ERC-165/ERC-721/ERC-1155 checks when a complete address is entered. Direct RPC lookup checks bytecode and optional name/symbol/totalSupply; no arbitrary metadata URL is fetched. It does not guarantee identification of nonstandard contracts.

Fuzzy names additionally use a paginated Ebisu collection metadata catalog (last observed 1,319 unique Cronos contracts), refreshed hourly with a labeled disk-snapshot fallback. Whitespace/punctuation normalization, compact names (ultracat), reordered words and limited edit-distance typos (ultra catt) are supported. If the catalog misses a collection, live name search can still find it, including a reordered-token fallback. Catalog pagination completing is NOT equivalent to all NFTs on Cronos being indexed. Search is not a full archival chain-wide indexer and cannot guarantee finding every unindexed collection by name. Use its contract address for the best direct lookup.

Results merge by normalized contract address, preserve independent source provenance, and never sum venue volumes or attach unrelated rankings. Minted omnisearch only supplies basic collection details, so missing volume/floor stays unavailable. Additional pagination is supported by Ebisu; Minted contributes on the first page only. Query responses cache for two minutes, source timeouts and partial-source warnings are surfaced, request concurrency is bounded, and input/page lengths are validated. Returned source images are registered by hash and use a same-origin `/api/search-art` handler restricted to allowed HTTPS artwork hosts with redirects rejected and the existing image size/type/cache controls.

Coverage is explicitly disclosed in the search UI; Crovia is still not connected. There is no promise of active RIFT trading for discovered collections. Like other API handlers, production static hosting requires a corresponding backend implementation and operational rate limits.

Validation: `node test/search.mjs` passed punctuation, compaction, typo, reordered tokens, empty matches and address-deduplication checks. `node checks/search.mjs` verified ULTRA CAT name/typo lookup, Six Seven outside the ranking samples, VVS, empty states, contract address lookup and source reporting, collection detail opening, mobile search, no 390px page overflow and no browser page errors. `npm run build` passed.

## NFT metadata compatibility work
See LAUNCHPAD.md's interoperability upgrade. Builder now includes description/site, collection-level contractURI metadata, actual on-chain trait metadata, IPFS contract.json and per-token override export, separate valid-CID image/metadata directories, explorer verification-package export, and a read-only metadata checker. The checker is another server middleware (`/api/nft-readiness`) and must be ported to the production backend. These improvements do not promise universal marketplace/wallet indexing or rendering, automatic source verification, enforced royalties or free permanent storage. Existing contract deployments are not upgraded by frontend changes.

### Cronos wallet & portfolio
- EIP-6963 wallet discovery plus injected-provider fallback; selectable provider, persisted authorized reconnect (`eth_accounts` only), account/network event handling, chain 25 switch/add, local disconnect and permission revocation where supported.
- Portfolio native CRO, ERC-20 balances, ERC-721/ERC-1155 NFTs; balance/ownership checked using Cronos RPC. Metadata/artwork lazy-loaded; name/collection filtering, 24-card pages, manual contract import and ERC-721 list-form prefill.
- Discovery uses Cronos Explorer public SSR table data, NOT a guaranteed-complete indexer. The first **100 indexed NFTs and 100 indexed token contracts** are cached for 60 seconds and paginated locally. Explorer remote pagination was observed returning overlapping/unstably ordered results, so it is deliberately not represented as exhaustive coverage. Holdings outside the window, unindexed and escrowed/staked assets require manual import or a production indexer. Public services receive wallet addresses.
- No approvals/signatures/transfers are requested by portfolio reads. WalletConnect QR transport is not configured; mobile users need an injected wallet browser. Actual hardware/mobile wallet and transaction testing still required.
- Metadata/image fetches use HTTPS with public DNS/IP validation, pinned DNS lookups, redirect revalidation and size/time limits. Backend is Vite middleware for this preview; deploy behind a production service with per-user rate limits and monitoring.

### Collection branding
Launch Studio includes separate PFP and banner HTTPS/IPFS URI fields and visual previews. New on-chain-mode deployments store these immutable references and expose `image`/`banner_image` through `contractURI`; individual token art stays separate. IPFS exports include both in `contract.json`, which must be pinned before deployment. These referenced assets are **not** stored on chain merely because token art is; pinning/hosting and third-party rendering remain creator/platform responsibilities. Existing deployed contracts are unchanged. Rebuilt ABI/bytecode/verification artifacts match the new constructor.

Validation: 14 Hardhat tests, production build, launch browser check and wallet browser check (mock injected provider with live Cronos/explorer holdings) passed. No independent audit or mainnet deployment performed.

## Follow-up: expanded discovery, QR integration, server and deployment gates
This supersedes the earlier first-100 discovery limitation: up to 50 explorer pages per asset type are scanned and deduplicated, with explicit missing/unstable-page warnings; coverage is still best effort. `npm run start` serves the built app and backend without Vite (`npm run build` first). Configure `VITE_WALLETCONNECT_PROJECT_ID` and rebuild to enable the implemented QR/mobile path. It has not been tested with a live relay session.

Read **SECURITY-REVIEW.md** before launch: high-severity WalletConnect dependency advisories and independent audit remain blockers. `npm run deploy:preflight` is read-only and requires `MARKET_ADMIN_ADDRESS`; deployment requires additional explicit approval flags and a matching reviewed bytecode hash. No mainnet deployment was performed.
