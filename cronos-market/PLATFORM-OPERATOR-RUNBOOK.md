> **Batch14 update:** unified single-co-located SQLite recovery now includes exchange/journal/stage/job/review/archive state, streaming authenticated encryption/readback, exact quarantine restore, local key rotation and isolated drill. This is not split-database/hosted backup, actual off-host retention or production authority. See UNIFIED-RECOVERY-RUNBOOK.md and updated WORK-OWNERSHIP.md. Older lists below are historical.

# Candidate operator CLI and bounded supervision — Batch13

## Scope

`npm run platform:operator -- <command> --config /absolute/config.json`

New modules: `server/platform-exchange-operator.js`, `server/platform-exchange-supervisor.js`; entrypoint `scripts/platform-exchange-operator.js`. They expose the Batch12 dispatcher/jobs without changing production routes/indexes/worker entrypoint or installing any service. CLI database support is **existing local files only**, not hosted URLs. The dispatched chain provider is an explicitly configured HTTPS RPC environment reference.

No schema initialization, stream binding, job enrollment, expiry quarantine, review acceptance, archive/prune or production selection command is exposed. Use existing reviewed tooling for those explicit operations. No daemon, cron, timer, Render/systemd service or external alert sink was installed.

## Configuration

`deployment/platform-operator.example.json` is intentionally invalid until exact reviewed address/runtime/path values replace its markers. It is not a runnable default. Required `format=rift-exchange-operator-v1`, `purpose=candidate-only`, absolute queue path,1–32unique exact stream bindings and local index/journal/stages paths. Each stream references only an environment variable named `RIFT_RPC_[A-Z0-9_]+`; no URL/token is written in the config. Unknown fields, duplicate streams, relative paths and unsupported bounds are rejected.

Each configured binding must match any enrolled job for that stream exactly before the CLI can claim work. Existing independent SDK clients may point to the same disposable file if all required namespaces coexist; otherwise use reviewed separate files. Do not substitute existing production databases. Candidate-only is a safety declaration, NOT proof of target authorization or isolation.

Config file read uses O_NOFOLLOW and size+1 bounded read, maximum64KiB. Existing database paths must be regular non-symlink files before SDK clients are constructed. No missing database file is auto-created by the CLI. File existence checks do not pin database identity: trusted owner-controlled directories/files must not be swapped after validation. No filesystem permission/host sandbox or hostile local-admin defense is claimed.

RPC values must be HTTPS DNS endpoints without userinfo/query/fragment/non443port, literal IPs or obvious local hostname suffixes. URL path may hold a provider API token but is only fingerprinted, never printed or persisted. This is operator-controlled configuration, NOT an SSRF boundary for untrusted tenants: DNS rebinding/private resolution and malicious operator environment remain outside this validator. Protect environment/process access and use a reviewed RPC allowlist/network policy before deployment. Hosted database support is intentionally absent in this CLI.

## Commands / mutation boundaries

### validate — offline

Validates syntax, binding and loop bounds only. Does not resolve RPC environment variables, construct SDK/provider clients, create/open databases, call network, initialize schemas or enroll work. Returns normalized configHash, stream count, offline=true and productionSelection=false. Paths and secrets are not printed.

### plan — offline

Resolves configured RPC environment references and validates endpoint syntax, without DNS/network/client construction. Returns configHash, per-stream endpoint fingerprints and planHash binding normalized config plus exact endpoint fingerprints. No endpoint URL, token or database path is printed. Missing/unsafe endpoint refuses a plan.

### inspect / health — local database reads only

Require existing regular database files. No RPC environment or provider is needed. Queue schema/integrity and enrolled-binding compatibility are checked. `inspect` returns whitelisted queue snapshot without claim owner/token plus health. `health` returns counts/status only.

Readiness is **queue-only**, not chain freshness, runtime compatibility, index completeness, hosted durability, live lease ownership, independent security or production readiness. It does not inspect every stream's exchange/journal/stage schema; dispatcher does so before work. It does not quarantine expired jobs or resolve recovery automatically.

Counts ready/running/review/paused/expired/unconfigured. Review jobs, expired running executions or ready jobs lacking runtime configuration block admission and produce exit2. Nonexpired running claims are not falsely marked expired; ready jobs on other streams can be dispatched subject to existing coordination. Paused jobs are counted, not resumed. Empty queue can be queue-ready without proving any backfill exists.

### run — explicit mutation opt-in

Requires `--approve <planHash>` exactly matching a freshly recomputed plan from current config/endpoints. A changed config/provider changes the commitment. This is explicit operator intent, **not authentication, independent approval, authorization to use a target, spend approval or production activation**.

Only after approval/files/schema/binding checks does CLI construct runtime providers/SDK factories. Existing job claims/completions and normal journaled exchange/stage publication may mutate the selected candidate files. It does not initialize/enroll/rearm/prune. `purpose=candidate-only` and hashed endpoints are not permission to operate a live deployment.

No run command against actual Cronos/hosted targets was performed in this pass. Tests used disposable databases and controlled providers; the real child CLI signal test scheduled future-due work and made no dispatch/provider reads.

## Bounded loop and circuit behavior

Supervisor bounds:1–1000ticks(default1),1–8jobs/tick(default4),100–60000ms interval(default1000),1–3600000ms aggregate acquisition/wait budget(default300000). It is foreground and finite, not an unbounded installed daemon.

Every tick opens a fresh owned queue client, asserts schema and reads health. Blocked readiness emits a code-only alert and stops before claims. Scheduler runs its bounded jobs; queue health is reread after completion. Emits one bounded JSON heartbeat with tick/claim/finish counts and health counts. No cumulative event log is retained in supervisor memory. Errors/uncertainty/review open the circuit; no generic automatic write retry or expired-running reclaim.

Fresh queues close every tick, including errors. Alert callback is injected trusted code; CLI uses JSON lines on stdout. Sink exceptions stop with ALERT_SINK_FAILED, without rerunning already published work. Schema/storage errors emit sanitized code-only alerts when sink works. No webhook/email/SMS alert transport, authentication, persistence/rotation or delivery SLA is provided.

SIGINT/SIGTERM aborts admission/read acquisition and idle waits; dispatcher still does not race an invoked commit into a false unwritten result. Job completion/quarantine attempts and cleanup are allowed to finish. A second signal can terminate the process; restart must respect persisted running/review states. Underlying non-cancellable RPC reads, SDK/database calls, event sinks and process/platform scheduling are not guaranteed hard deadlines. Expired claims can still require explicit investigation/quarantine/review.

Per-dispatch bounds and conservative quarantine remain those in EXCHANGE-JOBS-RECOVERY-RUNBOOK.md. The supervisor does not change transaction/event/retention limits or broaden automatic retry semantics.

## Exit statuses

-0: successful validate/plan, queue-ready inspection or exhausted finite tick/time budget. Time-budget exhaustion is not backfill completion.
-1: configuration/schema/storage/sink/other stopped error.
-2: queue/recovery review required; no automatic expiry reclaim/rearm.
-130: graceful explicit cancellation.

The script prints a final JSON result; run may print preceding sanitized heartbeat/alert JSON lines. Health output has no endpoint, key, claim token or owner. Job results were whitelisted by Batch12; do not treat output as safe for hostile manually corrupted databases or public unauthenticated exposure.

## Tested versus pending

30new tests: offline config/plan validation, bounded/symlink/unknown-field refusal, endpoint fingerprints, approval gate before client creation, existing-file refusal, binding drift, health exit codes, actual child CLI validation/SIGTERM, bounded work, fresh-client ticks, review/expiry/unconfigured circuits, sanitized provider/schema/sink faults, cancellation/deadline, lost finish acknowledgement and short12tick idle soak.

The12tick test is a short local resource/lifecycle check, NOT a long-duration fleet/hosted/load soak. Actual deployment, service management, HTTP health endpoints, external alert transport/rotation, credentials/network hardening, operational SLA, secure unified recovery backup/restore and independent hosted/device/security acceptance remain open. No hosted probe/write, deployment/migration, paid provisioning/spend, trading/native signing or new APK.
