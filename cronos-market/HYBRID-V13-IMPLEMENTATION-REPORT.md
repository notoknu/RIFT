# RIFT hybrid v13 — contract-scoped transfer discovery

**Engineering/debug preview, versionCode 13 / 0.11.0-hybrid-preview. Not device, production or mainnet accepted.** This is actual additional implementation, not a claim of five elapsed hours or completion of every remaining phase.

## Implemented

### Bounded ERC721/ERC1155 discovery pages

Create/Portfolio now has a native-consented **Contract transfer-log discovery** panel, using the selected public owner, known contract and NFT standard. A starting block may be an explicit safe decimal or `recent`; spans are 1–2000 blocks.

- Native construction of owner/direction/event filters, not a generic RPC/filter proxy. Two log queries cover incoming and outgoing ERC721 Transfer or ERC1155 TransferSingle/TransferBatch events.
- Full uint256 token IDs, canonical address topics, strict single/batch ABI decoding, up to 128 IDs per batch. ERC20-shaped Transfer and zero-quantity multi-token events do not produce NFT hints.
- At most 512 combined log responses / 200 distinct token IDs. Oversized, malformed, removed, wrong-contract, wrong-owner and out-of-range logs reject the page rather than silently returning partial progress.
- Rechecks the page-end block hash after both queries; conflicting duplicate logs and observed anchor changes reject the page. Self-transfers deduplicate. This is an endpoint-consistency check, not proof of provider honesty, canonical history or finality.
- Six RPC calls for a successful page (chain, head, two anchors, two log queries), subject to the existing shared request deadline, cancellation, public-IP/TLS and 30-calls/minute budget. No automatic backup-provider fallback.
- Explicit next-page and overlapping-recheck controls; no automatic continuation. Results include source/time, requested/resolved range, provider head, end hash and coverage warnings.
- A separate **Save page hints locally** action merges validated candidates atomically into the selected profile's IndexedDB store. It makes no additional RPC request and does not assert current ownership. The existing candidate list refreshes after a successful save. Selecting a saved hint still makes no network request.

**Crucial scope:** these are tokens touched by transfers, including tokens sent away. They are NOT current holdings, complete wallet discovery, exhaustive history, contract standard certification or collection authenticity. Providers may omit/truncate history without detectable errors. Empty results do not prove an empty wallet. Discovery controls are transient; there is no verified persistent cross-page checkpoint, global contract discovery or background scan. Current ownership must be checked separately before any dependent action.

### Executable native-helper JVM tests

Added a real Gradle JVM test suite with `org.json`, separate from Android instrumentation. Seven tests execute the native scan helper against a fake RPC: exact scopes/filters, recent-window/head clipping, ERC1155 operator-topic placement, removed/wrong-owner/wrong-contract/out-of-range logs, reorg/wrong chain, duplicate conflicts, log and candidate caps.

`testDebugUnitTest` now runs in the Android verification command and prepared CI workflow. JUnit/JSON dependencies are test-only. Hosted CI has not been executed here. Twelve existing Android instrumentation tests remain compiled but unexecuted.

## Executed verification

| Check | Result | Boundary |
|---|---|---|
| Engineering | **162 passed, zero skipped** | Local suite |
| Native-helper Gradle JVM | **7 passed, zero skipped** | Actual helper/JSON execution; fake RPC, not Android runtime |
| Implementation | **6 passed** | Local |
| Redis security | **7 passed, zero skipped** | Real isolated local Redis |
| Contracts | **40 passed** | Local Hardhat; no transactions on mainnet |
| Full implementation browser runner | Passed | Real IndexedDB/UI; native transport mocked |
| Discovery browser flow | Passed | Explicit scan, sparse IDs, next/overlap, separate hint save with no RPC, list refresh |
| Worker/D1 + offline bundled browsers | Passed | Local/desktop |
| Fresh final source extraction | Actual `npm ci`, **162 tests**, frontend build and **7 Gradle JVM tests** passed | Separate npm dependency tree; existing JDK/SDK/Gradle dependency cache reused |
| Public Cronos discovery probe | Passed chain 25, real filters/anchors over three recent blocks; **0 logs / 0 candidates** | Read-only JVM transport; proves no holdings or completeness claim |
| Android build/unit tests/test APK/lint | **29 seconds / 73 tasks**, zero errors, one JavaScript-enabled warning | **12 instrumentation tests compile only** |
| App/test APK signatures | v2 verified | Disposable debug certificate |
| npm audit | Zero vulnerabilities reported at execution | Not independent security review |
| Source heuristic audit | No findings; LICENSE absent | Not secret/rights approval |
| Device availability | **Blocked**: no authorized device/emulator | No Android acceptance claim |

Public probe used a public contract address from the existing local ecosystem catalog and the public burn address, not a user's wallet. It exercised real provider transport/filters with no credential or transaction; the empty page does not demonstrate positive asset discovery. Evidence: `checks/v13-public-discovery-probe.log`.

Other evidence: `checks/v13-verification.json`, `checks/v13-verify-*.log`, `checks/v13-native-jvm-tests.xml`, `checks/v13-clean-*.log`, `checks/v13-clean-native-jvm-tests.xml`, tested-code hashes and browser/signature/audit reports. Runtime timestamps reflect the execution environment, not asserted calendar proof.

## Packaging and retention

- `RIFT-hybrid-preview-v13.apk`: user-facing engineering debug preview.
- `RIFT-native-tests-v13.apk`: compiled developer instrumentation package.
- `RIFT-hybrid-v13-complete.zip`: source, built frontend/native assets, APKs and current evidence.
- `RIFT-hybrid-v13-source-candidate.zip`: lean source/config/tests, not publication permission.
- `RIFT-hybrid-v13-package-checksums.json`: independently checked file manifests, clean-tested implementation hashes and APK identity.

All **31 older generated ZIP/APK artifacts**, including v12, are preserved byte-exactly in the history archive. Every reconstruction was verified before duplicate originals were removed. Nine duplicate historical screenshots were likewise compared byte-for-byte with archived v12 contents before deduplication; user data was not removed. Regenerable Hardhat/Gradle project caches were cleared to stay within workspace retention. See `checks/v13-retention-cleanup.json` and the root history inventory/restore script.

## Still open — not all assistant-side work is finished

Wallet-wide contract/holdings discovery and completeness; persistent reorg-aware multi-page indexing; authenticated conflict-aware automatic encrypted sync; broader media/cache and UnixFS/DAG integrity; full wallet/deep-link/account/chain/process-death integration; real Android networking/codecs/SQLite/Keystore/SAF/WorkManager acceptance; production deployment/signing; independent contract/security/legal review. Sync is **not** implemented by this pass—manual encrypted backups and candidate imports must not be represented as automatic synchronization.

See `REMAINING-RELEASE-GATES.md` and `ANDROID-V13-DEVICE-ACCEPTANCE.md`. No seed custody, platform/provider secrets, fake marketplace assets or automatic transactions were added. Zero platform fee/free mint does not waive Cronos gas or external-service/retention requirements.
