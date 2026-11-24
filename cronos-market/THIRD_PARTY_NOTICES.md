# Third-party components and assets

## Self-hosted fonts

RIFT bundles Latin variable font subsets from these Fontsource packages:

- `@fontsource-variable/inter` 5.3.0 — Inter Project Authors; SIL Open Font License 1.1.
- `@fontsource-variable/space-grotesk` 5.3.0 — copyright/attribution as reproduced in its SIL Open Font License 1.1 file.

Full copyright/license notices and exact package/file SHA-256 provenance are retained under `third-party/fonts/`. Font binaries are under `src/assets/fonts/`. These fonts are now delivered from the application origin; no Google Fonts stylesheet request is needed. Other scripts use the configured system fallback fonts.

## Software dependencies

`package.json` and `package-lock.json` record application/development dependencies, including OpenZeppelin, ethers, React, Three.js, WalletConnect, Express and Cloudflare local test tools. Each retains its own copyright and license. Preserve applicable upstream notices when redistributing source or bundles. This document is not an exhaustive legal audit of the dependency tree.

## External collection media and statistics

Collection artwork, banners, names and external-market data are not represented as RIFT-owned intellectual property. Availability at a public URL is not permission to redistribute it in source bundles. Runtime provider access remains subject to the relevant provider's terms and availability.

## Project-wide license

No project-wide license is selected on behalf of the owner. A public source publication candidate does not by itself grant all open-source reuse permissions. The owner must choose a compatible license and confirm rights before public release.
