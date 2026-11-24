# RIFT hybrid v10 — engineering delivery

**Version 10 / 0.8.0-hybrid-preview. Debug build, not production/mainnet/device-approved.** This report records actual completed work, not a claim of five elapsed hours or completion of every audit phase. v9 remains the prior packaged baseline.

## New implementation

### Local known-asset candidates

- Separate origin-local IndexedDB hint store: at most 64 profiles, 200 candidates/profile; ERC20, ERC721 and ERC1155 with full uint256 token IDs.
- Atomic merged import, normalized deduplication by standard/contract/token, bounded 128 KiB JSON, strict chain/profile/field validation, no credentials or arbitrary metadata fields.
- Create/Portfolio native-read panel: save/select/remove/export/import candidate hints. Selection only prefills fields; it does not send RPC, sign or schedule a watch. Labels render as text.
- Explicit coverage/privacy/recovery warnings: candidates are not verified ownership, full discovery, native personal-backup contents or encrypted sync. They remain separate from native SQLite and browser transaction journals.

### Background receipt controls

- Default WorkManager constraint is now unmetered network only. Metered use requires explicitly saving the alternative native policy, then explicitly enabling/resuming checks.
- Policy changes pause scheduling and invalidate old generations. The policy governs background receipt work, not foreground reads/web traffic. Android determines metered status; execution remains best-effort, not guaranteed.
- Checkpoint insertion now rejects SQLite insertion failure rather than silently implying success.
- Two more isolated Android SQLite tests cover reopen/claim-lease/stale completion and clock rollback/profile-clear isolation. **Ten instrumentation tests compile; none have run on Android here.**

### Repeatable verification

`npm run verify:hybrid -- --browsers --android` runs serial, bounded checks and writes versioned logs/JSON. Missing Redis/browser/Android options are explicitly not-run, and device absence is blocked rather than passed. No installs, instrumentation execution, deployment, signing or transactions. Every report has `releaseAccepted:false`.

Fresh source reproducibility was also checked separately: extract the source candidate, perform **actual `npm ci`**, run all engineering tests and build the frontend. No symlinked/reused installed dependency tree. Only later report/document edits differ from that preliminary extraction; final source/manifest verification confirms the tested implementation files remain identical.

## Executed results

| Check | Result |
|---|---|
| Engineering | **147 passed, 0 skipped** |
| Implementation | **6 passed** |
| Real isolated local Redis security | **7 passed, 0 skipped** |
| Local Hardhat contracts | **40 passed**, no mainnet spending |
| Complete implementation browser runner | Passed, including real IndexedDB candidate persistence/removal, sparse ID selection, inert labels and no automatic read |
| Worker/D1 + offline bundled browsers | Passed locally |
| Fresh extracted source install/tests/build | Passed actual npm ci, 147 tests and build |
| Native targeted final tests | Passed JVM/static boundaries; not Android runtime |
| Android final app/test APK/lint | **22 seconds, 69 tasks; 0 errors, 1 JavaScript-enabled warning** |
| App and test APK | v2 signatures verified; disposable debug certificate |
| npm audit | 0 vulnerabilities reported at execution; not an independent audit |
| Source heuristic audit | No findings; **LICENSE remains absent** |
| Device availability | **Blocked**: no authorized device/emulator; no `/dev/kvm` |

Evidence: `checks/v10-verification.json`, `checks/v10-verify-*.log`, `checks/v10-android-final.log`, `checks/v10-native-final.log`, `checks/v10-clean-*.log`, dependency audit and signature reports. Runtime timestamps can differ from conversation-date context; they are execution-environment records.

## Important remaining scope

See **REMAINING-RELEASE-GATES.md** for engineering still open versus work requiring access/owner decisions. This pass does not deliver exhaustive holdings discovery, external artwork loading, native-independent live trading/wallet lifecycle, automatic encrypted sync, production hosting/signing, legal approval or independent security review. Earlier native known-asset reads, manual receipt reconciliation and bounded background observations remain engineering features requiring actual Android acceptance.

No provider secrets, seed custody, native transaction-signing API or fake collections were added. Zero platform fee/free mint still requires applicable Cronos gas and external-service/retention resources.

## Files

- `RIFT-hybrid-preview-v10.apk` — user-facing debug preview.
- `RIFT-native-tests-v10.apk` — compiled instrumentation package for developers.
- `RIFT-hybrid-v10-complete.zip` — source, built assets, app/test APKs and evidence.
- `RIFT-hybrid-v10-source-candidate.zip` — lean source/tests/config, no dependencies/runtime databases/build outputs.
- `RIFT-hybrid-v10-package-checksums.json` — independently verified hashes/manifest counts.

Older v9 packages remain separately available; v6–v8 and other earlier generated artifacts remain in the verified byte-exact history archive with restoration script/inventory beside the project.
