> **Latest engineering/ownership checkpoint:** report 37 closes candidate scheduler/stage agreement propagation, adds durable pre-publication evidence, multipart/streaming larger backup transport, a concrete Kubo media adapter and an explicitly pinned replacement libSQL host. Final engineering 1,034/1,034; focused 168/168; contracts 64/64; remaining gates pass. Remaining source work is explicitly M1–M5 in `INDEPENDENCE-WORK-OWNERSHIP-LEDGER.md`, not delegated to owner testing. See `../RIFT-deliverables/37-INDEPENDENCE-ENGINEERING-CONTINUATION-AND-OWNERSHIP-REPORT.md`. No live deployment/spend/activation. Earlier sections remain historical.

> **Current continuation — infrastructure independence:** opt-in read-only RPC failover plus independent header/event publication checks now cover local market, exchange and collection worker paths. Cold split recovery sets, sealed transport, authenticated durable receiver/outbox, verified CAR replication/gateway interfaces and operator commands are implemented with local tests. Final engineering 995/995, focused 128/128, contracts 64/64; implementation/build/browser/security/Android-shell gates pass. This is not live provider retention, second-host acceptance, online distributed consistency, universal adapter completion or production activation. See `../RIFT-deliverables/36-INFRASTRUCTURE-INDEPENDENCE-EXTENDED-IMPLEMENTATION-REPORT.md` and `INFRASTRUCTURE-INDEPENDENCE-RUNBOOK.md`. Earlier sections remain historical.

> **Current checkpoint — Batch17:** Batch15–16 added authenticated filesystem vault inventory/publication, readback audit and selected quarantined restore drill. Batch17 adds reviewed selected-artifact replication between separately keyed pinned filesystem vaults, explicit partial-commit/inspection evidence, bounded audit monitoring, opt-in signed public-HTTPS notification transport, and uninstalled non-root audit service/timer templates. Local tests are not deployed/off-host/device/independent acceptance. Current ownership split: `WORK-OWNERSHIP.md` and `../RIFT-deliverables/31-INDEPENDENCE-BATCH17-REPORT-AND-WORK-OWNERSHIP.md`. Earlier lists below remain historical; newly implemented local capabilities must not be listed as completely unimplemented. No production changes/spending.

> Batch14: a single-co-located-SQLite unified authenticated-encrypted capture, verified quarantined restore, local key rotation and isolated recovery drill are now implemented/tested. Split-database/hosted capture and actual off-host transport/inventory/retention remain open. See UNIFIED-RECOVERY-RUNBOOK.md.

> Batch13 adds strict offline/operator planning, read-only queue health, explicit committed local-candidate run and bounded foreground supervision with graceful signals/circuit stops. See PLATFORM-OPERATOR-RUNBOOK.md. No installed daemon or hosted support in this CLI.

# RIFT remaining work — ownership after Batch14

## Current position

Substantial assistant engineering remains. It is not all waiting on the owner. The current completed local path includes authoritative exchange repository/query candidate, bounded header/log/receipt acquisition, adaptive scan, journaled publication/reconciliation, matching-publication review and acknowledged-intent archival, bounded snapshots, persisted single-block staging, finite stage worker, integrated range-to-stage dispatch, durable bounded jobs/finite scheduling, reviewed exact stage-marker closure, reviewed fenced job rearm and terminal-stage archival.

Production still selects existing local indexes. None of this is hosted-primary, live independent completeness, independent-security or actual Android/native-wallet acceptance. See EXCHANGE-JOBS-RECOVERY-RUNBOOK.md and audit/independence/batch12-results.json for current evidence/bounds.

## Mine — unfinished engineering I should continue

| Area | Already implemented locally | Still mine |
|---|---|---|
| Worker/job integration | Integrated receipt-range→stage dispatcher;32persisted jobs; finite scheduler; due-time selection; lease-busy exponential delay; expiry quarantine; inspection; pause; reviewed rearm | Validated local-only operator CLI, bounded foreground supervisor, fresh-client restart ticks, code-only health/alert events, circuit stops and graceful SIGTERM now implemented in Batch13. Still mine: actual service integration, external alert delivery/rotation/HTTP endpoints, runtime/network hardening, fleet/jitter/circuit policy refinements and meaningful long-duration/load/hosted soak. Not deployed. |
| Transaction-heavy blocks | Hidden4096transaction staging,32receipts/step, CAS/restart/SIGKILL tests, one complete atomic checkpoint, automatic recognized-gate fallback | >512matching events and other final repository bounds require a larger-event strategy; not solved by partial checkpoints. Real-chain compatibility/completeness policy remains. |
| Recovery | Journaled one-write attempts; fresh exact observations; matching intent review/archive; exact acknowledged stage-marker review; fenced job rearm; terminal-stage archive/prune | Unchanged/conflicting/superseded/nonmatching/absent-or-pruned-intent recovery strategies; audit rotation; tested recovery interaction with reorgs, later revisions and long-running jobs; integrated operator UI/CLI. |
| Durability/backup | Bounded exchange snapshots; existing general encrypted snapshot tools; local verified journal/stage archives and retained review/audit evidence | Single-co-located SQLite unified backup/restore, AES-GCM streaming/readback, authority/job quarantine, local key rotation and ephemeral isolated drill now implemented in Batch14. Still mine: split-database/hosted recovery protocol, off-host transport/inventory/immutable retention/key-custody integration, revocation policy, primary-loss/partition/power-failure and actual hosted restore drills. Local encrypted copy/drill is not off-host acceptance. |
| Hosted primary | Opt-in repository/schema and bounded tooling | Complete safe acceptance automation, migration/transaction/consistency/quota/restart/restore tests against designated disposable target; authority/cutover/rollback plan and implementation. |
| Independent acquisition | Exact binding/runtime checks, bounded receipts/headers and event decoding; no mandatory competitor scan for this candidate exchange path | Independent completeness/quorum/trie policy, live Cronos provider compatibility, proxy/admin/runtime policy and security review. One provider remains trusted. |
| Remaining platform | Existing UI/workflows and exchange candidate modules | Complete authoritative collection/wallet/statistics projections, remaining mandatory explorer/competitor dependency removal, shared API/service/public API/SDK and acceptance. |
| Creator/security/device | Existing ULTCAT renderer/SISE creator-hosted paths preserved; prior native policy/artifact tools/tests | Further creator/offline/security/device test preparation and fixes; test exact production/release candidates. Local checks do not approve native signing/trading. |

I should not ask you to write code, run SQL, purchase RPC/accounts or repeat secrets as a substitute for this work. A final production switch must not happen merely because local tests pass.

## Yours — genuine owner decisions / physical actions

1. **Physical locked-device participation** when exact artifacts/instructions are ready: install and operate the dedicated Android device/profile, unlock/approve only reviewed prompts, provide sanitized results. No funded-wallet import or seed/private-key sharing.
2. **License and official-platform rights decision.** Code packaging does not grant external rights or choose an open-source license for you.
3. **Reviewed consequential approvals** for exact production migration/cutover, release/signing/trading or spend plans when ready. Continuation does not raise the cumulative1CRO cap, approve a signer, enable trading/native signing or authorize new paid resources.
4. **Specific owner-only access/settings** only where tooling demonstrably cannot act. No such immediate request is needed for the next local engineering work. Existing private inputs are preserved; no secrets need to be pasted into chat.

## Joint / external acceptance

| Gate | My work | Owner/external participation |
|---|---|---|
| Disposable hosted-primary acceptance | Prepare safe scripts, dry-run/evidence/rollback, execute approved bounded test scope and fix failures | Confirm exact disposable target and reviewed mutation plan; required access/settings only if necessary. No production data substitution. |
| Independent security / activation | Prepare reproducible artifacts/threat model/tests, address findings and gate releases | Appropriate independent review; owner reviewed release/signing/trading decision. My local tests cannot replace independence. |
| Android/native-wallet acceptance | Prepare exact artifact binding, scripts, sanitized result parser and fixes | Physical device/native-wallet interaction in dedicated safe profile. Historical APK is not acceptance. |
| Rights / official platform release | Document technical/license dependencies and package clean source | Owner/rightsholder decision; external rights cannot be inferred from code. |

## Recommended next engineering order

1. Extend the now-implemented CLI/bounded supervision into reviewed service operations, external health/alert transport and long-duration/load acceptance; prioritize secure unified recovery backup/restore alongside this.
2. Extend the implemented co-located unified recovery into reviewed split/hosted and off-host transport/inventory/retention/key-custody operations; continue nonmatching recovery/audit rotation.
3. Larger event-dense block strategy and independent acquisition/live compatibility tests.
4. Hosted acceptance and reviewed API/worker authority selection, followed by remaining collection/wallet/stats/public API/SDK work.

These are engineering priorities, not a claim that everything else is owner-blocked. No immediate owner action is required for the next local pass.
