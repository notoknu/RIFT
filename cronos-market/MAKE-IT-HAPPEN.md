> **Batch14 update:** unified single-co-located SQLite recovery now includes exchange/journal/stage/job/review/archive state, streaming authenticated encryption/readback, exact quarantine restore, local key rotation and isolated drill. This is not split-database/hosted backup, actual off-host retention or production authority. See UNIFIED-RECOVERY-RUNBOOK.md and updated WORK-OWNERSHIP.md. Older lists below are historical.

> **Batch13 update:** validated local-candidate operator CLI and bounded foreground supervision now implemented/tested (offline validate/plan, explicit config+endpoint commitment, queue-only health, code-only events, fresh clients, circuit stops and graceful SIGTERM). Actual deployed service/hosted support, external alert transport and long-duration soak remain open. See PLATFORM-OPERATOR-RUNBOOK.md and WORK-OWNERSHIP.md. Earlier remaining lists are historical.

> **Batch12 current update:** integrated range-to-stage dispatch, durable32job queue/finite scheduling, contention backoff/expiry quarantine, reviewed exact stage-marker closure, reviewed fenced job rearm and terminal-stage archive/prune are now implemented/tested locally. Not a deployed daemon, hosted cutover, all-density solution or secure unified off-host restore. See EXCHANGE-JOBS-RECOVERY-RUNBOOK.md and updated WORK-OWNERSHIP.md. Older batch sections below are historical.

> Batch11: explicit finite stage-worker selection now discovers/resumes persisted acquiring/ready stages and admits/publishes one next block under a shared RPC/step/deadline/lease budget. No daemon, range-scanner dispatch or production integration. Held/publishing markers block replay. See STAGE-WORKER-RUNBOOK.md.

> Batch10 source-only progress: persisted hidden single-block receipt staging (4096transactions/512matching events), CAS/reopen/process-kill resume and explicit journaled complete-block publication. Automatic jobs, larger event-dense blocks and hosted/production acceptance remain open.

> Batch9 source-only progress: explicit matching-intent review, verified acknowledged archival/prune and finite journaled worker cycle with safe-unit lease renewal/shutdown. Nonmatching recovery, oversized staging, durable jobs and hosted/production acceptance remain open.

> Batch8 source-only progress: persisted recovery journal + bounded scanner/restart integration, real process-kill test, bounded independent-local restore tooling; responsibility split in WORK-OWNERSHIP.md. Assistant engineering and hosted/production/device gates still remain.

> Batch7 source-only progress: opt-in adaptive receipt-first scanning and shared aggregate acquisition budgets; remaining hosted/production/device gates mapped in REMAINING-ACTIVATION-GATES.md. Durable staging/recovery journal and activation are not completed.

> Batch6 source-only progress: opt-in bounded receipt enumeration validates every provider-advertised transaction receipt without using getLogs. Independent completeness proof, adaptive/staged dense scans, durable recovery and hosted/production acceptance remain open.

> Batch5 source-only progress: explicit fresh-client uncertain-commit observation with exact candidate-content comparison and no automatic replay. Durable recovery journal, hosted consistency, migration/restore and production wiring remain open.

> Batch4 source-only progress: full bounded-range linked-header validation and RPC read deadline/cancellation/call budgets added. No production activation; completeness, uncertain-commit recovery and hosted acceptance remain open.

> Batch3 source-only progress: remote query/status/checkpoint parity and bounded RPC/reorg acquisition added; see INDEPENDENCE-PROGRESS.md. Hosted migration/restore, completeness, reconciliation and production wiring remain open.

# MAKE IT HAPPEN — RIFT independent marketplace and developer platform

**Status:** source/architecture audit and implementation roadmap, not a completion certificate or deployment authorization.
**Prepared:** 2026-11-22, using the session's authoritative date. Provider timestamps can differ; preserve them as observations, not the document date.
**Target:** `https://rift-q6qs.onrender.com`, Cronos mainnet chain 25.
**Chosen infrastructure:** existing Render hosting and Turso account/database infrastructure. No new paid provisioning assumed.
**Product decision:** RIFT is the authoritative platform for its own marketplace, discovery/indexing, launch tools and developer API. Minted, Ebisu/Wolfswap and explorer discovery must become optional adapters, never mandatory foundations for core RIFT operations.

---


> **Execution update — batches1–2:** Work has started. See `INDEPENDENCE-PROGRESS.md` for the registry-admission bridge and candidate transactional/fenced remote exchange repository, tests and remaining gates. Original roadmap checkboxes remain unchecked until their full acceptance criteria are met.

## 0. Read this first

### What independence means

The goal is **marketplace/data-service independence**, with portability from infrastructure providers. It is not an offline blockchain app, a promise of no infrastructure costs, or proof of perfect security. Cronos remains the settlement network; RPC remains necessary. Render and Turso remain chosen infrastructure. Reown remains necessary for the WalletConnect connection path unless replaced; external-wallet/injected connections are a separate path. Other creators' HTTPS/IPFS metadata remains externally sourced unless content is lawfully replicated and retained.

### Target architecture

```text
Cronos contracts/events (chain 25)
          | RPC adapter, finality/reorg verification
          v
RIFT worker: discovery + exchange + ownership + metadata jobs
          | atomic/idempotent writes, checkpoints, leases
          v
RIFT authoritative data stores (Turso-backed application data/index projections)
          |                      |
RIFT metadata/media service      | authenticated creator services
          |                      |
          +------- RIFT versioned API -------+
                         |                   |
                   Web / Android        External developers

Optional market adapters -> separately attributed external datasets
No mandatory external-market request on a core RIFT read/write path.
```

### Non-negotiable boundaries

- No private key, seed, pairing URI, database token or signing keystore in source, logs, browser bundles, documentation or public archives.
- Existing **1 CRO cumulative mainnet test ceiling** is unchanged. Wallet balance is not authorization to spend all of it. Reconcile prior expenditure before calculating remaining allowance.
- No third-party NFT buys, unlimited approvals or new collection launches inferred from this plan. No native signing activation inferred.
- No paid plan, disk, Redis, RPC subscription or overage enablement without separate approval.
- Do not deploy/merge unreviewed v2 trading changes. Exact artifacts must compile/test before review and publication.
- Independent review is not replaced by blockchain consensus or the implementation team's own tests. A finite review is not a guarantee of perfect security either.
- Keep experimental/native signing disabled pending its separate wallet acceptance/review. No funded-wallet import into the preview native vault.
- Never infer complete chain coverage, durability, restored backups or hardware acceptance from a configuration flag.

### Responsibility / cost labels

- **A:** assistant engineering, local fixtures, static review and public read-only checks.
- **U:** owner dashboard/account/device interaction; secrets stay in secure provider UI.
- **R:** independent reviewer, where the release gate requires independence.
- **F:** free local work/read-only observation; subject to existing service quotas.
- **Q:** operating capacity/quotas must be measured; no paid purchase authorized.
- **G:** chain gas; fresh estimate and explicit bounded transaction approval required.

---

## 1. Audit scope and evidence

### 1.1 What was actually examined

Source inspection covered production routing/security, exchange contracts/client/index/worker, wallet discovery/indexing, collection registration/indexing, ranking/search/catalog/venue adapters, metadata/image resolution, account-storage configuration, public release manifest, launch studio, deployment scripts and operational recovery tooling. No private reference-document credentials were copied.

Evidence files already available in the workspace:

- `RIFT-records/independence-audit-current-public.json`: fresh bounded public endpoint observations for this audit.
- `RIFT-records/official-site-and-public-wallet-review.json`: previous public wallet/site point observations; not a fresh funding/spend statement.
- `RIFT-records/collection-storage-verified.json` and `collection-storage-mirror-and-rift.json`: sampled original-collection storage checks.
- `RIFT-records/hosting-guard-final-validation.log`, `hosting-guard-security.log`: historical last full hosting-guard regression evidence.
- `cronos-market/ANDROID-BUILD-REPORT.json`: historical v30 Android artifact/evidence scope, not a new build for this audit.

**This audit did not rerun all tests.** The generated dependency directory is currently absent/incomplete: an attempted existing Node diagnostic could not import `ethers`; the available default Node was20, not the required project Node22. A subsequent dependency-free Python HTTP probe succeeded. The initial separate Node release request timed out; the later bounded Python follow-up returned200. Do not label these environment/network issues a production outage or test pass. Reinstall and rerun exact-artifact verification before implementation releases.

### 1.2 Fresh deployed observations

The public release endpoint reported commit `559b528dbad2193209be5c759169458281a2062f`, `releaseClass: preview`, `productionApproved: false`.

| Observation | Result | What it does NOT establish |
|---|---|---|
| `/healthz` | HTTP200, `ok`, chain25 | Trading, durability or complete provider health |
| `/.env` | HTTP404, JSON error | Universal security certification |
| `/api/v1/release` | HTTP200, preview/configuration observations | Exact local-source/deployed-bytecode parity |
| `/api/v1/exchange/capabilities` | `configured:false`, `tradingEnabled:false`, null address/hash | Existence/nonexistence of every possible deployment elsewhere |
| `/api/v1/status` | HTTP503, `unconfigured`, indexes empty | Main HTTP service outage; this is index readiness |
| `/api/v1/storage/capabilities` | HTTP200, Pinata uploads disabled | Turso durable-write/restore acceptance; this is upload capability |
| `/api/collections` | HTTP200,136 rows, not marked stale | Complete Cronos collection inventory or RIFT-native data independence |
| `/api/v1/auth/session` | HTTP401 unauthenticated | Broken account login; no identity was supplied |
| Phone WalletConnect | Owner reports works | Every wallet/deep-link/reconnect case or native instrumentation acceptance |

Counts are snapshots, not fixed acceptance targets. Earlier135 and later136 directory observations are not contradictory.

---

## 2. Findings — current state versus required state

**P0:** blocks trustworthy trading/platform activation. **P1:** blocks marketplace independence or reliable operation. **P2:** developer/product completeness. These are architecture/release priorities, not claims that an exploit was demonstrated.

| ID | Priority | Source evidence / current behavior | Required action |
|---|---|---|---|
| F01 | P0 | `RiftExchange.sol`, `exchange-api.js`: source exists; live address/hash unset | Identify a valid exact deployment or prepare a reviewed new deployment; do not toggle-only activate |
| F02 | P0 | Exchange is **escrow-based**, with native-CRO funded offers, not an EIP712 signed off-chain listing service | Preserve/explicitly approve this model; test custody/refunds/withdrawals; do not design around nonexistent signed-order routes |
| F03 | P0 | `exchange-index.js`, `index-store.js`, `collection-index.js` use local `node:sqlite` files | Add authoritative remote storage adapters/migrations, transactional checkpoints and recovery |
| F04 | P0 | `remote-d1.js`/creator schema wire Turso for accounts only | Do not assume setting `CREATOR_DB_DRIVER=libsql` moves marketplace indexes to Turso |
| F05 | P0 | `production.js` starts HTTP; exchange/collection/wallet workers are separate entrypoints | Choose, implement and accept a real worker execution topology on the existing hosting |
| F06 | P1 | `rankings.js` depends on Minted; `search.js`/`catalog.js` use Minted/Wolfswap | Build own collection registry/search/ranking projections; optional external namespace only |
| F07 | P1 | `portfolio.js` discovers via `discovery.js` explorer tables; local transfer index is supplementary | Make RIFT event discovery primary with explicit coverage; remove mandatory explorer reads |
| F08 | P1 | `collection-config.js` auto-registration queries local `CREATOR_DB` SQLite | Read registered collections through the authoritative repository; bridge remote Turso registry to worker jobs |
| F09 | P1 | Per-collection configured indexes and enumerable RPC reads exist; no accepted chain-wide discovery service | Persist registry/deployment provenance, admission policy, historic scan plan and limitations |
| F10 | P1 | `crosscheck.js`, `venue-snapshot.js`, `images.js` use external venue metrics/art | Isolate optional comparison/art adapters; never relabel their data as RIFT-native |
| F11 | P1 | `wallet-assets.js` resolves embedded JSON/HTTPS/IPFS with bounded memory caches | Persist metadata provenance/job state; media retention/replication is separate from cache and SQL |
| F12 | P1 | Public `/release` currently infers configuration, not readiness | Add actual worker lag/checkpoints/lease/storage probe evidence without exposing private records |
| F13 | P0 | `scripts/deploy.js` and `scripts/preflight.js` target **legacy RiftMarket**, not RiftExchange | Add distinct exchange preflight/deploy/recovery tooling; never reuse the legacy command for v2 |
| F14 | P1 | Current security policy restricts writes; exchange API is GET-only, which fits on-chain escrow | Add only justified authenticated registration/job writes; preserve narrow routes and anti-abuse controls |
| F15 | P2 | LaunchStudio offers basic generator/sharedSVG/IPFS; not full custom ULTCAT renderer or direct HTTPS-host lifecycle | Implement two explicit workflows and validated export/manual handoffs |
| F16 | P1 | Upload capability disabled and pinning is provider-dependent | Owner-controlled storage adapter, consent/quotas and retention policy; never promise free permanent storage |
| F17 | P1 | Controlled/JVM/browser tests exist;19native compiled0executed historically | Complete owner device acceptance; user-reported connection is one useful result, not all19tests |
| F18 | P1 | Public v1 endpoints exist; no accepted external-builder platform contract demonstrated | Inventory existing routes, publish OpenAPI/SDK/version policy and external-client acceptance |
| F19 | P0 | Independent review/mainnet acceptance unresolved | Preserve gates; maintain exact release manifest, budget ledger and safe activation/exit procedure |
| F20 | P1 | Free hosting/DB quota and uninterrupted worker capability not measured for target load | Benchmark, bounded backfill and honest capacity; do not promise full-chain free indexing |

### Critical corrections to earlier discussion

1. No extra off-chain signed-orderbook is needed to make the **current escrow exchange** function. Listings/offers are contract transactions; their projections are indexed chain data. Add signed orders only as an explicit separately reviewed future protocol.
2. Turso configuration is not currently an all-platform persistence switch.
3. A public image gateway fetch is not a pin, backup, permission grant or availability guarantee.
4. A cold/sleeping web process cannot be called an accepted always-on indexer without measured behavior.
5. Existing Six Seven/ULTRA CAT NFTs must not be redeployed to demonstrate the launch tools.

---

## 3. Chosen design decisions to record before coding

- **D01:** chain25 only; RIFT contracts/events authoritative for RIFT trades; explicit chain validation everywhere.
- **D02:** retain current escrow/funded-offer model for the initial candidate unless the owner explicitly chooses a redesign. Display that listed NFTs move into escrow and offers lock CRO. Explain proceeds/refunds require withdrawal.
- **D03:** existing Render/Turso first. Add repository interfaces and portability; do not implement a second production database in parallel without need.
- **D04:** use bounded, restartable in-process worker slices as the initial **candidate** for one Render instance if free hosting supports it; startup catch-up and lag visible. If measurement fails, mark unattended indexing blocked and present execution alternatives; no paid worker silently created. Never place long backfills inside HTTP requests or browser tabs.
- **D05:** remote transactional state is authoritative. Local SQLite can remain a disposable dev/cache adapter, never the only production marketplace state on ephemeral disk.
- **D06:** public RPC initially, selectable/failover transport and capacity limits. Node ownership is optional later infrastructure scope, not a prerequisite for marketplace independence.
- **D07:** RIFT catalog/search/ranking primary. Optional venue datasets retain source/observation/coverage labels. Historical top100 external volumes cannot silently become RIFT all-time rankings.
- **D08:** developer clients use documented RIFT APIs; wallets still sign with the user's provider and contracts still enforce settlement. API keys never replace account ownership or transaction authority.
- **D09:** no forced metadata ownership claim. Caches are labelled; permanent replication requires creator authorization/content rights and retained bytes.
- **D10:** fail-closed new trading, but preserve reviewed exits/cancellation/withdrawal where safe during pause or stale indexing. Do not indiscriminately block withdrawal behind a marketing activation flag.

---

## 4. Execution roadmap — ordered, checkable tasks

Every step produces a saved artifact and a pass/fail result. A checkbox means **not yet accepted**, not an implied task already executed. A step can be partly implemented in existing modules; reuse proven code instead of replacing it wholesale.

### Phase A — Baseline and exact release identity
**Owner A; cost F. Dependency: none.**

- [ ] **A01.** Snapshot clean source, current public release/health/index responses and existing configuration key names (not secret values). Output `audit/baseline.json`, source hash and rollback artifact. Do not archive private attachments/keys/runtime databases publicly.
- [ ] **A02.** Restore a supported Node22 >=22.13, dependencies with lockfile, JDK17 and required Android tooling. Record actual tool versions and lockfile hash. Do not present sandbox Node20 failures as app defects.
- [ ] **A03.** Run engineering, security with real disposable Redis, implementation/browser, contract and relevant recovery tests. Save nonsecret logs. Resolve failures before changing protocol code. Label live/device gates separately.
- [ ] **A04.** Inventory existing legacy/v2 contracts and public deployment records. Verify chain/code/creation receipts against exact artifacts. Absence from app configuration is not proof no contract exists elsewhere. Output `audit/contracts.json` with confirmed/unknown entries.
- [ ] **A05.** Write a dependency inventory: module, hostname, operation, data rights/source, quota, credential location, mandatory/optional, replacement phase. Include explorer, RPC, Reown, pinning, verification and external media—not only marketplaces.
- [ ] **A06.** Record D01–D10 and a feature support matrix, including escrow custody and collection standards. Freeze the initial acceptance scope. No new collection launch or tokenomics implied.

**Exit A:** reproducible baseline, exact protocol choice and all unknowns enumerated. Source hashes do not prove deployed parity until independently compared.

### Phase B — Authoritative storage and migrations
**Owner A; U for secure config/restore approval. Cost F/Q. Dependency A.**

- [ ] **B01.** Define asynchronous repository interfaces for collections, contracts, events, balances, orders, checkpoints, metadata jobs, leases and developer usage. Keep API handlers independent of SQLite-specific calls.
- [ ] **B02.** Add versioned Turso/libSQL migrations with foreign keys/indexes where appropriate. Namespace by chain and contract; normalize addresses and preserve uint256 values as exact decimal/text, not JS floating point.
- [ ] **B03.** Add event uniqueness `(chainId,txHash,logIndex)` and block provenance `(number,hash,parentHash)`. Store canonical/finalization state and projection version. Enforce transactionally.
- [ ] **B04.** Move exchange events/projections and checkpoints together through an atomic remote transaction. Never advance a checkpoint before its event/projection writes commit.
- [ ] **B05.** Add worker leases with expiry, unique fencing generation and conditional writes so an old paused worker cannot commit after a replacement takes the lease. Two replicas must not double-apply events.
- [ ] **B06.** Adapt collection and wallet indexes to the repository. Verify compatibility with libSQL transaction/batch semantics; do not paste synchronous `node:sqlite` transaction patterns into async network code.
- [ ] **B07.** Replace `trackedCollections()` local creator DB query with authoritative registry access and explicit job admission. Preserve real deployment blocks/standards; validate conflicting entries. Reads must not anonymously trigger unbounded scans.
- [ ] **B08.** Design one-time import/export for any legitimate existing local index. Import into a separate staging namespace, compare counts/checkpoints, then switch; never overwrite existing account tables or assume empty DB.
- [ ] **B09.** Run disposable local/remote-adapter parity, constraint, timeout, partial-write, retry, double-worker and lease-expiry tests. Inject failures and verify checkpoint/projection consistency.
- [ ] **B10.** Export a disposable remote dataset and restore to an independent destination. Verify schema/version/event counts and sample balances. Decide encrypted backup destination and retention without public Filebin/live-data upload.

**Exit B:** remote indexes survive process replacement and independent test restore. Creator account configuration alone is insufficient evidence.

### Phase C — RPC and worker execution
**Owner A/U; cost F/Q. Dependency B.**

- [ ] **C01.** Build a shared RPC transport with chain25 validation, timeouts, provider capability checks, bounded concurrency, request/byte limits and Retry-After-aware backoff. Never retry a signing/send request automatically.
- [ ] **C02.** Persist job queues/backfill ranges. Schedule short bounded slices with cancellation and graceful shutdown; prioritize new blocks over historical work. Separate user-facing reads from worker throughput.
- [ ] **C03.** Wire the candidate worker lifecycle into the single-instance hosting topology, using B05 fencing. Document exact start/stop commands. HTTP health must not falsely report worker freshness.
- [ ] **C04.** Probe provider log-range/result caps. Adaptively shrink ranges on failure and detect result truncation where possible. Never mark an incomplete response as complete history.
- [ ] **C05.** Validate chain before committing; pin block boundaries and recheck hashes. Implement a documented confirmation/reorg policy, rollback event/projection/checkpoint transactions and deep-reorg recovery. Twelve confirmations in existing code is a policy, not mathematical finality.
- [ ] **C06.** Test crash mid-batch, restart, lease loss, provider switch,429/503, missed blocks, duplicate logs, out-of-order results and simulated reorgs. Deterministic replay must produce identical projections.
- [ ] **C07.** Measure DB writes/storage, RPC calls, API latency and backlog on actual selected free resources using bounded disposable workloads. Record measured sustainable rate, not invented service limits.
- [ ] **C08.** Exercise sleep/restart/redeploy and catch-up. If background progress cannot meet the release's freshness target, stop the always-on claim. Present manual/externally scheduled bounded work or separately approved infrastructure; do not use keepalive tricks as durability proof.

**Exit C:** selected execution model actually catches up, recovers and reports honest lag within measured capacity. Full-chain throughput is not assumed.

### Phase D — RIFT registry, discovery and ownership
**Owner A; cost F/Q. Dependency C.**

- [ ] **D01.** Create chain-scoped collection registry with address, standard, deployment block/provenance, discovery source, registration authority and coverage state. Separate verified contract identity from creator claims/branding.
- [ ] **D02.** Admit collections through verified factory receipts, exact-address lookup and authorized bounded registration. Add deployment-block verification/search when unknown. Do not trust user-submitted block/standard unchecked.
- [ ] **D03.** Reuse and extend transfer decoders for ERC721, ERC1155 single/batch and ERC20 candidates. Handle mint/burn, escrow, same-block transfers, nonenumerable tokens and malformed/nonstandard contracts explicitly.
- [ ] **D04.** Project current owner/balances from canonical events; reconcile sensitive operations through block-pinned on-chain `ownerOf`/`balanceOf`. Escrowed NFTs must appear in marketplace positions, not disappear from the user's inventory story.
- [ ] **D05.** Expose owned-asset pagination with stable cursors/snapshot or documented consistency model. Include indexed range, observed tip, confirmed tip, freshness and coverage warnings. No fabricated total count for partial scans.
- [ ] **D06.** Build local search over RIFT registry/token metadata, including normalization and bounded fuzzy matches. Direct-address lookup must work without any external-market service.
- [ ] **D07.** Replace mandatory explorer discovery in `portfolio.js`. Keep explorer as an explicit optional supplemental source, with source-separated results and no requests when disabled.
- [ ] **D08.** Define historical discovery scope: admitted collections/wallets first, then budgeted chain-wide event discovery. Validate ERC165/code and flag nonstandard/constructor-mint/ERC2309 coverage limitations. Never promise every NFT solely from ordinary Transfer scans.
- [ ] **D09.** Test nonenumerable collections, mint ID0, sparse/high token IDs, burns, batch1155, escrow, reorg rollback and multiple pages. Unknown/unindexed is not empty.

**Exit D:** registered RIFT collections and admitted wallet assets work without Minted/Wolfswap/explorer; coverage boundaries visible. Broad Cronos discovery grows separately.

### Phase E — Exchange protocol, deployment tooling and projections
**Owner A/R; U for release/admin decisions. Cost F until a separately authorized G step. Dependency A–D.**

- [ ] **E01.** Review `RiftExchange.sol` and freeze exact ABI/bytecode/compiler/dependencies. Identify differences from legacy `RiftMarket`; contracts are not interchangeable upgrades.
- [ ] **E02.** Specify escrow lifecycle: list/deposit, buy, restricted buyer, quantity, expiry, cancel/return; funded offer, token/collection/criteria scope, fill, close/refund credit and withdrawal. Declare ERC721/1155 and native CRO support; do not imply ERC20 payment support.
- [ ] **E03.** Verify royalties/rounding/caps, proceeds conservation and reserve solvency. Test unsupported/malicious NFT/royalty contracts, wrong standards, malicious receiver, callback reentrancy and unexpected deposits. Review admin pause/ownership powers honestly.
- [ ] **E04.** Verify cancellation/offer closure/withdrawal behavior during pause and frontend disable. Review accounting invariants across batches, partial fills and failed transfers. Ensure exits do not strand funds through UI gating.
- [ ] **E05.** Make event projections authoritative only after confirmed canonical processing. Expose pending versus confirmed separately. RPC receipt or index timeout is not transaction failure; never auto-resubmit a payment.
- [ ] **E06.** Add dedicated **RiftExchange** read-only preflight, approval manifest, deploy and interrupted-deployment reconciliation tooling. Current generic deploy/preflight commands target legacy RiftMarket and must not be used for v2.
- [ ] **E07.** Preflight records chain/admin, exact creation/runtime identity (including immutable handling where relevant), constructor config, gas price/estimate/max-fee ceiling, nonce, funds, source hash and expiry. No key in the report.
- [ ] **E08.** Deployment tooling must lock/reconcile submissions, persist transaction hash before waiting, recover dropped/replaced/unknown receipts and refuse duplicate deployment when status is uncertain. Verify deployed code and privileged configuration after confirmation.
- [ ] **E09.** Run unit/property/fuzz/invariant tests and client/index integration against the exact release. Save reviewer findings and resolutions. Obtain independent review at the established release gate; no audit badge inferred from test totals.

**Exit E:** exact candidate and tooling reviewed/tested; no mainnet transaction sent by completing this phase. Existing code remains explicitly unreviewed until resolved.

### Phase F — API as the platform contract
**Owner A; cost F/Q. Dependency B–E.**

- [ ] **F01.** Inventory existing endpoint behavior before changing routes. Publish OpenAPI for versioned collection/token/ownership/exchange/activity/stats/launch/account/status APIs. Existing `/api/collections` is a compatibility route, not automatically a stable developer contract.
- [ ] **F02.** Define exact uint256/text fields, chain/address casing, provenance, freshness, pagination, error codes, retry hints and request IDs. Set response/body limits and no ambiguous unknown-as-zero conversions.
- [ ] **F03.** Make RIFT-native endpoints read own projections. Put external comparison datasets under an explicit optional adapter boundary; never sum incompatible external volumes or expose external provider names as RIFT-native attribution.
- [ ] **F04.** Keep current exchange reads GET-only; chain wallets perform authorized writes. Add authenticated off-chain job/registry endpoints only as needed. Review `creatorRoute`/security method allowlists for every added route.
- [ ] **F05.** Separate public API access, account authorization and wallet transaction authority. API keys, if introduced for quota tiers, must be hashed/revocable and never grant spending/collection control.
- [ ] **F06.** Implement CORS scopes for public reads versus credentialed writes, rate/byte/concurrency quotas and explicit single-instance/distributed limitations. No wildcard credentialed CORS; no paid Redis inferred.
- [ ] **F07.** Version schema, publish changelog/deprecation policy and contract tests. Build a small typed SDK for read operations/transaction preparation; never accept developer private keys server-side.
- [ ] **F08.** Build one independent sample client using only documented public RIFT endpoints and wallet contracts. It must not import backend internals, query competitor APIs or scrape RIFT HTML.
- [ ] **F09.** Migrate web and Android clients to the same supported API contract. Audit residual direct external-market calls. On-chain reads/signing remain explicit RPC/wallet actions, not hidden server custody.

**Exit F:** an external developer can build a collection/portfolio/trading client with documented RIFT APIs and their own wallet provider.

### Phase G — Native statistics and optional external adapters
**Owner A; cost F/Q. Dependency D–F.**

- [ ] **G01.** Define RIFT sales volume, floor, owners, listings, weekly/all-time windows and time attribution. Use canonical settlement events, not listing asks as completed volume.
- [ ] **G02.** Calculate active floor only from executable/not-expired orders at an indicated block/time; handle pause/escrow/closed listings. State that the API is an observation, not a guaranteed executable quote.
- [ ] **G03.** Build rankings from RIFT sales/indexed scope. Preserve requested top100 all-time plus weekly union behavior when sufficient verified data exists; do not manufacture200 collections or call RIFT-only activity market-wide Cronos volume.
- [ ] **G04.** Convert Minted/Wolfswap/Ebisu/explorer functionality to individually disableable adapters. Retain source timestamps, attribution, provenance and cache retention. Confirm provider terms/data rights before redistribution through a public API.
- [ ] **G05.** Add isolated bounded caches/cooldowns at adapter boundaries. A per-process cache is not cluster-wide rate control. Missing adapter data cannot block RIFT-owned reads/trading settlement.
- [ ] **G06.** Run the external-market blackout acceptance in section6. Remove mandatory requests from catalog/search/portfolio/image paths; do not fake responses to make the test pass.

**Exit G:** core remains useful under external-market/explorer blackout; external coverage gaps are labelled, not silently filled with demo data.

### Phase H — Metadata, media and two exact launch workflows
**Owner A/U; cost F/Q; deployment/mint later G. Dependency D/F and storage choices.**

- [ ] **H01.** Persist metadata URI/document hashes, source scheme, fetch status, checked block/time, retry state and bounded parsed fields. Keep original URI separate from a display override or mirrored URL.
- [ ] **H02.** Retain safe-fetch SSRF protections, DNS/redirect/size/time limits and SVG/dataURI isolation. Render images as images, never inject untrusted SVG/HTML. Test scripts, foreign references, decompression/large payload and gateway failures.
- [ ] **H03.** Define media manifest/object-storage adapter separately from SQL. Store URI/hashes/provenance/retention status in Turso; do not treat a small free SQL allocation as unlimited binary image storage.
- [ ] **H04.** Support creator-controlled external storage with explicit rights/retention declarations, quotas and export/recovery. No secret provider tokens in browser bundles. Never claim a gateway cache is a permanent pin.
- [ ] **H05.** **On-chain workflow:** creator inputs deterministic art/traits -> preview -> build/version renderer -> exact contract config -> cost preflight -> reviewed deploy handoff -> metadata/source verification -> mint page/API registration -> recovery package. Basic built-in SVG generator is not a substitute for a full ULTCAT renderer.
- [ ] **H06.** Add custom renderer workflow only with size/gas determinism, supply/trait integrity, ownership/admin design and artifact verification tests. Do not copy another project's branding/art or promise all artwork cheaply fits on-chain.
- [ ] **H07.** **Creator-hosted workflow:** numbered artwork/traits -> complete JSON/media/site export -> owner-controlled hosting -> full bounded URL/hash validation -> metadata contract config -> reviewed deploy handoff -> verification/mint page -> backup. UI must distinguish exported/uploaded/verified/deployed/accepted states.
- [ ] **H08.** Direct HTTPS storage needs an explicit supported contract/configuration mode and reviewed mutability policy. Current studio IPFS mode validates ipfs directory URIs; do not claim a Surge URL already works in that mode. Add HTTPS import validation without silently changing immutability promises.
- [ ] **H09.** For direct integrations unavailable to the assistant, show exact manual dashboard steps and a resumable Check my hosted files stage. Preserve creator ownership; no publish probes on live domains and no background unapproved republish.
- [ ] **H10.** Separate banners/profile overrides from canonical token art/contractURI. Gate edits through proven creator authority; handle ownerless contracts without granting control based solely on claimed treasury/social identity.
- [ ] **H11.** Integrate factory verification/registration with remote registry/job admission, explorer verification package and failure recovery. Marketplace display/verification approval is not implied by deployment or explorer source verification.
- [ ] **H12.** Test existing original collections as read-only references: ULTRA CAT embedded JSON/SVG; Six Seven official HTTPS metadata with legacy image refs. Do not relaunch either. If correcting Six Seven JSON, first validate/export all67, compare image hashes, stage/backup and obtain publishing approval; no redirect-only false fix.

**Exit H:** two explicit workflows function or clearly stop at a documented, validated manual boundary. No fake one-click hosting or undeclared external fallback.

### Phase I — Accounts, connections and encrypted workspace
**Owner A/U; cost F/Q. Dependency B/F.**

- [ ] **I01.** Verify nonce one-use/expiry/domain/chain binding, EOA and ERC1271 authorization, cookie settings, session revocation and replay/race behavior. Wallet connection alone is not authenticated account sign-in.
- [ ] **I02.** Validate profile/draft/favorite ownership and optimistic concurrency in remote storage; account export/deletion must not touch someone else's records. Redact logs and enforce payload/retention limits.
- [ ] **I03.** Test encrypted workspace sync on two disposable clients: encrypt before upload, authenticated encryption, wrong-key/tamper refusal, version conflicts, offline edits, recovery export and deletion. Verify server cannot read encrypted private fields. Metadata/profiles intentionally public/plaintext must be clearly distinguished.
- [ ] **I04.** Centralize selectable RPC/provider state, manual disconnect/reset and bounded read retries. Never replay signing requests on reconnect/focus/foreground. Preserve explicit user network pauses.
- [ ] **I05.** Validate Reown QR/deep-link/app-switch/reconnect with the owner. User-reported connection already passes one case; capture versions, expected chain/account changes and decline behavior without QR/session-secret screenshots.

**Exit I:** authenticated persistence plus conflict/recovery behavior accepted using disposable records; no funded credential import.

### Phase J — Operations, security and resilience
**Owner A/U/R; cost F/Q. Dependency B–I.**

- [ ] **J01.** Establish threat model across contract escrow, API auth, SSRF/media, DB tokens, worker fencing, supply-chain dependencies, client signing and native vault. Map each threat to tests/controls/residual risk.
- [ ] **J02.** Pin/audit dependencies; protect build/workflow permissions, release signing, artifact hashes and source packages. Remove obsolete Surge base64 bootstrap from actual deployment settings, not by disabling its safety check.
- [ ] **J03.** Add safe public readiness plus private metrics: checkpoint lag/reorg depth/jobs/leases, RPC failures, DB errors/quotas and pending transaction reconciliation. Keep wallet/session/secret data out of public status.
- [ ] **J04.** Add schema-compatible app rollback and reversible feature rollout. Do not promise contract rollback; confirmed chain transactions cannot be undone by restoring a database.
- [ ] **J05.** Exercise disposable restart/SIGKILL, network outage, remote DB unavailable, quota exhaustion, partial backup and independent restore. Define recovery point/time objectives from measurements, not aspirational numbers.
- [ ] **J06.** Validate one-process protection on the existing instance or a genuinely shared limiter if multiple replicas. Do not scale out while relying on local-only quota/worker assumptions.
- [ ] **J07.** Publish operator incident actions: pause new entry when justified, maintain safe exits, rotate exposed credentials, restore projections from canonical events, reconcile before reopening. Preserve private recovery material.
- [ ] **J08.** Obtain independent review at the existing trading/native-wallet gates. Record reviewed commit/artifact, scope, exclusions and resolved/unresolved findings. Never label self-review independent.

**Exit J:** operational recovery demonstrated and residual risks explicit. Free-tier capacity and independent review remain real gates, not tickboxes.

### Phase K — Mainnet activation, separately authorized
**Owner U/A/R as authorized; cost G. Dependency E/J plus accepted hosted state.**

- [ ] **K01.** Reconcile spend ledger and current wallet/nonce/public contract state using read-only RPC. Never assume the previous3CRO balance is current or all spendable under the ceiling.
- [ ] **K02.** Produce an exact transaction list with destination/function/value/approval scope/gas limit/max fee/expected outcome and cumulative worst-case budget, including failed transaction and cleanup possibilities. Record the remaining1CRO ceiling. Historical1.2435CRO estimate exceeded it and is not current approval.
- [ ] **K03.** If budget or review gate fails, stop; propose narrower safe scope, reuse of a verified existing deployment, or request explicit changed authorization. Do not hide mint/config/withdrawal costs outside deployment estimate.
- [ ] **K04.** Obtain approval for the exact artifact and bounded transaction set/admin arrangement. Do not infer native signing approval; keep keys out of this document, GitHub and Render frontend environment.
- [ ] **K05.** Reconcile an existing verified exchange or deploy once using E06–E08 tooling. Save receipts/runtime/admin identity and source-verification result. No duplicate collection or speculative marketplace deployments.
- [ ] **K06.** Set exact `EXCHANGE_ADDRESS`, `EXCHANGE_START_BLOCK`, `EXCHANGE_RUNTIME_HASH`; leave new trading off. Ensure API/worker share authoritative storage and index from the actual deployment block; verify code hash live.
- [ ] **K07.** Catch up/reconcile the exchange projection, storage and safe exit behavior. Confirm zero unexpected admin/protocol fees and truthful royalty display; ERC2981 reporting is not universal enforcement.
- [ ] **K08.** In the separately approved isolated RIFT acceptance window, enable the reviewed release and test only permitted assets/parties/amounts. Execute minimal approval/list/cancel or sale/offer/refund/withdraw paths as actually budgeted. Never use third-party buys or unlimited approvals to save planning time.
- [ ] **K09.** Confirm receipts, NFT ownership/escrow, proceeds/reserves, real gas costs and indexed UI/API state after finality policy. Any ambiguous transaction requires reconciliation, not automatic resend.
- [ ] **K10.** Record pass/fail and cumulative spend. Disable new trading if a critical gate fails while preserving reviewed recovery paths. Public activation requires accepted evidence, not just `EXCHANGE_TRADING_ENABLED=1`.

**Exit K:** actual bounded mainnet behavior accepted and receipts published without credentials. This document authorizes none of the transactions by itself.

### Phase L — Android, developer release and publication
**Owner A/U; R for wallet review; cost F/Q, store fees only if separately approved. Dependency F–K as relevant.**

- [ ] **L01.** Build matched web/app/test artifacts; verify package/version/origin/signers and embedded asset hashes. Preserve funded-wallet files/signing identity privately; debug signing is not production custody approval.
- [ ] **L02.** Owner installs as update without uninstall/data-clear; run exact artifact-verified19instrumentation tests with an authorized device. Capture sanitized counts/failures, not secrets or arbitrary logcat.
- [ ] **L03.** Complete biometric/credential auth, lock/unlock, process-death, SAF export/import, network loss, app-switch and wrong-account/chain cases. Test with disposable vault/workspace, not funded keys.
- [ ] **L04.** External builder acceptance: new client using only public docs/SDK can list registered collections, fetch token metadata/ownership/activity and prepare supported trading flows. Verify CORS, pagination, quotas and schema errors.
- [ ] **L05.** Run all gates in section6 and publish an honest feature matrix: accepted, partial, disabled, optional-provider-dependent, device-blocked. Add API changelog and migration/deprecation guidance.
- [ ] **L06.** Package full source/APKs/docs/evidence/checksums without credentials/runtime personal records. Temporary Filebin is distribution only. Decide durable release hosting/publication and licensing separately; do not invent exclusive licensing terms.

**Exit L:** a repeatable developer-platform release with accepted core behavior, exact artifacts and truthful remaining limitations.

---

## 5. Dependency order / what to do first

```text
A baseline
  -> B remote persistence
  -> C real worker lifecycle
  -> D registry/ownership
  -> E exchange candidate/projections
  -> F stable API
  -> G native stats + adapter independence

H launch/media and I accounts/sync can proceed after B/D/F interfaces stabilize.
J threat/operations work starts in A and gates K.
K funded-chain activation only after explicit review, budget and approval.
L client/developer acceptance runs continuously; final release follows applicable gates.
```

**First implementation batch:** A01–A06, B01–B07 design/migration + disposable tests, C worker design. Do not spend the funded wallet to compensate for missing persistence or worker topology. Do not attempt a whole-chain backfill before measuring capacity on admitted collections.

**Prefer reuse:** keep tested event reducers, URI validation, file export, stale-state UI and recovery utilities where correct. Replace dependencies at interfaces; do not discard functioning creator tools or tests as “demo cleanup.”

---

## 6. Acceptance gates — proof of independence

| Gate | Exact evidence required | Blocking rule |
|---|---|---|
| X1 external-market blackout | Block Minted, Ebisu/Wolfswap and explorer discovery egress in integration tests; test cold start without old snapshots too | Registered RIFT catalog/search/holdings and own exchange reads still work; optional comparisons show unavailable |
| X2 chain availability boundary | Fail one RPC then switch to validated second provider; fail all RPCs | Reads explicitly stale/unavailable; no signing resubmission or claim of live settlement |
| X3 persistence | Save disposable records/index state, replace process/redeploy, compare expected values | No production-authoritative index on ephemeral-only SQLite |
| X4 replay/reorg | Deterministic event replay, duplicate events, partial commit, fork rollback, double worker | Identical correct balances/orders/checkpoints, no double credit |
| X5 API platform | Independent sample built from OpenAPI/SDK without UI scraping/internal imports/competitor queries | Pagination/errors/source/freshness/auth conform; no secret server custody |
| X6 metadata | Inline JSON/SVG, IPFS and creator HTTPS pairs; missing/hostile media; provenance and override checks | No fabricated substitute art, SSRF or cache-as-permanent-storage claim |
| X7 launch workflows | Both end-to-end preparation paths tested; manual hosting checkpoint verified; deploy steps separately approved | No promise of custom renderer/HTTPS hosting if still unsupported |
| X8 exchange | Exact bytecode reviewed, invariants/failure paths pass, index healthy; isolated approved chain receipts | No toggle-only activation; exits and liabilities reconcile |
| X9 Android | Matched artifact/signature/assets plus19tests and manual lifecycle evidence | Owner connection report alone does not certify vault/device suite |
| X10 recovery | Independent disposable backup restore + replay + documented measured recovery time/data loss | Same-host copy/Filebin/atomic rename alone insufficient |
| X11 capacity | Bounded measured worker lag/RPC/DB/media/API usage within selected free resources | No unlimited/all-chain/always-on claim if evidence fails |
| X12 security/release | Exact source/compiler/artifact manifests, resolved findings, independent review per established gate | Local passing tests not misrepresented as audit or perfect security |

Blackout tests intentionally leave the selected RPC and creator-owned metadata sources available: this proves marketplace independence, **not total infrastructure independence**. Test missing local caches as well as warm caches so a saved competitor snapshot cannot mask dependence.

---

## 7. Commands and configuration — existing versus proposed

### Existing verification commands (not all rerun during this audit)

Run in the project directory containing `package.json`, with Node22 and JDK17 restored. Use disposable DBs/Redis and protected local environment; never production credentials in command history/logs.

```sh
npm ci --include=dev --ignore-scripts
npm run test:local-engineering
npm run contracts:test
npm run test:implementation
npm run build
npm run test:browser:implementation
npm run test:android-shell
```

`npm run test:security` requires an isolated real Redis for the Redis branch (`TEST_REDIS_URL`). Native Gradle builds/device commands also require the documented SDK/JDK and exact artifact checks. Dependency native binaries may need legitimate platform-specific installation; do not suppress failures or report skipped branches as executed.

Existing separate workers: `npm run exchange:worker`, `npm run collection:worker`, `npm run index:wallets`. These currently use local-index configurations; **not production run instructions for a completed Turso migration**. Starting them blindly on free Render does not meet B/C gates.

**Do not run `npm run deploy:cronos` to deploy RiftExchange:** current target is legacy RiftMarket. Dedicated v2 tooling is a PhaseE deliverable.

### Existing Render layout

For the supplied source archive layout:

```text
Root: cronos-market
Build: npm ci --include=dev --ignore-scripts && npm run build
Start: npm start
```

Remove legacy inline/base64 Surge patch commands from service settings. Preserve real account data and existing config. Future worker start changes must be tested/documented, not guessed here.

### Existing environment keys

| Key group | Current role / caveat |
|---|---|
| `NODE_ENV`, `NODE_VERSION`, `PUBLIC_ORIGIN` | Production/supported Node22/exact HTTPS account origin |
| `CREATOR_DB_DRIVER=libsql`, `CREATOR_LIBSQL_URL`, `CREATOR_LIBSQL_AUTH_TOKEN` | Creator remote storage only today; token only in secure server UI |
| `CRONOS_RPC_URL` | Backend RPC; new failover/transport design needs explicit documented configuration |
| `EXCHANGE_ADDRESS`, `EXCHANGE_START_BLOCK`, `EXCHANGE_RUNTIME_HASH` | Exact reviewed v2 deployment identity; not placeholders to invent |
| `EXCHANGE_TRADING_ENABLED` | Keep0 until K gates;1 by itself cannot configure a contract |
| `EXCHANGE_INDEX_DB`, `INDEX_DB`, collection paths | Current local SQLite state; migrating persistence does not happen by changing creator driver |
| `COLLECTION_INDEXES_JSON`, `INDEX_REGISTERED_COLLECTIONS` | Current admission/local-registry configuration; remote registry bridge required |
| `REDIS_URL` or explicit `ALLOW_SINGLE_PROCESS_LIMITS=1` | Shared protection versus one-process-only assumption; no automatic scale-out safety |
| `VITE_WALLETCONNECT_PROJECT_ID` | Public ID `6192620197a83e8b29a98f8eb68ecc89`; build-time override; never put a database secret in VITE fields |
| `DROP_FACTORY_ADDRESS`, `DROP_FACTORY_RUNTIME_HASH` | Factory receipt registration; deploy/identity still must be verified |
| `PINATA_JWT`, finite `PIN_SPONSORED_*` quotas | Optional provider upload path; not required for on-chain art; no permission to provision/purchase |

New index-store/worker/adapter keys are **proposed design work**, not existing environment switches. Document them only after implementation/tests.

---

## 8. Owner handoffs — minimum needed, grouped

### Already supplied/reported
- Render hosting and Turso chosen; existing site redeployed.
- Current public Reown project ID supplied; allowed origin owner-reported.
- Wallet connection works on the owner's phone.
- Funded testing wallet exists; prior public balance observation3CRO, not a current balance or revised budget.

### Needed during implementation
1. Dashboard actions only when required: deploy tested source, private environment values, existing free/no-overages confirmation. Do not paste tokens into chat.
2. Confirm existing contract addresses/deployment receipts if deployed outside the tracked record. Public values only.
3. Test empty-wallet account sign-in/profile/draft plus phone cases. A login message is not a transaction approval; verify origin/purpose before signing.
4. Allow a controlled restart/restore test with disposable records; do not expose or overwrite live account DBs.
5. Decide publication/licensing and any broader production custody/admin model separately. No inference of exclusive licensing terms.
6. At PhaseK only, approve exact reviewed artifact/transaction plan and ceiling or decline. No “all features” instruction silently raises spend.

No owner action is needed merely to start source auditing, repository refactoring, fixtures, OpenAPI, simulations or packaging. Do not repeatedly ask for credentials to do local engineering.

---

## 9. Resource / feasibility decisions and stop conditions

| Situation | Required action |
|---|---|
| Public RPC cannot supply history at sustainable rate | Bound scope/admit collections, expose partial coverage, measure alternatives; request approval before paid service |
| Free Render sleeps or cannot sustain background worker | Persist checkpoints, show stale status; accept only measured catch-up model or explicitly decide execution change |
| Turso quota insufficient | Optimize batching/indexes/retention, reduce initial scope; no overage enablement or silent data dropping |
| Full metadata/media archive too large | Keep honest caching and creator-controlled storage; price capacity separately; SQL not unlimited object storage |
| Review incomplete or exact artifact differs | Remain preview/trading-gated; rebuild/retest/review |
| Mainnet plan exceeds remaining1CRO | Stop, revise scope or obtain explicit new authorization; no gas subsidy assumption |
| Native vault review/device gates fail | External-wallet path remains separate; no funded native import/signing activation |
| Existing contract cannot support chosen feature | Mark unsupported; review migration/new deployment separately; never claim an environment variable upgrades bytecode |

---

## 10. Definition of done and reporting format

**RIFT-native platform MVP is done only when:**

- Registered/admitted collections, assets and RIFT exchange data are served from RIFT-controlled indexed services without mandatory competitor/explorer requests.
- Canonical events/projections/checkpoints and account records survive process replacement; an independent disposable restore is demonstrated.
- Worker readiness/coverage is observable and honest at measured capacity.
- An external client can build on documented RIFT API/SDK without private internals or UI scraping.
- Both intended launch preparation workflows are usable with explicit tested manual boundaries; no false direct-hosting/custom-renderer claims.
- Exact trading candidate passes applicable review and bounded approved mainnet acceptance before public activation.
- Android/device and native-wallet gates remain clearly separated; no fabricated hardware results.
- All remaining external infrastructure/media/review/licensing constraints are declared.

**Not part of initial MVP unless separately accepted:** complete historical Cronos coverage, every external-market order/price, operating our own full node, unlimited free media storage, universal wallet support, permissionless native-funded signing, guaranteed forever-free operation or perfect security.

For each engineering batch publish:

```text
Completed step IDs / files changed:
Exact source and binary hashes:
Tests executed / passed / failed / skipped:
Live observations and scope:
Deployment / chain transactions / actual cumulative spend:
Known residual dependencies and coverage:
Owner actions required next:
Blocked steps and exact reason:
Rollback / recovery artifact:
```

### Immediate next action

**Begin PhaseA, then the authoritative-store/worker work in B/C. Keep the current live preview stable and do not spend to cover architectural gaps.** The most important first milestone is **a RIFT-owned indexed data path backed by durable state that survives worker restart and competitor blackout**. Trading activation follows the exact contract/review/budget gates, not the other way around.


## Appendix A — audited source fingerprints

These identify the inspected workspace files, not a claim of byte-for-byte equality with the deployed commit. No generated dependencies or private files are included.

| Source file | SHA256 |
|---|---|
| `server/production.js` | `3eb748d81e61d3d29dd5e08877409fc3cd610577f54bf71d0d77e15d85952929` |
| `server/security.js` | `a86c57a9b4e39e65ddc72ce5af47fa38bdd5fa90fbdfb07b8ac13284fcee2292` |
| `server/account-storage-config.js` | `acbc1238c797317fc07ffcf7fa98bbf207cc3325f99d5d10eb3b666396d7d463` |
| `server/remote-d1.js` | `1832ec5253e11c9e3290279e603d355d0b822a02b145516b2a657a18ce0cad2d` |
| `server/collection-config.js` | `db8ee8de3d92ab6ac627d2cdc6fc6976885e343111dec7764786abda4e9d747f` |
| `server/exchange-api.js` | `a762c2cac4eade4005dd8ef99a6e23f6ecdbd0f2048246bceecad90cfa1261bc` |
| `server/exchange-index.js` | `61949a3847a526444387495c3f7c97fe353327283e0d73e455f593018dc48439` |
| `server/exchange-worker.js` | `2f1dca1245567ef947228c7d3f5b566da145fc0bde14c6c110c4bbdd6c5057fd` |
| `server/collection-index.js` | `257e51c86263d913372fb183ddcc35654568dc606b4a2d26af7f0ae906a0a293` |
| `server/collection-worker.js` | `03597b4712cf3a1eca361be8ca6fae40a1d2107b3443556c5086a36899308f3e` |
| `server/index-store.js` | `7a7f203403d4347241abbb7928e9f744b43136a747682e35ef49a047abca5db5` |
| `server/index-worker.js` | `78489e0fd77a1afbfe10ebfbf19afdd4e495fc547d3c76554846e9420c88be48` |
| `server/portfolio.js` | `9a9541d31040aaf547176038a6e8d6ed492e5ed338e63a4a45c8eb219bee5c57` |
| `server/discovery.js` | `20a428a5be2f89f07e062e3502180ce4b1e9c1b78b1e02c4b02444ca76fa7060` |
| `server/rankings.js` | `407511c7884ac98abf707494bdac18176ee6529a05ecd343ea7800ccf8c9fabf` |
| `server/search.js` | `0ac197825678d122425f86113122042a3c5248261a66215e39771f35674bde21` |
| `server/catalog.js` | `4971d51ea365838635dfb850145d8a8c72fdd3b439d1ef8a05214ce449d4d9db` |
| `server/crosscheck.js` | `aaee8a578305877c40192c1d70d05a85124137fb34ed6be7f1e79f8dc1c414ca` |
| `server/venue-snapshot.js` | `a953b5a7f93ad9d6d9fb11793e54b0a2483258e5dab371b47a2bf506a71ac011` |
| `server/images.js` | `e55ec47ce1068050ec8f664288444b4e881002dc2d5518f2701a509088a159ce` |
| `server/wallet-assets.js` | `bbb1d87c3e52e30082301211594d391bf171831d2df63bf7154bf5313b3ba067` |
| `server/release-manifest.js` | `a47e224aefc42d111d2fa49510c133cd0f02985d3a8af257b74cc792cc7b5d37` |
| `contracts/RiftExchange.sol` | `b8afe7a2d8f5eeb986290f1f8d88a2160a60438f227f70e2f2e9a2befa657ed9` |
| `contracts/RiftDrop.sol` | `ab67e673a6c8fec86001528dc367bd4c58ffb15c8352b7f680966699ecb47e8d` |
| `contracts/RiftDropFactory.sol` | `bc7d9197034ec6777d9aa360a7cd91c21805ecfd2c562c1dec50a12628592cf2` |
| `src/exchange-client.js` | `bfd6fbab13dc354422b63681208d741657e967ff6414886c92580d33df83ec3c` |
| `src/LaunchStudio.jsx` | `7556bed374e528fbe205ffa66741df47915666d92d25ad0016f9274ba6b190f4` |
| `scripts/deploy.js` | `356d91118af629ba9803a89daeb377609df2125893573e651e9f5260b7fa751d` |
| `scripts/preflight.js` | `9a824078cecd7d1c47e813f8f6964ee0ac6774373d8b226ea2210cad1a60d646` |
| `package.json` | `119aca840a551c96f5f393cafefed3cde80ba71318a9d9264ba9235a093020f6` |

## Appendix B — task inventory

This roadmap contains **98 individually identified execution tasks** plus findings, gates, source fingerprints and owner handoffs. Checkboxes are deliberately unchecked.
