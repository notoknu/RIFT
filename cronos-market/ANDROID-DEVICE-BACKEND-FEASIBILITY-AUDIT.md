> **Historical baseline.** Current continuation: [HYBRID-V8-IMPLEMENTATION-REPORT.md](HYBRID-V8-IMPLEMENTATION-REPORT.md). In particular v8 unifies the web personal draft panel with native SQLite after consent; remaining native/backend/device gates are still explicit.

> Implementation update: the initial hybrid feature slice now exists. See HYBRID-IMPLEMENTATION-REPORT.md for delivered native/browser features and explicit pending work; the audit below describes feasibility and original pre-implementation findings. It is not proof all phases are complete.

# Android device-run backend feasibility audit — RIFT

## Executive decision

**Yes: an Android-first version can move substantial personal/backend computation onto each user's phone. No: the current APK cannot automatically run the complete existing Node/Cloudflare backend, and moving computation to a phone does not eliminate remote blockchain access, shared discovery, storage availability or independent trust requirements.**

Recommended direction: **local-first Android client + direct Cronos RPC + optional shared discovery/index services**. Keep shared hosting small and replaceable, rather than promise an always-running backend inside every phone.

An even more minimal serverless-to-the-operator client is possible for known contracts/token IDs and direct on-chain trading. It would still use other people's RPC/media/relay infrastructure and offer weaker discovery unless it builds its own indexes. “No RIFT-owned server” is achievable for a reduced product; “no external infrastructure, full current marketplace experience, automatic 24/7” is not a credible default.

This is a source/architecture and official-documentation audit. No Android device/emulator benchmarks, battery tests, APK redesign, new wallet, mainnet transaction or backend migration was performed for this audit. No code/APK change is claimed.

## 1. Evidence inspected

| Source | Actual finding |
|---|---|
| android/app/src/main/java/io/rift/cronos/MainActivity.java | Activity + WebView. Bundled assets intercepted locally. `/api/` and `/healthz` pass to configured HTTPS backend; unconfigured build returns explicit unavailable response. No privileged JS bridge. |
| android/app/src/main/AndroidManifest.xml | INTERNET permission and one Activity. No declared background indexing service or wallet callback/App Link intent filter. Cleartext disabled; backups disabled. |
| android/app/build.gradle | minSdk 26, targetSdk 35, Java 17; preview versionCode 5. No Node runtime, Android database repository, WorkManager or Jetpack WebKit dependency configured. |
| android/app/src/main/res/xml/data_extraction_rules.xml | Cloud backup and device transfer excluded. Do not assume personal local state automatically survives reinstall/device loss. |
| src/creator-client.js | Creator mutations currently use same-origin JSON HTTP + signed server challenge/session cookie, not a local native data repository. |
| src/transactions.js | Some device-local transaction recovery already exists through localStorage. It checks chain 25 and never automatically re-signs/rebroadcasts. |
| server/portfolio.js, discovery.js, wallet-assets.js | Holdings discovery uses explorer candidates, RPC ownership checks and bounded metadata reads. This is not a whole-chain ownership database bundled in the APK. |
| server/index-worker.js, collection/exchange/market workers | Node imports/process loops, durable SQLite state and checkpoint/reorg recovery. Porting is not just copying JavaScript into WebView. |
| server/creator-api.js; shared/creator-service.js | Shared auth, drafts, registry, upload quotas and moderation use trusted persistent database behavior. Personal local copies do not replace globally authorized writes. |
| shared/pinata-provider.js | Current sponsorship relies on a server-side upload credential that MUST NOT be shipped to all APK users. |
| scripts/ops-supervisor.js | Continuous operator monitoring/backup replication assumes an operator-controlled process and independent storage. |

The bundled frontend is already mostly local. The unimplemented part is the native service/data plane behind API-backed features.

## 2. Categorized feasibility matrix

“Local” means local processing/storage. It does NOT imply offline access to current chain state.

| Feature | Device-run feasibility | Required external dependency / consequence | Recommendation |
|---|---|---|---|
| UI, 3D rendering, fonts | Already bundled/local | App updates deliver code fixes; assets consume storage/GPU | Keep local |
| Personal favorites | High | Cross-device sync needs optional remote/export mechanism | Local-first, optional sync |
| Personal creator drafts | High | Lost on device loss without explicit export/sync | Local DB with schema/versioned backup |
| Pixel/SVG/multilayer generator | High; much is already browser-local | Large exports need storage/memory safeguards and document picker | Local worker + native file export |
| Trait recipe/metadata generation | High | Publishing immutable public metadata still needs chain/IPFS hosting | Local generate/validate; explicit publish |
| Native file import/export | High, but NOT implemented in current shell | Android document URI permission and user picker | Implement safe native document APIs |
| CRO/ERC20 balances | High for RPC client processing | Current state from external RPC or own node | Direct bounded RPC |
| Known NFT ownership/metadata | High | RPC, tokenURI host/IPFS gateway; host may fail | Direct reads + verified cache |
| Discover every wallet asset | Medium/expensive | No universal ERC721/ERC1155 “all my NFTs” call; explorer/indexer or history scan | Candidate sources + local verification + manual import |
| Buy/list/cancel/withdraw on RIFT contracts | High for client preparation | Reviewed deployed contracts, RPC, explicit wallet signature, gas | Direct wallet→chain, no platform signing key |
| Offers/ERC1155/bulk | High for known orders | Same as above; order freshness and runtime checks required | Reuse reviewed validation, verify just before signing |
| External venue order execution | Not created by localizing backend | Correct venue adapter/approval/protocol integration still required | Separate engineering/review |
| Transaction journal/reconciliation | High | Receipt/nonce data from RPC; background jobs can be delayed | Local durable journal; never auto-resend value actions |
| Personal recent transfer history | Medium | RPC logs or indexed source; archival/range limits | Resumable scoped checkpoints |
| Full collection ownership/traits index | Technically possible, operationally costly | Each phone must obtain logs/metadata and handle forks/storage | Opt-in bounded local index or shared snapshot |
| RIFT order discovery | Possible by contract event indexing | Catch-up cost and delays per device; contract orders are on-chain | Shared index optional; verify order on-chain |
| All-time + weekly top-100 union | Poor cold-start fit | Correct historic sale/venue data, normalization and coverage | Shared/cached index; clearly scoped fallback |
| Network-wide price/rarity/history analytics | Possible only after enough reliable ingestion | Duplicated heavy indexing across users; incomplete cache cannot imply global rank | Shared or opt-in full indexed mode |
| Collection registry | Personal cache yes; globally authoritative writes no | Canonical chain/factory proof or authenticated shared registry | Receipt-backed shared source; cache locally |
| Creator banner/profile overrides | Personal edits yes, global publication needs protocol | Signed off-chain records plus shared distribution, or on-chain updates | Do not confuse local draft with public verified update |
| Cross-device account/draft sync | Not device-only | Account service, user-selected storage or explicit export/import | Optional sync with conflict/version policy |
| Global reports/moderation | Local hides yes, global decisions no | Shared policy authority/distribution or decentralized protocol | Keep shared moderation; local blocklist option |
| Media thumbnail caching/SVG decode | High | Still needs first fetch and safe decoding; memory bounds | Native bounded disk cache; preserve SVG sanitization |
| IPFS upload using user's own credentials | Possible, opt-in | User's provider account, quota and retention terms | User-controlled provider flow; no platform JWT in APK |
| Platform-funded IPFS sponsorship | Unsafe as device-only secret | Trusted allocation/auth/quota service still needed | Retain minimal server or remove sponsorship |
| Permanent IPFS availability | Cannot be guaranteed by ordinary phone storage | Independent pinning/replication; CID proves identity, not retention | Explicit external retention strategy |
| Global rate limiting/abuse control | Local limiter not authoritative | Modified clients bypass local restrictions | Provider/shared-service enforcement where needed |
| Always-on alerts/monitoring | Not dependable on every phone | Android scheduling limits, network/reboot/force-stop | Best-effort local alerts; shared monitor for service SLA |
| Backups/disaster recovery | Local snapshots possible | Same-phone copy is not independent; Keystore-bound encryption affects recovery | User export/independent storage + restore drill |
| Operator deployment/admin/secret management | Should NOT move into consumer app | Giving users platform admin credentials compromises platform | Keep outside APK |

## 3. Three realistic architectures

### A. Local-first hybrid — RECOMMENDED

```
Bundled Android UI
   → explicit data-provider interface
      → local Room/SQLite: drafts, favorites, journal, cached metadata
      → bounded native network repository → Cronos RPC / approved media
      → external wallet app: user-confirmed signatures
      → optional shared service: rankings/discovery/public registry/moderation
```

The app remains useful if the RIFT service is down: personal drafts, cached content, known-contract reads and eligible direct chain actions can remain available. It must visibly distinguish cached data, failed refresh, incomplete indexing and live verified state.

Advantages: reduced RIFT server load, privacy for local drafts, fewer round trips, offline creative tools. Tradeoffs: native engineering, cache/state migration, storage usage, RPC privacy and device acceptance.

### B. Operator-serverless, reduced discovery — FEASIBLE ALTERNATIVE

- Bundle UI, local data and known contract manifest.
- Read external public RPC and media directly, use external wallet signatures.
- Discover orders by scoped on-chain event scans or user imports.
- Remove or downgrade globally curated rankings, shared favorites/drafts, moderation, platform-sponsored uploads and public profile overrides unless backed by a separate protocol.
- Explicitly show partial discovery and catch-up status.

This can avoid running a RIFT-owned API for core known-contract actions. It does NOT remove network dependency or make public RPC unlimited. It is not full feature parity with the existing planned marketplace.

### C. Embed the Node server in Android — NOT RECOMMENDED DEFAULT

A Node-compatible engine can in principle be embedded using an Android-compatible runtime/native build. The current server does not become portable simply because Android and Node can both use SQLite. `node:sqlite`, native dependencies, threading, V8 packaging, ABI/toolchain compatibility and process lifecycle all require proof and ongoing maintenance.

A loopback HTTP server also adds a local attack surface and origin/token/network configuration burden. It must never bind to 0.0.0.0 or expose local account data on Wi-Fi. Avoid global cleartext exceptions. It still does not create shared durability or provide unstoppable background execution.

Use a native repository with a narrowly scoped asynchronous transport instead. If Node embedding is researched, isolate it as a prototype with explicit support/licensing/supply-chain and ABI tests; do not ship it as an assumed fix.

## 4. Why background automation cannot be “all aspects, forever”

Android WorkManager periodic work has a minimum interval of 15 minutes and can be delayed by constraints/Doze. It is appropriate for deferred refresh/checkpoint work, not exact real-time trading or continuous global indexing [1].

For apps targeting Android 15+, Android restricts background `dataSync`/`mediaProcessing` foreground services; official documentation describes a six-hour-per-24-hour budget for each applicable type, with lifecycle/user-interaction details. This is NOT a blanket six-hour cap on all foreground app use or all service types. Our targetSdk is already 35 [2].

Design for process death, force-stop, sleep, reboot, disconnected network, low storage, clock changes and user cancellation. Resume from committed checkpoints; do not run an infinite sync thread as a supposed workaround. Do not request battery-optimization bypass as a hidden default or disguise syncing as another service category.

Automate: bounded reads, cache cleanup, receipt checks, checkpoint sync and user-approved file operations.

Do NOT silently automate: wallet creation/custody migration, token approvals, signing, buy/sell/mint, gas spending, external upload charges or broadcasting a replacement transaction. A local backend is not user consent.

## 5. Main security and correctness findings

### Critical: never embed platform credentials

Do not put deployment tokens, platform Pinata JWT, a shared paid-RPC secret, operator wallets or backup master keys in an APK. App obfuscation is not a trusted-secret boundary. Android warns that hardcoded secrets are readily recoverable [3].

Keystore is useful for device-owned keys/at-rest wrapping, but cannot make a shared bearer credential safe once the app must use it for an untrusted user. Prefer provider-scoped user credentials, supported short-lived upload capabilities or a small server-side allocator. Keep blockchain seed/private-key custody in the external wallet for this design.

### High: do not trust local results for shared authorization

Users can modify their client/database. A local “verified creator” flag cannot authorize a shared public profile write, allocate platform storage or override contract identity. The receiving shared service/protocol must independently verify signatures, proofs, limits and canonical chain state.

### High: local networking must not become arbitrary privileged fetch

A native network layer bypasses some browser CORS constraints; that is not permission to fetch arbitrary URLs or defeat provider access policy. Preserve HTTPS validation, DNS/private/LAN/loopback/link-local/metadata endpoint blocking, redirect revalidation, host policy, byte/time limits and safe content handling. Metadata or SVG must never trigger arbitrary file/native operations. Direct RPC providers can observe wallet-query IP associations; make that privacy tradeoff explicit.

### High: transport redesign, not fake HTTP interception

Current `shouldInterceptRequest` is suitable for bundled assets and bounded GET handling, not a complete replacement for JSON POST/PUT bodies. WebResourceRequest does not expose a general request-body interface. Returning invented success JSON would lose drafts/auth semantics.

Introduce a frontend data-provider interface rather than monkeypatching all `window.fetch`. Example operations: getBalance, resolveToken, saveDraft, listFavorites, reconcileTransactions. Web implementation uses existing HTTP APIs; Android implementation uses explicitly authorized native/local operations.

For JS/native communication, official Android guidance recommends `addWebMessageListener` with exact allowed origins over legacy `addJavascriptInterface`; verify source origin and main-frame context, validate operation/schema/size and expose no generic file/shell/key method [4]. Feature-detect supported WebView APIs and fail closed. Keep third-party HTML/navigation outside the privileged origin.

Use a stable local HTTPS asset origin via WebViewAssetLoader or an equivalently reviewed arrangement, avoiding file:// and universal-file-access flags [5]. Domain selection must account for external-wallet metadata/domain-verification rules; do not misrepresent an Android-local unlock as signing into a public website. Local personal storage does not require a server session cookie.

### High: historical indexing and stale orders

The phone must retain deployment-bound checkpoints, exact bigint quantities/token IDs, block hashes, confirmation policy, pagination and reorg behavior. A cached listing is not currently fillable merely because it was valid yesterday. Before any signature: recheck chain 25, reviewed exchange runtime, ownership/approval/remaining quantity, expiry, exact price and recipient.

Do not reuse the current Node module that writes arbitrary database paths inside WebView. Port/reuse pure validation/reducer logic and add Android database transactions; test compatibility rather than assume it.

### High: backup and public-data distinctions

Current app disables Android cloud/device-transfer backups. A new local database needs explicit export/recovery UX. Deleting/reinstalling the app or clearing data can destroy drafts/journals/cache. Do not promise Keystore-bound encrypted backups can be restored to a new phone without a separately designed recovery mechanism.

On-chain orders/assets survive app deletion; local evidence and UI state do not. Clearing local data does not cancel an escrowed listing, close a funded offer or revoke an on-chain approval.

## 6. Performance/cost audit

There is no measured basis for promising a RAM/battery/APK-size percentage or “100% free backend.” Moving work shifts costs to users' CPU, battery, storage and mobile data and to external providers.

Official Cronos FAQ advertises public mainnet RPC at 300 requests/minute/IP with a one-minute block if exceeded [6]. Carrier NAT/shared Wi-Fi may share an IP; each installed app is not guaranteed an isolated quota. Use batching only where supported, a global per-device request budget, exponential backoff/jitter, cache TTLs, user-visible progress and cancellation. Do not evade throttles by blindly rotating IPs/endpoints.

Complexity grows with history and metadata volume, not just the number of collections shown. As an illustrative unit conversion, one million 1-KB records already represent about 1 GB before database indexes, artwork and protocol overhead. This is NOT a measurement of RIFT or a forecast of any user's storage.

Heavy indexing should be opt-in, scoped, resumable and preferably unmetered/charging-constrained. Cache limits and freshness targets must be chosen after actual-device measurement. Do not make every new user rescan all venue history merely to show the home screen.

## 7. Concrete implementation work packages

### Phase A: transport and local origin

- Inventory current frontend `/api` consumers; classify personal/local, chain read, external discovery and shared write.
- Create typed data-provider/capability/error contracts shared by web and Android.
- Implement local asset origin and origin-restricted asynchronous native messaging.
- Explicit runtime mode: offline / local-live / hybrid, with capability labels. Replace the current all-or-nothing backend setup gate only for implemented operations.
- Keep existing web backend path; do not silently downgrade shared operations to local-only storage.

Acceptance: trusted UI only, malicious-frame/native-operation tests, external navigation separation, size/cancellation/timeout errors and unknown-operation rejection.

### Phase B: personal local state and native files

- Android SQLite/Room repositories with account+chain namespaces and versioned schema migrations.
- Local drafts/favorites, durable transaction journal, typed import/export with document picker.
- Explicit user export/restore, corruption handling, storage-full UX and sensitive-field policy.
- Keep wallet keys outside app; no privileged signer bridge.

Acceptance: process kill/reboot/reload, account switch, large export, storage exhaustion, tampered import and reinstall recovery documented.

### Phase C: bounded native reads

- Direct RPC chain validation, balance/ownership/metadata operations, approved-host media pipeline and cache.
- Persistent verified-address/token candidates and manual import; label discovery coverage.
- Live/cache/error/stale labels with block/source/freshness.
- Foreground receipt recovery; deferred WorkManager refresh only where suitable.

Acceptance: wrong-chain/wrong-runtime, RPC outage/429, unsafe host/redirect, malformed large metadata, sparse uint256 IDs, ERC1155 quantities and privacy/log redaction.

### Phase D: direct trading and lifecycle

- External wallet pairing/deep links with session/account/chain lifecycle tests.
- Reviewed deployment manifest and per-action read-before-sign checks.
- Preserve no-auto-resend semantics and journal before wallet prompt.
- Explicit cancellation/withdrawal recovery when shared index is unavailable.

Acceptance: wallet reject/cancel, app kill while signing, network switch, account switch, replacement transaction, expired/filled order and an approved bounded transaction plan. Local tests first; real mainnet only with owner approval.

### Phase E: shared discovery and optional advanced local indexing

- Retain minimal shared rankings/catalog/registry/moderation as needed.
- Optionally support user-selected compatible index endpoints and self-indexed mode, with provenance and no blind trust in reported price/ownership.
- Evaluate snapshots/signatures/checkpoints and availability/catch-up before claiming equivalent trust or completeness.
- Device indexes are not an assumed free distributed backend. A peer network would need authenticated data, discovery/relay/NAT traversal, validation, abuse controls and availability engineering.

Acceptance: compare candidate/index outputs against independent checks and chain state; show incomplete history honestly; measure catch-up, data use, database size, battery and recovery.

## 8. Physical-device acceptance plan

The current project has desktop Chromium/mobile viewport tests and Android build/lint checks; those are not these tests.

- At least a low-memory API-26-compatible class device and modern Android/API-35+ device; include varied WebView versions/OEM power behavior as practical.
- Foreground cold start, app background/sleep, process kill, force-stop, reboot and resume.
- Offline startup with cached data, network transition/Wi-Fi→mobile, 429, metered-data opt-out.
- Data migration/corruption/storage-full/cache eviction/import/export.
- Real wallet QR/deep-link return, cancelled signature, chain/account switch and no hidden signing.
- Reorg/checkpoint replay and stale order revalidation on local controlled chain before any mainnet plan.
- Battery/CPU/network profiling with Android tooling; publish measured results instead of invented savings.
- Release signing/update/uninstall and recovery semantics; no credentials or wallet keys in APK/logs/backups.

## 9. Decision and next step

Approve a **local-first hybrid redesign**, beginning with personal state and bounded RPC reads. Do not embed the entire server, open phone ports or distribute operator secrets as a shortcut. Preserve an optional small Worker/D1 service for shared discovery/registry/moderation/sponsorship if those features remain required.

No user private token is required to begin this engineering. Actual device/runtime access, public reviewed deployment addresses, an external wallet under the user's control and owner-approved hosting/provider configuration are required for later acceptance. A small CRO payment does not remove these requirements.

## Official references

[1] Android PeriodicWorkRequest: https://developer.android.com/reference/androidx/work/PeriodicWorkRequest

[2] Foreground service timeouts and precise applicability: https://developer.android.com/develop/background-work/services/fgs/timeout

[3] Hardcoded secrets and at-rest key guidance: https://developer.android.com/privacy-and-security/risks/hardcoded-cryptographic-secrets

[4] Origin-aware JavaScript/native API access: https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge

[5] Local content and WebViewAssetLoader: https://developer.android.com/develop/ui/views/layout/webapps/load-local-content

[6] Cronos RPC policy: https://docs.cronos.com/cronos-chain-protocol/cronos-general-faq

Provider policies and Android behavior depend on version/target and can change. This audit is not a security certification, device benchmark or completed migration.
