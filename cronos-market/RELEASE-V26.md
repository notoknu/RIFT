# RIFT v26 — bounded read resilience and cancellable collection loads

## Implemented
- Read-only RPC provider exponential cooldown (5-second base; exponential base capped at 60 seconds, plus up to 20% jitter). Retry-After seconds/date on HTTP429/503 is respected up to an overall 120-second cooldown. There are no timer-driven retries; a later explicit request is required. State is per transport instance, not a global cross-app quota manager.
- Pause/reset abort active fetch controllers and invalidate stale results. A stale chain probe cannot verify/quarantine an endpoint or clear a newer replacement probe after reset. Reset preserves wrong-chain quarantine and does not resume a paused transport.
- Detached transport diagnostics expose provider indexes, verification/quarantine/cooldown state, bounded failure category and retry interval; not URLs, request parameters or server error bodies. This is a transport API, not a new global diagnostics dashboard.
- Launch collection loading accepts AbortSignal. The UI provides Cancel collection read, cancels on address/provider changes or unmount, and rejects stale completion. Checks bracket individual reads, preventing cancellation-triggered fallback or publication.
- Failed snapshot workers stop queuing remaining fields. Terminal contract reverts/input errors are not hidden by whole-snapshot provider fallback. The fixed-block/before-after-hash snapshot guarantee is retained.

## Scope and limits
Only allowlisted reads use this transport. No signing/broadcast/replay or wallet connection changes were introduced. The launchpad creates a fresh transport per provider/snapshot; cooldown is not persisted across separate loads. Broader global provider controls and cross-tool rate-limit coordination remain unfinished.

Controlled browser/unit tests are not real provider, wallet or device acceptance. Build/report counts and hashes belong in ANDROID-BUILD-REPORT.json and the delivery report. No paid resource, deployment, funded wallet import or mainnet spend is inferred. Native signing remains disabled/unapproved.
