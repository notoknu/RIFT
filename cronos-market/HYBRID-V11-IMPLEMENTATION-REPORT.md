# RIFT hybrid v11 — consented IPFS JSON and wallet-pairing recovery

**Engineering debug preview, versionCode 11 / 0.9.0-hybrid-preview. Not production/mainnet/device-approved.** This report describes completed work, not five elapsed hours or completion of every remaining audit phase. v10 is the prior packaged baseline.

## Implemented

### Explicit external JSON inspection

Create/Portfolio native-read panel now offers a separate **Inspect IPFS JSON via native gateway** action after a supported token URI has been read. Reading the URI alone never fetches its contents. The native confirmation identifies the exact public gateway/path and privacy tradeoff.

- Only `ipfs://` references and exact `https://ipfs.io/ipfs/` paths; one fixed HTTPS gateway. No arbitrary-host proxy, IPNS, arbitrary HTTPS, credentials, explicit ports, queries, fragments, traversal, encoded path segments or empty segments.
- Conservative CID syntax and bounded path checks in both JavaScript and native policy. **CID syntax is not independent content-integrity verification.** Gateway responses remain untrusted.
- Dedicated credential-free GET over vetted public IP/TLS transport with bounded DNS, shared cancellation/deadline, no cookies/referrer/authorization, compression or redirects.
- Strict JSON Content-Type, at most **64 KiB**, fatal UTF-8 decoding, bounded JSON depth (16), object-only response. Denial/errors never substitute a backend response or stale success.
- JSON fields are displayed as escaped text with filtered metadata inspection. No external artwork, HTML, SVG, animation, iframe or secondary resource is fetched or executed. No remote metadata cache/sync was added; the response is transient UI state, not a personal-workspace backup.
- Offline mode still blocks network inspection; every actual external fetch needs its own native consent. Public gateway availability/rate limits are outside app control.

### WalletConnect lifecycle hardening

Cancelled pairing is quarantined until the original attempt settles and any late-approved session is disconnected. An overlapping new pairing is refused instead of risking late cleanup disconnecting a new session. Accounts and signing requests are blocked through a quarantined adapter. Pairing errors—including synchronous provider throws—clear pending state for a later explicit attempt. Restored account strings and application origins receive stricter validation. Late pairing URIs are suppressed after cancellation.

These are adapter-level safeguards and mocked lifecycle tests, **not real wallet/deep-link/device acceptance**. A provider that never settles can keep the adapter quarantined; do not interpret it as a connected/usable session or start a value action. Actual wallet recovery remains a runtime gate.

### Artifact preservation

The byte-exact history tool now supports verified atomic extension. All **23 previous ZIP/APK artifacts**, including v9/v10, are preserved in `RIFT-previous-builds-history.zip`; duplicate standalone originals were removed only after all reconstructions passed. Root inventory and restoration script retain original filenames, sizes and SHA-256 hashes. This saves retention space, not approval of historical builds.

## Executed verification

| Check | Result | Boundary |
|---|---|---|
| Engineering | **154 passed, 0 skipped** | Local suite, including new metadata and pairing tests |
| Implementation | **6 passed** | Local |
| Redis security | **7 passed, 0 skipped** | Real isolated local Redis |
| Contracts | **40 passed** | Local Hardhat; no mainnet transactions |
| Complete implementation browser runner | Passed | Native transport mocked; real browser persistence/rendering |
| External metadata browser flow | Passed | Separate explicit action, normalized payload, inactive image/animation references; mocked native gateway |
| Worker/D1 and bundled-offline browsers | Passed | Local/desktop, not Android |
| Fresh extracted source | Actual `npm ci`, **154 engineering tests**, frontend build passed | Separate dependency tree, no symlinked reuse |
| Public pinned TLS transport | Cronos chainId 25 passed | Read-only JVM probe, not Android |
| Android app/test APK + lint | Passed; final run **21s / 69 tasks**, zero errors, one JavaScript-enabled warning | **Ten instrumentation tests compile only** |
| App and test signatures | v2 verified | Disposable debug key |
| npm audit | Zero vulnerabilities reported at execution | Not independent security certification |
| Source heuristic audit | No findings; LICENSE absent | Not rights/secret approval |
| Device availability | **Blocked: no authorized Android device/emulator** | No runtime acceptance claimed |

Evidence: `checks/v11-verification.json`, `checks/v11-verify-*.log`, `checks/v11-metadata-tests.log`, `checks/v11-clean-*.log`, `checks/v11-clean-tested-code.json`, browser JSON, signature/audit/probe logs. Final source package implementation files are compared with the clean-tested code hashes; report/document changes are separate. Runtime timestamps reflect the execution environment and may differ from conversation-date context.

## Deliverables

- `RIFT-hybrid-preview-v11.apk`: user-facing debug preview, offline by default.
- `RIFT-native-tests-v11.apk`: developer instrumentation APK, compiled but not executed here.
- `RIFT-hybrid-v11-complete.zip`: source, built assets, APKs and evidence.
- `RIFT-hybrid-v11-source-candidate.zip`: lean source/tests/config, not a publication license.
- `RIFT-hybrid-v11-package-checksums.json`: independently verified manifests, code comparison and artifact hashes.

## Still open

Full holdings discovery/index completeness, external artwork/media safety/rendering, independent IPFS content verification, authenticated conflict-aware encrypted automatic sync, full wallet/deep-link/account/chain/process-death acceptance, actual Android networking/Keystore/SQLite/SAF/WorkManager behavior, production hosting/signing and independent contract/security/legal review. See `REMAINING-RELEASE-GATES.md` and `ANDROID-V11-DEVICE-ACCEPTANCE.md`.

No provider keys, seeds, fake collections or automatic transactions were introduced. Zero platform fee/free mint does not waive Cronos gas or external-service/retention requirements. This is a substantive additional engineering pass, not a declaration that all remaining work is finished.
