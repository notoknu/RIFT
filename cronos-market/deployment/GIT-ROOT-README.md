# RIFT — Cronos NFT app

Complete clean repository layout: application source is in `cronos-market/`; active GitHub workflows are in root `.github/workflows/`.

- Render-first app/backend target: https://rift-q6qs.onrender.com
- Legacy Surge browsing site: https://rift.surge.sh
- Repo: https://github.com/notoknu/RIFT

**Public browsing preview, NOT a full-mainnet trading/wallet release.** Creator accounts/uploads are disabled, no RIFT trading contract is configured, and the native wallet is experimental with no embedded transaction signing. Never import funded wallets or fund the native preview. A free Render service may sleep/cold-start; no always-on availability is guaranteed.

## v20: one Render-connected Android app and private profiles

See [RENDER-FIRST-V20.md](cronos-market/RENDER-FIRST-V20.md) for the current app changes, migration behavior, profile API, test scope, and required persistent Render storage configuration. The three-mode selector is removed; an explicit network pause is preserved. Private profile storage is implemented in source but is NOT activated on the live backend by copying this repository or installing an APK. Native signing remains disabled, and Android account sign-in still needs a supported external-wallet integration.

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
