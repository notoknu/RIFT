> **Report40 update:** `CANDIDATE-COMPLETE-BLOCK-RUNBOOK.md` adds an explicit1024-event complete-block candidate receipt-stage/repository/journal/recovery/review path, v2 projection snapshots and complete-block narrowing in ordinary Node market/exchange indexes. The earlier statements that these Node paths necessarily stop at512 are historical for unselected/default profiles and superseded only where the new runbook explicitly admits the larger profile. Worker/D1 and declared workload/resource bounds remain separate.

# Public-read/provider adapters, marketplace rebuilds and complete-block collection profile

This extends the report38 maintenance runbook. All paths remain opt-in where configuration changes are required. No external service selection, real upload/pinning, database cutover, trading activation, contract submission or expenditure occurred in implementation tests.

## 1. Public Node read paths use replaceable read-only access

`server/public-chain-access.js` now supplies the ContractRunner used by portfolio/native/token/NFT reads, collection enumeration/profile, exact-address search, metadata-readiness audit and creator signature/factory verification.

- Without `RIFT_CHAIN_READ_CONFIG`, keep the existing explicitly configured `CRONOS_RPC_URL` or legacy Cronos public endpoint. Verify chain25 even in this mode. No claim of independent consistency is made.
- With `RIFT_CHAIN_READ_CONFIG`, use the same private versioned chain config/primaryId/provider policy as configured workers. Invalid selection cannot downgrade to the public fallback. Provider failure permits bounded read-only failover.
- Contract calls, code, block, receipt and native-balance reads are available. Raw RPC is allowlisted to `eth_chainId`, `eth_blockNumber`, `eth_getCode`, `eth_call`, `eth_getBalance`, `eth_getBlockByNumber`, `eth_getTransactionReceipt` only. Signing, wallet actions and broadcasts are not exposed. There is no server user-key store or signer.
- Availability failover is **not independent agreement on eth_call/balance output**. Existing call block tags and honest coverage notes remain. Public caches can retain bounded previously observed data; changing a provider does not retroactively reverify cached metadata/search observations.
- Transports close on success/failure; initialization and request failures are code-only. The internal `portfolio.provider()` helper is now asynchronous; every repository caller was updated to await it. It is not a synchronous ethers Provider factory anymore.

Creator factory registration still requires its existing reviewed factory/runtime identity, successful canonical receipt and confirmation checks. These adapters do not authorize registration/trading or replace wallet signatures.

## 2. Optional independently operated Pinata-compatible upload API

Both Node and Worker creator services retain the existing optional Pinata upload path and quota/uncertain-allocation behavior. A replacement must implement the same multipart wrapped-directory upload protocol and response shape (`IpfsHash`, `PinSize`); a generic IPFS gateway is not sufficient.

Legacy configuration stays `PINATA_JWT`, existing `PIN_SPONSORED_BYTES`/`PIN_SPONSORED_FILES`. No credential means no sponsored uploader, and public bring-your-own CIDs remain supported.

Replacement configuration, with real operator values supplied privately:

```text
CREATOR_PIN_DRIVER=pinata-compatible
CREATOR_PIN_API_URL=https://pins.example/v1/pinning
CREATOR_PIN_APPROVED_HOST=pins.example
CREATOR_PIN_AUTH_TOKEN=<server-side bearer token>
PIN_SPONSORED_BYTES=<approved internal byte allocation>
PIN_SPONSORED_FILES=<approved internal file allocation>
```

The API URL must be HTTPS, an exact approved lowercase public-style hostname, no credential/query/fragment/custom port and a non-root path. Unknown driver or invalid selected replacement fails closed rather than silently falling back to Pinata. Account upload status identifies the selected provider type rather than mislabeling it as Pinata. Never paste real credentials into reports or commit them.

Node upload transport serializes the bounded multipart request and uses the existing public-DNS/IP-pinned authenticated HTTPS POST guard. Private DNS targets, redirects and oversized responses are refused. Worker uses its runtime fetch with redirects refused and the same reviewed URL/token/config boundary; it does not execute Node's DNS-pinning code and requires actual hosted egress acceptance. No retry is added for an upload with an unknown remote outcome. Existing service allocation reservation/blocking/reconciliation rules remain authoritative.

A protocol-compatible test fixture is not provider billing/retention/compatibility certification. Selecting this adapter does not enable it without credentials and the existing approved positive upload quotas. This change does not replace all media storage in the product or imply Kubo folder-upload compatibility.

## 3. Durable cold marketplace pair rebuild

Maintenance additionally accepts `kind:"marketplace-rebuild"` with binding:

```json
{"chainId":25,"address":"0x1111111111111111111111111111111111111111","startBlock":10,"model":"exchange-v2"}
```

`model` is `legacy` or `exchange-v2`. Use the actual deployment binding, not the example. All common maintenance spec fields (`runtimeId`,`runtimeFingerprint`) and exact `targetBlock`/`targetHash` are required. Addresses must be lowercase in normalized specs.

Use action `marketplace-rebuild-init` with binding and two distinct absent absolute paths. Existing targets are never overwritten. Runtime shape is the same as collection rebuild except `kind:"marketplace-rebuild"`: private `paths` plus `chainConfigFile`. Obtain its exact fingerprint before enrollment. Schedule using normal finite `run`; no daemon or production database is implicitly selected.

Each unit resumes one lagging index with independent event/header checks and a fixed target. Exact schema/binding/private-file bounds are checked before opening a mutable index. At the common target it verifies the independent hash and transactionally stream-compares event/order projections. Results include order count, event-open orders, fill-event count, filled quantity and exact gross event-volume wei:

- Legacy purchases obtain price from the deployment-history listing before counting purchase volume.
- V2 Bought/OfferFilled sum emitted gross and quantity; existing projection reducers validate creation/order quantity/value semantics.
- Numbers use BigInt/string arithmetic, never floating-point CRO aggregation.

Statistics are **deployment-scoped emitted historical gross volume**, not cross-venue ranking completeness, royalty enforcement, seller proceeds, floor price, live/expiry-aware order validity or wash-trading identification. Both targets remain quarantined: `activated:false`. Publication mismatches, schema drift, fork differences or CAS conflicts do not produce certification. If the filesystem fails between creating the two files, inspect partial initialization before retrying; no automatic destructive rollback is attempted.

Bounds are512 MiB per opened index and two million comparison rows. Legacy/v2 normal independent acquisition still has the512-event publication profile. These marketplace rebuilds do not gain arbitrary dense-block support from the separate collection profile below.

## 4. Explicit complete-block collection event agreement above512

Selected chain config may add `"completeBlockEvents":true`. It must be a boolean and is committed in maintenance runtime/candidate configuration fingerprints. Default remains false. A provider must implement raw block/receipt reads. This enables a **different acquisition strategy**, not simply a raised ordinary-log limit:

1. Require exactly one complete block, never a partial/multi-block dense checkpoint.
2. Each independent provider supplies the complete canonical block transaction list.
3. Query every transaction receipt in bounded slices; validate transaction/index/block identity, canonical block before/after slices and matching logs.
4. Compare full transaction-list digest, canonical block hash and canonical matching-event digest across providers. Any valid contradictory response stops agreement, even if two other providers agree.
5. Compare primary acquisition's entire event content with that complete-block evidence before ordinary atomic collection projection publication.

Explicit limits:256 total block transactions,8192 matching events,8 MiB canonical matching-event bytes, normal per-log bounds, configured provider deadlines. Exceeding any limit fails closed; there is no claim of unlimited block density. A timed-out underlying read can finish late, but its result cannot certify/publish and the reader stops admitting further receipt requests after its timeout.

Ordinary event queries still cap at512. For an independent collection query above512 across multiple blocks, range width is reduced until a single block. Collection's existing durable receipt staging remains available when primary getLogs cannot return the dense block; staged rows/cursor survive restart and become visible only through the existing atomic checkpoint/projection transaction after final independent verification. No partial-block checkpoint is published. Reorg detection discards stale staging; concurrent checkpoint changes fail the commit CAS.

This implementation is integrated into **collection** publication and its cold collection maintenance rebuild. It is not a blanket claim that candidate exchange stage/journal/repository, legacy market, v2 ordinary exchange or Worker/D1 dense paths now support8192-event publication. Those still retain their existing guards/limits and require separate engineering. The bound above512 has been crossed and tested for collection, while the broader M3 requirement remains partial. This is provider-response agreement, not a receipt-trie/consensus proof.

## 5. Archive delivery acknowledgement observability

Maintenance action `archive-delivery-status` takes a private `runtimeFile` for `agreement-archive` and `deliveryId` returned by an archive run. It opens only the configured local outbox/key context, not a remote polling endpoint. It reports sender-recorded acknowledgement state. For multipart it authenticates the commit manifest and checks **every** expected part's target/content/acknowledgement as well as the manifest; a delivered manifest alone cannot imply a complete archive.

`acknowledged:true` means the sender durably recorded the matching HTTPS receiver acknowledgement. It remains `restoreVerified:false`; remote decryption/restore, failure-domain independence and retention are separate evidence. Missing/pruned local records cannot reconstruct historical acknowledgement status; export the observed status, anchor and independent restore evidence before any local spool pruning.

## 6. Reviewed, bounded outbound spool retention

The existing independence CLI has two explicit actions. This is not a default automatic eviction policy and was exercised only against temporary fixtures.

- `outbox-prune-plan`: `version:1`, existing `database`, `policy:{target,keepLatest,maxItems}`, absent absolute `planOutput`. `keepLatest` is explicitly1–128; `maxItems` is1–32 (default32). The private plan is written without overwrite. It selects only older `delivered` outbound records for that target, preserving the newest requested count by **insertion order**, not acceptance timestamp or retention age.
- `outbox-prune`: same DB/policy plus private `approvalFile` containing `{planHash,reviewer,evidenceHash,confirm:"PRUNE ACKNOWLEDGED OUTBOX CIPHERTEXT"}`. Retain the reviewed plan/approval and real independent restore/retention evidence outside this queue. The transaction recomputes the plan; stale state/plan hashes fail before any deletion.

Ready, in-flight and received records are not selected; other targets are unaffected. Minimum preserved count cannot be zero. Source snapshots, archive files, receiver copies and all documents are untouched. This deletes local acknowledged spool **ciphertext only**, reclaims logical queue capacity and does not VACUUM/compact the filesystem or certify external restore. It cannot establish that an operator-supplied evidence hash is truthful; explicit policy/review remains essential. Pruning individual multipart spool pieces is safe only after the owner has retained complete remote/archive restore evidence; local status after pruning truthfully reports missing pieces rather than inventing previous acknowledgement.

Age-based autonomous archive deletion, live audit rotation, complete power-loss scratch handling and distributed retention policy orchestration remain separate engineering/policy work. No destructive retention was applied to production or historical user files.
