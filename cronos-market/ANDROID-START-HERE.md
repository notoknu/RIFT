> **Current: RIFT-hybrid-preview-v8.apk**, versionCode 8 / 0.6.0-hybrid-preview-debug. Read HYBRID-V8-IMPLEMENTATION-REPORT.md and ANDROID-V8-DEVICE-ACCEPTANCE.md first. Native/web drafts now share SQLite after consent; encrypted manual backups are available. Offline by default; direct web trading, Android runtime and release acceptance remain unfinished. The older instructions/reports below are historical; use the explicit v8 APK filename.

> Latest artifact: RIFT-preview-v5.apk / versionCode 5 / 0.3.1-preview-debug. Still debug-signed and unconfigured. See ENGINEERING-SESSION-RESULTS.md.

# RIFT Android — installable preview + complete build source

## What this build is

- Android Java/WebView app with the actual RIFT frontend bundled in its APK.
- Name: **RIFT**. Provisional release ID: `io.rift.cronos`.
- This debug preview installs as `io.rift.cronos.preview`.
- Android 8.0/API 26 or later; compile/target API 35.
- No live backend origin is configured in the supplied APK, as requested.
- First screen explains service setup; an optional offline browser opens the real
  bundled interface with a permanent offline banner. APIs fail explicitly rather
  than returning fabricated collections, orders, prices or wallet balances.

**This is NOT a live mainnet trading APK or a Play Store release.** The Android
shell is implemented in Java and the marketplace UI remains the existing web UI;
it is not a rewrite into native Android screens. The backend is not inside the APK.

## Install this preview

1. Transfer/download `RIFT-hybrid-preview-v8.apk` onto your Android phone.
2. Open it and, if prompted, permit your chosen installer/browser to install this
   package. Follow Android's normal security checks; do not disable device-wide
   protections or ignore security warnings.
3. Launch **RIFT**. Read the setup notice. Offline interface browsing cannot sign in,
   connect a wallet, fetch live assets, mint or trade.

This package is signed with a disposable Android **debug** certificate and is
inspectable/debuggable. Do not enter production account secrets or use it for funds.
A developer-signed release needs the owner's long-lived signing key. Future APKs
signed by a different key cannot update this preview in place. Uninstalling clears
its local favorites/session/transaction journal; preserve needed records first.

## Rebuild

Install Node 22, JDK 17, Android SDK platform 35 and Build Tools 35.0.0 (or allow
Gradle's standard Android SDK dependency resolution). Set `ANDROID_HOME` or use
Android Studio's local SDK configuration. Gradle 8.9 wrapper is included with a
pinned distribution SHA-256. SDK/JDK/dependencies/caches are not bundled.

```sh
npm ci
npm run android:prepare
cd android
./gradlew assembleDebug
```

Windows: `gradlew.bat assembleDebug`. Output:
`android/app/build/outputs/apk/debug/app-debug.apk`.

To connect the app to a real deployment, prepare/rebuild the frontend with the
reviewed public build settings, then use the exact HTTPS service origin:

```sh
npm run android:prepare
cd android
./gradlew assembleDebug -PriftOrigin=https://YOUR_ACTUAL_DEPLOYED_HOST
```

The uppercase host above is an illustrative placeholder, not a supplied service.
Do not literally use it. Do not put JWTs, seed phrases, private keys or signing
passwords in Vite settings, Gradle properties or source control.

## Origin/auth model

Bundled static files are served by WebView interception at the configured backend's
HTTPS origin; `/api/*` uses ordinary same-origin HTTPS and cookies. This avoids a
privileged native networking/Javascript bridge or an arbitrary public proxy. Only
allowlisted bundled filenames and known app navigation routes map to local assets.
Unknown API paths never fall back to a successful index page.

The HTTPS backend must implement the APIs, cookie/CSRF and exact public-origin
checks described in the web runbook. It must remain compatible with the bundled
frontend version. Deploy backend and frontend updates together; there is no native
OTA-code updater. No bypass of TLS errors, cleartext networking, third-party
cookies, file/content access or browser-origin authentication is implemented.
Offline mode also applies a restrictive CSP with `connect-src 'none'`.

## Wallets and limitations

- No wallet or key custody is embedded. Never paste a seed/private key into RIFT.
- Android WebView does not inject MetaMask/browser-extension providers. A reviewed
  WalletConnect public project ID, appropriate origin configuration and actual
  mobile-wallet acceptance are needed. The current QR/manual pairing UI is reused.
- Same-device wallet handoff/return, background/resume, cancellations and transaction
  recovery require real-device testing. There are no verified Android App Links or
  automatic wallet callback intent filters in this preview.
- External HTTPS and specifically allowed wallet schemes open installed external
  apps only via user-initiated navigation. Arbitrary `intent:`, `file:` and `javascript:`
  navigation are not handed to external applications.
- Creator file uploads, blob/ZIP exports, camera and native sharing are **not enabled
  by this initial shell**. Use the deployed website for those flows. HTTPS downloads
  can be handed to an external browser after confirmation; it has a different
  cookie session. Do not call this full native feature parity.
- New provider/chain setup, contract reviews, hosted quotas and web roadmap gaps
  remain as documented in `ENGINEERING-COMPLETION-CHECKLIST.md`.

## Release checklist

Confirm the permanent package ID, privacy policy and store disclosures; configure
actual HTTPS/backend/contract/WalletConnect values; implement/accept required native
upload/export and wallet-return behavior; review WebView origin isolation on device;
exercise low-memory/WebGL performance and process death; run accessibility/mobile
wallet/security tests; choose current required Play target SDK at submission time;
and sign a non-debuggable release/AAB using the owner's secured key outside Git.
No Play upload, production signing key or mainnet transaction was created here.

The provided certificate/build checks do not replace installation/runtime tests on
real devices. See `checks/android-*.log` and `ANDROID-BUILD-REPORT.json` for precisely
which checks completed; do not infer an emulator or live-wallet pass.

## Executed result

Debug APK assembly and Android lint passed (0 errors, one JavaScript-enabled
warning retained for review). APK Signature Scheme v2 verification passed. Three
source/asset checks and a desktop-Chromium offline-origin/CSP smoke test passed.
No emulator/device installation or live backend/wallet test was performed.

Latest update: `RIFT-preview-v2.apk` is versionCode 2 / 0.2.0-preview-debug and
includes the new navigation and platform/activity pages. It remains offline.
Older Filebin uploads are not automatically updated.

Newest package: RIFT-preview-v4.apk / versionCode 4 / 0.3.0-preview-debug includes
collection workspace tabs and source-scoped market statistics. Backend remains
unconfigured. See EBISU-COMPARISON-IMPLEMENTATION.md.
