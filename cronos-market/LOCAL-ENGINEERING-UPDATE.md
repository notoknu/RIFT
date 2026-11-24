# RIFT — remaining local engineering, implementation pass 2

**Date:** 22 November 2026  
**Verdict:** Substantial additional engineering implemented and locally tested. **The entire roadmap is not finished and unrestricted mainnet launch is still not approved.** This report supersedes older status statements where they describe the features below as entirely unimplemented.

## Implemented in this pass

### 1. Creator authentication — real backend, not a mocked login button
- Single-use five-minute wallet challenges containing the exact configured origin, chain 25, issued time, expiry and a cryptographically random nonce.
- EOA message-signature verification and EIP-1271 contract-wallet verification.
- Atomic challenge consumption; a signature cannot be replayed to create another session.
- Hashed session identifiers in storage; HttpOnly, Secure, SameSite=Strict cookies on HTTPS, 24-hour expiry and logout revocation.
- Exact-origin mutation checks, JSON content-type/body limits and bounded authentication request rates.
- Public browsing remains signature-free. Creator login does not authorize an NFT approval, transfer or payment.

**Files:** `shared/creator-service.js`, `server/creator-api.js`, `server/creator-chain.js`, `server/local-d1.js`.

### 2. Persistent creator drafts, favorites and report intake
- Save/list/restore/delete drafts with wallet isolation, 24 KiB document caps, maximum counts and version conflict detection.
- Reject secret-like draft keys. Original files/private credentials must still never be placed in draft fields.
- Account favorites can merge with browser favorites, including bounded bulk merges; browser-local favorites still work without login.
- Authenticated collection reports have per-wallet limits and return a received—not adjudicated—state.
- The studio now exposes these controls through a creator panel rather than leaving the APIs inaccessible.

**Not implied:** reports do not automatically ban a collection; an operator moderation/review console remains unfinished.

### 3. Capped public-IPFS folder uploads
- A server-only Pinata adapter publishes a wrapped public folder. The browser never receives the root JWT.
- Each authenticated allocation has an owner, expiry, finite byte/file reservation and a single-use upload claim.
- Batches are limited to 32 files / 2 MiB input; PNG/JPEG/WebP signatures and metadata JSON/IPFS references are checked. Simple unique filenames only; MIME types are normalized before forwarding.
- Shared budget reservation is atomic. Sponsorship is disabled by default unless a secret and nonzero finite limits are configured.
- An uncertain provider response cannot be blindly retried under the same allocation: it remains charged/uncertain for reconciliation. Provider-side pin names include the allocation ID for operator investigation.
- Unexpected provider accounting pauses sponsorship instead of silently increasing the budget.
- Studio controls apply the resulting folder CID as the artwork directory or metadata directory. The existing local/remote metadata checks remain available.

**Intentional design change:** a bounded one-shot backend upload is used instead of giving the browser a reusable presigned bearer URL whose use count has not been proven enforceable. This makes local single-allocation enforcement explicit.

**Not implied:** no real pinning account was connected or charged, no live files were pinned, and the provider's current free-plan folder/file accounting, bandwidth, retention and account entitlements have not been exercised. Internal reservations are not provider billing telemetry. Keep the provider account exclusive to this service, inspect its usage and retain original files/independent backups. No guarantee of permanently free storage is made.

**Files:** `shared/pinata-provider.js`, `src/CreatorPanel.jsx`, `src/creator-client.js`.

### 4. Receipt-backed collection registration and presentation
- The backend verifies a canonical successful receipt, twelve confirmations, an event from the configured factory, exact reviewed factory runtime hash and the drop's `originalCreator`.
- EIP-1271 and factory-registration verification now have tests against actual locally deployed contracts, not only injected service stubs.
- Verified records persist collection identity/metadata/branding; only the registered original creator may change RIFT presentation settings.
- A graphical **Launched on RIFT** directory and name/address search integration consume the registry. Unknown floor/volume remain blank and no authenticity badge is invented.
- Collection permalinks use registered branding when available.

**Not implied:** this is not automatic backfill of every factory event, third-party collection authentication, or completion of branding integration in every wallet/provider surface. Direct deployments are not falsely treated as factory-registered drops. Registration currently requires an explicit creator action after confirmations.

**Files:** `shared/verify-factory.js`, `src/LaunchDirectory.jsx`, `src/registry.js`.

### 5. Shareable URLs and safer rendering
Implemented browser routes:

| Route | Behavior |
|---|---|
| `/discover`, `/collections`, `/create`, `/market`, `/account`, `/favorites` | Top-level views with browser history |
| `/search?q=…` | Shareable search query |
| `/collection/:address` | Deep-linked collection detail with source/registry lookup |
| `/assets/25/:address/:tokenId` | Public token metadata/trait page, survives refresh |
| `/profile/:address` | Public address portfolio without requiring that wallet to connect |

Unsupported chains/overflowing token IDs return a not-found view. Panel/root error boundaries prevent a rendering failure from silently emptying the application. Artwork references are normalized to supported local/HTTPS/public-IPFS/base64-image formats; arbitrary schemes are rejected.

**Not implied:** collection detail still uses the existing detail presentation rather than a complete OpenSea-style item/trait/owner/activity page. Metadata display does not prove ownership, authenticity or an available order.

### 6. Transaction records and recovery
- Approve/list/buy/cancel/withdraw, mint, creator controls and drop deployment now record lifecycle/hash information locally.
- Wrong-chain calls and unavailable recovery storage are rejected before requesting a transaction.
- Pending hashes survive refresh. Users can check receipts without re-signing/rebroadcasting anything.
- Replacement/cancellation/revert states are explicit; deployment receipts can link back into drop management.
- Listing retries check existing token/operator approval and recheck ownership instead of automatically sending duplicate approvals.

**Not implied:** this is not a fully automatic multi-step transaction wizard, chain-finality guarantee, universal nonce-replacement finder or automatic factory-deployment reconstruction after an interrupted tab. It never auto-resends a financial transaction. If a wallet response/storage operation is lost at the moment of broadcast, manual wallet/explorer reconciliation can still be necessary.

**Files:** `src/transactions.js`, `src/TransactionPanel.jsx`.

### 7. Actual edge/D1 implementation and local runtime tests
- The creator service uses Web Request/Response and a D1-style storage interface, shared by local SQLite and the Worker.
- Versioned executable migrations exist under `edge/migrations/`; these replace neither an already-live database nor the older draft schema automatically.
- The Worker implements the creator APIs and a persistent D1-backed RIFT listing projection, not just SQL sketches.
- Scheduled market sync uses an exclusive lease, canonical checkpoint checks, atomic event/order/checkpoint batches, bounded ranges, adaptive log caps, confirmation delay and a shared RPC request budget.
- D1 cursor queries preserve very large token IDs/prices as strings and keep listings older than the latest 100 reachable.
- A config generator requires a real user-owned D1 resource ID; it does not fabricate an account/resource or enable sponsored uploads.

**Local proof:** the test bundles and runs the Worker in workerd through Miniflare, applies the actual migrations to local D1, tests account flows, and tests the edge indexing algorithm against that D1 binding with isolated RPC fixtures, including 131 listings, sale state and reorg rejection.

**Critical limits:**
- This is **not yet the whole app hosted free on Cloudflare**. Legacy discovery/search/provider feeds, portfolio and media/readiness handlers still need migration or an explicitly selected hybrid backend.
- Local workerd success does not prove compliance with the hosted Free-plan 10 ms CPU budget, quotas, real public RPC behavior or production load.
- Dense single blocks above twenty indexed events deliberately stop with an error rather than skipping history. An operator-approved dense backfill path remains unfinished.
- A changed checkpoint stops indexing for investigation/rebuild; automatic reorg repair is not claimed.
- A shared application RPC bucket cannot reserve a dedicated Cloudflare egress IP/upstream allowance.

See `edge/README.md` for the exact scope and provisioning/release gates.

### 8. Code splitting, CI and operation preparation
- Creator/launch, portfolio, search and 3D discovery modules are now split/lazy-loaded rather than all remaining in the main app chunk.
- The main JavaScript bundle fell from roughly 1.17 MB before splitting to roughly 0.57 MB in this build; **large bundle warnings remain**, especially the 3D chunk. This is not a Lighthouse/real-device performance certification.
- CI now includes the new service/workerd tests and expanded browser flows.
- Node/Compose runtime configuration includes creator origin, private DB, reviewed factory identity and disabled-by-default upload sponsorship.
- Miniflare is pinned as development-only tooling. Its newer beta was selected after the older npm-latest dependency graph reported advisories; the actual compatibility path is tested. Production code does not import the simulator.

## Validation completed

| Suite | Result |
|---|---|
| Contract tests | **24 passed**, including actual local EIP-1271 and receipt/factory verifier checks |
| Security tests | **7 passed**, including shared Redis rate/concurrency controls |
| Earlier implementation regression tests | **6 passed** |
| New creator / transaction / workerd-D1 tests | **14 passed** |
| Earlier production-browser regressions | **5 scenarios passed** |
| New creator/URL browser suite | **6 scenarios passed**: actual local API login, draft save across reload, restore, history, token permalink refresh, public profile |
| Responsive/accessibility checks | No horizontal overflow on Discover/Launch at **375/768/1440 px**; wallet dialog focus/Escape pass |
| Contract artifact export and production build | **Passed**; bundle warnings remain |
| Dependency advisory snapshot | **0 reported advisories** |

Evidence lives in `checks/local-engineering-*.log`, `checks/creator-browser.json`, existing implementation browser/layout JSON and the corresponding executable test sources. These tests do not replace independent security review, live mobile-wallet pairing, live pin-provider acceptance, hosted free-tier CPU tests or mainnet settlement acceptance.

## Configuration required to activate account features

Node server/worker processes read exported runtime environment variables, not a `.env` file automatically:

```dotenv
PUBLIC_ORIGIN=<exact HTTPS frontend origin>
CREATOR_DB=data/creator.sqlite
# Optional, only after reviewed factory deployment:
DROP_FACTORY_ADDRESS=<actual reviewed factory address>
DROP_FACTORY_RUNTIME_HASH=<actual runtime bytecode hash>
# Optional upload sponsorship — keep zero/blank unless explicitly configured:
PINATA_JWT=
PIN_SPONSORED_BYTES=0
PIN_SPONSORED_FILES=0
```

No private credentials should be pasted into chat, Git, frontend assets or `VITE_*` variables. Existing browser-wallet account connection works independently of a WalletConnect project ID; real QR/mobile pairing still needs the public project ID and origin configuration.

## Remaining engineering — still my/development-side work

1. Finish migration of legacy discovery/search/provider feeds, metadata/media safety and portfolio services, then prove the full chosen free-tier deployment under hosted quotas.
2. Implement/review offers, criteria/trait offers, ERC-1155 settlement, expiry/private orders and bulk execution with the matching APIs/UI/index. These are not implemented by this pass and cannot safely be called finished by adding buttons.
3. Rich multilayer/per-token generative artwork templates and exact preview/export interoperability; the original starter generator plus shared pixel/SVG editor are not that complete builder.
4. Complete collection item grids/traits/owners/activity, automatic factory event ingestion, broader metadata schemas, and consistent branding in every asset/discovery surface.
5. Complete dense index backfill, stronger operational readiness/lag/alerts, off-host encrypted backups/restore, production load/failure tests and remaining transaction recovery edges.
6. Operator moderation/adjudication tools, provider pin reconciliation/replication/recovery workflows and further performance/accessibility acceptance.
7. Independent review and user-approved real deployment/mobile-wallet/financial acceptance.

These are **not being handed to you as coding chores**. Account ownership, public deployment identity, private-secret provisioning and user-authorized mainnet signing are the genuine user-side steps when the implementation is ready.

## What did not happen

No cloud resources/accounts or paid subscription were created; no real pin-provider secret was collected; no real file was uploaded; no mainnet contract or transaction was deployed/sent. All signing in automated tests used isolated locally controlled test identities.
