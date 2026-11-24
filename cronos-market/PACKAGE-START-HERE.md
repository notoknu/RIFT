# Latest milestone: v18 — online default, test-only native vault

**DO NOT FUND OR IMPORT A FUNDED WALLET. No embedded transaction signing exists yet.** Install `RIFT-hybrid-preview-v18.apk`; read `HYBRID-V18-IMPLEMENTATION-REPORT.md`. New installs auto-connect Cronos direct RPC; explicit disconnect persists. Save edits disconnected, then validate with Connect saved services. A compatible shared API must still be deployed for web marketplace features. Native wallet generation/recovery/backup is an experimental foundation, not a full trading wallet. Source ZIP provided separately; run `npm run android:prepare` before building. Follow `ANDROID-V18-DEVICE-ACCEPTANCE.md`.

The following v14 instructions/results are HISTORICAL and superseded for offline defaults, saved-setting behavior and wallet custody.

# RIFT v14 — start here

**Engineering/debug preview, not production or mainnet approved.** Read `HYBRID-V14-IMPLEMENTATION-REPORT.md` for implemented scope and executed tests. Older version/session reports are historical.

## Android first

1. Install `RIFT-hybrid-preview-v14.apk` on a disposable Android 8+ device. It is debug-signed and offline by default. Do not use valuable wallets, irreplaceable data or production credentials.
2. Open Connections & local tools to choose Offline, Direct-read or Hybrid mode. Keep provider credentials in the native fields only. Direct-read is not backend-independent live trading; Hybrid needs an actual owner-deployed HTTPS service origin.
3. Open the bundled interface → Create → Device drafts. Personal SQLite workspace access requires consent for the current document/profile. Browser-origin IndexedDB drafts/candidates are separate and are not auto-migrated.
4. Try personal backups/export deliberately. Keep encrypted-backup passphrases separately; there is no password-reset service. Decryption prepares review text; import is a separate action. Started native mutations can commit after timeout—reload before retrying.
5. Follow `ANDROID-V14-DEVICE-ACCEPTANCE.md`. `RIFT-native-tests-v14.apk` is a developer instrumentation package, not the user-facing app. Its **15 tests compiled but have not executed on Android here**.

## Native known-asset tools

- Create/Portfolio direct-read panel: CRO/ERC20 balances, known ERC721/ERC1155 checks, token URIs, receipts and historical observations. Known assets only, not full wallet discovery or authenticity certification.
- Transfer discovery: select owner/contract/NFT standard above the discovery panel, choose `recent` or a starting block and a 1–2000-block span, then approve one native page scan. ERC721/ERC1155 transfer hints include sent-away tokens, not current holdings. Explicit next/overlap controls and separate local hint saving; no automatic continuation. Provider omissions are possible even for accepted pages.
- Persistent index: expand the separate native index controls, explicitly load the local checkpoint, start/resume using the selected range, and reload after cancellation. App-private unencrypted SQLite; 16 scopes, 1000 IDs/scope, 200-entry pages. Source changes/detected reorgs require explicit delete/rebuild. Not wallet-wide discovery or current holdings; exports/copies contain hints, not verified checkpoints.
- Local candidate hints: origin-local IndexedDB, separately exported/imported JSON; no RPC/signing/watch scheduling on import/selection. Not part of the native personal-workspace backup.
- IPFS JSON: separate explicit request/native consent, fixed ipfs.io gateway, 64 KiB maximum, no credentials/cookies/referrer/redirects. Reading a token URI never fetches metadata automatically.
- Raster preview: another explicit request/native consent; PNG/JPEG only, 128 KiB input, at most 1 megapixel and 2048px original side. Native conversion produces at most 256px/64 KiB PNG. Original image URL/bytes are not embedded in WebView. SVG/HTML/GIF/WebP, arbitrary hosts and general animation remain unsupported.
- Integrity: only pathless CIDv1 raw SHA-256 bytes are independently checked. Mismatch is rejected. UnixFS/DAG/directory/subpath references explicitly remain not-verified. A matching digest is not safety, ownership or collection authenticity.
- Receipt watches: off by default, bounded and best-effort; unmetered networks by default. Saving a data policy/settings change pauses work until explicit resume. Inclusion is not finality. Android timing is not guaranteed.
- Manual native receipt journal reconciliation never signs or resends. Browser-origin journal state is not automatically migrated between origins.

External JSON/preview responses are transient, not new caches/sync/backup formats. Remote gateways see your IP and selected paths after consent. Native image-codec behavior still requires device acceptance.

## Run the web/backend locally

Install Node.js 22 and npm. In the extracted `cronos-market/` directory:

```sh
npm ci
npm run contracts:export
npm run build
npm start
```

Open `http://localhost:4173`. The complete ZIP includes a built frontend; rebuilding is recommended. The lean source candidate omits generated builds/APKs/evidence, so build before serving. Dependencies, private environment files, runtime databases, backups and caches are not bundled. Unavailable live data must remain unavailable, never become demo assets.

Read `.env.example`, `START-HERE-YOUR-STEPS.md`, `DEPLOY-NEXT.md` and `ops/RUNBOOK.md` before live service configuration. Templates are not credentials or completed deployment. `npm run dev` is for development.

## Reproduce verification

Node 22 and JDK 17 are needed for engineering/JVM checks. Full Android/browser verification also needs Android SDK 35, configured `JAVA_HOME`/`ANDROID_HOME`, Gradle (optional `GRADLE_PATH` override), and installed Playwright Chromium (`npx playwright install chromium`). Use an isolated test Redis, never valuable production state.

```sh
TEST_REDIS_URL=redis://127.0.0.1:6379 npm run verify:hybrid -- --browsers --android
```

The Android step also executes eighteen native-helper Gradle JVM tests against fake RPC/repository adapters; these are not the fifteen Android instrumentation tests. The serial bounded runner writes versioned logs/JSON, records unavailable checks as not-run/blocked, and always sets `releaseAccepted:false`. It does not install APKs, execute instrumentation, deploy or transact. Without Android/browser prerequisites, run individual local checks:

```sh
npm run test:local-engineering
npm run test:implementation
npm run contracts:test
```

## Packaging and preservation

```sh
npm run package:hybrid
npm run package:hybrid-source
```

Versioned ZIPs and checksum reports are written beside the project. Each ZIP has a verified per-file `PACKAGE-MANIFEST.sha256`; Unix wrapper executable modes are retained. The complete ZIP includes source, assets, app/test APKs and evidence. The lean candidate excludes dependencies/runtime state/build outputs/evidence but retains tests/config/fixtures.

All **31 previous generated ZIP/APK files**, including v12, are preserved byte-exactly in `RIFT-previous-builds-history.zip`. Use the adjacent `RIFT-history-inventory.json` and `restore-rift-history.py`; every reconstruction was verified before duplicate originals were removed. Historical files are not release-approved.

## Remaining gates

See `REMAINING-RELEASE-GATES.md` for remaining engineering versus access/owner decisions: wallet-wide holdings discovery and persistent reorg-aware indexing, UnixFS/DAG integrity, richer media/cache, wallet/device lifecycle, authenticated encrypted automatic sync, Android runtime validation, hosting, release signing and independent contract/security/legal review.

Project LICENSE remains absent; source packaging is not publication permission. Zero RIFT platform fee/free mint never waives creator deployment gas, collector mint gas, IPFS retention or external-provider constraints. No seed/private key should be shared or embedded.
