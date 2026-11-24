# Current engineering checklist

**Latest state: major previously missing implementations now exist and pass local gates. This is not mainnet launch approval or proof of unlimited/free hosted operation.**

## Implemented in the latest continuation

### Native Worker/D1 collection ingestion

`edge/collections.js`, migrations **0008–0010**, public reads and scheduled Worker wiring:

- Explicit address/deployment-block/ERC721-or-ERC1155 admission, up to 100 bindings.
- Real standard transfer events discover non-enumerable, sparse and uint256 IDs.
- Exact quantities, duplicate batch IDs, burns, self-transfers and holder projections.
- Restart-safe pending progress, bounded four-movement reductions and single-receipt
  slices when getLogs is oversized. No guessed token IDs or skipped checkpoints.
- Partial blocks stay in delta tables; readers retain the prior committed snapshot.
  Initial ingestion and committed-fork recovery still return unavailable.
- Pending forks discard only staged changes. Committed forks probe retained
  canonical checkpoints and apply bounded undo slices while reads are hidden.
  Short histories without a retained ancestor can replay from deployment; a deeper
  fork beyond the recovery window fails closed.
- Global owner/trait filters, zero-token-safe `i:` item cursors, owner pages,
  activity pages, metadata coverage and frontend-compatible cursor parameters.
- One metadata hydration attempt per hydration job; failures retry after an hour,
  successful snapshots refresh after six hours. Approved media uses D1 media IDs.
- Scheduled jobs rotate rather than stacking independent D1 workloads in one tick.
  Explicit-query tests cover reduction and 16-trait hydration budgets.

**Current runtime bounds:** empty ranges adapt up to 128 blocks/invocation;
eventful ranges narrow to a single block, then stage/reduce/publish across ticks.
The previous committed snapshot remains queryable during normal staging, with
coverage pointing to its actual block. Monotonic revision fences detect concurrent
publication/metadata changes during multi-query reads. Workers reread state after
lease acquisition to avoid acting on a pre-lease stale snapshot.

Recovery retains 32 checkpoints and probes at most eight candidates. Four token
before-images undo per recovery call, preserving exact balances and removing
orphan-token metadata. Recovery and initial ingest still return 503; deep forks
fail closed. Per-token holder documents remain capped at 50 KB, pending state at
900 KB, and metadata hydration at 16 attributes/token. Explicit configuration is
required (Node registry auto-admission is not mirrored). These are finite service
bounds, not full Node parity or production-scale catch-up evidence. Hosted CPU,
row-write limits, actual catch-up times and availability remain unmeasured.

### Cryptographic CAR verification

`scripts/verify-car.js`, `npm run storage:verify-car`:

- Requires the expected root CID, verifies SHA-256/SHA-512 block hashes and follows
  reachable raw, DAG-PB and DAG-CBOR links to check archive completeness.
- Missing linked blocks, corrupt bytes, duplicate blocks, unsupported reachable
  codecs/hash algorithms and unsafe sizes fail closed.
- Can verify two distinct local archives for the same root. The report explicitly
  does **not** infer independent providers, hosts, pinning or retention from paths.
- Limits: 128 MiB/archive, 8 MiB/block, 100,000 blocks; supported codecs only.

No CAR was downloaded from an external provider, uploaded or pinned. Local files
are not proof of off-host independence. Actual provider export/retention and a
hosted recovery drill still need explicit operator resources and acceptance.

## Implemented by earlier passes

- Separate, disabled-by-default v2 exchange contract/client/index for offers,
  criteria, ERC1155 and bulk trades; Node and native D1 indices remain separate
  from the original marketplace. Release/order identity checks protect actions
  against mismatched displayed and configured exchange deployments.
- Multilayer/per-token generative art builder and export workflows; creator-supplied
  SVG workflow, creator authorization/registry, storage allocation and recovery.
- Node collection event index with traits, owners, metadata retry and activity;
  canonical rollback and durable receipt backfill.
- Legacy and v2 D1 staged publication, receipt fallback and canonical recovery.
- Bounded Worker discovery/rankings/search/media/metadata/portfolio/readiness APIs.
- Optional resumable Minted-only fuzzy catalog: 50 rows/tick, 1,000-row cap, daily
  refresh and explicit completeness/timestamp flags; not whole-network discovery.
- Encrypted SQLite snapshots, scoped retention/replication, source-loss restore
  tests, sanitized status, opt-in monitoring and operator supervisor.
- D1 checksummed SQL export/disposable-database restore CLI. It refuses recorded
  source names, requires exact confirmation and executes a verified private copy.
  SQL dumps are private but NOT encrypted; the caller must protect storage and
  independently ensure the destination is disposable/empty. Tests use a fake CLI.
- Manual resumable EOA nonce/replacement investigation without signing or resending.

## Latest executed gates

| Gate | Result | Evidence |
|---|---|---|
| Engineering suites | **89 passing** | checks/closure-engineering.log |
| Solidity suite | **38 passing** | checks/closure-contracts.log |
| Redis security | **7 passing** | checks/closure-security.log |
| Implementation regressions | **6 passing** | checks/closure-implementation.log |
| Browser suites | passed, no reported page errors | checks/closure-browser.log |
| Production frontend build | passed; large-bundle warning remains | checks/closure-build.log |
| Dependency audit | zero reported vulnerabilities | checks/closure-audit.json |

Engineering includes actual local D1/workerd tests with isolated provider fixtures,
sparse IDs, dense receipts, partial quantities, both collection fork paths,
metadata/trait queries and statement budgets. A seeded 6,000-movement ERC1155
model checks conservation and reducer immutability. CAR tests prove complete
linked closure, missing-block refusal, corruption detection and unknown-codec
refusal. This is not exhaustive verification or an independent contract audit.

## Remaining engineering/acceptance gaps — do not relabel as done

1. **Production-scale acceptance and fuller runtime parity:** adaptive empty ranges,
   retained-checkpoint recovery and prior-snapshot availability are implemented.
   Event-dense backfill throughput, per-token holder-document scaling, full metadata
   trait parity and registered-collection admission still differ from Node and
   require further engineering/measurement if those workloads must move entirely
   to Worker. Do not claim those differences are solved by configuration alone.
2. **Independent adversarial review:** additional exchange/property/fuzz testing,
   contract audit, real-device/mobile-wallet and large-collection performance.
3. **Hosted acceptance:** CPU/subrequest/D1/write/bandwidth quotas, final-origin
   auth/wallet tests, real D1 export/restore and independent CAR/retention drills.
   Local tests cannot substitute for these measurements.

## External authorization still required

Actual account-controlled hosting/domain/D1/provider resources, secrets and key
custody; approved independent storage destinations; notification destinations;
independent contract review; explicit gas/deployment approval and verified runtime
configuration. No mainnet deployment, paid service, pinning operation, remote
restore or wallet signature was performed during this continuation.

**The entire engineering roadmap is not yet fully closed.** Core missing engines
now exist, but the production-scale and acceptance limitations above remain real.

## Latest continuation evidence

Migration 0009 moves in-progress changes into deltas and safely invalidates any
old partially applied pending state. Migration 0010 adds checkpoints, token
before-images and monotonic read revisions. Apply with indexing stopped. Local
D1 tests cover prior-snapshot publication, adaptive ranges, pending-fork discard,
checkpoint rollback/orphan cleanup, stale-pre-lease interleaving and concurrent
read-revision rejection. No hosted migration or deployment was performed.

## Latest UI/platform continuation

CroBay-inspired information architecture was implemented without copying code or
changing settlement contracts: grouped accessible navigation, mobile bottom tabs,
fees/contracts/service-disclosure page and a collection-scoped activity explorer.
81 engineering regressions and browser suites pass. See
`CROBAY-LEARNINGS-IMPLEMENTED.md` for the review and test evidence. Updated Android
preview is versionCode 2, still unconfigured/debug-signed and not device accepted.

## Latest collection-metadata correction

85 engineering tests pass after adding collection-profile contractURI reads,
retaining venue banners, safe HTTPS readiness reads, embedded SVG normalization
and URI-safe image retries. A real ULTRA CAT logo/banner web-browser check passed.
See COLLECTION-METADATA-FIX.md. Android preview v3 still has no live backend origin.

## Latest Ebisu comparison continuation

89 engineering tests pass. New collection workspace tabs, explicit source-scoped
venue snapshot API/UI, loaded-item name/ID browsing, collection-funded-offer view
and token-trait deep links are implemented. See EBISU-COMPARISON-IMPLEMENTATION.md
for the comparison, evidence and deliberately unsupported external-market/rarity/
history features. Android preview v4 remains unconfigured and debug-signed.

## Deployment preparation continuation

93 engineering and 39 contract tests passed. Same-origin static asset/Surge gateway delivery and random disposable local-wallet transaction testing added. See DEPLOY-NEXT.md. No hosted deployment or real-device/mainnet acceptance occurred.

## Latest deployment/release engineering pass

103 engineering tests and 40 contract tests passed, including a seeded 32-sequence ERC1155 conservation model. Real Worker/D1/browser signed-session acceptance, static-delivery resource/security bounds, validated disabled-trading configuration, manual CI deployment workflow, source audit and read-only hosted smoke tooling are implemented. Both delivery modes pass local Wrangler dry-runs; no hosted deploy occurred. Android preview v5 rebuilt and verified, still unconfigured. Full evidence and remaining engineering: ENGINEERING-SESSION-RESULTS.md.

## Hybrid device continuation

109 engineering tests, 40 contract tests and new device-workspace browser scenarios passed. Native connection/credential settings, bounded read-only RPC transport, private SQLite workspace and document JSON import/export are implemented and compile/lint; native Android runtime acceptance remains pending. Browser IndexedDB drafts work without cloud auth. Neither complete native API parity nor backend-independent web trading is claimed. See HYBRID-IMPLEMENTATION-REPORT.md.
