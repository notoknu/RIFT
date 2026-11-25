# RIFT — what I can do here, what needs you

## What was checked/completed
- v30 kit contains the latest built Android preview and source. Public Reown project ID is included in source and APK. Existing signer preserved.
- Improved disposable browser diagnostic: live relay WebSocket upgrade returned HTTP101, with no recorded browser socket error. QR/mobile link creation and cancellation were observed. No relay subscription acknowledgement; no real wallet approval. No pairing secrets retained.
- Hosted read-only follow-up: homepage, SPA deep link, health(chain25), unknown API JSON404 and storage-capabilities endpoint passed. Initial failures/timeouts resolved on follow-up; this is not uptime/load acceptance.
- Hosted `/.env` returns the ordinary406-byte application HTML, NOT an environment file. Added source middleware to return no-store JSON404 for hidden/private path segments before plugins/static/SPA routing, including encoded variants.
- Read-only deployed entry-bundle inspection did not find the new public Reown project ID or Open mobile wallet label. This is a limited entry-bundle observation, not exact release identity verification. New source has not been deployed.

## Please do these first — no purchase or CRO needed

### 1. Test the latest APK on an Android device
Use `12-RIFT-v30-wallet-pairing-kit.zip`, folder `android`, file `RIFT-v30-preview.apk`. It is also included unchanged in the new backend-supplement kit.
- Prefer a spare/disposable Android8+ device or Android profile. This is a debug preview, not approved for funded-wallet custody.
- Back up existing app data privately first. Install as an update if possible. Do NOT uninstall, clear app data or erase a wallet to resolve an install failure; send the error instead.
- Tell me Android version, device model and whether installation/opening succeeds. Do not send device serial/IMEI.
- Open wallet selection, choose WalletConnect, then Open mobile wallet (or scan the QR from another device).
- Use a separate EMPTY external EVM wallet with Cronos support. No funded-wallet import, seed entry into RIFT, buy/mint/approve/sign transaction or gas is needed for this connection check.
- Approve connection only, return to RIFT, and check whether the public address and Cronos chain25 appear. If a transaction or signature is unexpectedly requested during connection, decline and report it.
- Background and reopen RIFT, then disconnect. Tell me which steps work. Redact QR images, pairing URIs and account/session data in screenshots; never send seeds/private keys.
- A mobile wallet failing to open may mean it has no generic wc: handler. Tell me the wallet name/version; do not infer that funds or another installation are needed.

Reply template:
Android version/model:
Install/open:
External wallet name/version:
QR appears:
Open mobile wallet launches:
Connection approved / Cronos25 shown:
Return/background/reopen:
Disconnect:
Exact error (no secrets):

### 2. Give me a safe route to publish the reviewed changes
The hosted app has not been updated by this work. The connector checks returned unsupported for GitHub and Render here, so there is no supported authenticated publish path through those integrations in this conversation. The practical next step is a manual source upload/deployment by you, guided by me after narrow release review. Do not paste a personal access token, Render token or database token into chat. No paid plan/disk or new service is required or authorized by this request. Do not merge/deploy unreviewed v2 trading changes.
First send screenshots of the current Render service Build & Deploy settings with all secrets hidden; do not deploy yet. Root directory depends on repository layout: package.json must be in the selected service root. Do not blindly reuse an old cronos-market root after uploading a root-layout bundle. I can then give exact upload/build steps for that layout, keeping trading disabled.

### 3. Confirm free external account-storage setup
If the existing Turso database is still yours and intended for use, confirm that. Put runtime URL/token only in the provider's secure environment UI when instructed, not in chat or VITE_* variables. Management authorization is not a runtime database token. No new paid resource or overage enablement. Hosted durable write/restart/independent restore acceptance remains pending until the backend is configured and deployed. Do not upload live databases/backups; they can contain personal data.

## Optional deeper native testing — needs a computer/device
The19 Android instrumentation tests cannot run here without an authorized device. A normal screenshot/browser check is not a substitute. If you have a computer with ADB, say so and I can walk you through installation of the matching app/test APKs and the artifact-verified test command. Do not run native vault tests with a funded wallet. Do not use uninstall/data-clear as a repair step. Biometric, SAF and process-death acceptance also need device interaction.

## Things I can continue without your intervention
Source implementation, unit/integration/browser tests, local database recovery with disposable data, security hardening, source packaging, Android compilation/signature/asset checks, public read-only diagnostics and technical review preparation. These do not establish independent security review or real hardware acceptance.

## Not needed now
No CRO funding, new collection launch, seed phrase/private key, paid hosting, unlimited approval, native-signing approval or licence decision is required for the connection checks. Independent trading audit/approved mainnet acceptance and licensing remain separate gates. Filebin is not a permanent backup.
