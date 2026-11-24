# Remaining work and ownership — hybrid v18

**This is a debug engineering preview, not a full-mainnet launch approval.** The requested five-hour session is not a claim of elapsed work time. See machine logs and the implementation report for executed checks.

## Delivered assistant-side foundations

Online-default Android shell with explicit persistent disconnect/reconnect/reset; experimental native generation/recovery/backup vault (NO embedded signing; test-only, never funded); editable Keystore-backed primary/backup connections; native personal SQLite workspace; bounded file import/export and optional passphrase-encrypted manual backup; narrow consented native reads; inert embedded JSON inspection; bounded historical observations; opt-in bounded receipt background work; manual native receipt reconciliation; local asset candidate hints; local contract/backend/browser security tests; CI and packaging.

## Engineering still open (not merely user setup)

| Work | Why still open / acceptance needed |
|---|---|
| Complete wallet NFT/token discovery and richer metadata/media | Candidate hints are deliberately incomplete. Explicit native ERC721/ERC1155 transfer-log discovery for a selected contract/range is now implemented (2000 blocks, 512 log responses, 200 IDs per page), with endpoint-hash recheck and next/overlap controls. These are touched-token hints, not current holdings or provider-completeness proof; a bounded persistent contract-scoped native checkpoint is implemented with anchor/source invalidation and CAS. v16 adds explicit hash-pinned known-NFT ownership/balance pages (12 hints) with whole-page rejection on error; this is not wallet-wide discovery or coverage proof, and device acceptance remains open. A bounded, abuse-resistant indexing/fetch/render/cache policy and coverage validation are still needed. The panel now supports a separate consented 64 KiB IPFS JSON fetch through a saved native public HTTPS gateway (v17 presets/manual origin; no redirects or credentials). Separate consented native PNG/JPEG raster preview is now implemented with bounded decode/re-encode. Only pathless CIDv1 raw SHA-256 integrity is verified; UnixFS/DAG paths, richer media/cache, authenticated gateways and broader URL/pinning adapters remain open. Decoder behavior still needs real Android acceptance. |
| Native-independent trading/wallet lifecycle and embedded custody | v18 adds a native device-authenticated BIP39/Keystore vault foundation, NOT a complete wallet. Native signer/provider bridge, transaction review/simulation, fee/nonce/replacement policy, account selection and independent custody review are unimplemented. Never fund/import real assets in this debug build. External pairing/deep-link return, account/chain change, cancellation and process-death behavior require actual wallet/device integration. Cancelled WalletConnect pairing now has adapter quarantine/late-cleanup protection and mocked tests; v17 also refuses stale deleted/expired WalletConnect sessions in the adapter; real wallet return/process-death acceptance remains open. No privileged signing bridge was added. |
| Authenticated encrypted automatic sync | Not implemented. Manual backups/candidate imports are not sync, and this remains substantive assistant-side engineering, not merely a missing hosting credential. Identity, conflicts, key recovery, service trust and migrations need explicit design and testing. |
| WorkManager/SQLite/Keystore/SAF runtime validation | Compiling and pure-policy tests cannot prove Android execution, storage-full recovery, scheduling or provider/OEM behavior. |
| Performance and reliability under load | No invented battery/data/availability measurements. Profile on real low-memory and modern devices and a real deployed shared service. |
| Mainnet contract/trading acceptance | Local Hardhat tests are necessary, not independent audit or live acceptance. Review deployed code/address manifest and execute an explicitly bounded transaction plan only after owner approval. |

## Requires access or owner decisions

1. **Android device/emulator:** connect an authorized disposable device; run `ANDROID-V18-DEVICE-ACCEPTANCE.md`. This environment has no authorized device and no `/dev/kvm`; no emulator execution is represented as passed.
2. **Hosting/project/domain:** provision the intended owner-controlled hosting resources and final HTTPS origin; configure secrets in host secret storage, not chat/source/APK. Existing deployment workflow remains manual approval only.
3. **External wallet and funds:** use an owner-controlled testing wallet with an explicit CRO limit and approved actions. Do not share seed/private key. No mainnet transactions were authorized or sent in this pass.
4. **Release signing:** owner controls and securely backs up production signing material. Current wallet code is test-only and APKs use disposable debug keys and a preview package ID.
5. **Legal/security review:** choose a project license only with rights-holder authorization; review third-party rights and contracts independently. An absent LICENSE was not filled with an invented permission grant.

## How to rerun assistant-side verification

Node 22, JDK 17, Android SDK 35; install dependencies with `npm ci`. Install Playwright Chromium separately if needed (`npx playwright install chromium`). Use a separate test Redis, never a production Redis containing valuable data.

```sh
TEST_REDIS_URL=redis://127.0.0.1:6379 npm run verify:hybrid -- --browsers --android
```

Set `JAVA_HOME`, `ANDROID_HOME` and optionally `GRADLE_PATH`. The runner writes versioned logs and JSON, runs serially with deadlines, and records unavailable checks as not-run/blocked rather than passing. It does not install APKs, execute device instrumentation, deploy, sign transactions or spend funds. Device inventory can be blocked while local automated checks pass; the report always sets `releaseAccepted:false`.

## Data locations and recovery boundaries

- Native drafts/favorites/observations: app-private SQLite; personal portable backups omit credentials and watches.
- Candidate hints: separate browser/WebView-origin IndexedDB, 64 profiles / 200 candidates per profile. Export them with their own candidate JSON export. They are public unverified hints, not wallet authentication or native personal-backup contents.
- Transaction journal: browser-origin local state; no automatic cross-origin migration.
- Connection credentials: Keystore-backed settings, not source/APK/work inputs/portable backups.
- Watch checkpoints: separate app-private native database, bounded and not restored by personal backups. Imported candidate hints never schedule watches or send RPCs.

Export needed data before uninstall/clear-data/change-origin. New installation or different origin is not automatic restoration. Zero platform fee/free mint never means zero Cronos gas or free permanent IPFS retention.
