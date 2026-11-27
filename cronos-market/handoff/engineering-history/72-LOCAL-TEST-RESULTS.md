# Local test results — pass72

Executed with project Node v22.23.5 after npm ci. No deployment, live-chain transaction, spending or production activation.

| Check | Result |
|---|---|
| Local engineering | 1,079 passed, 48 failed; 1,127 total |
| Implementation | 6 passed |
| Security | 5 passed, 1 failed, 1 skipped |
| New workflow-review regressions | 3 passed |
| Contracts, local Hardhat simulation | 64 passed |
| JavaScript syntax: server/shared/edge/scripts | 249 checked, no syntax failures |
| Selected failures rerun sequentially | 30 passed, 18 failed, 1 skipped (overlaps suites above) |

Not a clean pass. Sequential reruns reproduce selected failures, so these cannot all be dismissed as parallel test contention.

## Initial triage, not completed remediation
- Exchange replay: two existing failures match changed error wording (`underflow` expected, `Invalid fill quantity` returned); invalid quantities are still rejected.
- Complete-block/receipt paths: canonical receipt quantity/provenance validation fails on exercised inputs; quorum then reports unavailable. Fixtures include normalized numeric fields whereas the shared scanner requires RPC hex quantities. Production adapter and fixture contracts need reconciliation without weakening provenance validation.
- Security/index crash tests: strict index admission rejects exercised commit inputs; disposable crash fixture uses `committed-hash` rather than a canonical block hash. Full cause review remains necessary.
- Chain reader API assertion predates added bounded readTimedCheckpoint method.
- Multipart retention/acknowledgement and Worker discovery/catalog/ranking tests fail assertions and need further investigation. Other engineering failures include dense D1 and SDK registry paths; see complete logs.

Added `checks/workflow-review-regression.test.mjs`: replay identity/type/participant/value/criteria/refund checks and cross-artifact metadata/lineage/intent checks. These focused unit cases do not exercise the full filesystem production workflow or establish all phases complete.

Contract suite initially could not load its optional EDR native binding. Installed exact matching 0.25.1 binary in node_modules (no package/lockfile edit), then all64 contract tests passed on local simulation.

Logs: `/home/user/RIFT-records/72-{dependency-setup,local-engineering,implementation,security,workflow-regression,contracts,contracts-retry,isolation,syntax}.log`.

No frontend build, browser/device tests or hosted/provider acceptance was performed. Phases5–8 remain open. No production source changes made in this testing pass.
