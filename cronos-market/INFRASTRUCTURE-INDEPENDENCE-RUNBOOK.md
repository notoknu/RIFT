# RIFT infrastructure independence — operator runbook

## Release boundary

The new paths are opt-in and have local fixture evidence. No services/templates have been installed and no production environment was modified. Provider ownership, live quotas, remote credentials, host restore, retention and production selection need explicit review. Do not call a local receiver store a second host.

Use Node >=22.13 and Java 17 for the full project tests. Run `npm run test:independence-completion`, `npm run test:local-engineering`, `npm run test:implementation`, and `npm run build`.

## 1. Replaceable chain access and indexing

`RIFT_CHAIN_READ_CONFIG` selects a private, absolute-path JSON file for the market, exchange and collection worker entrypoints. With no config, existing single-provider behavior remains explicit. An invalid selected configuration stops startup; it never downgrades to `CRONOS_RPC_URL`.

Example only; these reserved endpoints do not work:

```json
{"version":1,"primaryId":"a","chainId":25,"quorum":2,"timeoutMs":5000,"maxHeadLag":24,"providers":[{"id":"a","failureDomain":"operator_a","url":"https://a.example/rpc"},{"id":"b","failureDomain":"operator_b","url":"https://b.example/rpc"},{"id":"c","failureDomain":"operator_c","url":"https://c.example/rpc"}]}
```

Keep this file mode 0600. API keys in URL paths remain sensitive. Distinct failure-domain declarations and origins are not proof of independent operators.

The configured workers use a read-only failover runner. Failed reads cool down, wrong-chain providers quarantine, and execution rejections are not hidden by retrying another provider. Raw RPC passthrough permits only block and receipt reads needed by collection backfill, not signing or broadcasting. `call` supports read-only metadata contract queries. No signing keys are loaded.

Before publication, selected workers compare all headers and the exact filtered event responses against independent providers. Normalized event content includes address, block/transaction identities, log index, topics and data; ordering differences do not cause false disagreement. A valid contradictory response is never silently outvoted. A provider timeout/malformed response cannot count as agreement. Three independent providers with quorum two can tolerate one outage, including loss of the preferred acquisition provider. Two providers cannot tolerate one outage.

Selected spans are 16 blocks; legacy market replay is 8 blocks. General independent agreement is bounded to 32 blocks/512 events. Dense blocks beyond the event cap stop independent publication; do not silently disable verification to get progress. The existing collection receipt staging can still collect data, but publication must pass the same independent gate. Event agreement does not verify transaction/receipt tries, protect against colluding providers, or guarantee finality.

Candidate `syncPlatformExchange` callers may pass both `chainReader` and `eventReader`. `openChainReadQuorum(configText,{createProvider,events:true})` exposes both interfaces. The existing candidate supervisor does not automatically propagate these new options into every stage/job path; worker integration must not be confused with universal candidate scheduler integration.

Collection replay tests rebuild two separate databases from mint/transfer/burn history, resume after reopening, compare sparse IDs, owners and activity, and preserve explicit checkpoint/freshness reporting. This is bounded fixture proof, not a live full-history ULTCAT/SISE backfill. Existing collection deployment identities and metadata renderers are unchanged.

Public indexed reads still have confirmation lag. Independent writes to a derived index do not turn it into a live balance guarantee. Agreement summaries are returned per step, not stored as an immutable audit trail.

## 2. Media provider contracts

`replicateVerifiedMedia` accepts 2–5 adapters with unique declared `id`/`failureDomain` and methods:

- `pinCar({root,archive,signal})`: explicit durable-side-effect request; use bounded provider-specific transport.
- `readCar({root,maxBytes,signal})`: independently retrieve CAR bytes, respecting the cap before allocation where possible.

Before side effects, the source CAR's CID, block hashes and supported-codec DAG closure are verified. Approval must be exactly `{confirm:'REPLICATE VERIFIED CAR',archiveSha256:...}`. Every counted copy requires verified readback; pin acknowledgements alone do not count. Partial results remain visible. There is no automatic deletion/rollback of successful pins and a timeout may mean a pin request completed later.

`createVerifiedCarGatewayReader` supports 2–5 distinct credential-free HTTPS gateway origins. It requests `/ipfs/CID?format=car`, follows no redirects, verifies returned content and falls through failures/corrupt bytes. Gateway availability is not pin retention. `verifyMetadataBytes` checks exact metadata bytes against an externally supplied SHA-256 before parsing JSON; it does not invent an authoritative expected digest.

The stock public metadata preflight still honestly states its existing ipfs.io retrieval scope; it was not relabeled as verified multi-provider retention. No real pinning provider adapter/credentials or paid pin request was selected in this batch.

## 3. Durable ciphertext delivery

`backup-delivery.js` provides explicitly initialized private SQLite stores (WAL, FULL synchronous mode, bounded capacity). It is a separate operational store, not a migration of product data. Pending/delivered/received ciphertext is retained; no automatic pruning or last-copy deletion. Caps: 128 artifacts, 4 MiB per artifact, 64 MiB aggregate. Exhaustion fails closed.

Outbox claims have expiring leases and random fencing tokens. A crashed process's sending claim can be reclaimed after expiry. A late old completion cannot settle a newer claim. Ambiguous acknowledgement retries send the same destination-bound content identity. Receiver deduplication makes these ciphertext deliveries idempotent; this retry policy must NEVER be applied to chain transactions.

HMAC authentication binds protocol, destination identity, key ID, digest and length. Ciphertext digest and a bounded recognized envelope are checked. Receiver acceptance means authenticated ciphertext storage, not successful decryption or restore. Encryption and delivery authentication should use separate random 32-byte private keys. The receiver need not possess the decryption key.

The HTTPS sender pins public DNS results, rejects any private address, requires a credential-free `/v1/backups` HTTPS URL on port 443, follows no redirects and bounds response/timeout. The receiver handler has bounded bodies/concurrency and sanitized errors. The operator CLI binds the receiver ONLY to 127.0.0.1 behind a separately configured TLS reverse proxy. Do not expose a plaintext receiver publicly. Configure proxy body cap 4 MiB, request limits and TLS authentication/termination appropriate to the host.

### Commands

Every invocation takes an absolute-path private JSON config file:

```sh
npm run independence:ops -- /absolute/private/config.json
```

All configs include `version:1` and `action`. Supported actions:

| Action | Required fields besides version/action |
|---|---|
| `outbox-init`, `receiver-init` | `database`: absent absolute private SQLite target |
| `queue-status` | `database` |
| `enqueue` | `database`, `keyFile`, `artifact`, `targetId` |
| `deliver-once` | `database`, `keyFile`, `keyId`, `url`; optional `timeoutMs` |
| `receive` | `database`, `keyFile`, `keyId`, `targetId`, `bind:"127.0.0.1"`, `port` |
| `export` | `database`, `keyFile`, `id` from queue/receiver status, absent absolute `output` |

The outbox and inbox must be separate stores. The API rejects confusing received and outgoing roles for the same content identity. Exported ciphertext remains encrypted; no keys are included. Initialize only disposable/approved targets, never point an initialization action at a live database.

Uninstalled templates are in `ops/independence/`. Review `/opt/rift`, `/etc/rift`, `/var/lib/rift-recovery`, Node version, user/group, TLS proxy and service access before installing. A timer delivers one pending artifact per invocation; it is not an automatically authorized deployment. Config/key files must be readable only by the service account. Keep outbox/receiver databases out of source exports.

## 4. Split database recovery

The new split set coordinates an **operator-attested stopped application SQLite database and a supported unified exchange SQLite database**. This is not online distributed atomic recovery and does not migrate the live product into split databases.

Requirements:

- Stop and fence all writers externally; attest `servicesStopped:true` with reviewer/evidence hash.
- Checkpoint/close WAL writers. Nonempty WAL/rollback journals cause capture refusal.
- Supply distinct source files and an absent target directory. Source digests are compared before/after capture.
- The exchange image must already contain the supported unified schema and supplemental namespaces; no auto-migration occurs.
- Each component and the final transport artifact are bounded. Large datasets must not be truncated to satisfy the cap.

Capture snapshots and encrypts each component, verifies readback, and publishes an authenticated `COMMITTED.json` last. Incomplete sets have no valid commit marker and are not restorable. Capture/restore scratch plaintext may remain after SIGKILL; private directories and operator cleanup review are required. No secure erase or hostile same-user ancestor-swap protection is claimed.

Restore plans bind the exact manifest and target path. Targets must be absent. Both encrypted components are authenticated before creating the destination. The exchange restore clears leases/increments fences, quarantines jobs and preserves recovery evidence using the existing unified restore policy. The application copy remains offline and requires application-specific operational review. A `QUARANTINED.json` marker is published only after both files are restored. Failure/crash can leave a partial private target: never start services from it or treat it as a committed restore. No source-of-truth selection or automatic replay occurs.

### Split CLI actions

All encryption-key files are private 32-byte files; `keyId` must match the captured set.

| Action | Fields |
|---|---|
| `split-capture` | `application`, `exchange`, absent `target`, `keyFile`, `keyId`, `approvalFile` |
| `split-inspect` | set directory `source`, `keyFile`, `keyId` |
| `split-plan` | set `source`, absent restore `target`, `keyFile`, `keyId`; optional absolute absent `planOutput` |
| `split-restore` | set `source`, absent `target`, `keyFile`, `keyId`, private `planFile`, private `approvalFile` |
| `split-pack` | set `source`, private `keyFile`, `keyId`, absent absolute `output` |
| `split-unpack` | sealed artifact `source`, absent set `target`, private `keyFile`, `keyId` |

Capture approval: `confirm:"CAPTURE STOPPED SPLIT DATABASES"`, `servicesStopped:true`, `reviewer`, `evidenceHash`.

Restore approval: `confirm:"RESTORE STOPPED SPLIT COPY"`, `servicesStopped:true`, `reviewer`, `evidenceHash`, and the exact `manifestHash` from the plan.

`split-pack` creates one AES-GCM authenticated `RIFTSP01` artifact containing both ciphertext components and their signed manifest, suitable for the outbox. Base64/container overhead means some individually valid pairs exceed the 4 MiB transport cap; these are rejected, not split unsafely or truncated. `split-unpack` authenticates the transport and manifest and checks every component before publishing the commit marker.

## 5. Required second-host drill — not performed locally

1. Owner designates independent disposable host, runtime, database/storage directories and quota. Record host/failure-domain identity separately from credentials.
2. Install/review code, Node and templates there; initialize the private receiver store and TLS proxy. Do not reuse production databases or expose signing/decryption keys through HTTP.
3. Capture/pack an approved cold fixture set; enqueue and deliver using a separate delivery-authentication key.
4. Verify receiver status and export the exact ciphertext by its destination-bound identity. With independently transferred decryption credentials, unpack, inspect, plan and restore into an absent quarantined directory.
5. Recompute projections, compare counts/owners/checkpoints/recovery evidence; inject interruption, lost ack and expired claims. Record initial failures as well as successful reruns.
6. Verify no service activated, no old lease works and no chain transaction was sent. Record host-specific power-loss/restart, disk limits, retention and access controls.

Local tests perform this protocol across separate stores/directories and restore both databases, but cannot establish physical host independence, power-loss behavior or real retention. No external targets or credentials were provided for such acceptance.

## 6. Signing and remaining boundaries

All new chain access is read-only; no user signing keys, custody services or automatic transaction resend were introduced. Existing wallet lifecycle tests remain part of the regression. Backup authentication/encryption keys are not wallet signing keys.

Database backend and hosting replacement is not universally finished: existing SQLite/libSQL/D1 and Node/edge paths have their existing scopes. This batch adds portable local operator interfaces but does not prove every feature can move between all hosts without changes. The production-wide adapter audit, very dense ranges, distributed online split consistency, durable agreement audit retention, actual media provider retention and hosted/device/independent-security acceptance remain explicit work. Do not interpret this runbook as permission to deploy, spend or activate trading.
