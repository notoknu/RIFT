# Projection source admission and selected-backend status — continuation57

## Status
Phase4B's bounded Node read/publication scope is implemented in source, unverified. This is not production admission. No tests, builds, syntax checks, runtime imports, services, network requests, publication or activation were performed. Phase4C is next; wider runtime/backend independence remains incomplete.

This document supersedes the earlier publication instructions where they allowed planning/apply without an accepted-source record. Original Markdown/TXT records remain preserved.

## Explicit source review gate
Planning and apply now require an external, private accepted-source review record and its separately supplied canonical SHA256 pin. The record is not auto-generated from a schema check. Its exact fields are:

- `format`: `rift-projection-source-acceptance-v1`
- `scope`: `deployment-events-through-block`
- `imageDigest`: canonical publication hash of the complete exported image
- `indexedThrough`: exact image checkpoint, at or after the configured deployment block
- `blockHash`: exact lowercase checkpoint hash from the image state row
- `observedHead`: safe integer head accepted by the reviewer
- `confirmations`: integer12–100000, with observedHead minus indexedThrough at least this value
- `acceptedAt`, `expiresAt`: positive integer Unix milliseconds; issued no later than evaluation time, unexpired, maximum24-hour lifetime
- `evidenceDigests`:1–32 unique canonical JSON-value SHA256 pins for the reviewed evidence documents
- `exclusions`:1–32 nonempty strings, each at most512 characters, describing coverage limitations

The image's stored update timestamp must be positive and no later than acceptance. Collection images with receipt-scan or staged-log rows are rejected. This does not require metadata hydration to be complete; record such exclusions honestly.

Hashing uses `projectionPublicationHash`: recursively sorted JSON object keys, array order preserved, null/string/boolean/safe-integer primitives. It is not the raw file-byte hash. Floating-point/non-safe integer evidence values are unsupported. Use genuine reviewed artifacts compatible with this format, not invented evidence pins.

**Trust boundary:** this is an explicit operator-reviewed acceptance gate. It verifies record/image/checkpoint consistency, expiry, artifact availability and canonical content pins. It does not independently rerun RPC agreement, prove evidence semantics, authenticate an external signer, fetch current chain consensus, or detect collusion by an authorized writer who can replace both review records and pins. Evidence-document contents still require the authorized review policy. Automated semantic evidence generation/validation across all rebuilt projections remains part of the broader Phase5 workflow. Hashes are not signatures or a universal chain-completeness certificate.

## CLI changes and compatibility
`export` is unchanged and does not grant acceptance.

`plan` config now additionally requires `acceptancePath`, `acceptedSourceHash` and `evidencePaths`.
`apply` config now additionally requires `acceptedSourceHash` and `evidencePaths`; acceptance is embedded in the reviewed plan.

Evidence paths must match the record's unique digest set exactly. Each document uses the existing private regular-file reader; total evidence bytes are limited to16MiB, each document at most9MiB. Evidence contents are not copied into public output, remote schemas or receipts. No credentials should be included in review evidence.

The CLI checks evidence and source acceptance before opening a remote client. Plans use `rift-projection-publication-plan-v2` and include acceptance plus its pin. Apply requires the separately supplied acceptance pin to match the plan. Legacy v1 plans are rejected rather than bypassing this gate; prepare a new reviewed v2 plan. Acceptance is rechecked at planning completion, before apply transaction admission, before declaring already-applied content, and immediately before requesting commit. There is no hard transport cancellation: expiry can pass during an in-flight commit, whose response may be unknown. Reconciliation after expiration requires renewed review rather than bypassing expiry.

Receipts include `acceptedSourceHash`. A commit and local receipt are still not atomic. Existing unknown-outcome, target-change and private-output rules continue to apply.

## Selected-backend operational status
`server/projection-operational-status.js` uses the same selector and repository contracts as collection/market/exchange APIs. It resolves collection configuration asynchronously, including the configured remote registry path, and inspects selected SQLite/libSQL repositories rather than substituting local-file freshness for remote data.

The endpoint reports sanitized backend, timestamp age, checkpoint/hash and observed-head/caught-up fields. Failed schema/binding checks, invalid timestamps, missing hashes, registry/configuration failures, unbound selections, cleanup errors and inspection limits do not produce an overall ready result. Overall `ok` means only the declared stored-observation checks passed, not accepted-source certification, complete history, release authorization or trading safety. Separately inspected databases are not one atomic snapshot. A false collection caughtUp flag degrades status even with a recent update timestamp.

Default inspection limit is16 projections, concurrency2. Additional configured projections are reported as uninspected and degrade the result rather than being silently ignored. This deliberately limits status work; larger-capacity status aggregation remains a workload extension, not universal admission.

The HTTP status plugin shares one in-flight inspection, caches completed observations for15seconds, and returns unavailable after a5-second request wait. The underlying work is not cancelled; later callers share it rather than starting unbounded replacements. SQLite synchronous work can still delay timer delivery. A stalled SDK operation can delay close. The old synchronous `operationalStatus` helper is retained as an explicitly local-only compatibility interface; the HTTP route now uses selected-backend inspection.

## Source support profile and credentials
The executable support contract adds `node-libsql-read-snapshots`: SQLite accounts, SQLite ingestion/other projections, opt-in libSQL reads for collection/legacy-market/exchange, fed by reviewed bounded snapshot publication. Source limits remain10000 rows,8MiB image, at least12 confirmations and at most24-hour review lifetime. Existing account-only libSQL and SQLite profiles keep their defaults. The evaluator still reports configurationReady, verified and activated false. A profile entry does not activate any connection or accept a production environment.

Remote publication uses a distinct write credential; public reads use server-enforced read-only credentials. Credential acknowledgement is not a permission audit. Supported configuration/credential changes use a drained process restart; live process.env mutation or hot credential reload is not supported. On SIGTERM/SIGINT, production now rejects new requests, drains HTTP, awaits implemented plugin close hooks and then closes Redis. A15-second shutdown deadline exits nonzero if work stalls. This wires existing repository drains into production, but is not a distributed credential revocation service or a promise that every unrelated plugin owns a close hook.

## Retained exclusions
No automatic remote replication, direct remote ingestion engine, cross-database atomicity, live cold-candidate activation, wallet projection substitution, whole-product backend portability, universal workload support, recurring credential custody/rotation service or production-readiness certification. These are preserved in Phases5–8/backlog scope, not silently declared complete by finishing this bounded read/publication subphase.

All historical Markdown/TXT retained. User-wallet-only signing and the1 CRO ceiling remain unchanged.
