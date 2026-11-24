# CroBay review → RIFT implementation

## Reference reviewed

https://crobay.surge.sh/ — inspected the public HTML and rendered browser routes.
Observed patterns included a grouped trade/account/platform drawer, mobile bottom
navigation, dedicated activity/disclosure areas and explicit Cronos positioning.
Some asynchronous route captures showed the prior page while data was loading;
therefore those captures are observations, not a verified audit of every route.

CroBay publicly describes signed orders/on-chain settlement. We did not audit its
contracts, APIs, order validity, fee enforcement or custody. Its visible listings,
volumes, badges and claims were NOT imported as RIFT data or treated as verified.
No branding, artwork or implementation code was copied. Browser observation text
is saved in `checks/crobay-observations.json` only; the app never loads that file.

## Applied to RIFT

1. **Grouped navigation:** Trade, Account, Create & platform; accessible modal menu
   with Escape dismissal, focus containment/restoration and scroll locking.
2. **Mobile bottom navigation:** Home, Explore, Trade, Create, Account with current
   state and safe-area spacing. Existing desktop tabs remain usable; the original
   3D discovery/gaming design is preserved.
3. **Fees/contracts/status page:** `/about` explains gas versus mint price, wallet
   custody, metadata persistence and the distinction between discovery and
   executable listings. Actual configured addresses link to the explorer; absent
   configuration remains absent. Status and storage allocation are fetched from
   existing APIs. Fresh status does not imply an audit or launch readiness.
4. **Collection-scoped activity explorer:** `/activity` validates a supplied Cronos
   collection address and shows existing indexed transfer/holder/trait analytics
   separately from RIFT v2 exchange events. No invented global sales feed and no
   automatic anonymous ingestion. Standalone analytics are read-only, avoiding
   filter controls that would not affect the shown item grid.
5. **Web + Android alignment:** bundled assets updated, Android `/about` route
   fallback added, preview version increased to 0.2.0-preview / versionCode 2.

## Deliberately not copied or claimed

- No migration from escrow to another site's off-chain signed-order architecture.
- No token DEX added merely because the reference site links to one.
- No external venue order import, automatic listing validity guarantee, fabricated
  floor/volume values or provider badge presented as independent verification.
- No backend deployment, wallet signature, upload/pinning operation or spending.

## Verification executed

- 81 existing local engineering tests passed (`checks/crobay-engineering.log`).
- Existing implementation and browser regressions passed.
- New platform browser suite passed: mobile menu/Escape/focus, bottom navigation,
  honest unconfigured status, validated activity lookup, and 360/393/768/1440 widths.
- Production build passed; the existing large-bundle warning remains.
- Android source/asset checks and equivalent offline desktop-browser smoke passed.
- Updated debug APK assembly, lint and v2 signature verification passed. Lint has
  one retained JavaScript-enabled warning (the React UI requires JavaScript).
- Dependency audit reported no vulnerabilities (`checks/crobay-audit.json`).

This is still an offline, debug-signed Android preview until a real HTTPS backend
is configured and the app rebuilt. Android device/wallet/native upload/export
acceptance and all remaining engineering/release gates in the main checklist
remain outstanding. The older Filebin upload is not automatically replaced.
