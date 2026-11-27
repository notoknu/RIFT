# Phase5 admitted legacy marketplace gross accounting — continuation67

## State
Bounded source implementation, unverified. No tests/builds/syntax checks/runtime imports, operational CLI, network, source capture/approval, dataset generation, publication, deployment or activation were performed. Phase5 remains in progress.

## New replay boundary
`server/owned-legacy-accounting.js` consumes one existing accepted legacy-market image plus source acceptance and reviewed acceptedSourceHash. Existing schema/image/binding/checkpoint/confirmation/expiry admission is reused. Optional marketplace rebuild lineage must bind the exact captured image, model, target and authoritative digest; it is not substituted for source approval.

Supported source model is the existing RIFT legacy native-CRO fixed-price ERC721 marketplace. The stored events retain listing seller/NFT/tokenId/priceWei but drop purchase buyer identity and per-event block hashes/timestamps. The new implementation deliberately does not reconstruct or invent those missing fields. Event-shaped data alone does not attest authentic deployment, bytecode, native-CRO denomination or independently complete history; those remain reviewed source obligations.

Replay sorts by safe bounded block/log positions, validates canonical padded uint256 order IDs, lowercase transaction hashes, supported Listed/Purchased/Cancelled kinds, unique transaction/log and block/log identities, and consistent transaction/block association. Creation requires a new order, exact listing payload fields, lowercase nonzero addresses, canonical uint256 tokenId and positive uint256 priceWei. Purchase/cancellation requires an existing active order and the exact empty object payload emitted by the current stored projection. Missing/repeated/closed order actions fail rather than contributing approximate totals.

Each purchase adds exactly its preceding active listing price in integer wei and one NFT unit. Cancellation adds no volume. Purchases/cancels close the listing. Replay must exactly match every persisted orders row, with no missing/extra/duplicate orders, fields or changed seller/NFT/token/price/active flag. This checks internal event/order consistency, not independent chain acquisition or purchaser identity.

The bounded report contains deployment/start/checkpoint/image/acceptance pins, optional rebuild summary, per-collection gross CRO/wei, purchase counts/units, deployment totals and source exclusions. Maximum500 accounting collections and existing10k-row/8MiB image limits apply; overflow fails. Daily/weekly totals and sale counts, live floor/listing counts, net proceeds and buyer attribution remain unknown. There is no timestampEvidence input for this schema: no per-event block hash was retained to satisfy the timestamp acquisition/admission contract. Merely borrowing the v2 time format would falsely imply evidence that is absent.

## Producer/CLI integration
The existing owned:produce configuration now accepts optional `legacyAccounting` instead of `exchangeAccounting`. They are mutually exclusive; requesting both rejects rather than summing overlapping venues or silently preferring one. Omitting both preserves null monetary metrics.

Exact legacyAccounting descriptor:
- imagePath: absolute existing legacy image JSON
- acceptancePath: absolute existing source acceptance JSON
- acceptedSourceHash: reviewed canonical acceptance digest
- optional paired rebuildLineagePath/rebuildLineageHash

No timestamp keys, unknown fields or half-lineage pairs are accepted. Existing protected file reads, aggregate32MiB input budget and no-overwrite/private-output semantics remain. The API equivalent is legacyAccounting:{image,acceptance,acceptedSourceHash,rebuildLineage?}, with rebuildLineage:{manifest,reviewedHash}.

Ownership and legacy accounting must share one checkpoint number/hash, and output expiry is capped by both acceptances. Display observation time uses the older source observation. When an admitted legacy collection also has accounting rows, its admitted ownership standard must be ERC-721; mismatch fails. A collection absent from the selected marketplace interval can receive zero for that scoped interval only, not a collection-lifetime/network-wide zero.

Normalized volumeAllCRO reports only this selected deployment's admitted start-to-checkpoint gross executed amount. Time-window metrics remain null. Dataset coverage explicitly labels legacy versus exchange-v2 and the legacy missing-field limitations. Dataset-relative ranks do not become whole-network ranks. Event active flags are reconciled internally, not promoted to live executable/tradable inventory.

Production evidence retains legacyAccounting separately from exchangeAccounting; unsupported/missing models are not relabelled. The production receipt's marketplaceRebuildLineage summary can come from either explicitly selected model. Existing collection ownership lineage remains separate. Raw evidence/dataset/receipt pins and restart inspection remain compatible. Runtime consumes the resulting reviewed pinned dataset as before; no new activation/configuration/deployment action is implied.

## Remaining work
This closes the bounded legacy gross-purchase accounting implementation gap, not all legacy economics or full Phase5. Buyer/fee/net/escrow state absent from the stored schema cannot be honestly recovered here. Future richer acquisition/schema work, complete applicable holdings/ERC20/escrow/staking/bridge semantics, multi-source lineage fan-in and durable reviewed production/publication progression remain open. Phases6–8 remain acquisition completeness, unattended lifecycle and integration/defect closure. No source review, host/provider choice, credentials, spend or trading approval is inferred. Wallet-only signing,1CRO ceiling, historical Markdown/TXT and snapshots remain preserved.
