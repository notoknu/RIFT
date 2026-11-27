# RIFT latest handoff — pass74

**Start here. This guide supersedes older APK filenames and installation instructions in historical reports.** Those reports remain preserved as engineering history.

## 1. What to download

- **RIFT-source-pass74-git-safe.zip** — complete development snapshot: frontend, Node server, Worker/edge code and migrations, contracts, Android source/wrapper, tests, lockfile, CI workflows and documentation. This is what you extract and commit to Git.
- **RIFT-pass74-debug.apk** — freshly built, signed, user-facing Android debug app. Do not upload it into the Git source repository.
- **RIFT-pass74-handoff.zip** — convenient all-in-one download containing the two files above, this guide, integrity checksums, a build/verification report and developer-only Android instrumentation APK/reports.
- **SHA256SUMS.txt** — checksums for the deliverables. Keep this file with your downloads.

The source ZIP deliberately does **not** contain credentials, `.env.local`, private keys, wallets, runtime databases, backups, node_modules, SDKs, caches, compiled web assets or APKs. It is a development snapshot, not a backup of private application state. Dependencies are restored with `npm ci`; bundled Android web assets are regenerated with `npm run android:prepare`.

The handoff ZIP includes APKs; it is **not** the ZIP to commit to Git. Only commit the extracted contents of the Git-safe source ZIP.

## 2. What is verified, and what is not

Pass73 local results: engineering 1,133 passed; implementation6; security7 including real Redis; local contracts64;249 JavaScript syntax checks passed. Workflow regressions are included in engineering, not additional independent coverage.

Pass74 packaging: frontend rebuilt; Android debug APK and instrumentation APK built;42 JVM tests passed; lint completed with0 errors and8 warnings; Android shell3 and native-policy7 source checks passed; app APK signature verified. See `BUILD-VERIFICATION.json` in the handoff bundle for identity and detailed observations. Instrumentation APK compilation is **not** on-device test execution.

No emulator/phone installation, real-wallet session, hosted/backend acceptance, production restore drill or live trade was performed for this handoff. Phases5–8 remain open. A build/test pass does not establish that all features are complete or safe for production funds.

## 3. Install the Android app

1. Use Android8.0/API26 or later. Download **RIFT-pass74-debug.apk** onto a disposable/test phone.
2. Optionally verify its checksum before installation (section7).
3. Open the APK. If prompted, allow installation only for the browser/file manager you trust. Follow Android warnings; do not disable system-wide protections.
4. Open RIFT and read the preview limitations. Test with a fresh, unfunded wallet if a wallet is needed. Do not import seed phrases or valuable wallets into this debug app.
5. In **Connections & local tools**, inspect the backend/API setting. This build retains the source default **https://rift-q6qs.onrender.com**. Its current availability, ownership and deployment revision were **not** verified in this handoff. Do not assume it runs this ZIP. Replace it with your own exact HTTPS API origin when you have deployed and verified one. Native connection settings may be retained from an older installation.
6. A real backend is required for shared profiles, server APIs and other online features. Some reads use external providers. The APK contains the UI and native tools, **not a backend/server**, and does not make every feature work offline.

**APK identity:** `io.rift.cronos.preview`; versionCode28; versionName `0.26.0-comparison-resilience-preview-debug`; compile/target API35; minimum API26. Pass74 is the handoff revision, not Android versionCode74. The existing source version metadata was retained; this APK was freshly rebuilt from the current source.

**Updating an existing install:** Android needs the same signing key for an in-place update. This artifact uses a debug certificate and may differ from your older APK's signer. If Android says the signatures conflict, first export any app data you need using the app's supported export tools, keep passwords separately, and check recovery instructions. Only uninstall when you accept losing remaining app-local data. Do not delete valuable data merely to try the APK. No update compatibility is promised.

**Not for Play Store:** a public release requires your own long-lived release signing key, protected backups of that key, suitable version increments, release testing and publication rights. No release key or seed phrase is supplied or requested. Keep signing authority in user wallets; do not give a backend wallet seed/private key. Existing1 CRO ceiling is unchanged and is not authorization to spend.

## 4. Put the full source into Git

A computer with Git is recommended. Start with a **private repository** until credentials, rights and documentation have been reviewed. No top-level LICENSE was found; this archive does not grant third-party rights or choose an open-source license for you. Review `THIRD_PARTY_NOTICES.md` and obtain the right approvals before public publication.

1. Extract **RIFT-source-pass74-git-safe.zip**. Open the contained `cronos-market` folder. You should see `package.json`, `src/`, `server/`, `shared/`, `android/` and hidden `.github/` and `.gitignore` files.
2. Create an empty repository with your Git host. Do not auto-generate an unrelated README in the new repository. Copy its clone URL.
3. In a terminal inside the extracted folder, run:

```sh
git init
git branch -M main
git add .
git status --short
```

4. Review the staged filenames before committing. There must be no real `.env`, `.env.local`, `.dev.vars`, wallet backups, signing keys, SQLite files, access tokens, SDKs, APKs or node_modules. `.env.example` is a template and is intended to be included. Git ignore rules do not remove secrets already committed elsewhere.
5. After review:

```sh
git commit -m "Import RIFT pass74 source snapshot"
git remote add origin YOUR_REPOSITORY_CLONE_URL
git push -u origin main
```

Replace `YOUR_REPOSITORY_CLONE_URL` with your real repository URL. Use SSH or your Git host's credential manager; do not embed access tokens in a URL or source file. Configure your Git name/email locally if Git prompts. For an existing repository, import on a new branch, inspect the diff and open a review; do not force-push over existing work.

**Important:** uploading the ZIP as one repository file does not import the code. Commit the extracted files. Git hosting is not deployment: pushing does not create a backend, database, Android release or live chain index. CI workflows under `.github/workflows/` can run on push; review workflow triggers first. Keep manual deployment workflows unapproved until you deliberately authorize an evaluation deployment. Do not paste secrets into workflow YAML.

## 5. Run the website locally

Install Node.js22.13+ (prefer a maintained22.x patch), npm and Git. Use Java17 plus Android SDK35 only if rebuilding Android.

From the extracted project root:

```sh
node --version
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. This starts the frontend development server with the project's Node API plugins; live-provider features still depend on their configured providers. A development server is not a public production service.

For creator/account testing, configure the exact local origin **before** starting the server. POSIX shell:

```sh
PUBLIC_ORIGIN=http://localhost:5173 npm run dev
```

PowerShell:

```powershell
$env:PUBLIC_ORIGIN="http://localhost:5173"
npm run dev
```

If Vite chooses a different port, use that port in PUBLIC_ORIGIN and restart. Public browsing may work while creator/profile functions remain disabled without configuration. An unavailable provider or absent deployment should produce an honest unavailable/limited result, not invented data.

Optional local environment template:

```sh
cp .env.example .env.local
```

On Windows use `Copy-Item .env.example .env.local`. Vite reads local VITE_* build values; Node processes started directly do not automatically load this file. Use `node --env-file=.env.local ...` when appropriate or inject environment variables through your process manager. `VITE_*` values are public browser configuration: never put secrets there. WalletConnect needs a valid public project ID and domain allowlist for your deployment; native/backend credentials belong in private configuration, not VITE_*.

## 6. Rebuild and test

```sh
npm run test:local-engineering
npm run test:implementation
npm run test:security
npm run contracts:test
npm run build
```

Security's real-Redis test requires a disposable Redis instance and `TEST_REDIS_URL`; without it that case is intentionally skipped. Contract tests are local Hardhat simulations, not contract deployment.

If Hardhat reports a missing EDR optional platform package, verify you are running Node22 before installing, enable optional dependencies and reinstall from the existing lockfile with a current compatible npm. Do not delete the lockfile or weaken tests just to suppress an environment error. Preserve exact compiler/dependency provenance for release work.

### Android rebuild on your computer

Install JDK17, Android Studio/SDK platform35 and build-tools35.0.0; set ANDROID_HOME and JAVA_HOME for your own paths and review/accept applicable SDK licenses. Then:

```sh
npm ci
npm run android:prepare
bash android/gradlew -p android --no-daemon testDebugUnitTest assembleDebug assembleDebugAndroidTest lintDebug
```

On Windows use `android\gradlew.bat -p android ...` instead of `bash android/gradlew -p android ...`.

To compile an APK with **your** default backend instead of the existing one:

```sh
bash android/gradlew -p android --no-daemon assembleDebug -PriftOrigin=https://YOUR_API_HOST
```

Replace the example with a real exact HTTPS origin, no path/query/credentials. Source-level native fallback remains documented; validate saved/default connection behavior on an actual device. The main output is `android/app/build/outputs/apk/debug/app-debug.apk`. Test instrumentation output is under `android/app/build/outputs/apk/androidTest/debug/`; it is **not** the app to install for ordinary use.

The included Android CI workflow can build on a hosted Git runner with Java17/Node22. Its optional emulator run is manually selected and consumes runner resources; inspect provider quotas before enabling it. Debug signing certificates differ across fresh machines/runners, so keep update-compatibility expectations separate from build success.

## 7. Check downloads

Linux:

```sh
sha256sum -c SHA256SUMS.txt
```

macOS: use `shasum -a 256 FILENAME`; compare with the corresponding line. PowerShell:

```powershell
Get-FileHash .\RIFT-pass74-debug.apk -Algorithm SHA256
Get-FileHash .\RIFT-source-pass74-git-safe.zip -Algorithm SHA256
```

Each Git-safe source ZIP also contains a per-file `PACKAGE-MANIFEST.sha256`. These hashes detect file changes; they do not establish author identity, app safety, backend availability or licensing. The APK contains a public debug certificate, not a private signing key.

## 8. Hosting and the remaining setup you need

Do not buy or activate every provider at once. First select your own hosting plan and set a spending limit. No deployment or paid service was activated for this handoff.

Recommended order:

1. **Private source repository and local smoke check** using sections4–6.
2. **Evaluation backend:** choose one persistent Node22 host with HTTPS, a known exact public origin and durable private data storage. `npm ci`, `npm run build`, and `npm start` are the basic source commands, but production requires environment settings. Configure PUBLIC_ORIGIN and REDIS_URL; ALLOW_SINGLE_PROCESS_LIMITS=1 is only an explicit alternative for a genuinely single-process evaluation server. Never use it as multi-instance protection. Filesystem storage needs a persistent volume, not an ephemeral deployment directory.
3. **Read-only chain access:** choose independent RPC providers and review `CHAIN-READ-QUORUM-RUNBOOK.md`. Two URLs behind one operator are not independent failure domains. Read-only evaluation does not authorize chain deployment or trading.
4. **Identity/storage:** follow `REMOTE-ACCOUNTS.md`, `ACCOUNT-SECURITY-AND-RECOVERY.md` and relevant storage runbooks. Keep provider tokens in host secret settings. Do not assume profiles/uploads work merely because `/healthz` responds.
5. **Index/rebuild workflows:** use reviewed deployment start blocks, source evidence and explicit limits. Read `INTEGRATED-PRODUCTION-WORKFLOW-RUNBOOK.md`, `ALL-REMAINING-PACKAGES-PASS-RUNBOOK.md`, and `INDEPENDENCE-RECOVERY-PHASE-STATE.json`. Do not run workers, restoration or maintenance enrollment against valuable data without reviewing their commands and acceptance gates. Full-network discovery/holdings is not complete.
6. **Backups:** preserve private app data separately from this Git ZIP. Encrypt backups, keep keys separately and verify a restore to an isolated destination. The default Docker named-volume backup is not independently hosted disaster recovery. Do not use `docker compose down -v` on valuable data.
7. **Connect APK:** point the test installation to the verified evaluation HTTPS origin, then test login, read-only content, disconnect/reconnect and local export/recovery with disposable data.
8. **Release gate:** device/browser acceptance, verified infrastructure recovery, licensing, release signing and explicit trading approval remain separate steps. Keep live trading disabled. Wallets retain signing authority. Do not run deploy:cronos or activate paid upload budgets simply to make a preview look complete.

Existing `compose.yaml`, Dockerfile, edge migrations and deployment workflows are source options, not evidence that their hosted execution is accepted. Compose can start indexers/backups and consume RPC/storage; inspect its service selection and variables before using it. This handoff does not select a production provider or authorize a deployment.

## 9. Keep versus publish

**Commit:** extracted source, lockfile, tests, migrations, template configuration, Gradle wrapper and documentation. **Keep privately:** real environment values, RPC/API credentials, wallet material, app exports, databases/backups and signing keys. **Share separately if needed:** debug APK, checksums and verification reports. Do not commit the entire handoff ZIP or private machine directories.

No seed phrase, funded wallet, server private key or unlimited cloud budget is required to inspect/build this source. External-wallet transaction signing, if later authorized, stays on the user's wallet.
