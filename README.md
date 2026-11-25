# RIFT — Cronos NFT app

Latest consolidated preview: [v23 release notes](cronos-market/RELEASE-V23.md) and [exact Android build evidence](cronos-market/ANDROID-BUILD-REPORT.json). V23 bundles wallet/launch reliability changes; it does not deploy the backend or activate v2 trading.

Complete clean repository layout: application source is in `cronos-market/`; active GitHub workflows are in root `.github/workflows/`.

- Render-first app/backend target: https://rift-q6qs.onrender.com
- Legacy Surge browsing site: https://rift.surge.sh
- Repo: https://github.com/notoknu/RIFT

**Preview, NOT a production mainnet trading/wallet release.** Private profiles were activated against Turso on the last verified hosted commit, with tested retention across Render redeployment. Uploads and trading remain separately gated. The native wallet is experimental with no approved embedded signing. Never import funded wallets. Free services may sleep or have quotas; no always-on availability is guaranteed.

## v22: consolidated creator/privacy source and Android preview

Read [RELEASE-V22.md](cronos-market/RELEASE-V22.md), [FEATURE-MATRIX.md](cronos-market/FEATURE-MATRIX.md) and [MAJOR-UPDATE-WORKLOG.md](cronos-market/MAJOR-UPDATE-WORKLOG.md). This source adds private-workspace export/deletion, source-verification submission/job tracking and the mobile wallet-picker fix. These latest changes have NOT been deployed by packaging the APK. Installing an APK does not update its backend.

The app uses one Render-connected interface; explicit network pause is preserved. See [REMOTE-ACCOUNTS.md](cronos-market/REMOTE-ACCOUNTS.md) for remote account configuration and credential-rotation requirements. Native signing remains disabled/unapproved; real-device external-wallet acceptance is still required.

## Start

Install Node.js 22.13+ and npm, then:

```sh
cd cronos-market
npm ci --include=dev --ignore-scripts
npm run build
```

For the Surge split-host public preview, set `VITE_PUBLIC_API_ORIGIN=https://rift-q6qs.onrender.com` in your shell and run `npm run build:surge`. Output is `dist/`. The root manual Surge workflow also builds this variant. Do not deploy the ordinary same-origin build to Surge and expect relative `/api` paths to work.

Android source is included. Run `npm run android:prepare` before Gradle, use JDK17 and Android SDK35. APKs, Keystores and generated assets are deliberately excluded. Android's shared service origin is the Render API URL, not the Surge URL.

Read `UPLOAD-TO-GITHUB.md` before replacing repository contents, and `cronos-market/DEPLOYMENT-HANDOFF.md` for service configuration and restrictions. Provider credentials are NOT included; rotate previously exposed credentials and store replacements in the appropriate secret settings.

## Security and release status

The old public repository included local `.android` keys/configuration. Replacing files does NOT purge Git history, prior clones or caches. Keep the repository private during cleanup; review and rotate anything exposed. Never reuse the published debug Keystore for production.

No project LICENSE has been selected. This bundle does not invent a copyright permission grant; review ownership and third-party terms before public/open-source release. Historical version reports inside the app directory are retained as historical context, not current release approval.
