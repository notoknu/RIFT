# Projection read repository boundary — Phase 4B

## State
Source implementation only; not executed or verified. Phase 4B remains in progress. Continuation55 adds opt-in existing-schema libSQL reads for three Node APIs, not remote ingestion or whole-product database substitution. Existing libSQL accounts support remains separate. Worker D1 parity is separate.

## Implemented boundary
`shared/projection-read-contract.js` defines capability, binding, query and error contracts for collection, legacy-market and exchange repositories. Repositories expose only their read methods, capabilities and close; no public db or sync handle. This is an interface check, not a sandbox against malicious injected code.

`server/projection-read-models.js` extracts the existing SQL read models behind asynchronous get/all ports. Pagination, deployment coverage, collection image transformation and exchange live-settlement warnings are retained in source. JSON response compatibility has not been executed.

`server/sqlite-projection-read-repository.js` opens an existing target read-only per operation, starts a read transaction, validates schema and deployment binding, executes reads and rolls back/closes. It does not initialize or migrate the target. Schema fingerprints come from the existing index constructors with in-memory databases only, cached per kind. The constructors can still perform their existing directory setup for the memory path's current directory.

The collection API accepts `createRepository(configuration)` and closes that request's repository. Market/exchange accept `createRepository(configuration)` and retain a repository behind a draining slot. Returned repositories must meet the named kind's contract. Factories are dependency injection points, not backend admission or runtime conformance certification. Collection factories must return independently owned instances; do not return a shared singleton that another request can close.

The market API retains explicit `createIndex` injection through an accurately labelled legacy bridge. That bridge is neither read-only nor snapshot-isolated; production defaults use the new SQLite adapter. The legacy factory is synchronous.

## Operational requirements and failure semantics
Provision and populate indexes through the existing ingestion workflows before serving their indexed routes. A missing index now fails unavailable rather than being created by an HTTP read. Configuration, schema, storage and cleanup failures map to HTTP 503; typed invalid query errors map to 400. Collection indexed storage errors previously looked like invalid queries; they are now deliberately distinguished. Untracked enumerable collection reads are unchanged.

SQLite target and present sidecars must be regular, singly linked files without group/world write bits. Target identity is checked around operations. Exact schema matching rejects additional schema objects, including otherwise benign extra indexes; coordinate legitimate schema changes with ingestion constructors and this adapter. No automatic permission repair or migration occurs. WAL readers may interact with SQLite sidecars; read-only is not a guarantee of zero filesystem effects. Parent-directory symlinks and hostile filesystem replacement races are not fully fenced. Use trusted, private local directories.

Default adapter concurrency is eight per repository. Collection admission is eight indexed requests per plugin; market/exchange slots admit sixteen operations, with the adapter rejecting excess concurrent reads. Limits are overload rejection, not a queue or hard execution deadline. SQLite is synchronous; large scans can block the event loop. Paging responses does not bound aggregate SQL work. A request has a consistent SQLite snapshot; separate pages are not snapshot-pinned together.

## Still required
Implement and explicitly admit any alternative projection adapter with its real transaction and schema semantics, runtime ownership and credential lifecycle. A generic SQL port alone is not backend support. Reconcile support-contract evidence with actual admission, retain unsupported profiles, then continue Phase 4C/4D. No live cutover, deployment, signing, trading or spending has been authorized. Wallet-only signing and the 1 CRO ceiling remain unchanged.


## Continuation55 — opt-in libSQL read adapter
`server/libsql-projection-read-repository.js` uses the existing declared `@libsql/client` dependency, loaded only for remote selection. It uses a read transaction per operation, validates the exact schema fingerprint and chain/deployment binding in that transaction, then reuses the same read models and cleans up the transaction. It exposes no writer/provisioning interface. The dependency was not installed or imported during implementation.

`server/projection-read-repository.js` selects SQLite unless a matching entry exists in `RIFT_PROJECTION_READ_CONFIG_JSON`. All three Node API defaults now call this selector. Injected factories still take precedence. Invalid selected entries fail closed, without remote-to-local fallback.

The JSON top-level keys are `collection`, `legacy-market` and `exchange`. Collection is a map keyed by lowercase collection address, allowing one independently bound database per collection. Legacy-market/exchange each take one endpoint object. An endpoint object's exact fields are:
- `driver`: `libsql`
- `url`: root `libsql://` or `https://` URL, no userinfo/port/query/fragment
- `approvedHost`: exact lowercase reviewed public DNS hostname matching URL
- `authTokenEnv`: uppercase environment variable name holding the credential, not a token value
- `readOnlyCredentialAcknowledged`: `true`

Supply a server-enforced read-only credential. Acknowledgement is an operator declaration, not a token permission audit. Read transactions and SELECT-only internal ports reduce accidental writes but cannot audit remote operator behavior. Host pinning does not pin DNS addresses or replace network egress controls. No arbitrary endpoint discovered from request parameters is accepted. Do not put credentials in URLs or saved reports.

Each remote repository admits four concurrent operations by default; each operation permits at most64 query statements and checks a15-second cooperative deadline before/after statements. This does not cancel an in-flight SDK/network operation or bound received response bytes. Closing drains admitted work; a stalled transport can delay draining. Platform/SDK server request limits, network egress and response limits remain required before production admission. There is no automatic retry that could hide switching datasets.

Schema matching remains exact, including SQL text. Provider-added non-SQLite schema objects will be rejected unless supported through a deliberately reviewed schema contract. There is no automatic schema loosening. A compatible schema must already exist and be kept fresh independently; this change does not implement remote ingestion, copying, live migration, freshness certification, cold-selector consumption or remote status inspection.

Market/exchange retain selected clients until close/reopen; credential/configuration rotation therefore requires a drained restart/reopen. Collection creates an independent client for each admitted request. No deployment profiles were relabelled as full libSQL projections: the existing account-only libSQL profile still defaults to SQLite projections.

### Remaining Phase4B work
Remote projection provisioning/ingestion or explicitly scoped owned publication, credential/reload operational wiring, status and consumer coherence, and a reviewed supported-combination admission boundary remain. The adapter is implemented source, not an accepted production backend. Phase4C/4D and Phases5–8 also remain. No credentials, endpoints or workloads were activated.


## Continuation56 — bounded owned remote projection publication
Implemented source for local snapshot export, target-pinned remote plan, hash-reviewed transactional libSQL provisioning/replacement/readback and retry outcome reporting. Private CLI/receipts and conservative remote-selection status added. Not executed; accepted-source/coverage admission, full backend-aware status/consumer coherence and credential lifecycle remain. Five top-level phases and seven work packages remain open. See report56 and PROJECTION-PUBLICATION-RUNBOOK.md. MD/TXT preserved; wallet-only signing and1 CRO ceiling unchanged.


## Continuation57 — bounded Phase4B source scope completed, unverified
Added required source review/evidence pins and v2 publication plans, selected-backend asynchronous status, production plugin draining and a bounded hybrid read-snapshot source profile. Earlier v1 publication instructions are superseded: plan/apply require acceptedSourceHash and evidencePaths; plan also requires acceptancePath. See PROJECTION-SOURCE-ADMISSION-RUNBOOK.md and report57. Five top-level phases / six work packages remain (4C/4D/5/6/7/8). Broader remote ingestion, semantic evidence automation, wallet/cold-selector integration and recurring credential lifecycle remain excluded/incomplete, not silently closed. No tests/builds/syntax checks/network/activation; wallet-only signing and1 CRO ceiling preserved.
