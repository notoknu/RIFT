# Hosted profile activation and browser check

Verified source/deployed commit: `3ae9e3dbcaa23ed3c40f08ff943b3d1ae11e8bea`.

## Hosted backend result

Set exact `PUBLIC_ORIGIN=https://rift-q6qs.onrender.com` and cookie session transport on the existing Render service, preserving the configured authoritative Turso adapter. Deployment `dep-dc353oh5efls73arcotg` reached live. No paid plan, overage or trading changes.

Actual hosted HTTPS tests with disposable wallets passed: unauthenticated profile access returns 401; wallet-message login; HttpOnly/Secure/SameSite=Strict cookies; save/read and other-wallet isolation; hostile-origin write rejected; stale version rejected; private-profile export; versioned deletion; wallet-scoped active-session revocation. Profile fixture was deleted.

A second actual Render deployment `dep-dc354ke8bjmc73ejtr60` reached live and the same profile and session survived it. This establishes the tested redeploy-retention scenario, not all disaster-recovery guarantees. Independent provider-aware backup/restore remains outstanding.

Hosted desktop Chromium with a controlled injected message-only signer passed sign-in, profile save/reload, delete and session-revocation UI. It is not real extension/WalletConnect or Android device acceptance. No funded wallet, mainnet transaction, NFT approval or gas used.

## Mobile defect found and fixed locally

The hosted 393×852 browser check timed out selecting a wallet. Diagnostic evidence showed the non-interactive `.pending` status element intercepting pointer events over the wallet picker. The mobile bottom-position rule also left the desktop top value active, stretching the banner vertically.

Local fixes:
- `src/style.css`: pending status does not intercept pointer events.
- `src/platform.css`: mobile pending banner resets top to auto and bounds width.
- `checks/creator-browser.mjs`: start actual local API sign-in at 393×852, click the wallet normally (no force-click), then continue desktop regression.

Build and complete implementation browser suite passed after the fix. The mobile fix is NOT on GitHub/Render until the owner uploads it. No APK rebuilt. Do not mark live mobile acceptance passed before verifying the deployed CSS.

## Remaining limits

Trading/uploads remain separately gated. Native vault signing, physical-wallet/Android pairing, release-signing approval, comprehensive backup/restore and independent security review remain incomplete. The database token configured in Render has a 30-day lifetime from provisioning; rotate before expiry. Rotate the organization/Render management credentials shared in chat without publishing them.
