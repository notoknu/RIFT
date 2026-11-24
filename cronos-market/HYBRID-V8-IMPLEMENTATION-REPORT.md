# RIFT hybrid v8 — personal-data integration, encrypted recovery and transaction hardening

## Honest completion status

This is a further implemented and locally verified increment, **not completion of the entire marketplace/native-backend audit** and not a claim of five elapsed hours. No hosting deployment, mainnet transaction, funded wallet testing, production signing or independent security review was performed. An adb availability check found **no attached authorized Android device/emulator**. Native runtime acceptance remains blocked, not passed.

The current debug app is versionCode **8**, version **0.6.0-hybrid-preview-debug**, package `io.rift.cronos.preview`. It remains Offline by default. v6/v7 documents and packages are historical baselines; this report is the current delta/status reference.

## What changed after v7

### 1. Native ↔ web personal workspace

- Added a separate, narrow `RiftLocal` AndroidX WebMessageListener: exact HTTPS origin rules plus source-origin and main-frame verification.
- The web draft panel now selects native SQLite when the Android channel is available. This is the **same personal workspace used by Connections & local tools**, not an automatically synchronized second IndexedDB store.
- Explicit native consent is required per opened page/profile before reading or mutating personal data. Navigation/close revokes grants. Profile addresses are namespaces, **not wallet authentication**. Consenting grants the page access to that selected profile's drafts/favorites; do not approve untrusted origins.
- The channel exposes only `list`, `save`, `remove`, `export`, `import`. No keys, credentials, generic RPC, signing, arbitrary native paths, clear-all or platform-upload authorization API.
- One bounded serialized JavaScript client per channel; bounded queue, request IDs, timeouts, restored reply handlers and no silent native-error fallback into browser storage. The native owner serializes DB operations and refuses concurrent requests. A started DB mutation can still commit if its page times out/closes: reload before retrying a save/import.
- Ordinary browsers retain IndexedDB. Old WebView IndexedDB drafts are **not automatically migrated**. Explicit portable matching-profile backup import is available.

### 2. Explicit favorites transfer

Buttons now merge app favorites into the selected personal workspace, or explicitly merge workspace favorites back into app favorites. The UI emits the existing favorites-restored event. No wallet authentication, cloud publication or automatic on-chain change is implied. Restoring refuses an oversized union instead of silently truncating it.

### 3. Passphrase-encrypted backup files

- AES-256-GCM with random 16-byte salt, random 12-byte IV and authenticated format parameters; PBKDF2-SHA-256 with fixed 310,000 iterations.
- At least 12 characters, at most 1024 UTF-8 bytes per passphrase. Choose a genuinely strong passphrase; minimum length alone is not an entropy guarantee.
- 4 MiB plaintext / 6 MiB encrypted-envelope limits. Strict format/KDF/encoding checks prevent attacker-selected work factors and unsupported parameters.
- Wrong passwords, modified ciphertext/IV/salt and mismatched backup chain/profile are refused. Credential-named fields remain prohibited by workspace validation; never hide secrets under other field names.
- Decryption loads review text only; import remains a separate explicit merge. Passphrase input is cleared after completion/failure and on profile changes. No passphrase is persisted or sent to the backend.
- **No password reset or recovery service exists.** Encryption protects an exported file, not a compromised page, unlocked device or the unencrypted app-private SQLite/IndexedDB store. JavaScript cannot promise erasure of every immutable passphrase/string copy. Plain JSON backup remains available and is visibly labeled readable/unencrypted.

### 4. Transaction safety and recovery

- A wallet-returned transaction must match the signer, have a valid nonce and not assert a different chain before a dependent step can continue.
- Live replacement handling now compares sender, nonce, destination, calldata hash, value and asserted chain. A different/unverifiable replacement stops dependent actions rather than reporting the original action as successful.
- Receipts must match the tracked hash and wallet, have numeric status 0/1, a valid block hash and nonnegative safe block number. Invalid receipts leave the operation uncertain, never authorize a dependent step.
- Read-only bounded reconciliation now revisits recent confirmations/reverts as well as pending records. A missing previously observed receipt becomes `reorg-uncertain`; deployment shortcuts are cleared until a valid inclusion is observed again. This is RPC-reported inclusion, **not irreversible finality or independent proof of application success**.
- Still never automatically re-signs/rebroadcasts. Missing-hash/awaiting-wallet records tell the user to inspect their wallet/explorer before a new value action. Smart-account/user-operation recovery is not claimed.

### 5. Native resource/lifecycle hardening

- Pre-parse UTF-8 byte/nesting guards for personal requests, file-export requests, native draft/import JSON and provider JSON. Schema/credential checks still run separately.
- Native save/favorite admission checks now run inside SQLite transactions; rollback protects imports and concurrent connection limits. Workspace growth is bounded to 64 nonempty draft/favorite profiles as well as existing per-profile bounds. Browser IndexedDB has the corresponding profile bound and reclaims an empty profile slot.
- Native restore schema/title checks avoid string coercion of numeric schema/title fields. Connection Keystore operations share a process-wide lock across settings owners.
- Process-start cleanup snapshots old import/export staging paths, then cleans only captured old paths off the main thread. It preserves new live sessions and unrelated/outside files. Cleanup is best-effort, not a durable-deletion guarantee.
- Consent dialogs are dismissed on cancellation/close; native settings DB closure is queued after ongoing work. Main WebView uses FLAG_SECURE, as native settings already did. This is screenshot protection, not a claim of malware resistance.

### 6. Reproducible handoff tooling

- Five isolated native SQLite instrumentation tests were added and their test APK compiled. They cover profile isolation/shared data, atomic overflow rollback, prohibited credential fields, concurrent SQLite draft admission and favorite deduplication.
- `scripts/android-device-check.js` inventories a selected authorized device, hashes device identifiers and can optionally run the already-installed isolated tests. No automatic installation, logcat/screenshot collection, signing or transactions. Availability check here reports blocked: no device attached.
- `.github/workflows/android.yml` prepares Android build/lint/test-APK compilation on push/PR and optional manually requested API 35 emulator execution. This workflow has **not** run on a hosted CI account here. It requires the owner to upload/enable the repository; optional emulator work consumes runner time.
- `scripts/package-hybrid.js` produces versioned full/source-only archives with private/runtime-path exclusions, source audit gating and verified per-file SHA-256 manifests. Packaging is not independent security review or licensing approval.

## Verification actually executed

| Gate | Result | Evidence |
|---|---|---|
| Local engineering suite | **128/128 passed**, no skips | `checks/v8-engineering.log` |
| Implementation checks | **6/6 passed** | `checks/v8-implementation.log` |
| Security suite, including real isolated Redis keys | **7/7 passed**, no skips | `checks/v8-security.log` |
| Solidity local contract tests | **40/40 passed** | `checks/v8-contracts.log` |
| Full desktop Chromium implementation runner | Passed, including new personal-workspace/encryption browser scenarios | `checks/v8-browser-suite.log`, `checks/personal-workspace-browser.json` |
| Built frontend + local Worker/D1 browser flow | Passed | `checks/v8-edge-browser.log` |
| Production frontend + Android bundled assets | Passed; existing >500 kB chunk advisory remains | `checks/v8-frontend-build.log` |
| Native JVM policies | Network/parser harness, 24 file-transfer assertions, 25 workspace/JSON assertions, staging snapshot/isolation test passed within engineering suite | `checks/v8-engineering.log` |
| Android build, test-APK compilation, lint | **Passed: assembleDebug, assembleDebugAndroidTest; lint 0 errors / 1 intentional JavaScript warning. Both APK v2 signatures verified.** Native tests not executed | `checks/v8-android-final.log`, `ANDROID-BUILD-REPORT.json` |
| Extracted source-candidate regression | **128/128 passed** from extracted archive using the existing installed dependency tree; not a fresh network npm ci | `checks/v8-source-extraction-smoke.log` |
| Actual attached Android device/emulator | **Blocked: none attached**; five instrumentation tests not executed | `checks/android-device-availability.json` |
| Publication source audit | No heuristic findings; **project LICENSE still absent** | `checks/source-publication-audit.json` |

Desktop native-channel tests use an explicit mocked transport. They prove frontend selection/serialization/error behavior, **not** Android origin enforcement, consent, SQLite, SAF or provider behavior. JVM tests are not Android execution. Initial build verification stalled under memory pressure from stale processes; the stale build/preview processes were stopped and final checks rerun serially. Earlier failed/stalled logs remain historical evidence, not success claims.

## Still remaining — distinguish engineering from owner/device gates

### Further engineering not implemented in v8

1. Native direct-read transport for the web asset/trading screens; the delivered bridge unifies **personal workspace only**, not RPC/backend APIs.
2. Native metadata/media/holdings ingestion and bounded cache pipeline, candidate discovery and provenance/freshness UI. Existing server/web implementations are not an equivalent native pipeline.
3. WorkManager/background checkpoints, opt-in receipt/index watches, cancellation/backoff and battery/network policy. No always-on device backend claim.
4. Full wallet mobile callback/return handling and interruption recovery acceptance; Android signing remains entirely in external user wallets.
5. Optional authenticated, conflict-aware automatic cross-device sync. Encrypted portable files are manual backup/recovery, not automatic sync.
6. Broad fuzzing/property/security review of the new channels and real-provider file transfer failures. Same-origin page compromise remains a serious threat after a user grants that origin access.

### Owner / external environment / independent review gates

1. Run `ANDROID-V8-DEVICE-ACCEPTANCE.md` on real Android devices and providers. Execute the five native tests (or the prepared manual emulator CI). Validate selected FileProvider URIs with WebView content access disabled, process/renderer death, background/resume, low storage and unsupported WebViews.
2. Choose the actual hosting/domain/project accounts and deploy/configure optional shared services. Local Worker/D1 and Redis tests are not production availability or quota verification.
3. Provide owner-controlled release signing outside chat and choose a project license after rights review. A debug APK and missing project LICENSE are not a public release.
4. Configure public WalletConnect/project/origin settings and independently reviewed deployed contract addresses. Review contract source/permissions and external venue coverage before funds.
5. Authorize only deliberate, bounded mainnet test spending from an owner-controlled disposable wallet after review. Never share seeds/private keys in chat. No such authorization/funding is assumed or used here.

## Deliverables / how to use

- `RIFT-hybrid-preview-v8.apk`: offline-default debug app.
- `RIFT-native-tests-v8.apk`: optional instrumentation APK, not a user-facing app.
- `RIFT-hybrid-v8-complete.zip`: current source, built frontend, evidence, app/test APKs, operating docs, per-file manifest; no dependencies/runtime databases/private environment files.
- `RIFT-hybrid-v8-source-candidate.zip`: lean publication candidate without APKs/build outputs/evidence. **Not publication-approved**: license/rights and independent secret/history review remain required.
- `ANDROID-V8-DEVICE-ACCEPTANCE.md`: concrete device/owner test procedure.

Start at `PACKAGE-START-HERE.md`. See `ANDROID-BUILD-REPORT.json` and adjacent ZIP checksum reports for artifact hashes. Previous generic source-candidate and v6/v7 archive names are historical; use explicit **v8** names for this increment.
