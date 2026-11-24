> **Historical baseline.** Current continuation: [HYBRID-V8-IMPLEMENTATION-REPORT.md](HYBRID-V8-IMPLEMENTATION-REPORT.md). In particular v8 unifies the web personal draft panel with native SQLite after consent; remaining native/backend/device gates are still explicit.

# RIFT hybrid implementation — delivered scope and remaining gates

## Read this first

This is a substantial implementation pass, not a claim that five uninterrupted hours elapsed or that the entire device-backend audit is complete. APK v6 is a **debug-signed engineering preview**. No real CRO was spent, no wallet was created for funding, no mainnet transaction was submitted and no cloud account was deployed.

The most important boundary: **Direct-read mode currently enables native read tools, NOT a fully backend-independent web marketplace.** Hybrid mode can connect the bundled web app to a real shared HTTPS service entered in the app. Native SQLite and browser IndexedDB are explicitly separate personal stores with compatible backup interchange; they are NOT magically synchronized.

## 1. Implemented Android features

### Connections & local tools

A native button is available on both the setup screen and above the bundled interface. It opens a non-exported native `HybridActivity`. No JavaScript bridge, generic native fetch method, shell access, seed entry or signing method is exposed.

Modes:

- **Offline** (default): no native network reads; bundled offline UI and personal tools remain available.
- **Direct-read**: native RPC checks are enabled; shared web API remains inactive.
- **Hybrid**: native tools plus bundled web interface on the configured real shared HTTPS origin.

The mode/shared service URL can be changed in the app without rebuilding. Returning from settings recreates the web Activity to apply the saved mode/origin. Switching shared origins also switches origin-scoped browser storage/cookies: export browser drafts first. No automatic migration of old browser storage is claimed.

### Protected user-owned connection settings

- Primary HTTPS RPC endpoint and optional Authorization: Bearer token.
- Optional backup endpoint/token, separate connection test and explicit swap.
- Provider keys in a URL are supported by storing the complete URL encrypted.
- AES-GCM encryption using an Android Keystore key; fresh randomized IV and authenticated context for each settings save.
- Credentials are never handed to WebView, included in personal exports or displayed in results.
- Settings UI masks RPC URLs/tokens, disables autofill and uses FLAG_SECURE.
- Changing an endpoint clears its previous Bearer token unless the user explicitly supplies a replacement.
- Provider 401/403/429 responses yield sanitized actionable messages; provider response/error contents are not logged.
- Explicit Forget action removes the stored settings and restores Offline defaults. It does NOT revoke provider credentials, clear local drafts or cancel chain orders.

**Not implemented:** provider OAuth enrollment, automatic static-key issuance/rotation, biometric settings unlock, globally secure platform-key distribution. Do not enter platform/operator credentials. Keystore is at-rest protection, not a guarantee on compromised phones. Its runtime behavior has NOT been exercised on a real Android device here.

### Direct read-only RPC tools

Implemented operations:

- Test saved primary/backup: require Cronos chain ID 25, then read current block.
- CRO balance for an explicitly entered address, with raw units/block/source host.
- ERC20 `balanceOf` for an explicitly entered owner/contract, reporting raw units without inventing symbol/decimals.
- Known ERC721 `ownerOf` or ERC1155 `balanceOf(owner,id)` response checks.
- Receipt lookup by hash, with pending/not-found distinction, hash/status/block checks and local observation history.
- Local read snapshots with explicit cached/historical warnings and checkedAt; no silent assertion of current ownership or finality.

There are no transaction/signing RPC methods in the allowlist. No private keys, wallet generation, approvals, transaction broadcasting, automatic resubmission or spending.

**Not implemented:** exhaustive holdings discovery, native metadata/media resolution, portfolio prices, verified contract-standard certification, independent RPC proofs, order settlement or universal transaction recovery. A known-contract response is not proof a collection is authentic. The same provider can lie about chain data; the UI says results are provider reports.

### Native network hardening

`NetworkPolicy.java`, `PinnedHttps.java`, `ReadOnlyRpc.java`:

- Public DNS-host HTTPS endpoints only, no URL userinfo/fragments/literal/private addresses or alternate ports.
- Resolve and validate all returned IP addresses, then connect to a validated IP without a second DNS lookup.
- Original DNS hostname retained for TLS certificate hostname validation and SNI; normal trust validation is not bypassed.
- No redirects, ambient browser cookies, proxy credentials or cross-provider token forwarding.
- Narrow HTTP/1.1 JSON POST transport, rejecting ambiguous framing, unexpected compression and malformed/oversized responses.
- 256 KiB response cap, header/line/chunk bounds, connect/read timeouts and a post-DNS response deadline.
- Shared per-process native budget: 30 RPC calls/minute; sequential operations prevent an unlimited queued burst.

This is DNS/IP pinning for each connection, NOT hardcoded certificate pinning. DNS resolution itself is system-controlled and not given a strict app-enforced deadline. The transport uses the first vetted address rather than full Happy Eyeballs/proxy support. IPv6-only/NAT64 networks, captive portals, enterprise TLS/proxies, slow sockets and provider HTTP compatibility require actual-device acceptance. This small custom transport needs independent review; successful JVM tests are not Android security certification.

### Native personal workspace

`LocalWorkspace.java` uses app-private SQLite with:

- Explicit Cronos/profile namespaces. A typed profile address is only an organization label, NOT wallet authentication.
- Up to 50 JSON drafts/profile, each up to 64 KiB, with title/version/timestamp and open/delete controls.
- Up to 1,000 local favorite addresses/profile.
- Up to 50 receipt observations/profile and bounded read snapshots.
- Native document-provider JSON export/import (maximum import 4 MiB), explicit user confirmation and schema/chain/profile validation.
- Atomic imports that add new draft records and merge favorites; repeated imports create copies rather than silently overwrite.
- Credential-field and nesting checks on drafts.
- Explicit local-profile deletion with a warning that chain orders/approvals and cloud records are unaffected.
- SQLite schema-1→2 migration for snapshot support; unsupported migrations fail rather than wipe records.

Backups contain personal drafts/favorites, not connection credentials, wallet keys, receipt observations or snapshots. Exports and the draft database are NOT separately encrypted; keep exports private and never store secrets in drafts. Android backup/device transfer remain disabled. Arbitrary secret prose cannot be reliably detected by checking JSON field names.

Native document import/export is limited to this workspace JSON workflow. **The general WebView creator file chooser, blob artwork ZIP downloads and upload flows remain unfinished on Android.**

## 2. Implemented frontend/local provider features

`src/device-workspace.js`, `LocalDraftPanel.jsx`:

- Async IndexedDB-backed device draft provider, independent of cloud auth.
- New Creator Studio section: Device drafts · no cloud sign-in required.
- Save, restore, delete, prepare backup JSON and explicit merge import.
- Account+chain scoping, 50-draft/64-KiB limits and bounded portable backup format.
- Atomic profile transactions; concurrent saves are serialized without losing draft records.
- Request generation fences prevent old-profile async results/backup text from being displayed after profile change.
- Import does not silently change the app's existing favorites; imported favorite records remain in that workspace backup.
- Source/profile and non-sync status are clearly labelled.

This is an implemented local data-provider API, not a complete replacement for every existing `/api` consumer. There is deliberately no global `fetch` monkeypatch or credential-bearing JS bridge.

`src/launch-draft.js` now validates launch restores before changing React state. This applies to both cloud and local drafts and prevents malformed object-valued/unknown config fields from crashing or partially mutating the form. Local generic documents can still be stored, but incompatible launch restores are refused with a visible error.

## 3. What passed, and what that proves

| Gate | Result | Scope/evidence |
|---|---|---|
| Engineering suites | **109 passed** | checks/hybrid-engineering.log; includes new draft/restore and native source/JVM tests |
| Native pure Java policy/parser | **51 assertions passed** inside one engineering test | checks/native/NativePolicyHarness.java; real JVM execution, not Android |
| Public native transport probe | passed against evm.cronos.org, chain 25 | checks/hybrid-native-public-probe.log; JVM TLS + one public read, no key/funds |
| Solidity suites | **40 passed** | checks/hybrid-contracts.log; no contract modifications in this pass |
| Redis security | **7 passed, none skipped** | checks/hybrid-security.log |
| Implementation regressions | **6 passed** | checks/hybrid-implementation.log |
| Combined existing browser suites | passed | checks/hybrid-browser.log |
| Local IndexedDB browser scenarios | passed with cloud APIs forced unavailable | checks/device-workspace-browser.json |
| Built frontend + real local Worker/D1 browser | passed | checks/hybrid-edge-browser.log |
| Production frontend build | passed, large-chunk warning remains | checks/hybrid-build.log |
| Android source/asset checks | **3 passed** | checks/hybrid-android-shell.log |
| Android-equivalent offline desktop browser | passed | checks/hybrid-android-offline.log; NOT Android WebView |
| Android assemble/lint | passed; 0 errors, 1 JavaScript-support warning | checks/hybrid-android-build.log |
| APK signature verification | passed | checks/hybrid-android-signature.log |

**No emulator/physical Android execution occurred. Native Activity UX, Android SQLite execution/migration, Keystore encryption/decryption, document provider behavior, Activity recreation and native TLS on Android remain runtime acceptance items.** Compilation, source checks and JVM tests are explicitly not reported as those tests.

Browser scenarios exercise save without a wallet/cloud, reload/restore, portable backup, profile isolation, 49 concurrent saves, 50-draft cap, atomic overflow refusal, malformed restore safety and 360/393/768/1440 widths.

## 4. Quick start on your Android phone — no CRO needed

1. Install **RIFT-hybrid-preview-v6.apk**. It is debug-signed and not Play/release validated. Do not use it with valuable assets or production credentials.
2. Tap **Connections & local tools**.
3. Leave optional credential fields blank to use public RPC; choose **Direct-read**.
4. Tap **Save mode & protected connections**. Blank endpoint retains the default `https://evm.cronos.org` on first setup.
5. Tap **Test saved primary connection**. Expected: Cronos chain 25 plus block. A provider/network error should stay an error.
6. Enter a public wallet address, leave contract blank, tap **Read CRO / ERC-20 balance**. This is a read; do NOT fund a new wallet for this check.
7. To inspect an existing NFT, enter its actual contract/token ID and select the right standard, then use the ownership check.
8. Use native workspace controls to save/list/export a small personal test draft. No cloud account is needed. For a launch-compatible document use mode/config, e.g. `{"mode":0,"config":{"name":"My original collection","symbol":"MINE","supply":10,"walletLimit":2,"txLimit":2,"price":"0"}}`.
9. Return to app. The bundled interface stays offline in Direct-read mode; create tools and browser-local drafts can be used without a cloud sign-in. Native and browser stores are distinct.
10. When you have deployed your shared service, reopen settings, enter its exact HTTPS origin, choose **Hybrid**, Save, then Return. The bundled interface uses that service origin. Test auth/reads on the real deployment; the app does not create hosting or contracts for you.
11. If you replace an API credential, enter it ONLY in native settings, save, test and clear the text field. No screenshot/chat upload is needed. Static keys cannot auto-renew unless the provider supports a separately implemented management flow.

## 5. Audit implementation status

| Audit work package | Status |
|---|---|
| Offline/direct/hybrid selection and in-app shared-origin setting | Implemented, native runtime pending |
| Protected user RPC settings and explicit backup slot | Implemented, Keystore runtime pending |
| Browser local draft provider integrated in Creator Studio | Implemented and browser tested |
| Native personal DB and bounded JSON documents | Implemented/compiled; device runtime pending |
| Bounded direct reads for known assets/receipts | Implemented; JVM network/policy tested, Android runtime pending |
| Safe native JS transport for all existing API consumers | NOT implemented; avoided with a separate native tools screen |
| Native metadata/media resolution and broad holdings discovery | NOT implemented |
| Persistent background checkpoint sync/WorkManager and cancellation UX | NOT implemented; current native reads are explicit/manual |
| Fully backend-independent web trading and wallet callback lifecycle | NOT implemented |
| Native general creator file uploads/blob exports | NOT implemented; workspace JSON picker is narrower |
| Shared indexing/analytics/registry/moderation at production scale | Existing implementation/limits retained; hosted acceptance pending |
| User OAuth/provider key-management integration | NOT implemented |
| Automatic cloud/native/browser draft synchronization | NOT implemented; explicit format interchange only |
| Independent audit + physical-device battery/network/lifecycle acceptance | NOT performed |

## 6. Remaining next engineering, not just owner chores

- A unified capability/transport layer for all supported web/native reads, without broadening native authority.
- Native metadata/media pipeline, more complete verified asset candidates and opt-in resumable scoped history.
- WorkManager lifecycle/checkpoint integration, cancellation, cache freshness and battery/data controls after measurements.
- Real wallet callbacks/App Links, user-confirmed signing integration and pre-sign contract/order validation in the direct path.
- General document import/export for artwork/metadata ZIPs and safe creator upload flows.
- Better native draft editing/version conflict UX, optional encrypted backups/recovery and explicit cross-device synchronization if desired.
- Real Android runtime/instrumentation tests of database, Keystore, imports, process death, origin changes, WebView storage and native TLS/network conditions.
- Independent review of the new native network/credential/storage code before production use.

No private tokens are needed to begin those tasks. Later provider/account authorization and device/wallet acceptance must use secure user-controlled interfaces, not secrets pasted in chat.
