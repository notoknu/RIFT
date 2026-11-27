# Phase5 checkpoint-anchored trade windows — continuation64

## Implementation state
Source implemented, unverified. Phase5 remains open. No timestamp evidence, approvals or datasets were fabricated; no tests/builds/syntax checks/runtime imports/operational CLI/network/capture/publication/activation were performed.

## What the new path does
`server/exchange-time-evidence.js` admits a reviewed timestamp artifact for an existing accepted exchange image. `accountOwnedExchange` can then compute native-CRO gross executed24h/7d volume and fill-event counts while replaying/reconciling that image's orders. Missing timestamp evidence leaves daily/weekly figures null exactly as before. Malformed, changed, incomplete, expired or unpinned supplied evidence fails rather than silently substituting nulls or wall-clock estimates.

Window anchor is the accepted historical checkpoint timestamp, **not production time or current wall-clock now**. Windows are `(checkpointTimestamp-duration, checkpointTimestamp]` in integer Unix seconds, with durations86400 and604800. Events exactly on the lower boundary are excluded; events at the endpoint are included. Values are restricted to the selected deployment's admitted start-to-checkpoint history. If deployment starts inside the window, this is that deployment's shorter covered interval, not a promise of collection/network-wide full-window history. Sale counts mean fill events, not distinct tokens, buyers or transactions. All monetary summation remains integer wei, formatted exactly as CRO.

## Timestamp document contract
Exact top-level fields:
- format: `rift-exchange-time-evidence-v1`
- chainId:25
- imageDigest: canonical projectionPublicationHash of the exact exchange image
- generatedAt: positive integer Unix milliseconds, no later than source acceptance acceptedAt
- expiresAt: positive integer Unix milliseconds, later than runtime now, no later than source-acceptance expiry, and at most24h after generatedAt
- blocks: strictly ascending exact header sample rows

Each block row has exact `number`, `hash`, `timestamp` fields. Number is a safe integer within admitted start..checkpoint. Hash must match that event block's stored hash or the pinned checkpoint hash. Timestamp is a positive safe integer **Unix seconds**, nondecreasing across sampled block numbers and no later than generatedAt's second. Required set is every event block plus the accepted checkpoint, even if no event occurred at the checkpoint. Extra, duplicate, missing or reordered sample rows reject. Conflicting hashes among events and checkpoint reject. Max10001 rows and2MiB serialized/CLI bytes.

The separately supplied timestampEvidenceHash is the canonical projectionPublicationHash of this document, not raw-byte SHA256. That hash **must also occur in the exchange source acceptance's evidenceDigests**. The acceptance itself must still pass its separately reviewed acceptedSourceHash and existing schema/image/confirmation/time checks. This avoids an unreviewed timestamp attachment changing derived statistics under an unchanged approved source record. Generating/reviewing timestamp evidence precedes source acceptance; do not fabricate or silently rewrite acceptance to satisfy this requirement.

A reviewed timestamp hash proves artifact identity, not true timestamps, independently acquired chain headers or authorized authorship. Sample linkage is to accepted event/checkpoint hashes; no contiguous parent-header chain, timestamp consensus proof or fresh quorum acquisition is implemented here. Existing chain-read-quorum currently returns hash/parent identities without timestamps, so this slice deliberately does not pretend it acquired timestamp agreement through that interface. Automated timestamp acquisition remains engineering work; operators are not being assigned a manual repair in its place.

## Existing producer/CLI integration
The optional `exchangeAccounting` descriptor in `owned:produce` keeps its previous exact base fields imagePath/acceptancePath/acceptedSourceHash. It may now additionally include **both**:
- timestampEvidencePath: absolute existing protected timestamp document
- timestampEvidenceHash: reviewed canonical digest, also admitted by source acceptance

Supplying only one extra field rejects configuration. File reads use the existing no-final-symlink/regular-single-link/no-group-world-write checks and aggregate32MiB production input budget; timestamp input cap2MiB. Existing producer, lineage and output receipt paths are otherwise unchanged. The API accepts equivalent `timeEvidence:{document,reviewedHash}` on exchangeAccounting. No new environment variable or live activation mechanism is added.

The normalized dataset receives nullable24h/7d fields. When timestamp evidence is admitted, selected collections with no fill in a window receive zero for that **admitted deployment window**, not a claim of no network trades. Collection counts outside admitted scope are not invented. Data coverage labels the exact checkpoint Unix second and historical basis; all-time remains the selected admitted deployment interval, not collection lifetime. Floor, live/expiry-aware listings and net proceeds remain null. Data expiry is capped by ownership, exchange and timestamp evidence expiry.

Production evidence embeds the timestamp artifact digest, sample count, anchor and trust scope inside the already dataset-pinned accounting report, not an invented verification certificate. It does not embed every header sample; the original timestamp artifact must be retained with source evidence for audit/re-review. Existing1MiB raw dataset/evidence output bounds fail on overflow. Ordinary runtime validates pinned produced bytes/model/expiry; it does not repeat timestamp source verification or query providers.

## Remaining work
Phase5 remains in progress: automatic timestamp acquisition/review evidence orchestration, durable workflow progression and multi-source lineage, complete applicable legacy/holdings/ERC20/escrow/staking/bridge accounting, reconciliation and publication integration. Sampling/review is not a substitute for Phase6 acquisition completeness or Phase7 unattended lifecycle. Phase8 integration/defect closure remains open. Wallet-only signing,1CRO ceiling and no unauthorized deployment/spend/trading activation preserved, as are historical Markdown/TXT and snapshots.


## Continuation65 — Phase5 resumable quorum timestamp acquisition (in progress)
Implemented timed checkpoint agreement, bounded immutable sample acquisition, pinned plan/evidence/receipt artifacts and read-only restart inspection. Added time:evidence CLI and durable maintenance job/runtime/finite-runner integration. Acquisition completion awaits source review; no approval fabrication or live activation. This supersedes the earlier missing timestamp-acquisition implementation, not complete accounting/independence. Four phases5–8 remain. User requested five hours; no continuous five-hour or unattended agent was promised/started, and no background service was left running. Source-only/unverified: no tests/builds/syntax checks/imports/CLI/network/RPC/enrollment/artifact generation/activation. See report65 and EXCHANGE-TIME-ACQUISITION-RUNBOOK.md. Wallet-only signing,1CRO and historical MD/TXT/snapshots preserved.
