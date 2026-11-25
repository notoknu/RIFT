# Android/cloud acceptance — current handoff and limits

## What can run without cloud-account authorization

Local build/JVM tests, instrumentation APK compilation, isolated Keystore/SQLite test implementation, result-parser tests and preparation of a matched app/test APK bundle. None is device execution. No attached Android device and no /dev/kvm are available in this runtime. No Google account/project authorization is available; no external account or paid service has been provisioned.

## Runtime suite

Expected suite: 19 tests = 12 WorkspaceInstrumentedTest + 3 DiscoveryIndexStoreInstrumentedTest + 4 KeystoreInstrumentedTest. New Keystore tests use random test-only aliases, delete them afterward, and exercise nonexportability/reload, AES-GCM tamper/AAD rejection, IV randomness and deletion. They do NOT touch the actual WalletVault alias or test biometric/device-credential authentication, hardware backing, lockout or key invalidation after credential changes. Those remain separate gates.

The device-result checker now checks the explicit expected total and rejects ignored/assumption-skipped tests, crashes, failures or ambiguous summaries. An OK count alone does not prove all device features work. Use --expected-tests=19 with this exact matching test APK; older APKs contain only 15 tests and are not this suite.

## Google/Firebase prerequisites (not performed here)

A RIFT-owned Google project/account must authorize uploads/test execution. Do not provide Google passwords, wallet seeds, private keys or long-lived service-account JSON in chat/source. Keep Firebase on Spark/no billing; do not enable Blaze/paid overages. Confirm current quotas and product lifecycle in the console before submission. Official quota/lifecycle page: https://firebase.google.com/docs/test-lab/usage-quotas-pricing . Free-tier availability and device catalog may change. Current documentation announces a Test Lab migration/shutdown timeline; do not assume this service is permanent.

After authorization, upload matched app APK and instrumentation APK in Firebase Test Lab -> Android -> Instrumentation. Select ONE currently available physical device/API initially; do not invent model IDs or consume a broad matrix by default. Use a short timeout and no automatic flaky retries. A cloud run uploads your APK and test output to the provider: use only disposable wallets/test fixtures and review artifacts before sharing.

The current APK is not WalletConnect-configured until an operator-owned public project ID is supplied at frontend build time. Creating a Test Lab project does not create a WalletConnect project. No borrowed/sample project ID is bundled. Origin allowlisting must match https://rift-q6qs.onrender.com (the APK's configured origin) and any explicitly approved additional site.

## Dedicated device commands (alternative to cloud)

Use a disposable Android8+/API26+ device/profile with current WebView. Install app and matching test APK with adb install -r; never uninstall/clear an existing valuable workspace just to bypass a signing mismatch. Dedicated test device only. Then:

    ANDROID_HOME=/path/to/sdk node scripts/android-device-check.js
    ANDROID_HOME=/path/to/sdk node scripts/android-device-check.js --run-instrumentation --expected-tests=19

The checker does not install/uninstall or collect logcat/screenshots/credentials. It writes checks/android-device-availability.json with hashed device IDs. Instrumentation may restart the app and uses isolated data/key aliases. Native security prompts/file pickers still need actual interaction tests.

## Still required before marking item3 complete

- Execute matched instrumentation on authorized cloud/physical hardware and inspect failures/skips.
- Actual WalletVault device-credential/biometric behavior, cancellation, lockout, credential-change invalidation and recovery. No funded-wallet import or native signing approval.
- SAF document-provider export/import roundtrip, hashes/multi-chunk integrity, denial/cancel/tamper/wrong-passphrase checks and no permission fallback.
- SQLite workspace and active export/import recovery across real process death; emulator/worker recreation is not Android process-death evidence.
- Actual WalletConnect QR/deep-link pairing with an owned project ID and fresh unfunded wallet, including app switch, rejection, disconnect, expiry and reconnect; verify no spontaneous sign/send.
- Explicit supported device/OS/WebView/wallet versions and limitations. Cloud test success does not establish all-device compatibility.

Broader project gates remain: matching backend publication/deployment and hosted account recovery; independent contract review and approved mainnet trading acceptance; hosted index/provider quotas; external marketplace integrations and discovery coverage; real launchpad provider/storage acceptance; licensing and synchronized release evidence.

## Offline review of downloaded instrumentation text

Keep original logs private. With a raw instrumentation transcript (not a provider XML/HTML report), run:

    node scripts/review-device-result.js /private/path/instrumentation.txt 19 /private/path/verdict.json

Exit 0 means only the exact instrumentation summary passed; 1 means failed/incomplete; 2 means invalid invocation/input or an existing output file. Existing evidence is never overwritten. The output contains a SHA-256 binding to the raw input but not its text. It always marks full device acceptance false. Provider XML/HTML or missing summaries fail closed; do not edit logs to force a pass. Verify matching APK hashes and provider/device identity separately.

## Exact installed artifact binding (v27 tooling)

Before --run-instrumentation, the checker now requires app versionCode, installed app/test APK SHA-256 and instrumentation runner target to match ANDROID-BUILD-REPORT.json from the same source release. It obtains a single validated /data/app/.../base.apk path for each package, reads hashes using Android shell sha256sum, and fails closed for mismatches, unavailable hashes or split/unknown paths. It does not install, uninstall, clear app data or bypass signing mismatches. This prevents running an older app with a matching test count and calling it the current release.

Reports retain a digest and parsed instrumentation verdict, not raw transcript text. Keep any original provider logs separately and privately. Mock-ADB CLI tests prove command gating and reporting behavior only; they are not device execution. Build-report integrity itself and a trustworthy authorized device/toolchain are still operator prerequisites. A successful identity match is not vault/SAF/lifecycle acceptance.
