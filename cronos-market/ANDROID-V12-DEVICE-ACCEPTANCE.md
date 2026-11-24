# RIFT v12 — Android runtime acceptance (not yet executed here)

The v12 APK is a debug preview, offline by default, Android 8/API 26+. Do not test it with valuable wallets, production provider tokens or irreplaceable drafts. Compilation, JVM tests and desktop browser tests are not Android acceptance.

## 1. Install and open

- Install `RIFT-hybrid-preview-v12.apk` on a disposable Android device/emulator. If an older preview cannot be updated because its debug certificate differs, export needed personal data before uninstalling; uninstalling erases private data.
- Keep Android System WebView current. Leave mode Offline for local draft/backup tests.
- Open the bundled interface, then Create → Device drafts. The first native workspace request prompts for consent for the current origin and profile. Read it before allowing. Access is per opened page/profile, not proof of wallet ownership. Denying must NOT silently create browser drafts.
- Native settings/tools remain accessible from Connections & local tools. In v12, the web draft panel uses that native SQLite store after consent. Old IndexedDB drafts are not auto-migrated; use matching-profile portable JSON on the old browser/app to move them deliberately.

## 2. Automated native SQLite tests

These twelve tests were written and their test APK compiled here, but they have NOT been executed on Android. They use a unique prefixed temporary database, never the user's actual workspace, and make no wallet/network requests.

With Node 22, Java 17, Android SDK 35 and a connected disposable device:

```sh
npm ci
npm run android:prepare
cd android
./gradlew assembleDebug assembleDebugAndroidTest
./gradlew connectedDebugAndroidTest
```

Windows: use `gradlew.bat` rather than `./gradlew`. In Android Studio you can run the `WorkspaceInstrumentedTest` class under `app/src/androidTest`.

Alternatively install both prepared APKs manually:

```sh
adb install -r RIFT-hybrid-preview-v12.apk
adb install -r RIFT-native-tests-v12.apk
node scripts/android-device-check.js
node scripts/android-device-check.js --run-instrumentation
```

Set `ANDROID_HOME` (or `ADB_PATH`) so the script can find adb. For multiple devices select `ANDROID_SERIAL` explicitly. The script hashes device identifiers in its report, does not install/uninstall apps, and does not collect logcat/screenshots/credentials. Instrumentation can restart the preview process. Expect `OK (5 tests)`; any other result must be investigated, not reported as a pass.

An Android CI workflow is prepared in `.github/workflows/android.yml`. Builds/lint/test-APK compilation run on push/PR. Once the owner has uploaded the repository, they can manually run it with `run_emulator=true` to execute the twelve tests on a disposable API 35 emulator. This has NOT been executed here and consumes the owner's runner time. Emulator success still would not establish real-provider SAF or real-wallet behavior.

## 3. Manual acceptance matrix

Record OS/API, device model, WebView version, build hash and pass/fail/evidence for each case. Do not record seeds, provider tokens or private personal backup text in shared evidence.

| Area | Exercise | Required result |
|---|---|---|
| Consent isolation | Deny native workspace, try save; reopen/allow; switch local wallet profile | Visible denial, no silent IndexedDB fallback; a new profile needs its own consent; data is profile-scoped, not wallet-authenticated |
| Shared store | Save a web draft; return to native tools for the same blank/device profile; open it | Same native draft appears; browser fields restore only after document validation |
| Profile isolation | Use two public profile addresses without connecting/funding them | No cross-profile listing/delete; selecting an address is explicitly not authentication |
| Favorites | Save app favorites to device workspace, clear only app favorites, explicitly restore | Union merge on explicit action; no cloud/on-chain mutation or silent truncation |
| Plain backup | Save file, choose it for review, then separately import | Real document-provider destination; no import before confirmation; duplicate imports create copies |
| Encrypted backup | Use a new 12+ character passphrase, save, then choose the encrypted file with correct/wrong passphrases | No draft plaintext in exported envelope; wrong/tampered file rejected; passphrase cleared; decryption only loads review text; separate import required |
| Imports | Try JSON/SVG/PNG/JPEG/WEBP/GIF/ZIP/TXT from several document providers, including image previews and file.text() | Selected files remain readable despite general WebView content access being disabled; unsupported files fail explicitly; no broad storage/camera grant |
| Bounds | Try >25 MiB/file, >128 files, >128 MiB retained selections in one opened interface, duplicate basenames, >8 MiB exports | Explicit rejection; no crash/unbounded staging. Reopening the interface resets the retained import budget |
| Export transfer | Save metadata/artwork/proofs/verification ZIPs and readiness JSON, including multi-chunk files | Opened files and ZIP contents intact; destination success shown only after native completion |
| Cancellation | Cancel confirmation/picker; navigate during transfer; choose a stale picker result | Old request does not attach to a new page/session; failure warns that chosen destination can remain empty/partial |
| Lifecycle | Rotate, background/resume, force renderer loss, kill/reopen process during selection/transfer/DB request | No automatic signing/resend; user can reload to inspect committed state; consent revoked after navigation; old staged files cleaned on next process startup where possible |
| Resource failure | Low disk, unavailable provider, provider read/write error, large malicious/deep JSON | Visible bounded failure; database import remains transactional; no raw provider credentials in errors |
| Unsupported WebView | Run without WebMessageListener support | Clear native capability error; no silent browser fallback or unsafe generic bridge |
| Connection secrets | Replace/delete primary and backup keys; wrong-chain endpoint; switch Offline | No key exposed to WebView/backup; no credential forwarding to backup; offline native networking refused |
| Receipt recovery | Interrupt confirmation, check receipts; speed-up/cancel in a disposable wallet | Never automatic resend; different replacement cannot unlock dependent action; inconsistent/missing receipt becomes uncertain |
| Reorganization | Use a controlled RPC fixture to remove/re-include a previously seen receipt | Recent confirmation recheck flags uncertainty and clears deployment shortcut until a valid receipt is observed |
| Wallet return | Pair/disconnect/reconnect supported wallets and return after each requested approval | Requires real configured origins/project IDs and deliberate mainnet authorization; no funds/signing permitted by this checklist alone |

## 4. Known limits to retain in acceptance notes

- Native personal data is private app storage, NOT an encrypted database. Encrypted exports protect the file with the chosen passphrase; they do not protect a compromised/unlocked page or recover forgotten passphrases. JavaScript cannot guarantee erasure of every immutable passphrase/string copy from memory.
- File writes are provider-dependent and not atomic. Cancellation/failure can leave empty/partial destination files. Never assume SHA-256 transport integrity means SVG/ZIP contents are safe to execute/open as trusted code.
- A started SQLite mutation may commit even if its page times out/closes; reload before repeating it. No automatic retry of non-idempotent import/save.
- Private staging cleanup is best-effort. Process-start cleanup snapshots old sessions, so it does not delete new live sessions; deletion/provider failure must still be tested.
- No WorkManager background indexing/receipt service, unified native RPC web adapter, metadata/media/holdings pipeline, secure automatic cross-device sync, production signing or mainnet acceptance is claimed.
- No shared platform provider key or wallet seed is in the APK. External RPC, wallets and IPFS remain required for live features. Offline mode does not simulate current chain state.

## v12 additional mandatory runtime gates

- Consent denial/cancel, backgrounding, full navigation and offline mode must release active native reads without stale replies. Invalid origins/subframes must never access the bridge. Confirm endpoint/key values never reach the page.
- Compare known-token balances, ERC721/1155 ownership, strict tokenURI and fresh receipts against an independent Cronos provider; malformed/oversize responses must fail closed. Confirm no external metadata/media is fetched automatically; only the separately consented fixed-gateway JSON and bounded native raster operations may fetch. HTML/SVG must never execute.
- Enable watches explicitly; test pending, inclusion, reverted inclusion, provider failure, pause/resume/remove, app process death, reboot, device idle, settings changes and stale claims. Verify bounds, no busy-loop retries and honest scheduling status. Inclusion is not finality.
- Run all twelve instrumentation tests; compiled APK is not execution evidence. Native journal reconciliation must require consent, never sign/resend, and flag a missing prior inclusion as uncertain.
- Review newly merged WorkManager permissions (wake lock, boot receive, network state, foreground service) and actual background behavior. No exact-alarm/continuous-service guarantee is offered.

## v12 additional gates

- Background receipt policy defaults to unmetered only. Verify on Wi-Fi marked metered, mobile data, unmetered Wi-Fi and network transitions. Changing the policy must pause checks; enable/resume is explicit. This setting does not govern foreground web/native requests.
- Known-asset candidates are unverified, origin-local IndexedDB hints. Save/import/export/remove them; verify profile isolation, sparse uint256 IDs and storage-full rollback. Imported/selected hints must not trigger RPCs, signing or watch scheduling. Check labels remain text, not HTML.
- Export candidate JSON separately before clearing app data/changing origins. Native personal backup does not include candidate hints or transaction-journal migration.
- Execute the two added SQLite instrumentation cases (connection-reopen lease/stale completion, clock rollback/profile clear isolation), along with the prior eight. All ten are compiled only in this environment.

## v12 metadata and pairing gates

- Read a supported IPFS token URI: there must be no gateway request until the separate inspection action AND native approval. Confirm the exact gateway/path/privacy warning. Test denial, back button, backgrounding, full navigation, Offline mode and timeout.
- Controlled gateway/transport fixtures must refuse private DNS results, redirects, gzip, wrong MIME, oversized length/chunked/EOF bodies, malformed UTF-8, excessive JSON nesting and array roots. No provider key, wallet account, cookies or referrer may be sent to the gateway. Test real public gateway availability separately; outage is not a cached success.
- During JSON inspection, images, SVG, HTML, animations and links remain inactive text; the separate v12 raster operation is the only supported explicit image-preview path. Metadata is transient, not in personal portable backups. CID syntax/gateway response alone establishes no integrity/authenticity; v12 independently checks only pathless raw SHA-256 bytes, not UnixFS/DAG paths.
- With a disposable real WalletConnect wallet: cancel, approve late, attempt another pairing before cleanup, reject, disconnect, switch account/chain, kill/resume app and inspect relay/session state. No signing request may pass through a cancelled/quarantined adapter. A never-settling attempt must stay blocked, not masquerade as connected.

## v12 raster / integrity acceptance gates

- A metadata read must never fetch artwork automatically. Separate preview click AND native consent are required; check exact host/path and privacy warning. Offline mode, cancellation, full navigation/backgrounding and owner/profile/candidate changes must not display stale previews.
- Exercise both new Android raster tests and the prior ten isolated tests. All twelve are compiled only here. Test on varied Android/WebView versions and low-memory hardware; JVM budgets do not execute Android codecs.
- Verify MIME/signature spoofing, SVG/GIF/WebP/HTML, redirects, compressed or oversized bodies, bad decode, 2049px sides, >1 megapixel dimensions and >64 KiB PNG output all fail closed. Input is at most 128 KiB; output at most 256px per side. Metadata dimensions are not trusted. No browser request to the original image URL is permitted.
- Compare real decoded/reencoded pixels/aspect ratio; confirm only generated PNG reaches WebView and original EXIF/chunks are not copied. Android codecs still require updated OS and independent review; bounds are not proof of absence of decoder vulnerabilities.
- Verify pathless raw/sha2-256 matching and mismatched CIDs using controlled known files. Digest mismatch must reject before parse/render. UnixFS/DAG/directory paths must say not-verified, never verified. Check the known empty raw CID vector in the JVM harness separately. Matching digest is not ownership/authenticity/safety proof.
- Decode/reencode is bounded by bytes/pixels but is not a hard-preemptible Android operation; confirm lifecycle cancellation suppresses late output and resource pressure recovers without stale success.
