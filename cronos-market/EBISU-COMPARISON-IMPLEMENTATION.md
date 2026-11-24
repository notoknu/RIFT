# Ebisu’s Bay comparison and implemented learning

## Public references reviewed

- https://app.ebisusbay.com/
- https://app.ebisusbay.com/collection/cronos/ultra-cat
- https://app.ebisusbay.com/collection/cronos/ultra-cat/305

The reviewed pages demonstrate featured discovery, recent listings, collection
banner/avatar, venue-specific market figures, Items/Offers/Activity/Analytics/About
navigation, item traits, collection-return links and a sweep entry point. Public
UI observations are not a contract/security audit, API SLA or proof of every
advertised feature. No wallet was connected and no signing/settlement flow was run.
No branding, artwork or application code was copied. Real collection metadata is
read from the existing supported public sources, not bundled as invented orders.

## Comparison matrix

| Learning | RIFT implementation | Boundary |
|---|---|---|
| Focused collection workspace | New accessible Items / Offers / Activity / Analytics / About tabs | Existing item grid, admitted transfer index and exchange API; not a new network-wide index |
| Floor/volume/owners/listings at a glance | New six-metric external-venue snapshot component | Explicitly Ebisu-only, not executable RIFT inventory or network totals |
| Preserve source and freshness | Node + Worker `/api/v1/collection-market` with address/chain binding, bounded reads, cache and marked stale fallback | Unknown stays null; absent 24h volume is not silently zero |
| Offers close to collection browsing | Paginated collection-scoped RIFT v2 funded-offer view and review link | No imported Ebisu offers; live acceptance/proof/ownership checks remain in the existing exchange client |
| Find individual items quickly | Name/token-ID search and exact uint256 ID ordering of loaded pages | Not a global name or listing-price search; scope shown beside controls |
| Navigate from token traits to matching collection items | Trait links carry validated traitType/traitValue filters into the collection index | Non-indexed collection traits remain loaded-page only; no inferred rarity percentage |
| Collection provenance in one place | About tab shows contract, network, standard, metadata status and directory source | Provider badges are not independent verification |
| Sweep/bulk workflow | Existing separate v2 reviewed-cart/atomic-bulk path retained | No shortcut around release activation, runtime/order validation, wallet review or contract audit |
| Banner/avatar and metadata resilience | Previous collection-profile fix retained with real contractURI + venue fallback | No generic hero or token image masquerading as a collection banner |
| Discovery/launch presentation | Existing original RIFT 3D discovery and launch directory retained | No copied promoted drop, fabricated recent listings or random NFT prices |

## Deliberately not fabricated or claimed complete

- External Ebisu order execution, token approvals or settlement adapters have not
  been added. A public venue listing is not automatically executable by RIFT.
- No universal rarity score, trait floor, top-offer statistic, historic price chart,
  24h price change or portfolio USD total was synthesized from incomplete data.
- Multi-trait AND/OR discovery and full external listing-price sorting are not
  implemented by the new loaded-item controls.
- Recent-listing feeds, accurate historical charts and rarity products need
  trustworthy, correctly scoped/timestamped ingestion and independent validation;
  a visually similar widget alone would not supply that engineering.
- No change to zero-platform-fee intent, creator/collector gas responsibility or
  Cronos-only scope. Contract administration/review/deployment gates remain.

## New API semantics

`GET /api/v1/collection-market?address=CRONOS_COLLECTION_ADDRESS`

The fixed public source is queried with chain 25 and the exact address. Returned
fields include floorCRO, volume24hCRO, volume7dCRO, volumeAllCRO, activeListings,
owners, reportedSupply, sales24h/sales7d, source URL and checkedAt. Missing values
are null; valid zero remains zero. Active listings are not unique token counts,
so no misleading listed percentage is calculated (especially for ERC1155).

Node limits concurrent refreshes, bounds response bytes/time and preserves only
marked last-successful data for up to one hour. Worker uses shared upstream/D1
budgets and snapshot cache. Both validate the source chain/address. Failure with no
snapshot is an explicit error. Source changes or outages still require operations.

## Verification executed

- **89 engineering tests passed:** source validation, missing/zero distinction,
  marked stale fallback, exact large token-ID sorting, URL filter validation and
  real local D1 Worker snapshot behaviour, plus prior suites.
- **38 Solidity tests passed**; contracts were not modified by this UX pass.
- **7 Redis security tests** and **6 implementation regressions** passed.
- Production build passed (the existing >500 KB bundle warning remains).
- Existing browser suites and new collection workflow tests passed: keyboard tabs,
  source-scoped statistics, loaded item search/sort, offer review links, trait
  deep links and 360/393/768/1440 layouts. Metadata and navigation regressions pass.
- A non-fixture ULTRA CAT public snapshot succeeded via the new backend endpoint;
  see `checks/ebisu-live-snapshot.json`. It is a point-in-time source report, not
  a promise that every collection has complete market data.
- Android assets refreshed; debug preview versionCode 4 / 0.3.0-preview rebuilt.
  APK/lint/signature checks are recorded under `checks/android-ebisu-*`.

## Still not a live launch

The Android preview remains offline until the actual HTTPS backend is configured
and it is rebuilt/tested. Existing native upload/export and wallet-return gaps,
hosted quota/throughput acceptance, independent contract review and all other open
items in `ENGINEERING-COMPLETION-CHECKLIST.md` remain. Older downloaded archives or
Filebin links are not automatically updated. No paid service, mainnet transaction,
external upload/pin or wallet signature occurred during this pass.
