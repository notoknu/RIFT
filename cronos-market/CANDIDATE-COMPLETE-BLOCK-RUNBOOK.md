# Candidate complete-block publication — explicit bounded dense profile

This extends the report39 collection complete-block strategy into candidate exchange stages, their SQL repository, journal, recovery/review and snapshot paths. No production selection or transaction signing/broadcasting is performed by these modules. “Publication” below means local derived-index database publication, not a blockchain transaction.

## Selection and admission

Select a valid private independent chain config with boolean `completeBlockEvents:true` using the existing operator/runtime configuration mechanism. Candidate operator plans commit the normalized config; a changed selection changes the approval commitment. Existing configs without the option keep ordinary limits/behavior. Nothing was enabled against production in this session.

- `runPlatformStageCycle` and dispatcher propagate the selected reader capability when creating a new receipt stage.
- Direct programmatic `beginReceiptStage` callers must explicitly pass `completeBlockEvents:true`.
- The created stage records immutable `profile:"rift-candidate-complete-block-v1"`. A legacy stage cannot gain that profile through progress updates, and a selected stage cannot change profile midway. Existing persisted stages remain compatible.
- Dense candidate stages require at most256 total block transactions. They still collect every receipt in bounded slices, track global log positions/raw-byte usage, verify reviewed deployed runtime hash, check canonical block/parent and preserve the original checkpoint.

The profile admits at most1024 matching exchange events, at most8192 total receipt logs, at most2 MiB raw receipt data and at most2 MiB serialized stage document. Existing aggregate stage capacity remains8 MiB/16 stages. Other byte and per-log limits still apply, so1024 events is an event ceiling, not a promise that every maximally sized1024-event block fits. Above-limit work fails before staged progress/projection commit. It never advances a partial-block checkpoint.

## Independent evidence and exact repository policy

Above512 events, publication must obtain the report39 complete-block evidence: agreement on the entire transaction list, each canonical receipt and full matching-event digest from independent providers. Primary receipt contents must match that evidence, and independent header checks still run. A selected stage without complete independent evidence remains ready and cannot prepare a journal intent or publish.

The journaled request includes `denseBlock` with exact fields:

- profile identifier;
- end block hash;
- exact canonical event digest/count;
- complete transaction-list digest/count;
- distinct agreeing provider IDs.

Repository and recovery preparation independently validate this request policy and recompute the canonical event digest. Unknown proof fields are rejected rather than copied into the journal. The proof binds exactly one complete block contiguous with the expected or reviewed rollback boundary. It is evidence from configured readers, not a cryptographic receipt-trie proof, not authorization and not independent defense against colluding providers or a malicious local administrator.

Ordinary requests still admit only512 events/1 MiB; no marker means no raised limit. Valid dense requests admit1024 events/2 MiB validation budget and at most1024 affected projections. Order history remains bounded at10000 events/order; journal intents remain2 MiB each/8 MiB aggregate. All existing SQL lease/fence/checkpoint CAS and end-of-transaction lease revalidation remain in force.

## Restart, unknown outcomes, review and rollback

Receipt slices are persisted separately from visible exchange projections. A killed process can resume a ready/acquiring stage without exposing any incomplete order projection. The final index mutation remains one SQL transaction, not many visible512-event sub-checkpoints.

The complete-block request policy is preserved in recovery intent serialization/digests. Exact fresh-connection reconciliation can inspect up to1024 intended events only for this profile. Lost commit acknowledgements are **observations, never automatic write replay**. A staged unknown/matching-but-unacknowledged outcome still holds the journal/stage for explicit review.

Existing review flow is retained:

1. Plan fresh exact matching-publication review of the held/attempting journal intent.
2. Accept it with the exact commitment, reviewer and external evidence hash.
3. Plan and accept exact published-stage marker closure.
4. Only marker/evidence records change; no second exchange mutation is authorized.

A real process-kill test after SQL commit leaves the intent attempting and the stage publishing; review closes them with the index revision still1. Another real kill test after600-event durable acquisition leaves zero visible orders until a later explicitly verified publication.

Dense reorg replacement is supported only when the retained rollback boundary is valid, the replacement is exactly one complete block with new evidence, and the union of orphaned/new affected projections fits1024. Tested replacement of600 events uses the original deployment boundary. An ordinary request cannot roll back more512 affected projections after dense publication; that attempt fails transactionally without deleting old content. Larger/multi-block or capacity-exceeding reorgs still require reviewed recovery/rebuild; no arbitrary fork is silently accepted.

## Versioned projection snapshot portability

Public projection snapshots retain the existing v1 format/validation for at most512 orders. A bounded snapshot above512 and at most1024 orders is explicitly emitted as `rift-exchange-snapshot-v2`. Existing4096-event/32-checkpoint/8 MiB snapshot bounds remain. The reducer reconstructs every derived order before export/restore acceptance. v2 restore still requires an absent target stream and does not restore active leases.

Relabeling a600-order v2 artifact as v1 fails. Old tools that support only v1 must be upgraded before consuming v2. Co-located unified encrypted backup/verify/restore also validates these snapshots and preserves dense journal/stage provenance, quarantines restored state and never activates authority. This was exercised with600 orders and dense evidence.

## Legacy/v2 ordinary Node projection integration

Explicit complete-block readers are also supported by `MarketIndex` and `ExchangeIndex` (the ordinary Node SQLite paths):

- A valid oversized multi-block response is narrowed to one block before independent complete-block verification.
- The selected dense profile caps ordinary market/exchange matching events at1024.
- Legacy selected complete-block mode advances from the next block after its already verified checkpoint, rather than replaying a window that would force a dense single-block target backwards. It still checks its previous canonical checkpoint and fails closed on a changed fork. Unselected legacy replay behavior is unchanged.
- V2 keeps existing retained-checkpoint reorg recovery and atomic affected-order projection updates.
- No failed database write is retried; adaptive narrowing is read-only acquisition of a valid oversized range, not publication replay.

These paths feed report39 marketplace cold-pair rebuilds through their selected runtime readers. Tests show600 events commit only as a complete block, then resume through later empty blocks; independent disagreement exposes no orders and leaves the deployment checkpoint unchanged.

## Scope and remaining limits

This closes the former512-event barrier for the explicitly selected bounded **candidate and ordinary Node collection/market/exchange paths** described above. It does not raise every product path without review. Worker/D1 execution, wallet-wide cross-contract transfer discovery, very large blocks beyond declared ceilings and larger snapshot/reorg histories remain distinct throughput/coverage engineering requirements.

Neither local fixtures nor this policy prove actual RPC operator independence, provider rate limits, host power-loss durability, hosted libSQL compatibility or production recovery acceptance. No funded wallet key, signer, paid provider, active production DB or timer was used by the new tests.
