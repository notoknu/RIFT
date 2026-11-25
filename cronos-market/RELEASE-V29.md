# RIFT v29 — reproducible Reown configuration

## Completed
- Official public Connect Wallet/Reown project ID: `6192620197a83e8b29a98f8eb68ecc89`. Replaces the earlier supplied project ID. This is a public application identifier, not a private key.
- Added source-controlled public configuration with validated environment override; an explicitly empty override disables WalletConnect. Updated environment documentation and readiness tooling to use the same resolver.
- Owner reports adding the production origin to the Reown allowlist. This has not been independently verified. Production origin remains `https://rift-q6qs.onrender.com`.
- Built debug preview versionCode29 / `0.27.0-reown-configuration-preview-debug`, package `io.rift.cronos.preview`, with the public project ID verified inside the APK assets. Preserved prior signing certificate.
- Includes the previous bounded venue-cache backend work and all v28 comparison resilience work.

## Current validation
380 engineering tests (including two new public-configuration tests), 7 security tests with real isolated Redis, 6 implementation checks, complete controlled-browser implementation suite, frontend build, 3 Android shell tests, 42 JVM tests, Android app/test APK builds and lint passed. Lint: zero errors, eight warnings. All 21 bundled asset hashes verified against the APK. Eight final device-artifact tooling tests passed. Contract tests were not rerun this batch; 64 simulated tests passed historically at v28.

## Not completed / boundaries
No live Reown relay authorization or QR/deep-link/app-switch pairing acceptance. Dashboard allowance is owner-reported, not a live result. No selected authorized Android device is attached: 19 instrumentation tests compiled, zero executed. Vault authentication, biometric, SAF and process-death acceptance remain open. APKs are debug previews, not store/publication approval; native signing remains disabled/unapproved.

No deployment occurred; hosted app still needs the reviewed source/configuration published. Hosted external database runtime credentials, persistence and independent off-host restore remain outstanding. Per-process cache is not distributed/global provider throttling. Independent trading review, approved mainnet acceptance, broader venue/discovery/creator/storage/encrypted-sync integration acceptance and licensing remain open. No transactions, paid provisioning or new collection launches.

## Reown / Android identifiers
- Public project ID: `6192620197a83e8b29a98f8eb68ecc89`
- Website/allowed origin: `https://rift-q6qs.onrender.com`
- Debug Android application/package ID: `io.rift.cronos.preview`
- Release package ID (not a published app): `io.rift.cronos`
Android package entries are not interchangeable with HTTPS origin allowlist entries. A field labelled App ID requires its dashboard context; package registration alone does not prove WebView relay authorization or deep-link handling.

## Delivery
Full clean source, debug app/test APKs and evidence included in the v29 kit. Environment files, wallet credentials, runtime databases and signing keys are excluded. Public configuration is included explicitly in source. See ANDROID-BUILD-REPORT.json for exact binary hashes and scope.
