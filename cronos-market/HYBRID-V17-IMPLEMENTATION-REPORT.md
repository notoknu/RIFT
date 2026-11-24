# RIFT hybrid v17 — native IPFS gateway settings and stale wallet-session refusal

**Debug engineering preview. Not launch acceptance or completion of all remaining engineering. No five-hour elapsed-session claim.**

## Implemented

### Native gateway picker and manual origin

Connections & local tools now includes **IPFS gateway HTTPS origin** and a picker for manual input, `https://ipfs.io`, or `https://dweb.link`. Applying an option only fills the editable field; the user must Save. Old installations with no saved gateway retain ipfs.io behavior. Forget connections restores the default along with Offline mode.

The saved gateway is used by native JSON and PNG/JPEG reads, not merely displayed. Custom input must be a lowercase public HTTPS DNS origin without path, port, credentials, query or fragment. No API key/header support is added to gateway requests. The transport still resolves and validates public IPs, connects to those same validated IPs with TLS hostname checks, refuses redirects and compression, and applies existing response/deadline/MIME/decode bounds. No RPC credentials, cookies or referrer are sent. A custom origin is user-authorized native configuration, NOT a page-selected arbitrary-URL proxy.

The web bridge still accepts only a bounded content reference and local profile. Its ipfs.io-shaped URI is a **canonical content marker**, not necessarily the contacted destination. Native consent and returned metadataHost/mediaHost identify the actual saved gateway. Native settings revisions are checked before requests and again before accepting JSON/raster results; changing connections during a request rejects stale results. Gateway changes also retain existing receipt-pause/index-source-invalidation behavior.

Only validated `/ipfs/CID/path` requests are constructed. `ipfs://` and canonical ipfs.io references remain supported; arbitrary HTTPS artwork URLs, IPNS and gateway-specific token/query paths are not newly accepted. A gateway requiring authentication or redirects will fail: no silent fallback. Preset inclusion is not an availability/trust/pinning/retention guarantee. dweb.link may redirect to subdomain form and consequently be refused by this transport; the app explains this rather than weakening redirect policy. There is no background fetch or automatic metadata/image following.

Integrity scope is unchanged: only pathless CIDv1 raw SHA-256 bytes are independently verified. UnixFS/DAG/path resolution remains explicitly unverified. Switching gateway does not manufacture integrity, authenticity, ownership or safety.

### WalletConnect lifecycle hardening

Remote disconnect/session-delete now invalidates adapter access even if the SDK retains a stale session object. Expired or malformed-expiry sessions expose no accounts and cannot forward signing requests. Reusing a stale SDK object requires explicit disconnect/reconnect; no automatic pairing or signing occurs. A new explicit Cronos pairing resets stale chain-event state to its requested chain. Existing cancelled-pairing quarantine remains.

This does not cancel or reverse transactions already sent, guarantee external wallet behavior, implement Android deep-link return/process-death recovery, or replace live account/chain checks in transaction flows. Expiry uses the local clock, not independent time attestation. Restored test/session objects with no expiry retain existing compatibility; actual SDK session expiry enforcement remains relevant.

## Executed checks

- **175 engineering tests passed**, including native gateway boundary checks and seven WalletConnect lifecycle tests (four newly added).
- **33 native JVM tests passed**, including four new gateway normalization/rejection tests.
- **6 implementation tests, 7 real-local-Redis security tests and 40 local contract tests passed.**
- Full implementation browsers, Worker/D1 browser and offline browser checks passed. Native bridges remain mocked in browsers; wallet lifecycle tests use an SDK fixture, not an external mobile wallet.
- Android app/test APK build and lint passed. **15 instrumentation tests compiled, none executed** because no authorized Android device/emulator is available.
- App v2 debug signature verified. Source/audit/packaging checks remain heuristics, not independent certification. No new real-device gateway or mobile-wallet acceptance is claimed.
- Fresh extracted source: actual npm ci, 175 engineering tests, frontend build and 33 native JVM tests passed with JDK17; see `checks/v17-clean-*`.
- Evidence: `checks/v17-verification.json`, versioned logs and JUnit XML. Fresh-source install/build/test evidence is recorded separately as generated.

## How to use

1. Install `RIFT-hybrid-preview-v17.apk` on a disposable Android 8+ device.
2. Open Connections & local tools. Choose gateway or manually enter your actual public gateway origin, then Save.
3. Use Direct-read/Hybrid mode as appropriate. Inspect a known token URI, then explicitly request supported IPFS JSON or raster preview; review the actual gateway in native consent. Offline still blocks all network reads.
4. Never enter seed/private keys. Gateway authentication secrets are intentionally unsupported; put upload/pinning secrets only in an appropriately secured backend.
5. Follow `ANDROID-V17-DEVICE-ACCEPTANCE.md`; no device execution is represented as passed.

## Still open

Wallet-wide discovery/coverage validation; authenticated encrypted automatic sync (identity, key recovery, conflicts, migrations and service trust); UnixFS/DAG integrity, broader media/cache/pinning adapters; configurable backend/build-only API adapters; real wallet return/account-change/process-death integration and Android fault/performance acceptance. Production deployment/signing, licensing, independent security review and approved bounded mainnet acceptance remain separate gates. See `REMAINING-RELEASE-GATES.md`.

No user credentials/funds were supplied and no approvals, transfers, deployment or other mainnet writes were sent. Zero platform fee/free mint never waive gas or guarantee IPFS retention. Prior generated artifacts through v16 are byte-exact in the history archive with the adjacent restore script/inventory. Current deliverables are APK plus source ZIP; run `npm run android:prepare` before building from source.
