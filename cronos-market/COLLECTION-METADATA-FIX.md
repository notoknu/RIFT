# Collection metadata/artwork correction

## Confirmed issues

- Ebisu's live collection payload contained a `banner` field which the Node and
  Worker search mappers discarded.
- The collection modal relied on registry/search snapshots and did not independently
  resolve the contract's collection-level `contractURI()` document.
- The readiness checker skipped HTTPS JSON even though the main token resolver had
  a DNS/IP-checked public-HTTPS reader.
- Percent-encoded embedded SVGs were not accepted as collection/token images.
- Artwork retry appended a query string to data/signed URLs, corrupting those URIs.
- The banner UI substituted logo or generic hero art when no banner was supplied.

## Implemented

- New `/api/v1/collection-profile?address=...` in Node and Worker: bounded cached
  collection-level reads, contractURI metadata, separate logo/banner fields,
  explicit resolution status/warnings and source information. No guessed token ID.
- Independent profile/registry/venue lookups in collection details. A venue or
  registry failure does not discard successful contract metadata. Curated registry
  presentation keeps precedence, moderation remains respected, and missing fields
  can fall back to other actual sources without merging venue financial totals.
- Preserved and safely proxied venue banner URLs. Node and Worker mappings updated.
- HTTPS metadata checker uses the same bounded, public-address checked reader as
  token metadata. Private/internal destinations remain blocked. IPFS JSON reads
  can try a second gateway. Embedded document size and object shape are checked.
- Shared bounded embedded SVG/base64 normalization for Node, Worker and frontend.
- Artwork retries preserve the original URI. Banner rendering uses an actual image
  element, with explicit missing/error states rather than generic collection art.
- Metadata status and a refresh action are visible in collection details.
- Backend provider honors CRONOS_RPC_URL; Compose app passes it through.

## Executed checks

- 85 local engineering tests passed (`checks/metadata-engineering.log`).
- 7 Redis security tests passed; production build and browser regressions passed.
- New metadata browser tests verify logo/banner/description, provenance, venue
  fallback on profile failure and no fabricated fallback banner.
- Worker D1 tests verify embedded contract-level metadata + logo/banner normalization.
- Real, non-fixture read on ULTRA CAT
  `0xd0a7736cb44c387907b48c518b24fb45ecf1d98f`:
  contractURI embedded JSON resolved; its embedded SVG collection logo loaded;
  its separate Ebisu banner loaded through the safe image proxy in Chromium.
  See `checks/metadata-live-profile.json`, `metadata-live-search.json` and
  `metadata-live-browser.json`. This proves this example, not all Cronos collections.
- Android bundled-assets checks, equivalent offline browser smoke, debug APK build,
  lint and signature verification passed. Preview now versionCode 3.

## Deployment/runtime limits

The shipped Android preview is still intentionally unconfigured/offline. It cannot
fetch live metadata merely by installing this correction. The backend must be
hosted, the exact HTTPS origin configured, and the APK rebuilt/tested against it.
Older Filebin uploads and downloaded ZIPs do not update automatically.

Some contracts do not publish contractURI or a collection banner; unavailable,
malformed, oversized or blocked metadata must remain explicitly missing. Worker
HTTPS hosts still need explicit approval; this correction does not remove egress
protections. API resolution does not prove authenticity, persistence or successful
image-byte fetching for every contract. Existing engineering/release gates remain.
