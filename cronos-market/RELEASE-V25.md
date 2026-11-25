# RIFT v25 — export staging failure isolation

## Change
ExportSession now becomes terminal and closes its private staging stream when a write, flush, close or checksum operation fails, or when its monotonic deadline is invalid/expired. It cannot resume after a potentially partial write or consumed digest. Cleanup errors are attached as suppressed exceptions without replacing the original failure. Null staging streams are rejected at construction. A merely incomplete finish remains recoverable before the deadline, allowing remaining chunks to arrive.

The existing NativeExports caller already cancels when these operations fail; this change independently enforces failure isolation inside the reusable staging state machine. It does not make document-provider output atomic: an interrupted final SAF copy can leave an empty/partial chosen destination, as the existing UI warns.

## New regression coverage
checks/native/ExportFailureHarness.java executes real JVM OutputStreams with deterministic injected partial-write, flush and close faults. It covers terminal state, suppressed cleanup exceptions, checksum failure, backwards/expired time, no post-failure writes, idempotent close, incomplete-then-complete success and null stream rejection. 55 assertions passed in the focused run. It is included in checks/native-policy.test.mjs and therefore the full engineering suite.

## Acceptance limits
This is a native source change; v24 APKs do not include it. Use only a successfully built and verified v25 artifact for this change. Build status and exact hashes are recorded in the v25 deliverable report, not inferred here.

No Android hardware/cloud execution is implied. The existing 19 instrumentation tests remain compiled-only until run with authorized hardware/account access. This harness does not prove SAF provider behavior, credential/biometric protection, process-death recovery or WalletConnect pairing. Native signing remains disabled/unapproved, with no funded-wallet import or mainnet spending.
