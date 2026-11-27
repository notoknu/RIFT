# Worker read/media contract alignment — Phase4C

## State
Source implementation only, unverified. No tests, builds, syntax checks, runtime imports, migrations, services, network calls, deployment or activation were performed. Existing D1 migrations must already be provisioned separately; untrusted HTTP reads do not run migrations.

Phase4C implements the bounded route/media alignment described here, not universal Node/Worker equivalence. Collection fallback/discovery and portfolio remain `partial-source` in the executable support contract. Worker maintenance throughput and larger acquisition workloads remain separate Phase5–7 work.

## Route changes
- `/api/v1/listings/{uint256}`: exact-ID lookup, including inactive sold/cancelled orders and404 for missing IDs. List queries now include the NFT contract filter before pagination. Shared projection query validation rejects invalid/overflowing cursors as400.
- `/api/v1/exchange/listings/{uint256}` and `/offers/{uint256}`: exact order lookup with live-time expiry/remaining-derived active flag, matching the Node read-envelope behavior. List/account/NFT/closed filters and activity cursors use the shared query contract. Unknown paths are404; unsupported methods405; unavailable/unconfigured D1 is503.
- Indexed collection reads now include checkpoint hash/startBlock/caughtUp, metadata timestamps and enumerable:false; deterministic holder ordering, separate owner/activity cursors, empty trait-value matching and normalized activity fields align the common envelopes. Existing Worker indexed limit24 remains; Node's HTTP cap12 remains. Numeric non-index item cursors behave like Node's initial indexed page; `i:` cursors perform indexed continuation.
- Untracked collections no longer answer owners/traits/activity requests with an unrelated enumerable item page. Those aggregate views/indexed cursors return404 when not admitted. Untracked enumerable fallback remains four items with deferred metadata, not Node's richer fallback or complete token discovery.
- `/api/v1/release`: GET/HEAD configuration-only manifest,405 for other methods. Node and Worker share a pure release builder. Runtime storage observation remains Node persistent-account configuration versus presence of a Worker D1 binding; neither proves durability. Upload configuration uses the shared Pinata/compatible-provider descriptor. The result always remains preview, productionApproved:false.
- `/api/v1/status`: bounded D1 read-batch inspection of configuration bindings, stored checkpoint/hash, future/old timestamps, rebuilding/pending state and caughtUp. At most16 projections; skipped projections explicitly degrade status. Non-ok status now returns503 rather than HTTP200 with a degraded body. No raw stored error text is exposed.

## Read consistency and admission
`edge/projection-read-consistency.js` uses a D1 `first-primary` session where supported and brackets list/detail/collection reads with state observations. A changed cooperative state returns503 with Retry-After. Sessions provide sequential consistency, **not** a multi-statement snapshot. This does not fence arbitrary SQL writers, eliminate all ABA possibilities or pin pages across requests. A binding without the sessions API uses state bracketing alone; no snapshot guarantee is claimed. D1 status uses a read batch, separate from these route reads.

Projection list/detail/capability reads now use the same shared90-per-minute client D1 admission counter as other public reads. The lightweight release manifest does not require a D1 quota write and can describe missing configuration. CF-Connecting-IP is trusted only as a Cloudflare platform-provided boundary, not an arbitrary unproxied client header. Existing upstream budgets remain30 metadata/nonmedia and90 media attempts per minute; fallback attempts each consume budget. No trading or signing action is performed by these read routes.

## Gateway and metadata boundary
`shared/public-ipfs-gateways.js` now holds the existing Node gateway grammar; the server module reexports it for compatibility. Worker metadata/media/factory registration paths consume it too. `RIFT_PUBLIC_IPFS_GATEWAYS` remains a JSON array of1–5 distinct root HTTPS origins. CID and path components are validated, including encoded separators/traversal/control characters. Worker additionally requires public-looking DNS gateway names and rejects local-name suffixes, credentials/ports, noncanonical gateway paths and redirects. Hostname checks are not DNS/IP pinning; deployment egress controls and provider trust remain necessary. Node safeFetch's destination controls are not reproduced by a lexical hostname check.

Worker metadata tries configured candidates under a shared7-second default deadline; media under8seconds. Registration uses the shared metadata reader with8seconds. Preflight uses one8-second request deadline across the collection document and up to eight token documents. A slow first attempt may consume the remaining budget; this is not a guarantee that every configured gateway is attempted. D1 operations can also delay execution; deadlines do not cancel D1 calls. Successful metadata is bounded to512KiB, media8MiB, redirects refused. Non-ok response bodies are cancelled. Preflight validates the same required name/image, optional banner/animation and token traits, returning sanitized `{uri,name,image}` objects rather than raw collection JSON.

Worker media cache keys include the current candidate URL list; current policy is validated before cache access. Existing approved gateway URL records can resolve through current configured candidates. Removed custom gateway origins can make older records unavailable until rehydrated; there is no silent grant for retired hosts. Other cached metadata/catalog JSON is not globally purged by gateway changes and remains subject to its existing TTL/freshness policy. Media records/cache persistence still differs from Node process-local handles.

**Ordinary gateway JSON/images are not content-address verified CAR/DAG recovery, durable pinning, a media retention SLA or source authenticity proof.** Existing verified recovery components remain separate.

## Retained partial/excluded behavior
- Collection admission caps remain100 Worker configurations versus1000 Node configurations; no automatic registry-to-Worker ingestion parity is claimed.
- Worker collection enumeration is four items/page without equivalent inline metadata; discovery and full holdings/accounting remain incomplete.
- D1 request/row/SQL/runtime quotas and bounded scheduler work differ from Node. Shared route shape is not equal acquisition completeness, independent RPC agreement, reorg recovery capacity or maintenance throughput.
- No universal backend substitution, Node libSQL publication on D1, live cold-selector consumption, trading approval, production deployment or recurring credential/media lifecycle completion.
- Runtime conformance remains deferred under the no-testing instruction. Existing previously executed checks do not verify these changes.

Next package: Phase4D venue/explorer/catalog/snapshot provider boundaries. Wallet-only signing,1 CRO ceiling and preservation of Markdown/TXT remain unchanged.
