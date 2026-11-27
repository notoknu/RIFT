# Owned normalized public-data adapter — continuation60 / Phase4D

## State and scope
Implemented source only, unverified. No dataset was fabricated, generated from a live provider, inspected through the new CLI, configured, published or activated during implementation. No tests/builds/syntax checks/imports/services/network calls were run.

This supplies a concrete bounded alternative to external Ebisu/Minted/Explorer protocols for directory/ranking reads, catalog search, collection observations and wallet discovery candidates. It reads an operator-published normalized dataset from owned local storage or an owned Worker asset binding. It does not automatically create that dataset from chain history; end-to-end production of complete holdings/statistics belongs to Phase5. No manual data-entry task is being substituted for that remaining assistant engineering.

The dataset's origin is explicitly operator-published, not silently relabelled as Ebisu, Minted, independently verified, network-wide or complete. Configuration and coverage review remain operator authority; building the remaining automated producers remains implementation work.

## Selection and admission
Set `RIFT_OWNED_PUBLIC_DATA_JSON` only after separately reviewing a real dataset. Its exact fields are `version:1`, `path`, `sha256`, `reviewAcknowledged:true`. The pin is SHA256 of the exact file bytes, including whitespace/newlines, not a canonical JSON hash. A malformed selection fails rather than reverting to external providers.

Node requires an absolute path to an existing regular, single-link file, no final symlink, no group/world write bits. Reads are capped at1MiB and four concurrent loads; file size/change checks and the raw hash are checked before use. Trusted parent directories remain necessary; this is not a hostile-filesystem sandbox. Node does not keep a stale dataset cache that can bypass expiry.

Worker requires an ASSETS binding and a path matching `/owned-public-data/<bounded-name>.json`. It fetches only that binding, not an external URL, checks response/byte/hash bounds and validates the same model. The asset and any wallet-candidate list in it are **public data** if deployed through the frontend assets path. Do not include secrets, account sessions, private notes, unpublished wallet associations or confidential datasets. A five-second binding request signal is provided, but runtime/binding cancellation is not a universal hard deadline.

Selecting this adapter bypasses external data-provider queries for these admitted read paths, without fallback on missing/expired/mismatched data. External provider selections may separately be disabled. Worker external catalog advancement is suppressed in owned mode; unrelated contract/metadata/RPC paths still follow their existing configured policies. Configuration and pin changes use a reviewed restart/redeployment, not live atomic cutover.

## Dataset format
Exact top-level keys:
- `format`: `rift-owned-public-data-v1`
- `chainId`:25
- `datasetId`:1–64 ASCII alphanumeric/underscore/hyphen characters
- `sourceLabel`:1–120 characters; responses always prefix it with `Operator dataset:`
- `generatedAt`, `expiresAt`: positive integer Unix milliseconds; generatedAt is not future, expiresAt is future, maximum seven-day lifetime
- `coverage`: exact `scope`, `exclusions`, `evidenceDigests` fields
- `collections`: at most500 normalized collection observations
- `walletCandidates`: at most2000 public discovery candidates

Coverage scope is a nonempty bounded string, exclusions1–32 nonempty bounded strings, evidenceDigests1–32 unique lowercase64-character SHA256 pins. These declare the reviewed evidence basis, not automatic semantic validation or a proof that the source is independent.

Every collection has these exact fields:
`address`, `name`, `description`, `image`, `standard`, `owners`, `items`, `floorCRO`, `volume24hCRO`, `volume7dCRO`, `volumeAllCRO`, `activeListings`, `sales24h`, `sales7d`, `observedAt`, `blockNumber`, `blockHash`.

Addresses are lowercase nonzero Cronos/EVM addresses and unique. Names/descriptions are bounded. Standard is ERC-721, ERC-1155 or Not supplied. Image is null or a bounded credential-free HTTPS URL; image hosting/egress approval is separate. Counts are null or nonnegative safe integers. CRO amounts are null or exact nonnegative decimal strings with at most18 fractional digits and78 integer digits. Unknown values must be null, never invented zeroes. observedAt is a positive integer no later than generatedAt. Checkpoint number/hash must either both be null or a nonnegative safe integer and lowercase32-byte0x hash. These are declarations, not fresh RPC confirmation.

Every candidate has exact `wallet`, `tokenAddress`, `tokenId`, `tokenType`, `tokenName`. Addresses are lowercase/nonzero, tokenType20/721/1155, tokenId null for ERC20 and canonical uint256 decimal for NFTs. Duplicates reject the dataset. Candidates are **not ownership assertions**: portfolio paths still perform indicated-block RPC ownership/balance checks. Complete escrow/staking/bridge accounting is not inferred.

## Review tool
`npm run owned:data -- /absolute/review-config.json` is added but was not run. The review configuration has exact `version:1`, `action:inspect`, `inputPath`, `evidencePaths`. It reads a real dataset plus1–32 local evidence files, checks shape/time/units and raw SHA256 evidence-set equality, with a16MiB aggregate evidence budget and2MiB per artifact. It prints only dataset/pin/count/time metadata, not wallet addresses or candidate contents, and writes or activates nothing. Inspect input/config/evidence files must be regular, singly linked and not group/world writable.

A matching artifact hash proves content identity, not truthful content, authorized authorship, source acquisition completeness or semantic agreement. Runtime checks pin/shape/time; they do not reopen evidence files or perform a new independent chain audit. The review acknowledgement is not a signature. No server-custodied wallet/signing key is introduced.

## Read behavior and explicit exclusions
- `/api/collections` returns normalized operator observations. Positive provided all-time/weekly volumes are ranked exactly within the bundle, top100 per period, address-tied deterministically. Null/zero volumes get no invented positive rank. Unranked collection metadata remains available; this is a dataset directory, not a claim that every directory row is a ranked trade.
- `/api/search` searches only the dataset in owned mode,24 results/page, and explicitly sets catalogComplete:false. It does not secretly supplement with external search or imply a complete network census.
- `/api/v1/collection-market` returns separately labelled operator observations, original observation time, dataset expiry, nullable metrics and exclusions. Missing collections fail; they are not zero-stat collections.
- Portfolio discovery reads candidate lists; Node/Worker pagination and existing RPC verification policies remain distinct. No local transfer-index job is anonymously enrolled. Existing optional Node transfer-index candidate integration is preserved.
- `/api/market-art` can use an admitted collection image without requiring an external crosscheck. Normal media size/type/destination policies still apply. Worker image hosts still require existing egress approval; a dataset does not grant arbitrary host access.
- `/api/crosscheck` deliberately returns unavailable in owned mode: one dataset is not two independent venue observations. The support evaluator rejects requiring crosscheck with `publicDataMode:owned-v1`.
- Status adds a sanitized owned-dataset admission/expiry observation. Cached Node status remains an observation at its checkedAt time, not a promise of perpetual validity. It does not independently verify metric freshness or semantic coverage.

Worker JSON cache namespaces include the owned selection/pin to prevent mixing external and owned portfolio data. Owned portfolio requests validate the dataset before cached results. Old namespace rows and historical files are retained. Already-created media handles/cached public bytes follow existing media retention semantics; dataset expiry is not secure erasure.

## Supported-combination contract
The source support evaluator accepts optional `publicDataMode` as `external-compatible` (default) or `owned-v1`. Owned mode with required crosscheck is rejected. The evaluator does not read the dataset/configuration and still reports configurationReady:false, verified:false, activated:false. Runtime opt-in is solely the reviewed environment configuration, not running the evaluator.

Phase4's bounded read/provider boundaries are now source-implemented; broad full-product independence and universal real-world usability are not certified. Automatic owned history/statistic production, complete holdings/rebuild integration, acquisition completeness/density, unattended publication/rotation/capacity and integration verification remain Phases5–8.

All historical Markdown/TXT preserved. Wallet-only signing,1 CRO ceiling and no unauthorized production/trading activation remain unchanged.


## Continuation61 — Phase5 in progress
Added bounded accepted collection-image to owned normalized dataset production, common-checkpoint enforcement and internal supply/holder reconciliation, with evidence pins, conservative null market metrics and requested-public-wallet NFT candidates. Added owned:produce private artifact CLI (not executed). No automatic source approval/publication/activation. Phase5 remains open: orchestration, complete accounting/holdings, market statistics and integration remain. Four open phases5–8. Source only/unverified, no tests/builds/syntax checks/network/services or real dataset generated. See report61 and OWNED-PROJECTION-PRODUCTION-RUNBOOK.md. Historical MD/TXT preserved, wallet-only signing and1CRO ceiling unchanged.
