> **Historical baseline.** Current continuation: [HYBRID-V8-IMPLEMENTATION-REPORT.md](HYBRID-V8-IMPLEMENTATION-REPORT.md). In particular v8 unifies the web personal draft panel with native SQLite after consent; remaining native/backend/device gates are still explicit.

# RIFT hybrid v7 — file tooling increment

## Status
Implemented and locally verified Android file import/export integration on top of v6. This is a debug preview, not a production/mainnet acceptance claim. v6 reports remain historical; this report describes the v7 delta. No physical Android/emulator runtime was available in this pass. No deployment, funded wallet testing or transactions were performed. This does not complete the entire feasibility audit or claim five elapsed hours of work.

## Implemented
- AndroidX WebKit exact-origin, main-frame `RiftFiles` export-only message listener, capability detected. No addJavascriptInterface, arbitrary path, native key retrieval, RPC or signing exposed through this channel.
- Native confirmation and Android Storage Access Framework destination chooser; private bounded staging; sequential 24 KiB chunks; declared length and SHA-256 checked before destination write. Export cap 8 MiB, transfer deadline 120 seconds after staging starts, overall consent/session deadline 180 seconds.
- Shared browser/native download helper used by metadata ZIPs, layered-art ZIPs, explorer verification ZIPs, allowlist and criteria proofs, readiness report and new personal-workspace JSON file export. Native failures are awaited instead of reporting an optimistic save. Browser success only means a download was requested, not that the browser saved it.
- Native file chooser with explicit consent, data/image allowlist, provider-content URIs only, private cache copies exposed through a non-exported FileProvider restricted to imports/. Limits: 25 MiB/file; 128 MiB and 128 files retained per opened-interface instance, including earlier selections. Reopen the interface to reset this budget. No camera, broad storage access or persisted provider grants.
- Personal-workspace JSON file selection loads text for review; a separate explicit import merges it. Backup is NOT encrypted; do not share it publicly.
- Navigation cancels active transfers/selection; Activity destruction shuts down owners and queues cache cleanup; stale picker results do not attach to a different active request. WebView history state is saved only for matching origin/mode; renderer loss returns to setup and warns against blindly retrying wallet actions.
- Unsupported Android WebViews fail visibly rather than silently attempting unsupported blob downloads.

## Verification actually run
- Production frontend build and bundled Android asset-manifest generation passed (existing >500 kB chunk advisory remains).
- Existing local engineering suite: 109/109 passed before new tests were added to its command.
- Focused file/native/shell suite: 11/11 passed after final changes. Includes mocked JS bridge success, sequencing, rejection, timeout, oversize, MIME and unavailable-channel cases; JVM native network/parser harness; 24 new JVM file policy/session assertions; source-level security boundary checks; bundled asset checks.
- Full desktop Chromium implementation runner passed: implementation/layout, creator, remaining, platform/navigation, metadata, Ebisu-inspired flow and local IndexedDB workspace suites. Initial browser attempt failed because a development server occupied the runner's port; stopped that process and reran successfully. Desktop browsers do NOT validate Android SAF or Keystore.
- Android Gradle assembleDebug and lintDebug passed after final asset/source changes: 0 lint errors, 1 intentional JavaScript-enabled warning.
- APK signature verification passed using v2 debug signing. Version code 7, version name 0.5.0-hybrid-preview-debug.

Evidence: checks/v7-file-tests.log, checks/v7-engineering.log, checks/v7-implementation-browser.log, checks/v7-android-final.log, checks/v7-frontend-build.log. Reproduce via npm run android:prepare; npm run test:file-export; npm run test:native-policy (Java 17); npm run test:android-shell; npm run test:local-engineering; npm run test:browser:implementation; Gradle assembleDebug lintDebug with Android SDK 35.

## Important limits / acceptance still required
1. Test real Android document providers, selected content URIs with the WebView's content-access restriction, multiple selection, large files, cancellation, rotation, renderer/process death, background/resume and low storage. Compiled integration is not runtime proof.
2. Destination writes are not provider-atomic: a chosen destination may remain empty or partial after failure/cancellation. SHA-256 checks transport integrity, not safety of user-supplied SVG/ZIP contents. Do not open untrusted exported content as trusted code.
3. Abrupt process termination can leave private cache staging behind until Android cache cleanup; normal lifecycle cleanup is implemented. Provider reads can block the single worker; no claim of a hard OS-level read timeout.
4. Same-origin page compromise can request user-confirmed exports or read user-selected files. The channel is not permission to trust arbitrary hosted page content; independent security review is still required.
5. Current native personal settings/tools and browser IndexedDB remain distinct stores with portable backups, not a unified native/web data adapter. Direct-read native tools are not React trading or complete metadata/holdings indexing.
6. Still outstanding: full native/web capability transport; metadata/media/holdings pipeline; WorkManager checkpoints and recovery; wallet return/callback and direct-trade device acceptance; optional authenticated sync/recovery; hosted service deployment/quota validation; production signing, independent contract/security review and authorized mainnet testing.
7. No shared provider secrets embedded, no seed custody, no continuous phone-as-backend claim. External Cronos RPC, wallets and IPFS remain external dependencies. Free mint still requires creator deployment gas and collector mint gas.

## Deliverables
`RIFT-hybrid-preview-v7.apk` is the new debug build. `RIFT-hybrid-v7-complete.zip` contains current source, this report, evidence and the APK; dependencies, caches and intermediate build directories are excluded. Do not interpret preview packaging as launch approval. Use v6 only when deliberately comparing against the earlier historical baseline.
