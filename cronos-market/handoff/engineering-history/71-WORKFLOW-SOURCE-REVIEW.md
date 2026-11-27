# Workflow source review — pass 71

Status: implemented source changes only; unverified. All remaining phases remain open.

Reviewed the connected paths from event decoding/replay and admitted collection/marketplace sources through discovery, historical holdings, production artifacts, selected Node/edge reads and finite maintenance. This was a bounded source review, not exhaustive certification.

## Changes
- Shared exchange replay now rejects duplicate creation, wrong order/transition types, closed orders, invalid quantities/participants/criteria, incorrect gross values and incorrect offer refunds, following the selected RiftExchange contract semantics.
- Owned exchange accounting additionally rejects repeated ERC721 offer fills and, when admitted timestamp evidence exists, creation/fill expiry violations.
- Production inspection and recurring artifact audit share semantic binding of receipt summaries, evidence metadata, rebuild lineages and exact current-format intent. Hash identity alone no longer substitutes for these cross-file relationships. Historical audit expiry reporting remains separate from current admission.
- Timestamp acquisition now fsyncs containing directories after exclusive artifact writes and the parent after directory creation. Late RPC results fail before persisting a sample when the finite call deadline has passed. This does not cancel the underlying RPC or make multi-file publication transactional.

## Still open
Generalized holdings and protocols; universally dense acquisition and receipt-state propagation; independently acquired complete discovery; unattended enrollment/host operation; integration and runtime defects. Existing limits and source-acceptance requirements remain. No activation, spending, signing, deployment or live pointer changes.

No tests, builds, syntax checks, runtime imports or operational workflows were run. Source inspection cannot establish that every issue has been found or fixed. Historical Markdown/text retained.
