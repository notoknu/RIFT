# Phase5 bounded owned projection production — continuation61

Source implemented, unverified. No commands described below were executed, no dataset/evidence/source acceptance was fabricated, no rebuild was run and nothing was published or activated. Phase5 remains in progress.

## Implemented path
`server/owned-projection-producer.js` produces the Phase4D normalized owned public-data format from existing accepted collection projection images. It reuses `validateProjectionSourceAcceptance` (including schema, binding, image hash, reviewed acceptance hash, checkpoint, confirmation/time and pending-scan guards). This connects the existing projection image/acceptance path to the live-reader-compatible dataset format, without copying provider figures or requiring manual population of holder/count metrics.

Inputs are bounded to16 collection images and128 explicitly selected **public** wallets, with no duplicate wallets or collection addresses. All collections must share exactly one checkpoint number/hash. Different checkpoints are rejected rather than joined into a misleading wallet snapshot. This is a deliberately narrow producer, not complete market accounting.

The producer independently walks token/balance tables, requires canonical padded uint256 token keys, rejects duplicate token/holder keys, invalid/nonpositive balances and orphan balances, and sums every token's balances exactly against its declared supply. ERC721 supply/individual balances may not exceed one. A mismatch fails the whole production; no partial truncation is labelled complete. It computes positive-supply token-ID count and distinct positive-balance owner count. ERC1155 `items` means live token IDs, not the sum of minted units. Total unit supply is preserved in production evidence as a decimal string.

Requested-wallet positive NFT balances produce standard-specific discovery candidates. No request-selected wallet list is logged. Output candidates still require normal indicated-block RPC verification in the portfolio; production does not confer signing/listing authority. Unknown floor, volume, listing/sale counts remain null. Collection display name/description/image URL are bounded caller-supplied annotations, not chain-verified identity or artwork. ERC20/accounting/escrow/staking/bridge production remains open.

## CLI contract
Added `npm run owned:produce -- /absolute/config.json` (not run).
Exact configuration fields:
- `version`:1
- `action`:`produce`
- `datasetId`, `sourceLabel`: Phase4D identifiers/labels
- `lifetimeMs`: integer1000..86400000; output expiry is capped at earliest source-acceptance expiry
- `wallets`: unique lowercase nonzero addresses, up to128; these associations must be suitable for public output
- `collections`:1..16 exact descriptors containing `imagePath`, `acceptancePath`, `acceptedSourceHash`, `name`, `description`, `imageURL`
- `outputDirectory`: absolute, nonexistent directory under a trusted parent

Image/acceptance/config paths are absolute, final-component no-symlink, regular, singly linked and not group/world writable. Maximum image8MiB, acceptance/config64KiB, aggregate input32MiB. Reads reject growth/truncation/mtime/ctime changes. Parent-directory races are not eliminated. Image canonical hash and acceptedSourceHash semantics are those of projection publication, not raw-file pin semantics. No source DB migration or live source mutation occurs.

The existing captureLocalProjectionImage/export and source-acceptance review path supplies image inputs; this CLI does not invent source acceptance or silently approve chain completeness. An accepted artifact is not necessarily independently acquired correct history. The production checks add internal arithmetic reconciliation, not an independent chain oracle.

## Outputs and integration
An exclusive private mode0700 directory receives exclusive mode0600 files:
1. `evidence.json`: source image/acceptance pins, checkpoint, owner/token/unit counts, source-specific exclusions, reconciliation scope and expiry.
2. `dataset.json`: reader-compatible normalized document, with SHA256 pin of the exact evidence bytes.
3. `receipt.json`: written last, counts/time and exact raw dataset/evidence SHA256 pins, verified:false and activated:false. No wallet addresses are printed to stdout.

The dataset raw formatted bytes are capped at1MiB and candidates at2000; overflow rejects rather than silently omitting rows. Source acceptance and dataset expiry are evaluated during production, with output freshness checked again before directory creation and final receipt. The dataset preserves original source observation timestamps, not generation time as fake chain freshness.

Each output file is fsynced; the parent directory is not fsynced and the three-file group is not transactional. A failure may leave a private partial directory. It is retained, not erased or overwritten. A receipt is a production record, not an activation marker or guarantee against later disk loss/mutation. Retry uses a new reviewed output directory. Do not infer activation or successful deployment from a receipt.

The resulting dataset/evidence pair can be inspected by the previously added `owned:data` command (with `evidencePaths` pointing to the exact generated evidence file). That command and runtime hash configuration are separate. Runtime activation still requires reviewed configuration/restart or Worker asset deployment and user authority. Nothing in this producer edits environment, selects a provider, serves candidate files publicly, deploys or signs.

## Remaining Phase5 engineering
- Automatic orchestration from admitted rebuild completion through image capture and reviewed acceptance/production, with durable lineage and resumable failure outcomes.
- Complete admitted holdings/accounting across applicable contracts/standards, ERC20 discovery and explicit escrow/staking/bridge semantics.
- Market-event monetary accounting, price denomination, time-window checkpoints and reconciliation; no volumes are currently derived here.
- Larger-than-current-image bounds, global candidate/catalog completeness, recurring publication/rotation and full integration parity.

Acquisition completeness and unattended lifecycle also retain their Phase6/7 work. No complete Phase5, universal fitness, verified execution or production-readiness claim is made. Wallet-only signing,1CRO ceiling, historical Markdown/TXT preservation and no unauthorized activation remain unchanged.


## Continuation62 — Phase5 rebuild/production lineage (in progress)
Implemented completed collection-rebuild record to paired read-only image capture with authoritative digest/checkpoint checks, private receipt-last lineage artifacts, restart inspection and optional exact-image lineage admission in owned production. Production now prints a raw receipt hash and supports read-only pinned dataset/evidence/expiry inspection. No automatic source acceptance, partial-write recovery, multi-collection lineage fan-in or full accounting completion. Four phases5–8 remain. Source-only/unverified; no tests/builds/syntax checks/runtime imports/operational CLI/network/capture/generation/activation performed. See report62 and REBUILD-PRODUCTION-LINEAGE-RUNBOOK.md. Preserve wallet-only signing,1CRO and historical MD/TXT.


## Continuation63 — Phase5 admitted exchange accounting (in progress)
Added ABI-validated accepted RIFT v2 event replay, lifecycle/value/refund checks and exact persisted-order reconciliation; derived gross native-CRO deployment/collection trade totals, fill events and units. Optional exchangeAccounting input now feeds owned production at a common checkpoint, expiry capped to both source types, with scoped source/evidence pins. No timestamps means daily/weekly/floor/live inventory remain unknown. No bytecode/denomination attestation, net economics or complete cross-venue/accounting claim. Phase5 and four phases5–8 remain open. Source only/unverified; no tests/builds/syntax checks/runtime imports/CLI/network/dataset generation/activation. See report63 and OWNED-EXCHANGE-ACCOUNTING-RUNBOOK.md. Preserve wallet-only signing,1CRO and historical MD/TXT.


## Continuation64 — Phase5 checkpoint time-window accounting (in progress)
Added exact image/source-acceptance-pinned timestamp evidence admission for every exchange event block plus checkpoint; optional24h/7d gross CRO and fill-event totals now derive in replay over checkpoint-anchored open-lower/closed-upper intervals. Historical/deployment scope is explicit; no timestamp input retains nulls. No automatic header/timestamp acquisition, consensus proof or current-wall-clock statistics claim. Full automation/holdings/accounting remains open across four phases5–8. Source only/unverified; no tests/builds/syntax checks/runtime imports/CLI/network/data generation/activation. See report64 and EXCHANGE-TIME-EVIDENCE-RUNBOOK.md. Preserve wallet-only signing,1CRO, historical MD/TXT and snapshots.


## Continuation66 — Phase5 marketplace rebuild/accounting lineage (in progress)
Added completed paired marketplace rebuild to read-only image/digest capture for existing legacy/exchange-v2 models, receipt-last private artifacts and reviewed manifest/receipt inspection. Optional exact marketplace lineage now composes with source acceptance, timestamps, ownership lineage and exchange accounting in owned production; pinned evidence/receipts retain separate summaries. No new legacy economics or complete accounting claim. Four phases5–8 remain open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/capture/generation/approval/activation, no unattended session. See report66 and MARKETPLACE-PRODUCTION-LINEAGE-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.


## Continuation67 — Phase5 legacy gross accounting (in progress)
Added accepted legacy event/order replay with strict canonical listing/action checks, unique positions/identities, exact persisted-order reconciliation and gross native-CRO purchase totals. Optional legacyAccounting is mutually exclusive with v2 exchangeAccounting in owned production; optional exact marketplace lineage remains separately approved. Same-checkpoint/expiry safeguards and legacy ERC721 consistency preserved. Stored legacy buyers/event hashes/timestamps are absent: no attribution or daily/weekly statistics invented. Four phases5–8 remain; complete holdings/workflow and richer acquisition still open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/capture/generation/approval/activation or unattended session. See report67 and OWNED-LEGACY-ACCOUNTING-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.


## Continuation68 — integrated work across5–8; phase permission gate removed
User authorized cross-phase work without permission stops and brief reporting. Added multi-collection lineage fan-in, shared private/pinned source loading, deterministic resumable private production with receipt-last files/directory fsync/headroom and maintenance scheduling. Hardened shared receipt acquisition transaction-list/all-log/index/status checks and carried progress in admitted paths; exposed quorum error codes and deterministic sort ordering. Four packages5–8 remain open; complete holdings/acquisition/lifecycle/integration not claimed. Source only/unverified; no tests/builds/syntax checks/imports/operational CLI/RPC/generation/enrollment/activation. No deletion or signing/spend; preserve MD/TXT/snapshots, wallet-only signing and1CRO. See concise report68 and INTEGRATED-PRODUCTION-WORKFLOW-RUNBOOK.md.


## Continuation69 — integrated wallet discovery publication
Connected paired completed wallet rebuilds to bounded reviewed public20/721/1155 candidate artifacts, private capture/inspection/reuse and durable maintenance scheduling. Owned production now admits/merges pinned snapshots at a common checkpoint/expiry, with public-wallet acknowledgement and preserved balance-vs-discovery distinction. Bounded observation expansion and strict canonical store/log checks close related acquisition/integration defects; arbitrary density/full holdings not solved. No phase permission gate. Four packages5–8 remain open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/artifact generation/enrollment/activation or unattended service. See report69 and WALLET-DISCOVERY-PUBLICATION-RUNBOOK.md. Historical MD/TXT/snapshots, wallet-only signing and1CRO preserved.


## Continuation70 — all four remaining packages addressed, not finished
5: optional historical custody/selected RIFT listing escrow beneficiary accounting with vault reconciliation.6: explicit256..2048 wallet/generic receipt transaction policies, default/strict platform profiles preserved.7: pinned expiry/evidence/intent/headroom audit and recurring non-destructive scheduler lane.8: shared integration and missing enrollment-digest output fixed without inspect-time RPC adapters. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/artifact generation/enrollment/activation/signing/spend. All5–8 remain open for full coverage/acquisition/lifecycle/integration. No phase permission gate or unattended service. See concise report70 and ALL-REMAINING-PACKAGES-PASS-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.
