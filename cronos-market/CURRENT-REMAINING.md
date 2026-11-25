# Remaining work — current consolidated status

## Delivery and runtime gates

- Publish latest consolidated source to the existing repository and deploy matching backend to the existing Render service. Runtime has no authenticated publication credentials; do not claim this happened.
- Verify deployed workspace export/deletion/account isolation, restart persistence and independent backup/restore/recovery. Local tests are not hosted acceptance.
- Current matched Android/source packaging is addressed through v28; preserve signing identity and rebuild after any subsequent native changes. Old APKs must not be credited with newer source fixes.
- Real supported-device/emulator acceptance: SQLite, Keystore, native file export/import, wallet QR/deep links, app switching, cancellation, process death and recovery. Browser mocks/JVM tests/instrumentation compilation do not satisfy this gate.
- Real WalletConnect relay/project/origin/quota acceptance; no borrowed project ID or unlimited free-plan promise.

## Marketplace/contracts

- Independent review of v1/v2 and accidental unsafe-transfer recovery policy. No admin rescue mechanism was added. Source compilation/tests are not an independent audit.
- Exact approved mainnet deployment/runtime/index and end-to-end buyer/seller/royalty/refund/withdrawal acceptance before activating trading. No authorization to exceed cumulative1 CRO testing cap; no mainnet spend in current batches.
- Per-venue supported external marketplace order APIs/contracts/terms and safe execution adapters; direct purchases from other venues are NOT implemented as a universal feature.
- Hosted indexing/backfill/reorg/throughput/quota/CPU acceptance; broader Node/edge parity, complete collection/wallet coverage and external-order aggregation remain unfinished. Local Node/D1 restart and parity evidence does not certify providers.
- Auctions and other advanced roadmap items beyond current funded-offer/listing workflows remain separate.

## Launchpad/data/wallet features

- Real end-to-end launch/mint/register/verify acceptance and provider/storage quota/retention acceptance. No new collection launch is needed/authorized simply to imitate ULTRA CAT/Six Seven.
- Full provider integrations, creator operations breadth, multilayer builder, automatic verification refresh and external marketplace discovery integration remain incomplete. IPFS permanence and third-party discovery are not guaranteed.
- Native transaction signer remains disabled/unapproved; authenticated encrypted automatic sync and full wallet-wide NFT discovery remain incomplete.
- Broader provider diagnostics, manual/global connection-control integration, rate-limit jitter/backoff and supported-environment matrix need further work.

## Legal/release

- Rights-holder decision and review before publishing project-wide license. No project MIT/proprietary license has been inferred. Existing SPDX/dependency rights retain scope.
- Keep feature matrix, build report, release manifest and test artifacts synchronized with exact release snapshots. Current local changes must not be attributed to older APKs.

## Latest executed evidence

289 engineering tests,7 security including Redis, frontend build and complete implementation browser suite passed in the transaction-export batch. Most recent contract suite64 passes was in the preceding submission-uncertainty batch, not rerun for export-only changes. No hosted deployment, independent review, physical-device acceptance, external-marketplace trade or mainnet spend has been established by these results.

## V24 update

A matched v24 app/test APK bundle is now built from current source; the earlier post-v23 rebuild packaging gap is addressed for this snapshot. Exact current local evidence:293 engineering,3 Android shell,42 JVM tests,frontend/Android builds,lint0 errors/8 warnings. Four new Keystore tests bring compiled native suite to19; none executed. Strict result parser prevents skips/count mismatches being marked a complete instrumentation pass. No device/cloud authorization/runtime acceptance; item3 remains incomplete. Prior browser/security/contract results were not rerun in this batch. See ANDROID-CLOUD-ACCEPTANCE.md and RELEASE-V24.md.

## V25 update — export failure isolation

Export staging now closes and becomes terminal after partial-write, flush, close, checksum or timeout faults. A new real JVM fault-stream harness passed 55 assertions. Current full engineering suite:297 passes; Android shell:3 passes; Android JVM:42 passes; frontend and Android build passed. Exact signatures/assets/lint and source/APK hashes are recorded in ANDROID-BUILD-REPORT.json and the v25 delivery reports. No real document provider, device/cloud execution, biometric policy, process death or WalletConnect acceptance has occurred. Browser/security/contracts were not rerun this batch.

## V26 update — read resilience and cancellable launch reads

Implemented per-transport exponential cooldown/jitter and bounded Retry-After, active fetch cancellation on pause/reset, stale probe isolation and URL-free diagnostic API. Launch collection reads now support UI cancellation, address/provider/unmount invalidation, no post-cancel fallback or late publication, and stop queued fields after failure. Terminal contract errors do not trigger whole-snapshot fallback.

Current verification:308 engineering tests,7 security tests including real Redis,64 local simulated contract tests,3 Android shell checks,42 Android JVM tests; frontend/Android builds and full implementation browser suite passed. All21 APK asset hashes and preserved signing identity verified in release evidence.19 native tests remain compiled/0 executed. Diagnostics are an API, not a global dashboard; cooldown is per transport, not shared across separately created launch loads or all app tools. Broad provider controls/coordination and real provider quota acceptance remain open. No deployment, paid provisioning or mainnet spend.

## V27 update — autonomous work across items1–5

Exact installed app/test hash/version/runner binding now gates device instrumentation; mocked CLI integration and pure policy checks pass, while real instrumentation remains19 compiled/0 executed. WalletConnect clears authorization on malformed chain events, rejects mismatched chain namespaces and disallows unsupported relay methods. Local SQLite backup/restore validates bounded staged bytes/schema before fresh-path publication; IndexStore main-file permissions are0600. Two real SIGKILL/WAL recovery drills verified committed survival, uncommitted rollback and independent restored application state on disposable local data. These are not Android or hosted recovery.

Current full verification:326 engineering,7 security with Redis,64 simulated contracts,6 implementation checks,3 Android shell,42 Android JVM,full controlled-browser suite and frontend/Android builds passed. Both public default Cronos endpoints returned chain25 and block numbers in a single read-only observation; this does not establish provider quotas/availability guarantees. Exact APK signatures/assets/lint evidence is in ANDROID-BUILD-REPORT.json. Device availability remains blocked/no attached device. No new account, paid resource, deployment, native signing approval or mainnet spend; licensing remains undecided. Full item1–5 runtime/security/integration acceptance gates remain open as listed above.

## Ranking reliability update (Android stays v27)

Shared Node/edge bounded page acquisition, exact ranking input validation, deterministic deduplication/metadata choice, conflicting-metric rejection, unknown-not-zero output and source acquisition diagnostics are implemented. Added16 ranking tests plus1 Node/edge parity/stale-retention test. Current343engineering/7security(with Redis)/6implementation/full controlled-browser/frontend-build PASS. One live Minted-only observation returned135 union collections (100all-time/51positive-weekly); this is not network-wide coverage or provider quota/uptime acceptance. Backend changes are NOT deployed. No new Android build, device execution or contracts rerun in this batch; v27 Android and64contract evidence remain historical. New release source includes server/shared/edge changes beyond the v27 snapshot. See RELEASE-RANKING-RELIABILITY.md and RANKING-UPDATE-REPORT.json. All item1–5 runtime/integration/review gates remain; licensing undecided.

## Node directory refresh coordination update (Android stays v27)

Implemented shared in-flight refreshes, bounded jittered negative caching, detached responses, seven-day stale retention, private diagnostics, saved-directory schema/rank validation and bounded atomic JSON replacement. Node /api/collections emits503with Retry-After when no usable snapshot exists. Successful live data is not falsely marked stale on save failure. Scope is one directory resource per Node process, not all providers/replicas or edge networking.15new regressions; current358engineering/7security(with Redis)/6implementation/full controlled-browser/frontend build PASS. Android/contracts not rerun; unchanged v27 APKs remain historical artifacts. No deployment, paid resources, device execution or CRO spend. Broader provider integration, real-device/hosted/security-review/feature gates and licensing remain open. See RELEASE-REFRESH-COORDINATION.md and REFRESH-UPDATE-REPORT.json.

## V28 update — comparison resilience and stale/gap presentation

Node comparison now uses per-process coordinated refresh/cooldown, validated stale fallback and atomic bounded persistence; venue reads cap rows/body sizes and validate bindings/metrics. New frontend status marks whole comparisons stale, and null history samples produce a gap notice instead of a fabricated continuous chart. Nine new Node scenarios and a mobile stale/fresh/gap browser scenario pass. Current367engineering/7security(with Redis)/64simulated contracts/6implementation/3Android shell/42JVM/full controlled-browser/frontend and Android build PASS; signatures and21asset hashes verified; lint0errors8warnings. Matched v28 APK/source packaging supersedes v27 and the backend-only supplemental kits. Native19compiled/0executed, no device attached. A single read-only provider observation showed139venue collections/43Minted matches/110histories with gaps, not network coverage/quota/trading acceptance. Node resource scope is per process, not all providers/replicas; edge cache/lease remains unchanged. No deployment, paid provisioning, native signing approval or mainnet spend. Remaining item1–5 runtime/hosted/review/integration gates remain open; license undecided.
# Bounded venue cache update (backend supplement to v28)

Completed per-collection Node venue-cache coordination: same-address request sharing, maximum three active distinct reads, bounded LRU records and bytes, detached validated results, exponential per-address failure cooldown with jitter, two-minute freshness and one-hour stale retention. HTTP failure responses include bounded Retry-After hints; error responses and diagnostics omit provider details and addresses. Normalized snapshots validate chain/address/venue bindings, unknown metrics and safe URLs. Numeric precision and transport-size limits fail closed.

Validation: 378 engineering tests, 7 security tests with isolated real Redis, 6 implementation tests, complete controlled-browser suite and frontend build passed. Fourteen focused venue tests are included in engineering results. Shared normalization is exercised through existing Node/edge parity regressions. A single read-only live venue observation confirmed two concurrent same-address reads plus a later cached read used one upstream request. This is not quota, uptime or coverage acceptance.

No UI source change. Included Android app/test APKs are unchanged v28 historical artifacts, not newly built or device-tested for this backend supplement. Prior 64 contract/42 JVM/3 shell/19 compiled-native evidence is historical; native execution remains zero. No deployment, transactions, paid provisioning or native signing approval.

Limits: cache/cooldown scope is one Node process; negative records may be evicted; not distributed throttling, persistent storage, global provider coordination or edge networking replacement. Hardware acceptance, owned WalletConnect pairing, hosted persistence and independent restore, independent trading review and approved mainnet acceptance, broader feature integrations and licensing remain open.
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


# RIFT v30 — mobile wallet pairing actions and bounded diagnostic

## Completed
- Added an explicit Open mobile wallet link to the pairing panel. Only bounded WalletConnect v2 URIs with an irn relay, valid topic/key, unique known fields and nonexpired supplied expiry can become external links. No automatic wallet launch. The URI is not sent to a redirector or analytics endpoint.
- Clipboard handling now catches missing API, synchronous failures and denied writes without exposing pairing data in errors. Added privacy guidance and return-to-RIFT/fallback instructions.
- Four new unit regressions cover URI validation, duplicate/injected fields, expiry, clipboard failure and exact single-copy behavior.
- Added opt-in scripts/probe-reown-pairing.mjs --live-relay. This loads local built files in a disposable browser under an intercepted production origin, blocks backend calls, initiates pairing with the actual SDK and then cancels. No installed wallet is activated; no signatures or transactions. No profiles, QR images, pairing URIs, socket payloads or keys persisted in evidence.
- Built versionCode30 / 0.28.0-wallet-pairing-preview-debug, io.rift.cronos.preview. Prior signer preserved. Includes v29 public Reown configuration and earlier backend reliability changes.

## Observation — important distinction
The isolated browser observed a generated pairing URI/QR, validated mobile link, and cancellation with no saved wallet identity. A relay WebSocket was observed, but no relay subscription acknowledgement was observed in the bounded diagnostic (no request methods recorded). Generating a QR alone does NOT establish relay authorization. Project/origin authorization remains unverified, as do real wallet approval, deep-link opening, app-switch return and restored sessions. Production HTTPS origin was intercepted to serve local files: this is NOT testing deployed Render content. Owner-reported Reown allowlist change remains owner-reported.

## Current validation
384 engineering tests, 7 security tests with real isolated Redis, 6 implementation checks, complete controlled-browser implementation suite, frontend build, 3 Android shell tests, 42 JVM tests, Android app/test builds and lint passed. Lint: zero errors/eight warnings. All21 bundled asset hashes matched APK content; eight final device-artifact tooling tests passed. New link presence checked in the real SDK initiation diagnostic and built APK. Link was NOT activated. Historical64 contract tests from v28 were not rerun.

## Remaining categories 1–5
1. No authorized Android device attached.19native instrumentation tests compiled, zero executed. Biometrics/vault authentication, SAF, process death, external wallet launch and return remain unaccepted.
2. Owned public project ID configured, allowlist owner-reported; real relay subscription, QR wallet approval/deep-link/app-switch/reconnect acceptance still required.
3. No deployment/publication this batch. Hosted external database runtime configuration, persistence and independent off-host restore remain open. Filebin is temporary distribution, not durable backup.
4. Independent trading security review and explicitly approved mainnet acceptance remain open; native signing disabled/unapproved. No spending or approvals.
5. Bounded per-process provider/cache coordination and creator/discovery/sync features exist, but global distributed throttling, broad external venue coverage and end-to-end storage/mint/verification/encrypted-sync integration acceptance are not complete. No new collection launch.
Licensing remains undecided.

## Delivery / safety
Full clean source, app/test APKs, report and evidence included. No wallet credentials, signing keys, local environment files, runtime databases or pairing secrets included. No deployment, paid provisioning, native signing approval or mainnet transactions. See ANDROID-BUILD-REPORT.json for hashes and exact evidence scope.


# Hosting guard and owner handoff — backend supplement to v30

Implemented a hidden/private path guard before Node plugins, static files and SPA fallback, including encoded path handling, malformed encodings and control characters. Hidden requests return no-store JSON404; malformed encodings400. Ordinary routes, dotted assets and root .well-known files remain routable. Four new regressions.

Current388engineering/7security(real isolated Redis)/6implementation/full controlled-browser suite PASS. First engineering attempt used the sandbox default old javac and failed two JVM harness compilations (HexFormat unavailable); reran the entire engineering/implementation/browser chain with the project JDK17 and all passed. No frontend/Android source changed in this supplement; included v30 app/test APKs are unchanged and retain historical v30 build/signature/assets/JVM/lint evidence. No new APK build or native execution claim.

Improved opt-in pairing probe with privacy-safe CDP handshake statuses/error codes. Current observed relay HTTP101 handshake, generated QR/validated mobile link, successful cancellation/no saved identity; no recorded relay request methods/subscription acknowledgement. This is NOT full project authorization, wallet approval or deployed-site acceptance. No pairing secrets retained.

Hosted read-only warm follow-up:5of6smoke checks PASS; private-path404check fails because hosted /.env returns the ordinary406-byte application shell. Response classified as HTML with asset references, not environment assignments. Not evidence of exposed credentials. New guard is source-only, NOT deployed. Initial transient failures/timeouts were not reproduced in the warm follow-up; no uptime claim. One inspected deployed entry bundle did not contain the new project ID/mobile-link label, a limited observation rather than exact release identity.

Owner checklist included as YOUR-NEXT-STEPS.md: install/test unchanged v30 on disposable device with EMPTY external wallet; report model/Android/wallet versions and connection/return/disconnect outcomes; send redacted current Render Build & Deploy settings before manual publish guidance; confirm intended existing free external database. GitHub/Render connector lookups returned unsupported, so no supported authenticated publish path through these integrations here. No request to paste tokens/seeds/private keys. No merge/deploy of unreviewed v2 trading.

Remaining:19native tests compiled0executed, real-device authentication/biometric/SAF/process-death, actual wallet pairing/deep-link/app-switch, hosted deployment/persistence/independent backup restore, independent trading review and approved mainnet acceptance, broader feature integrations/distributed provider coordination, licensing. No deployment, paid provisioning, CRO spend or native-signing approval.
