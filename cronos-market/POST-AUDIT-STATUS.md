# Post-audit verification — current execution

## Confirmed

- Added the explicit OpenZeppelin IERC165 import to contracts/RiftExchange.sol.
- Ran Hardhat clean. Subsequent compilation succeeded: 9 Solidity files, solc 0.8.24, Paris, optimizer 200 runs.
- All 40 contract tests passed, including v1 adversarial escrow and v2 conservation, royalties, offers, criteria, batching, callback/reentry and withdrawal checks. These are local tests, NOT an independent audit.
- Regenerated ABI/bytecode/verification exports. Exact source and artifact hashes are recorded in evidence/CONTRACT-POST-AUDIT-VERIFICATION.json.
- Fresh npm ci completed. The environment initially ran Node20; rebuilt the pinned Node22 package and ran the checks under Node22.23.5. Missing optional EDR Linux native module required explicit no-save installation of version 0.25.1. Reproducible dependency installation still needs a gate addressing this npm behavior.
- Frontend build, Android asset preparation and all 3 Android shell tests passed.
- Implementation checks passed.
- Security suite: 6 passed, 1 skipped (Redis integration unavailable in this run). Not a complete infrastructure-security acceptance pass.
- Engineering suite: 228 passed / 229; one failure because the available system JDK11 lacks java.util.HexFormat used by the test harness. Supported JDK17 is required. The failure must be rerun, not silently waived.
- Replaced stale top-level Android report with scoped v22 APK evidence; preserved the old v18 report under evidence/historical/. Current report explicitly states the distributed APK predates the import patch and is NOT rebuilt from the current source.

## Still open — not accepted or deployed

- Complete JDK17 engineering rerun and Android compilation. SDK/JDK caches from the earlier session are absent in this runtime.
- Browser reruns require browser runtime restoration; no new browser acceptance claimed.
- Existing v22 APK hash is 81b1174e5fe306c6c9cc582aee83a43f3d96c84ed9f6bde18456f485757db449d14b. New source changes do not alter the already-distributed archive/APK.
- No backend publication/deployment, hosted export/delete isolation, restart/restore drill, hosted D1 quota/reorg/backfill acceptance or device/emulator acceptance performed in this pass.
- No independent contract reviewer engaged. No v2 merge, deployment, mainnet transactions or trading approval.
- Accidental unsafe ERC721 transfer recovery remains unresolved. No admin rescue function was added. Any future implementation must demonstrably exclude active escrow, track shared ERC1155 liabilities, and receive tests plus independent review. Absence of rescue must be disclosed to users.
- V1 implements no royalty payment. V2 reads ERC2981 at execution, rejects royalties greater than floor(gross/10) or positive royalties with zero recipient, and uses withdrawable credits. Excess royalties are rejected, not silently capped. Dynamic royalty responses can change or revert and block fills. Seller royalty/net-proceeds UI estimates remain unfinished.
- Project-wide license remains pending rights-holder intent. Existing contract SPDX and dependency permissions are not replaced or retroactively revoked. No project-level MIT/proprietary license has been published.
- Financial disclosure UI, formatting gate, complete release-manifest/feature-matrix reconciliation and a newly packaged release remain unfinished.

This is a bounded executed verification record, not a five-hour session claim or full completion claim.

## Continuation — supersedes earlier toolchain/test blockers above

Restored JDK17, Android SDK35 and Playwright Chromium. Current run:

- 234/234 engineering tests passed (includes 5 new royalty tests).
- 7/7 security tests passed, including real Redis integration; no skips.
- 6 implementation checks passed; frontend build passed.
- Full implementation browser runner, edge browser and split creator Node/Worker checks passed.
- Android prepare and 3 shell tests passed.
- Android clean-runtime build succeeded: 42 JVM tests passed; lint 0 errors/8 warnings; application and instrumentation APKs compiled. Instrumentation was NOT run.
- Added seller royalty/net-proceeds review BEFORE NFT approval for listing and offer acceptance. It reads ERC2981, mirrors execution rejection above 10%, shows recipient, gross, royalty, net, gas/withdrawal and mutable-response warnings. Failed royalty reads block the action rather than pretending zero. Listing estimates apply to the entered total quantity; later partial fills/changed royalties can differ.
- Seller order cards explain gross and royalty/net policy. A persistent per-order live royalty estimate and dedicated end-to-end wallet acceptance remain separate improvements; the fresh estimate is in the seller confirmation.
- Rebuilt APK: RIFT-v22-post-audit-preview.apk; SHA256 6a0c6696438e4b0a70ea22b10f5419e3fdb88aafd6d0aecb7baf31d5df1785a0. Same versionCode22/debug signer; distinguished from the previously distributed APK by filename/hash. ANDROID-BUILD-REPORT.json now records this exact rebuild.
- Read-only live checks: health200, hosted commit still 3ae9e3dbcaa23ed3c40f08ff943b3d1ae11e8bea, exchange trading false. No authenticated GitHub/Render credentials are set in runtime; no current connector publication path. No remote publication or deployment performed.
- adb lists no attached devices; /dev/kvm is absent. No device acceptance claim.
- All remaining contract review, hosted restore/indexer acceptance, licensing and trading approval gates stay open. No mainnet spend or contract changes beyond the explicit import.
