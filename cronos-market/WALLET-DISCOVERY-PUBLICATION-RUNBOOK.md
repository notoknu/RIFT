# Integrated wallet rebuild → owned discovery publication — continuation69

Source-only/unverified. No tests/builds/syntax checks/runtime imports/operational CLI/RPC/capture/enrollment/data generation/publication/activation were executed. Work continues across5–8 without a permission gate; none is declared complete.

## Capture (holdings/discovery integration)
`server/wallet-discovery-publication.js` connects an existing completed paired wallet-rebuild job to a bounded public discovery artifact. It requires the existing wallet-rebuild job ID, expected source runtime fingerprint, completed WALLET_DISCOVERY_REBUILD_PAIR_VERIFIED result and matching result/spec target. Explicit publicWalletsAcknowledged:true is mandatory: wallet/contract associations in the artifact must be suitable for public use.

Two distinct absolute existing private DB paths are opened read-only, with final-component O_NOFOLLOW identity admission, regular single-link mode0600-compatible files,512MiB file ceiling, safe SQLite sidecars, and pre/post path identity checks. SQLite query_only/trusted_schema=OFF and read transactions are used. Schema must match the existing supported wallet store, without initializing/migrating source DBs. Schema reference creation is an in-memory runtime probe only, not a live migration.

Each DB must contain one matching admitted wallet/start and at most10000 observations. The existing walletDiscoveryDigest comparator runs against that transaction, requiring exact recorded target/hash and authoritative digest. Every observation is validated for wallet/contract/block/standard/canonical token ID. Grouped candidates cap at2000; no truncation is emitted. Sources must have different device/inode identities and agree on digest, observation count and candidate content; the completed job is re-read afterward. This is stronger local consistency, not independently acquired chain truth or attested infrastructure separation. Arbitrary parent-path races/raw writers are not universally fenced.

Snapshot format rift-wallet-discovery-publication-v1 retains wallet/start/checkpoint, completed job/version/runtime/digest lineage, observation count, candidates, capture/expiry times and explicit exclusions. Candidate token types are20/721/1155; fungible token IDs are null, NFT IDs canonical uint256 strings. No quantities, buyer identities, current-balance claims or prices are invented. Discovery may include former holdings. ERC20 versus ERC721 Transfer topic-layout classification remains a standard-event heuristic, not ERC165/bytecode attestation or universal token semantics; balances/ownership still require the existing RPC read path.

## Artifact command and resume
Added `npm run wallet:publish-discovery -- /absolute/config.json` (not run).
Capture config exact fields: version:1, action:capture, jobsPath, jobId, runtimeFingerprint, paths, lifetimeMs, publicWalletsAcknowledged:true, outputFile. Lifetime is1second..24hours; choose reviewed operational policy rather than assuming tiny lifetimes suffice. All paths are absolute and input/config files private; output parent must already exist as private nonsymlink directory.

The single private output file is written exclusively and fsynced; parent directory is synced. Missing headroom (file bytes plus16MiB) rejects new writes. Existing complete output may be reused only if current recapture matches all content and the original unextended lifetime/capture time remains valid. Changed/truncated/unsafe/expired output is preserved for review, never overwritten or erased. A write/finish crash can retry matching complete content; partial bytes are not automatically repaired. This is not a transactional publication service or capacity reservation.

Capture stdout returns documentDigest, counts and expiry, sourceApproved:false, verified:false, activated:false—not wallet/candidate contents. The canonical projectionPublicationHash digest is an identity/review pin, not a signature or automatic acceptance of truthful history.

Inspect config exact fields: version:1, action:inspect, inputFile, reviewedHash. It reads at most1MiB and validates exact artifact shape/content pin/time/limits with no source DB opens, RPC or writes. It does not grant source approval, renew expiry or verify independent acquisition.

## Durable scheduling
Added maintenance kind wallet-discovery-publication.
Exact spec: runtimeId, runtimeFingerprint, sourceJobId, sourceRuntimeFingerprint, lifetimeMs, publicWalletsAcknowledged:true. Own runtime fingerprint is distinct from the expected completed rebuild's sourceRuntimeFingerprint.
Exact runtime config: version:1, kind:wallet-discovery-publication, jobsPath, paths, outputFile. Fingerprint commits this config; each run recaptures/validates source contents against the completed job. Existing scheduler guard/lease checks surround capture/writes; static local immutable output can resume without remote side-effect retries. Completion is WALLET_CANDIDATES_CAPTURED_AWAITING_REVIEW, never a live-activation or source-approval status. No jobs, daemons or host cadence were installed or activated here.

## Owned-data production/read integration
The shared owned:produce config accepts optional walletDiscoveryPublications: an array of exact `{path,reviewedHash}` descriptors (1..128,1MiB each, still within shared32MiB input budget). API equivalent: `{document,reviewedHash}` entries. One publication per selected public wallet, with no foreign wallet. Collection ownership images and every wallet publication must share checkpoint number/hash. Expiry is the earliest included source expiry. Workflow resume revalidates publication expiry at real current time, not merely its frozen generation time.

ERC20/NFT candidates merge with collection-derived candidates, deduplicating wallet/contract/tokenId and rejecting conflicting standards. Combined cap2000 remains fail-closed. Contract candidates may lie outside the selected collection directory; dataset coverage says so. Candidate summaries/lineage/pins/exclusions are included in already dataset-pinned production evidence. Wallet associations may consequently appear in public served dataset/evidence; acknowledgement and selected-wallet admission must not be bypassed for private data.

Node/Worker ownedCandidates and existing portfolio readers already accept20/721/1155 rows; no new external fallback is added. Ownership/balances are checked through those existing RPC policies. Publication is a reviewed operator artifact tied to local paired rebuild evidence, not the existing collection/exchange source-acceptance format and not cryptographic approval. It cannot prove complete history or independently legitimate origin. No server-held signing key or settlement authority is added.

## Acquisition/ingestion defects addressed
Wallet observation decoding now bounds inputs and expansion before appending rows: at most8192 logs/rows,8KiB data per log, valid event shapes/topics/addresses/blocks, strict ERC1155 ids/values length equality and explicit limit/decode errors. Invalid/removed logs are rejected rather than silently skipped into a successful checkpoint. Ethers Result array-field name collisions are avoided by positional ids/values access. Oversized batches fail without checkpoint publication; resumable arbitrarily large ERC1155 expansion is still unimplemented.

IndexStore now rejects zero-address enrollment/contracts, malformed checkpoint hashes, noncanonical NFT IDs and nonempty ERC20 IDs, and lowercases committed hashes. Existing files are not rewritten or cleaned. Historical invalid rows fail publication for review. Limits and stricter log shapes may reject previously tolerated nonstandard contracts; no universal compatibility is claimed.

## Remaining
Complete holdings/escrow/staking/bridge look-through, balance/accounting projections, rich legacy history, arbitrary density/oversized expansion, source-review/publication progression, remote lifecycle/capacity/credential policies and full integration correctness remain open across5–8. This pass removes a candidate-export/integration gap, not those larger requirements. All source remains unverified under the no-testing instruction. Historical MD/TXT/snapshots, wallet-only signing,1CRO and no unauthorized spend/trading/deployment/activation preserved.
