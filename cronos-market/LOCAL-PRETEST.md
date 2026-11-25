# Local pre-release environment

## Operating rules

No official deployment, no collection creation, no mainnet spending and no paid resources. Never load the funded wallet or the secret-bearing reference attachment into this environment.

The local app preview runs on port 4180. It serves the real built frontend and Node server. Creator accounts are deliberately disabled on the shared preview because no exact trusted public authentication origin was configured. Sign-in/profile save and persistence are exercised by the isolated browser/API tests with disposable wallets and temporary SQLite databases. Do not mistake the disabled preview profile API for live profile acceptance.

## Executable validation

`node scripts/local-pretest.mjs` sequentially runs contract artifact export, local contract suite, production frontend build, engineering tests, implementation checks, real browser scenarios, Worker/D1 browser tests, split-auth tests and a source heuristic audit. It writes per-stage logs and timestamps to checks/pretest/<run>/ and checks/pretest/latest.json. Failures remain visible; they do not become passed because later stages succeeded.

Use supported Node 22 and JDK 17 on PATH. Android instrumentation/device tests are NOT executed by this runner; the v21 APK has a separately recorded JVM/lint/build baseline. Redis security tests are NOT included in this runner and require a separately isolated Redis test setup. Do not treat source heuristics as a security audit.

## Twelve-hour target

`node scripts/local-soak.mjs` samples the fixed local preview once per minute for a 12-hour target, saving individual results and a summary. It checks health/chain identity, SPA HTML, contract artifact shape, and the intentionally disabled account response. It is read-only and does not enumerate tokens, hit paid providers or sign anything.

This is HTTP availability sampling, NOT 12 hours of end-to-end user interaction or proof that every feature works. completed12Hours stays false until the full duration actually elapses. A running process can be interrupted by sandbox shutdown; no unattended 12-hour availability guarantee is made. If interrupted, retain its incomplete report rather than merging samples into a claimed uninterrupted run.

## Release gates not established locally

- Actual Render persistent disk, profile retention across redeploy and isolated recovery.
- External pinning-provider permissions, free quotas, durable replication and gateway reachability.
- Source-verification submission and acceptance by external services.
- External marketplace indexing/listings and owner presentation permissions.
- Real-device Android wallet pairing, authorization and lifecycle behavior.
- Independent security review, abuse/load testing, operational alerts and license/rights review.
- Completing missing integrations listed in RELEASE-V21.md. A green regression suite proves existing tests pass, not that absent features exist.

Do not push officially while any release-critical gate remains unresolved. Inspect the timestamped reports before making claims about results or elapsed time.
