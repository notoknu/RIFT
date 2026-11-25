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
