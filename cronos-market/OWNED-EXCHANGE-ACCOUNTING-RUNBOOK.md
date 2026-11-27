# Phase5 admitted RIFT v2 gross trade accounting — continuation63

## State
Bounded source implementation only, unverified. No accepted images/data were fabricated, inspected or generated; no operational CLI, capture, network, test, build, syntax check or runtime import was executed. Phase5 remains in progress.

## Accounting boundary
`server/owned-exchange-accounting.js` consumes one existing accepted `exchange` projection image, its source acceptance and reviewed canonical acceptedSourceHash. It invokes the same schema/binding/image/confirmation/expiry checks used by projection publication. It supports the RIFT v2 native-CRO event ABI in shared/exchange.js only. An operator-supplied deployment/address with the same event shapes is not automatically proven to implement that contract or denomination; authentic deployment/bytecode and completeness review remain source-acceptance obligations. No arbitrary ERC20/token denomination conversion is inferred.

This is deployment-and-admitted-start-block-scoped gross executed value, not collection-lifetime, network-wide, independent cross-venue or audited economic volume. Source acquisition could consistently omit events; replay reconciliation cannot prove absence of that error.

## Replay and reconciliation
- Sort events by block/log index; require safe checkpoint-bounded positions, canonical event/order bindings, transaction/block hashes and supported event types.
- Reject duplicate transaction/log identities and duplicate block/log positions, inconsistent per-block hashes, a transaction appearing in multiple blocks or a checkpoint event with a conflicting hash.
- ABI encode/decode every payload with exact event field names and native ABI widths/types; reject noncanonical payload representations.
- Require existing open orders for fills/cancels/closes, no duplicate creation and positive creation prices; use the existing exchange reducer to enforce positive quantities, remaining-supply bounds, unit-price/gross equality and close-offer refund reconciliation.
- Independently replay all orders, then require exact stored order-document agreement plus account/NFT/event-open flag/expiry consistency. Missing, extra or altered persisted rows fail the accounting operation.
- Sum Bought and OfferFilled gross amounts once per admitted event using integer arithmetic. Sum fill units separately from fill-event counts. Aggregate each collection and the deployment totals; cap at500 collections, with existing10k-row/8MiB image admission.

No live floor or active inventory is inferred: event-open status is not expiry-aware settlement authority. No timestamps exist in these projection event tables, so24h/7d volumes and sale counts remain null. No fee/royalty/net-proceeds/profit/wash-trade adjustments are invented. A fill event is not a unique buyer or unique NFT sale count. Historical checkpoint consistency is not fresh contract execution verification.

## Owned producer integration
`owned:produce` accepts an optional exact `exchangeAccounting` descriptor:
- imagePath: absolute existing admitted exchange image JSON
- acceptancePath: absolute existing source acceptance JSON
- acceptedSourceHash: reviewed canonical acceptance SHA256

The optional descriptor composes with the existing optional paired lineagePath/lineageDigest. There is still no new operational activation step or provider fallback. No command was run.

The exchange acceptance is checked separately from collection ownership acceptance. All must match the same checkpoint number and hash. Output expiry is capped at the earliest ownership/exchange acceptance expiry. Observation timestamp is conservatively the older of ownership and exchange observations, not the production time.

The resulting normalized dataset's volumeAllCRO is the selected deployment's gross executed native-CRO volume over its admitted start-to-checkpoint interval. Collection rows with no observed trade in that admitted complete interval receive zero **for that interval only**, not a claim of no lifetime/network trades. Without the accounting descriptor, volumeAllCRO remains null as before. Dataset coverage/exclusions and collection-market scope explain the interval/deployment limit. Rankings remain dataset-relative and do not become network-wide ranks.

The production evidence embeds the complete bounded accounting report: source exchange address/start/checkpoint/image/acceptance pins, source exclusions, per-collection gross wei/CRO, units/fills and deployment totals. Dataset pins the exact evidence bytes as before. Evidence is now explicitly capped at1MiB, aligned with production restart inspection. Output dataset remains capped at1MiB raw formatted bytes. Oversize/invalid inputs fail rather than truncate or emit substituted figures.

Lineage-enabled production still proves ownership rebuild linkage for its selected collection only; this slice does not add paired marketplace-rebuild lineage or assert that exchange history was independently rebuilt twice. Exchange source acceptance remains a separate reviewed input.

## Remaining engineering
Phase5 remains open: timestamp/evidence-backed time windows, broader applicable legacy/market accounting, complete holdings/ERC20/escrow/staking/bridge semantics, marketplace rebuild linkage and multi-collection fan-in, automatic durable workflow progression/publication and reconciliation against independent acquisition. Phase6 acquisition completeness, Phase7 unattended lifecycle and Phase8 integration/defect closure remain open too.

Private output files, receipt-last semantics and restart inspection from prior slices are preserved; parent-directory fsync and transactional multi-file publication are not introduced. No live configuration, credentials, signing, spending, trading or deployment is authorized by this source work. Wallet-only signing,1CRO limit, snapshots and historical MD/TXT retained.


## Continuation64 — Phase5 checkpoint time-window accounting (in progress)
Added exact image/source-acceptance-pinned timestamp evidence admission for every exchange event block plus checkpoint; optional24h/7d gross CRO and fill-event totals now derive in replay over checkpoint-anchored open-lower/closed-upper intervals. Historical/deployment scope is explicit; no timestamp input retains nulls. No automatic header/timestamp acquisition, consensus proof or current-wall-clock statistics claim. Full automation/holdings/accounting remains open across four phases5–8. Source only/unverified; no tests/builds/syntax checks/runtime imports/CLI/network/data generation/activation. See report64 and EXCHANGE-TIME-EVIDENCE-RUNBOOK.md. Preserve wallet-only signing,1CRO, historical MD/TXT and snapshots.


## Continuation65 — Phase5 resumable quorum timestamp acquisition (in progress)
Implemented timed checkpoint agreement, bounded immutable sample acquisition, pinned plan/evidence/receipt artifacts and read-only restart inspection. Added time:evidence CLI and durable maintenance job/runtime/finite-runner integration. Acquisition completion awaits source review; no approval fabrication or live activation. This supersedes the earlier missing timestamp-acquisition implementation, not complete accounting/independence. Four phases5–8 remain. User requested five hours; no continuous five-hour or unattended agent was promised/started, and no background service was left running. Source-only/unverified: no tests/builds/syntax checks/imports/CLI/network/RPC/enrollment/artifact generation/activation. See report65 and EXCHANGE-TIME-ACQUISITION-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.


## Continuation66 — Phase5 marketplace rebuild/accounting lineage (in progress)
Added completed paired marketplace rebuild to read-only image/digest capture for existing legacy/exchange-v2 models, receipt-last private artifacts and reviewed manifest/receipt inspection. Optional exact marketplace lineage now composes with source acceptance, timestamps, ownership lineage and exchange accounting in owned production; pinned evidence/receipts retain separate summaries. No new legacy economics or complete accounting claim. Four phases5–8 remain open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/capture/generation/approval/activation, no unattended session. See report66 and MARKETPLACE-PRODUCTION-LINEAGE-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.


## Continuation67 — Phase5 legacy gross accounting (in progress)
Added accepted legacy event/order replay with strict canonical listing/action checks, unique positions/identities, exact persisted-order reconciliation and gross native-CRO purchase totals. Optional legacyAccounting is mutually exclusive with v2 exchangeAccounting in owned production; optional exact marketplace lineage remains separately approved. Same-checkpoint/expiry safeguards and legacy ERC721 consistency preserved. Stored legacy buyers/event hashes/timestamps are absent: no attribution or daily/weekly statistics invented. Four phases5–8 remain; complete holdings/workflow and richer acquisition still open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/capture/generation/approval/activation or unattended session. See report67 and OWNED-LEGACY-ACCOUNTING-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.
