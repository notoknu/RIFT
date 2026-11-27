# Phase5 marketplace rebuild/accounting lineage — continuation66

## State
Bounded source implementation only, unverified. No tests/builds/syntax checks/imports/operational CLI/RPC/capture/source review/data generation/publication/activation were executed. Phase5 remains in progress.

This slice links the existing completed paired marketplace rebuild to read-only captured image artifacts and, for exchange-v2, the owned accounting producer. It does not establish complete holdings/accounting, automatic source approval, event-acquisition completeness or independently verified chain history.

## Capture and digest agreement
`server/marketplace-production-lineage.js` supports existing marketplace-rebuild models `legacy` and `exchange-v2`. It opens the existing maintenance store read-only and requires an explicit completed job, expected runtime fingerprint, MARKETPLACE_REBUILD_PAIR_VERIFIED result, and result/spec target checkpoint agreement.

Two explicitly selected distinct absolute DB paths are captured using the existing read-only projection export admission. Their model-specific schema/binding/checkpoint is checked, and each captured event/order digest must equal the completed job's authoritative digest. Digest framing mirrors marketplaceProjectionDigest exactly: table name plus newline, selected row object JSON plus newline, with the same columns/order. Covered legacy tables are events/orders; covered exchange-v2 tables are exchange_events/exchange_orders. All included projection rows are still bounded by the existing10k-row/8MiB image admission. This does not expand rebuild acquisition density limits.

The maintenance job is re-read after both captures; a changed record rejects the capture. A pinned manifest records model/binding, job/version/runtime fingerprint, target, authoritative digest and both complete image digests. Legacy and exchange image kinds cannot be silently relabelled. Full image pins include any additional admitted checkpoint/state rows even where those rows are not part of the authoritative event/order digest.

This is local content/lineage consistency, not a distributed lock or new economic audit. Supplied paths are verified by content against the completed result, not independently attested as the historical runtime paths. The expected runtime fingerprint is an explicit reviewed comparison, not reconstructed deployment proof. Sequential snapshots and unchanged job state cannot fence arbitrary raw writers. Two rebuilt files can share an acquisition omission. No authentic-contract/denomination/bytecode verification is inferred from matching events.

## CLI capture
Added `npm run market:lineage -- /absolute/config.json` (not run).

Capture config has exact fields:
- version:1, action:capture
- jobsPath: existing private absolute maintenance store
- jobId: existing completed marketplace rebuild identity
- runtimeFingerprint: reviewed expected runtime digest
- paths: two distinct absolute existing projection DB files
- outputDirectory: absolute nonexistent directory in a trusted parent

Creates a mode0700 directory, with exclusive mode0600 files image-0.json, image-1.json, lineage.json and receipt.json written last. All files are individually fsynced. Stdout prints canonical manifestDigest, canonical receiptDigest, image digests, captured-awaiting-source-review status and verified:false. No source approval is created or extended.

Private-file reading reuses the bounded no-final-symlink/regular-single-link/private-mode/post-read-change checks from timestamp acquisition. Config/manifest/receipt limits64KiB each, images9MiB each. Capture still uses stricter existing8MiB internal image admission. Fixed read count bounds inspection inputs to under20MiB. Trusted parent paths remain necessary; this is not a hostile-filesystem sandbox.

## CLI inspection
Exact config: version:1, action:inspect, outputDirectory, manifestDigest, receiptDigest. It requires a private nonsymlink output directory, checks reviewed manifest/receipt pins, revalidates both bounded image schemas/bindings/checkpoints and authoritative digests, and requires images to occupy their originally pinned positions. It performs no network, source DB opens or writes. Pins are canonical projectionPublicationHash, not raw byte hashes. Reformatting canonical JSON is not considered a semantic artifact change; changing pinned values is.

Missing/truncated/partial output is preserved for review, never overwritten, erased or silently repaired. The output group is not transactional; file fsync is not parent-directory durability. A missing receipt is not inferred success. Capture retry uses a new reviewed directory. Static lineage has no independent freshness promise: using it for production still requires current source acceptance for the exact captured image.

## Accounting/producer integration
The existing optional exchangeAccounting descriptor in owned:produce can additionally include both rebuildLineagePath and rebuildLineageHash. These compose with its optional paired timestampEvidencePath/hash. Supplying half a pair or unknown fields rejects configuration.

For the API the equivalent property is rebuildLineage:{manifest,reviewedHash}. The exact accounting source image must equal one of the paired capture image digests, use the same model/binding/target, and recompute the recorded authoritative digest. The accounting implementation still independently checks current source acceptance, event ABI/lifecycle/value/refund consistency and exact replayed-order agreement. Captured marketplace lineage does not replace those requirements or authorize a new source acceptance.

The validated marketplace summary is embedded in the accounting report, dataset-pinned production evidence and production receipt. It is distinct from the existing top-level collection ownership rebuild lineage. Both may be present, absent or independently reviewed. Absence remains null rather than a fabricated paired-rebuild claim. The producer's existing common-checkpoint/expiry checks still prevent mixing ownership and accounting states at different targets. Ordinary runtime reads the resulting pinned dataset, not mutable source DBs.

Capture/inspection supports legacy artifacts, but the owned monetary-accounting producer remains exchange-v2-only. This slice does not smuggle legacy events through the v2 ABI or claim implemented legacy economics. It also does not add multi-exchange aggregation, multi-collection lineage fan-in, live floors, escrow look-through or current-balance authority.

## Remaining Phase5 work
Complete admitted holdings/ERC20/escrow/staking/bridge semantics, applicable legacy economics, automatic durable reviewed progression/fan-in and complete production/publication integration remain open. Marketplace paired-rebuild linkage is now source-implemented for bounded captured artifacts; runtime correctness and acquisition independence are not certified. Phases6–8 remain acquisition completeness, unattended lifecycle and integration/defect closure. Wallet-only signing,1CRO limit and no unauthorized production/spend/trading activation preserved, along with historical Markdown/TXT and snapshots.


## Continuation67 — Phase5 legacy gross accounting (in progress)
Added accepted legacy event/order replay with strict canonical listing/action checks, unique positions/identities, exact persisted-order reconciliation and gross native-CRO purchase totals. Optional legacyAccounting is mutually exclusive with v2 exchangeAccounting in owned production; optional exact marketplace lineage remains separately approved. Same-checkpoint/expiry safeguards and legacy ERC721 consistency preserved. Stored legacy buyers/event hashes/timestamps are absent: no attribution or daily/weekly statistics invented. Four phases5–8 remain; complete holdings/workflow and richer acquisition still open. Source-only/unverified; no tests/builds/syntax checks/imports/CLI/RPC/capture/generation/approval/activation or unattended session. See report67 and OWNED-LEGACY-ACCOUNTING-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.
