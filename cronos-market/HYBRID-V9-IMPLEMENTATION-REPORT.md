# RIFT v9 — local-first hybrid engineering delivery

Status: engineering/debug preview. Not production, Android device acceptance, mainnet acceptance or completion of every feasibility-audit phase.

## Implemented in this pass

- Installed a narrow `RiftRead` Android bridge: exact saved origin, main-frame only, native per-request consent, known-asset allowlist, no endpoint/key exposure, arbitrary RPC, transaction send or signing. Foreground departure/navigation cancels active reads. No backend fallback.
- Shared operation deadlines and socket cancellation, bounded DNS resolver concurrency, vetted-IP HTTPS transport and strict response budgets. Endpoint hostname redacted before returning observations to web content; inspect the actual provider in native Connections.
- Create/Portfolio direct-read interface: CRO and known ERC20 balance, known ERC721/ERC1155 ownership/balance, token URI, receipts and local observations. Historical data is labelled, not represented as current. No comprehensive holdings discovery.
- Strict bounded ABI URI decoding and inert, bounded embedded JSON metadata decoding. External HTTP/IPFS metadata and artwork are references only, not fetched or executed.
- Bounded app-private observation storage: 64 profiles, 50 records per category/profile, bounded report/output sizes. Profile labels are namespaces, not proof of wallet ownership. SQLite is app-private, not database-level encrypted.
- Explicitly opt-in WorkManager receipt observations: 20 targets, at most 96 attempts/48 hours, minimum 15-minute scheduling, three targets per invocation, 30-second read deadline and bounded retry backoff. Claim/checkpoint protections and enable/list/pause/resume/remove controls. Settings changes pause work. No credentials in WorkManager inputs or portable backups. Stops at RPC-reported inclusion, **not irreversible finality**. Android may delay/stop work; it is not an always-on backend.
- Existing transaction journal now has manual native-primary receipt reconciliation. Validates fresh chain/hash/from/block/status; denial/error halts further prompts in that check. No resend/signing, nonce discovery or automatic browser/native journal migration. A previously included receipt that disappears becomes reorg-uncertain.
- More malformed native-channel handling, metadata/receipt tests, browser coverage and CI checks. Version 9 / 0.7.0-hybrid-preview, WorkManager 2.10.0.

## Executed verification

| Check | Result | Boundary |
|---|---|---|
| Engineering | 141 passed, zero skipped | Local automated suite |
| Implementation | 6 passed | Local |
| Redis security | 7 passed, zero skipped | Real isolated local Redis |
| Contracts | 40 passed | Local Hardhat, no mainnet spending |
| Native shell/policies/export/read checks | 15 passed | JVM/static, not Android runtime |
| Full implementation browser runner | Passed | Native channels mocked, not Android |
| Real Worker/D1 browser | Passed | Local environment |
| Bundled offline browser | Passed | Desktop browser, not WebView |
| Public pinned TLS transport | Passed chain 25 | JVM, public read-only endpoint |
| Android assembleDebug + test APK + lint | Passed, 24s / 69 tasks | Eight instrumentation tests **compiled only** |
| Android lint | Zero errors, one JavaScript-enabled warning | Reviewed attack surface remains |
| App/test APK signatures | v2 verified | Disposable debug keys |
| Device preflight | Blocked: no authorized device/emulator | No runtime acceptance claimed |

Evidence: `checks/v9-*.log`, browser JSON reports and `ANDROID-BUILD-REPORT.json`. Tool/runtime timestamps may differ from the conversation date; they are execution-environment records, not asserted calendar proof.

## Not completed / release gates

Real Android WebView consent, lifecycle, SQLite, Keystore, SAF, WorkManager scheduling/recovery and wallet testing; provider behavior across real IPv4/IPv6/NAT64 devices; release signing; independent security review; deployment credentials/services; complete marketplace discovery/indexing; live wallet transaction bridge; external metadata/media loading policy; automatic encrypted sync and legal/license clearance. Source publication candidate is not permission to publish third-party materials. No seed custody/platform provider keys introduced. Mainnet readiness has not been established.

## Deliverables

`RIFT-hybrid-preview-v9.apk`, `RIFT-native-tests-v9.apk`, `RIFT-hybrid-v9-complete.zip`, `RIFT-hybrid-v9-source-candidate.zip`. Read `PACKAGE-START-HERE.md` and `ANDROID-V9-DEVICE-ACCEPTANCE.md`.

To preserve workspace retention, 15 older generated ZIP/APK artifacts are now stored byte-exactly in `RIFT-previous-builds-history.zip`. Original hashes and restoration instructions are in `RIFT-history-inventory.json` and `restore-rift-history.py` beside the project. All 15 reconstructions were verified before duplicate originals were removed. This is archival preservation, not approval of historical builds.
