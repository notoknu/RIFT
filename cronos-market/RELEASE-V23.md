# RIFT v23 — wallet and launch reliability preview

This consolidates the locally implemented wallet continuation batches after v22. See WALLET-FIRST-PLAN.md for individual changes and acceptance limits. VersionCode23 / 0.21.0-wallet-launch-preview-debug, package io.rift.cronos.preview. Debug preview only; native signing remains disabled/unapproved.

## Included

- WalletConnect session chain/account/request validation; signing account and typed-data chain checks; cancellation quarantine and late-approval protection.
- Single-flight SDK initialization with retry after failure; read-only foreground account/network rechecks.
- Connection-attempt cancellation gate covering initialization, injected approval, chain changes and signer lookup.
- Read-only Cronos RPC fallback with chain probes, time/response bounds and cooldown. No transaction/signature retries.
- Fixed-block launch snapshots, bounded concurrency, before/after hash checks and whole-snapshot fallback; launch-only provider selection and block/provider observation display.
- Mint review based on fresh limits, chain timestamp, exact price, simulation, estimated fees and CRO balance. Explicit cost confirmation, signer/network recheck and repeat simulation precede the existing tracked transaction flow.
- Seller royalty/gross/net/recipient review from the earlier post-audit batch.
- Explicit IERC165 import, compiled artifact hashes and local contract tests.

## Publication boundary

No remote source publication, backend deployment, exchange deployment or trading activation is performed by this build. Last verified hosted commit remains 3ae9e3dbcaa23ed3c40f08ff943b3d1ae11e8bea. The new APK bundles updated web assets but still targets https://rift-q6qs.onrender.com for APIs. New account export/deletion backend routes require publishing/deploying matching source. Installing an APK does not update Render.

## Acceptance limits

The compiled-contract mint acceptance runs on isolated in-process EDR configured with chainId25; this is NOT Cronos mainnet and uses no real CRO. It covers actual RiftDrop deployment/mint/receipts and proof/recovery behavior locally, not external-wallet relay or device acceptance. Browser wallet scenarios use controlled providers. No real phone, emulator instrumentation execution, mobile deep-link lifecycle, independent audit, hosted restore/indexer quota/reorg acceptance or production trading approval is claimed.

Free mint means zero mint price, not zero network gas. On-chain art and source verification do not establish ownership rights, marketplace approval or permanent availability of external media. No ULTRA CAT/Six Seven assets or new collection launch is included.

## Evidence and rebuild

ANDROID-BUILD-REPORT.json is the exact APK/hash/signing/test record when the build completes. Historical v18 and v22 evidence is retained separately. Use Node22.13+, JDK17 and SDK35. Install dependencies from the lockfile; address npm's optional EDR platform-package issue if encountered. Run contracts:compile, contracts:test, test:local-engineering, test:security with disposable Redis, build and test:browser:implementation. android:prepare bundles assets; Gradle testDebugUnitTest assembleDebug assembleDebugAndroidTest lintDebug builds/tests the shell. Instrumentation compilation is NOT execution.

Project-wide license choice remains unresolved. Existing contract SPDX and third-party licenses retain their scope. Keys/seeds/tokens, signing identity, runtime DBs and caches must never be included in release archives.
