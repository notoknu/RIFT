# Reported test failures resolved — pass73

All failures reported in pass72 have been resolved in local reruns. This is bounded local verification, not whole-product completion or hosted acceptance.

## Final results

| Check | Final result | Log in `/home/user/RIFT-records/` |
|---|---|---|
| Local engineering (now includes workflow-review regressions) | 1,133 passed; 0 failures/skips | `73-local-engineering-final.log` |
| Implementation | 6 passed | `73-implementation.log` |
| Security with disposable real Redis | 7 passed; 0 failures/skips | `73-security-redis.log` |
| Local contract simulations | 64 passed | `73-contracts.log` |
| Focused quorum/workflow rerun | 21 passed (overlaps engineering) | `73-quorum-regression-final.log` |
| JavaScript syntax | 249 files checked, no failures | `73-syntax-final.log` |
| Frontend production build | Passed | `73-build.log` |

## Production fixes

- Added typed receipt-validation errors and defensive hash-type checks. Complete-block quorum now distinguishes contradictory/malformed returned receipt evidence from transport outages. A malformed provider cannot be silently outvoted by healthy peers. Genuine transport outages remain eligible for bounded failover/quorum. Added explicit regression cases for omitted receipt logs, invalid status, wrongly typed receipt hashes and transport failure.
- Restored `underflow` wording in invalid fill-quantity errors for existing replay consumers without relaxing quantity validation.

## Fixture and expectation repairs

- Receipt fixtures now supply canonical JSON-RPC status and per-log transactionIndex fields. Strict scanner validation was retained.
- Index security/recovery fixtures now supply real-format checkpoint hashes and correctly encoded ERC20 event data. Real SIGKILL/WAL recovery tests pass again.
- Cache fixtures now use provider-policy-scoped keys and expiration timestamps consistent with cache admission. Worker ranking/catalog failure-retention tests pass.
- Read-only collection API fixture explicitly initializes its index before public reads; HTTP requests still cannot create/migrate target indexes. Edge listing fixture supplies the required marketplace binding.
- Reader API expectation includes bounded readTimedCheckpoint; factory fixture supplies the required receipt adapter capability.
- Multipart retention expectation now matches cohort protection: standalone pruning must not destroy multipart pieces. The test separately verifies that a missing required piece prevents complete acknowledgement.
- Added workflow regression file to the ordinary engineering command so it is not omitted from future runs. No tests disabled; final listed suites have no skips.

## Limits and environment

Node v22.23.5. Redis8.0.2 ran only on local loopback with persistence disabled, then was stopped. Contract tests used local Hardhat simulation, not Cronos mainnet. Dependency binaries remain disposable environment setup, not deployment artifacts.

Build emits a non-fatal warning about chunks over500kB. SQLite prints its experimental-feature warning. Neither is a test/build error. Redis host memory-overcommit warning was observed; no host sysctl changes were made, and persistence/replication readiness is not claimed.

Browser/device, real external provider and hosted acceptance were not run. No production deployment, trading, spending, signing, pointer activation or production data cleanup occurred. Phases5–8 remain incomplete. Earlier reports and all historical Markdown/text are retained.
