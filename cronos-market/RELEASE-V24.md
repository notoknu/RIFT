# RIFT v24 — device-acceptance preparation preview

VersionCode24, 0.22.0-device-acceptance-preview-debug, io.rift.cronos.preview. Matched application/test APKs preserve the earlier preview debug signing identity. This snapshot includes current wallet, launch, settlement, index, approval and recovery source updates. It remains an unapproved debug preview.

## This batch

Four new isolated AndroidKeyStore instrumentation tests (random test-only aliases; no production vault access), stricter device-result parsing that rejects failures/skips/count mismatches, updated optional emulator CI description and ANDROID-CLOUD-ACCEPTANCE.md. Expected device suite19. New native tests were COMPILED, NOT EXECUTED.

Exact APK hashes/signatures/local test evidence: ANDROID-BUILD-REPORT.json. This batch passed293 engineering tests,3 Android shell checks,42 JVM tests,frontend build and Android lint with0 errors/8 warnings. Previous full security/browser/contract passes are historical and were NOT rerun in this batch after the build environment was restored.

## Blocked runtime work

No authorized device/emulator attached. No cloud project/account authorization. No cloud tests or live WalletConnect pairing executed. Public project ID is not configured by this preparation. Do not classify Keystore compilation as device-credential/biometric vault acceptance. Actual file-provider/process-death tests remain open.

No backend/contract deployment, trading activation, paid resource provisioning or mainnet spend. Latest UI may call backend endpoints absent from the earlier hosted release. APK installation does not deploy matching source to Render.

## Package usage

The outer ZIP includes app APK, matching instrumentation APK, clean source ZIP, exact build evidence and checksums. For authorized Firebase Test Lab use app APK plus matching test APK, not the source ZIP; start with one supported physical-device run on a confirmed no-billing free plan. Do not upload private data, seed phrases or funded wallets. Product availability/quotas must be confirmed before submission.

For adb use a dedicated test device; update with adb install -r for both APKs. Do not clear/uninstall valuable app data. The included android-device-check.js --run-instrumentation --expected-tests=19 checks the already installed test runner. Reports distinguish local build success from absent runtime acceptance.

Remaining work: ANDROID-CLOUD-ACCEPTANCE.md, CURRENT-REMAINING.md and WALLET-FIRST-PLAN.md. Licensing is unresolved; existing SPDX/dependency permissions retain their scope. Source packaging excludes keys/tokens/runtime databases/signing identity/dependencies/caches; heuristic scans are not a security audit.
