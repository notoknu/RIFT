# RIFT — remediation results

**Status: code remediation implemented and regression-tested; external launch gates remain open.** This is an assistant-led implementation review, not an independent security audit. No mainnet transaction was sent.

## Findings and fixes

| Finding | Implemented remediation | Verification / remaining boundary |
|---|---|---|
| Vulnerable dependency tree | Replaced EthereumProvider/AppKit integration with WalletConnect UniversalProvider and a small local QR/EIP-1193 adapter. Migrated to Node 22 / Hardhat 3, removed unused toolbox plugins, and pinned patched Zod/diff/glob/minimatch/serialize-javascript overrides. | Both full and production-only `npm audit` reports currently contain **zero advisories**. Compile, source export, all contract tests and app build passed. Cross-major overrides are covered by current smoke/regression tests, not a guarantee about every unused upstream API. Re-run audit in CI for future advisories. |
| Missing hostile-contract tests | Added malicious NFT, rejecting receiver, reentrant withdrawal/receiver actors and 60 deterministic randomized state transitions checking escrow/proceeds invariants after every action. | **20 contract tests pass**. This is not exhaustive formal verification, a comprehensive fuzzer campaign or an independent audit. |
| Admin operational mistakes | Marketplace now uses two-step ownership transfer and rejects renunciation. Existing owner restrictions and paused cancellation/withdrawal behavior remain. | Admin acceptance, unauthorized access, renunciation and callback tests pass. Existing deployments cannot acquire these changes; new deployments need the new reviewed bytecode. |
| QR sessions/rejection/cancellation | Local QR rendering, 2-minute pairing expiry, cancellation, rejection handling, chain/account events and saved-session initialization added without AppKit. | Adapter tests pass with mocked relay/provider. Injected-wallet browser tests use live Cronos portfolio reads. Real relay/mobile tests still need the public project ID and final HTTPS origin. |
| Explorer-only discovery | Optional durable SQLite/WAL standard-transfer index with checkpoints, transactional candidate writes, resumable backfill, adaptive RPC range backoff, confirmation delay, fork detection/full reset, and scan-time chain-change checks. Merges candidates with explorer discovery, then verifies balances/ownership on chain. | Synthetic indexing/failure/reorg tests and consistent backup/integrity check pass. Mainnet history has **not** been backfilled. It is not correct to promise complete holdings while backfill is incomplete or for nonstandard/no-event assets. |
| Process-local abuse protection | Shared Redis rate limits and cross-instance concurrency leases, fail-closed store errors, explicit proxy trust, read-only API method guard and URL limit. Production refuses missing Redis unless single-process mode is explicitly selected. | Real Redis test validates shared rate/concurrency limits across two app instances. Lease expiry protects against crashed instances; disconnecting clients do not immediately free slots while work may continue. |
| Unbounded artwork/fetch resources | Byte-bounded LRU image/metadata caches, per-fetch size/deadline limits, public-IP validation, pinned DNS, redirect revalidation and global outbound-fetch concurrency guard. Collection image proxy now uses the same protected fetcher. | Cache and prohibited-network tests pass. Public image rendering is still allowed by CSP; artwork hosts may observe browser/server requests. |
| Disabled CSP | Enforced script-src self, no inline script/event attributes, no objects/base URLs, restricted network/frame destinations and explicit embedding origins. Inline CSS remains allowed for existing React/Three.js dynamic styles. | Production page renders with CSP; browser-injected inline script was blocked. This is strict **script** policy, not a claim that inline style permission was removed. |
| Missing deployment safety | Read-only preflight, admin/chain validation, fresh matching preflight requirement, reviewed bytecode hash, local explicit approvals, atomic duplicate-deployment lock, submitted record, post-deploy owner/runtime verification. | No deployment executed. Signer funding, admin/multisig selection, independent review and transaction approval remain user/operator actions. Lock files deliberately survive failures; inspect nonce/chain receipts before removing them. |
| Missing operational setup | Nonroot multi-stage Docker image; Compose app/worker/private Redis/Caddy TLS; persistent data, memory limits, capability drops, security headers, health checks, aggregate request/error metrics, graceful shutdown, consistent SQLite backup script and CI test/audit workflow. | Production app tested locally with real Redis. Docker/Caddy/DNS/certificate issuance and live-host monitoring were **not** executed in this sandbox. Templates require deployment-specific configuration and validation. |

## Tests completed
- `npm audit` and `npm audit --omit=dev`: zero reported vulnerabilities at this run. Reports: `checks/dependency-audit-full.json`, `checks/dependency-audit.json`.
- `npm run contracts:test`: 20 passing, plus directory/discovery/metadata/search tests.
- `TEST_REDIS_URL=redis://127.0.0.1:6380 npm run test:security`: 7 passing, including real cross-instance Redis behavior, mocked WalletConnect, index checkpoints/reorg reset, SSRF rejection and byte-cache limits.
- Contract ABI/bytecode/Standard JSON compiler-input export passed after the Hardhat 3 migration.
- Production bundle build passed. Large-bundle and harmless upstream Rollup annotation warnings remain; these are not represented as security vulnerabilities.
- Wallet, launch and metadata browser regressions passed; mobile overflow checks passed.
- Production built application rendered with CSP and blocked an inline script injection attempt.
- SQLite online backup and snapshot integrity check passed with an isolated test database.

## External launch gates — cannot be truthfully marked fixed by code alone
1. Independent contract/application audit and acceptance of the final reviewed artifact hash.
2. Real WalletConnect pairing/mobile rejection/reconnect testing using the public project ID and final domain.
3. Operator-run standard-transfer backfill to the confirmation boundary; reliable archival RPC capacity, disk monitoring and indexing-lag alerts. Nonstandard assets remain outside any event-index completeness guarantee.
4. Provision the real HTTPS domain, TLS, persistent storage, Redis, scheduled backups, off-host backup retention and monitoring/alert destinations. Validate Docker/Caddy configuration on that infrastructure.
5. Select/fund the local signer and reviewed admin/multisig, verify preflight and deployment transaction, approve mainnet broadcast. Never share private keys in chat.

The implementation and test work closes the code-level issues listed above; it does not grant an audit certificate or make the system automatically safe to launch.
