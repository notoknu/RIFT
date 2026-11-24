> Frontend delivery: see ../DEPLOY-NEXT.md. Worker now supports same-origin ASSETS delivery or a fixed Surge static upstream. Use the Worker public URL, not the direct Surge URL, for the integrated application. Hosted acceptance remains pending.

> Newest: apply all **ten** migrations, through 0010. D1 collections now stage
> deltas while serving the prior committed snapshot, adapt empty ranges up to 128
> blocks and recover using 32 checkpoints/bounded undo. Older one-block/always-503
> descriptions below are superseded by this note and the current checklist.

> Latest: migration 0008 adds explicit deployment-scoped ERC721/ERC1155 ingestion,
> holdings/traits/activity and bounded metadata hydration. It scans one block over
> multiple ticks, returns 503 while processing and replays from deployment on forks.
> It is not high-throughput/full Node parity. See ENGINEERING-COMPLETION-CHECKLIST.md.

# Bounded Worker/D1 API implementation

This Worker now covers creator accounts, legacy and v2 RIFT exchange indexes,
and a bounded public-read surface. It is **not yet full Node feature parity**.
Native D1 deployment-scoped ingestion now exists with stricter throughput and holder/metadata caps;
Worker fuzzy-catalog backfill is implemented as an optional bounded Minted-only snapshot. Do not announce a complete
Node-free migration or hosted free-plan acceptance from the local tests.

## Provisioning and migration

1. Provision the actual account-controlled D1 resource and final HTTPS origin.
2. Set real `D1_DATABASE_ID` and exact `PUBLIC_ORIGIN`, then run
   `node scripts/configure-edge.js`. No resource is created by that helper.
3. Apply **all ten ordered SQL migrations** in `edge/migrations/` before using
   this version. Back up/export the real D1 database first through an approved
   account workflow. Do not apply the old draft `design/free-first/schema.sql`.
4. Bind actual deployment addresses/receipt blocks for legacy/v2 indexers. V2
   additionally needs the reviewed runtime hash. Keep `EXCHANGE_TRADING_ENABLED=0`
   until independent review, explicit release approval and runtime verification.
5. Configure exact reviewed factory/runtime values for receipt-backed registration.
   Upload sponsorship stays zero unless explicitly funded/configured. Provider JWTs
   are secrets, never `VITE_*`, static assets, Git or plain Wrangler `vars`.
6. Route implemented APIs on the frontend's same origin. Cookies/CSRF are not a
   generic cross-origin authentication scheme. Retain Node for the remaining
   deployment-scoped collection index and any other required parity gap.
7. Measure hosted CPU, D1 reads/writes/storage, subrequests, gateway traffic and
   request limits on the exact chosen plan. Local workerd/D1 tests do not certify
   published free-plan CPU or practical production throughput. No paid plan or
   resource has been activated by this implementation.

## Implemented paths

- Creator auth, drafts, favorites, registry/presentation, reports, capabilities,
  capped public-IPFS uploads.
- `/api/v1/listings`: legacy RIFT fixed-ERC721 projection.
- `/api/v1/exchange/{capabilities,listings,offers,activity}`: v2 projection.
- `/api/collections`, `/api/search`, `/api/crosscheck`.
- `/api/{image,search-art,wallet-art,market-art}`.
- `/api/{wallet-nft,portfolio,wallet-import,nft-readiness}`.
- `/api/v1/{collection-items,storage/verify,status}`.

Public reads return real source data, explicitly marked stale snapshots or an
error. They never fill a failed provider response with invented collections,
prices, holdings or sample orders. Search uses live venue queries, exact-address RPC checks and optionally a bounded
Minted catalog. Set EDGE_CATALOG_ENABLED=1 to crawl one 50-row page/tick, capped
at 1,000 source rows with daily refresh. Coverage flags distinguish incomplete
and capped passes; it is not whole-network discovery.

## Runtime-specific bounds

- Worker portfolio pages check four source candidates per asset type; enumerable
  item pages contain at most four actual IDs. Node pages differ. Open individual
  token permalinks to resolve metadata from enumerable Worker cards.
- Only IPFS gateways, bundled approved hosts and explicitly configured
  `EDGE_METADATA_HOSTS` may receive metadata/media requests. No credentials,
  private IP literals, alternate ports or redirects are accepted by that policy.
  Do not broaden it to arbitrary hostnames as a shortcut around SSRF controls.
- Persistent D1 media IDs replace process-local maps. Image bytes use best-effort
  Worker cache storage; availability/retention is not guaranteed.
- Rate and upstream/RPC budgets are deliberate global ceilings, not a promise
  that all quotas can be sustained for a whole day on a free plan. D1 writes and
  indexes also consume provider allowances. Limit exhaustion fails explicitly.
- Scheduled legacy/v2 work rotates if both addresses are configured. This is a
  bounded indexer, not an unlimited real-time ingestion service.

## Canonical indexing and recovery

Both indexers lag by 12 confirmations, lease writes, stage dense blocks, and
publish complete projections/checkpoints atomically. Oversized/failed log ranges
shrink to a single block and then switch to resumable receipt discovery. Receipt
queues remain hidden until the whole block commits. Receipts, block hashes,
transaction membership and positions are checked.

Retained checkpoints support bounded automatic reorg recovery. Legacy orders
rebuild atomically; v2 APIs return unavailable while a bounded rebuild is in
progress. Deep forks beyond the retained/probed window require a verified rebuild.
Very large blocks/individual receipts are still subject to byte/row/transaction
safety caps; errors never silently advance or skip a checkpoint.

## Local evidence

`npm run test:local-engineering` bundles and runs the Worker in actual local
workerd with D1 migrations, plus isolated D1 tests for public reads and v2 indexing.
It covers staged publication, uint256 values, offers/fills/refunds, pagination,
canonical rebuilds, a 55-event legacy block, and oversized receipt queues.

Tests use isolated upstream fixtures, not mainnet orders or hosted resources.
See `../ENGINEERING-COMPLETION-CHECKLIST.md` for current totals and limitations.
