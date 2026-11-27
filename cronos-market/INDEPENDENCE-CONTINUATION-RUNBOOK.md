> Report38 adds opt-in durable scheduling/rebuild/media repair/audit snapshots/runtime rotation. See `MAINTENANCE-OPERATIONS-RUNBOOK.md`. The earlier “no automatic remote retention” statement still applies: local archive enqueue is not remote acceptance or retention.

# Independence continuation — candidate lifecycle, audit, large transfers and media adapters

This supplements `INFRASTRUCTURE-INDEPENDENCE-RUNBOOK.md`. Older numeric limits and statements about missing candidate propagation/Kubo support are historical where superseded below. No production selection or remote deployment is performed by this document.

## 1. Independent agreement throughout candidate work

The optional parameters `chainReader`, `eventReader`, `onAgreement` and `chainAgreementTimeoutMs` now propagate through:

- finite journaled exchange cycle;
- durable scheduler → dispatcher → ordinary range scanner;
- dispatcher → resumed receipt-stage publication;
- finite stage worker → receipt-stage publication;
- foreground supervisor through its configured runtime map.

The staged path verifies pinned headers and exact independently queried event responses before moving a ready stage to publishing or preparing a recovery intent. A disagreement/audit failure leaves the stage ready, with no new publication attempt. After agreement it rechecks the stage's original checkpoint/block before publication. Existing held/publishing stage review and uncertain-write handling remain unchanged.

`onAgreement` is pre-publication evidence storage, not a commit acknowledgement. A process can die after appending evidence and before publication; the evidence must never be interpreted as a successful checkpoint advance. Existing journal/repository reconciliation remains authoritative for publication outcomes. No automatic write replay was introduced.

### Operator config selection

Existing candidate operator configs remain valid. A stream can additionally select:

```json
{"chainConfigEnv":"RIFT_CHAIN_CONFIG_PRIMARY","agreementAuditPath":"/absolute/private/agreement.sqlite"}
```

Keep the existing valid `rpcEnv` field for v1 compatibility. When quorum is selected, `rpcEnv`'s endpoint is not used as a fallback. `RIFT_CHAIN_CONFIG_PRIMARY` contains the versioned JSON chain configuration itself, including reviewed `primaryId` and provider identities/endpoints. Unlike regular worker `RIFT_CHAIN_READ_CONFIG`, it is JSON in an environment variable, not a file path. This allows the synchronous offline operator plan to commit the exact configuration without mutable file contents escaping its fingerprint.

Quorum selection requires an explicit audit path. Initialize it separately. The offline plan hashes all normalized selected endpoints/provider policy plus audit-path configuration, and discloses evidence appends as a mutation. Any provider/config change invalidates the plan commitment. Invalid/missing selected quorum configuration cannot downgrade to single RPC.

No SDK clients/network are needed to validate/plan. Run still requires existing candidate DBs, explicitly initialized audit storage and the exact reviewed plan hash. No schema migration, queue enrollment, activation or funded wallet is implied.

## 2. Durable agreement evidence

`server/chain-agreement-audit.js` stores sanitized pre-publication evidence in a separate private SQLite WAL/FULL-sync database. It does not add unknown tables to exchange databases or invalidate unified exchange backup schemas.

Evidence contains immutable stream binding, expected checkpoint, observed range/end hash, header summary and event digest/provider IDs. Secrets, endpoint URLs and arbitrary caller fields are not copied into the record. Entries are sequence-linked by SHA-256. Capacity is 4096 records / 16 MiB documents; exhaustion fails closed before publication and never auto-prunes evidence.

CLI actions, with `version:1`:

- `agreement-audit-init`: absent absolute `database` path.
- `agreement-audit-inspect`: existing `database`; optional `expectedHead`/`expectedCount`.

Preserve the latest returned head/count in an independent trusted record. A local hash chain alone cannot detect a maliciously rewritten chain or an old valid prefix; external expected values are essential. The store is not WORM and has no automatic remote retention. Back it up separately with an approved consistent SQLite snapshot/encryption workflow; it is not silently included in the two-component cold split set.

## 3. Larger sealed backups through multipart transport

The single HTTP artifact/request cap remains 4 MiB. `server/backup-multipart.js` supports already sealed backups up to **256 MiB** without raising that request cap:

1. `multipart-pack`: stream a recognized encrypted backup into payload pieces of at most 3 MiB, each with a fixed wrapper.
2. Publish a signed ordered manifest last, binding exact piece sizes/digests and the complete sealed-file digest.
3. `multipart-enqueue`: validate and enqueue pieces, then the manifest. Repeating it is content-addressed/idempotent. If capacity interrupts enqueue, valid pending pieces remain and repeating after explicit capacity resolution resumes without deletion.
4. Existing `deliver-once` sends one artifact at a time. Receiver HMAC/duplicate handling is unchanged.
5. `multipart-import`: verify the manifest and require all receiver pieces before creating a local import directory.
6. `multipart-assemble`: verify every signed piece, then verify again while streaming output; publish the complete sealed backup only after total length and digest match.

Missing, changed, swapped or unauthenticated pieces do not produce a published assembled backup. Reassembly never decrypts the application database and never activates services. Existing destination files/directories are not replaced.

### CLI fields

All configs include `version:1`, `action`, private `keyFile`, and matching `keyId`. The multipart manifest key can be separate from delivery authentication; do not send a backup-decryption key to the HTTP receiver.

| Action | Other fields |
|---|---|
| `multipart-pack` | sealed file `source`, absent directory `target` |
| `multipart-inspect` | committed parts directory `source` |
| `multipart-enqueue` | parts `source`, outbox `database`, `targetId`; returns `manifestId` |
| `multipart-import` | receiver `database`, `manifestId`, `targetId`, absent parts `target` |
| `multipart-assemble` | parts `source`, absent sealed-file `target` |

Delivery storage retains its default aggregate cap of 64 MiB. Operator config `maxTotalBytes` may explicitly select up to **536870912 bytes (512 MiB)** for a large fixture set. The 128-record and 4-MiB-artifact caps remain. At most 86 pieces plus one manifest represent one 256-MiB backup, fitting the record bound in an otherwise empty queue.

Use the reviewed quota consistently in sender/receiver/operator configs. This quota is a runtime admission setting, not a stored migration or reserved disk allocation. Multiple retained sets can still exhaust capacity. No destructive retention/pruning was added. Real disk/RSS/host limits need measurement; the code's upper bound is not a performance guarantee.

## 4. Streaming cold split transport

Cold split capture/inspection now supports each component up to **128 MiB**. It still requires externally stopped/fenced writers, no nonempty WAL/journal, unchanged source digests and supported exchange schema. This is not online cross-database atomicity.

The original small in-memory `RIFTSP01` format remains supported but rejects larger pairs before allocating their combined base64 JSON. Use:

- `split-pack-file`: set directory `source`, absent sealed-file `target`, `keyFile`, `keyId`.
- `split-unpack-file`: sealed-file `source`, absent set-directory `target`, `keyFile`, `keyId`.

The streaming `RIFTSP02` format encrypts a fixed manifest/component sequence and verifies its GCM tag before publishing any imported set. Component digests are rechecked; imported commit manifests are published last. Combined sealed-container size is capped at 256 MiB, including headers, so the theoretical maximum of both component bounds together may exceed the container cap and be refused.

For a larger set, compose: cold capture → `split-pack-file` → multipart pack/enqueue/deliver/import/assemble → `split-unpack-file` → split plan/reviewed restore. Tests separately verify large split round-trip, multipart delivery and real encrypted SQLite restoration; do not infer physical host independence from local fixture stores.

The temporary unpacked container contains encrypted component backups and their manifest, not decrypted application DB pages. Existing cold-capture/restore scratch plaintext risks under SIGKILL remain as documented. Targets remain quarantined/offline; an application-specific activation review is required.

## 5. Concrete Kubo-compatible media adapter

`server/kubo-media-provider.js` implements the provider interface against Kubo-compatible HTTPS APIs:

- CAR multipart `dag/import?pin-roots=true`;
- explicit recursive `pin/ls` observation;
- `dag/export` readback, followed by the existing cryptographic CAR/DAG verification.

`apiUrl` is the origin or reverse-proxy base **before** `/api/v0`. It must not contain URL credentials, query secrets, fragments or a nonstandard port. Basic/Bearer authentication stays in a server environment variable. Authenticated POST transport pins public DNS, rejects private destinations/redirects, and bounds requests/responses/timeouts. Pinning is an explicitly approved side effect; it is not rolled back or assumed unsent after a timeout.

`media-replicate` CLI config:

```json
{"version":1,"action":"media-replicate","root":"EXPLICIT_EXPECTED_CID","archive":"/absolute/private/source.car","approvalFile":"/absolute/private/approval.json","required":2,"providers":[{"id":"a","failureDomain":"operator_a","apiUrl":"https://a.example","authorizationEnv":"RIFT_MEDIA_AUTH_A"},{"id":"b","failureDomain":"operator_b","apiUrl":"https://b.example","authorizationEnv":"RIFT_MEDIA_AUTH_B"}]}
```

Reserved endpoints/placeholders above are documentation only. Approval remains `{confirm:"REPLICATE VERIFIED CAR",archiveSha256:"exact-source-sha256"}`. Auth env names must use `RIFT_MEDIA_AUTH_...`. Same-origin concrete endpoints are rejected as duplicate copies. Distinct hosts/failure-domain labels still cannot prove distinct real operators. No actual provider was contacted in tests.

Kubo recursive pin inspection and valid readback establish point-in-time evidence, not guaranteed future retention or a pinning-service SLA. Vendor APIs incompatible with Kubo still require their own transport adapter; product replication logic does not need to change.

## 6. Non-Turso libSQL selection

Existing Turso configurations retain their default behavior. A reviewed compatible non-Turso libSQL service may now be selected with:

- `CREATOR_DB_DRIVER=libsql`
- `CREATOR_LIBSQL_URL=https://exact.reviewed.host` or `libsql://exact.reviewed.host`
- `CREATOR_LIBSQL_APPROVED_HOST=exact.reviewed.host`
- existing private `CREATOR_LIBSQL_AUTH_TOKEN`.

The explicit pin must be an exact lower-case DNS host, not a suffix/wildcard/URL/IP/internal-name shortcut. Invalid selected pins fail configuration rather than falling back to Turso. URL credentials/query/path/nonstandard-port rules remain. The same creator SQL adapter, remote registry and candidate remote-store configuration gate can use the approved host without product-feature rewrites.

Tests use real local SDK databases behind injected factories to verify unchanged CRUD/batch behavior on replacement configurations. They do not certify a new vendor's protocol consistency, redirect/DNS behavior, migration or durability. Operator-approved endpoint trust is required; this config pin is not a general sandbox for untrusted endpoint input.

## 7. Responsibility boundary

Mine: remaining feature/backend adapter parity, online split coordination if required, higher-density acquisition strategy, operational audit archival/retention/key lifecycle, full independent rebuild orchestration and fixes for defects reported by testing.

Yours: select actual hosts/providers, control credentials and budget, authorize cutover, run/observe your external tests and supply their results, and perform owner/device acceptance. Finding a code defect in those tests does not make implementing its fix your responsibility. No deployment or spending authorization has been inferred.
