# RIFT hybrid v14 — persistent contract-scoped discovery

Engineering/debug preview, not launch acceptance. This work does not assert a five-hour elapsed session or completion of all marketplace engineering.

## Added

- Explicitly consented native SQLite discovery index, scoped by Cronos owner/contract/ERC721-or-1155. Local load/delete work offline; start/resume require an allowed network mode and current user-owned connections.
- Persistent block hash/range, revision, pages and deduplicated token-ID hints. Limits: 16 scopes, 1000 IDs/scope, 10000 accepted scan pages, 200-entry views. Each request retains the 2000-block/512-log/200-ID transfer-page bounds.
- Resume overlaps up to 12 blocks (bounded by span minus one), checks the previous checkpoint anchor before and after the scan, and uses epoch compare-and-swap before saving. Settings save/clear rotates an opaque source revision. Detected source/reorg changes hide or invalidate native hints, rather than silently treating them as current.
- Explicit UI checkpoint load/start/resume/paging; separate browser-hint copy/export and confirmed native deletion. Nothing scans automatically. Index state is not accepted from the browser or imported from hint exports. Personal-profile deletion clears corresponding native index state.
- Database is app-private but unencrypted; Android backup/transfer exclusions apply. Native indices are intentionally not personal-workspace backup/sync data. A mutation already begun can commit after cancellation/navigation; reload before retrying. Previously copied/exported hints cannot be revoked by index invalidation.

## Executed verification

- 166 engineering tests, 6 implementation tests, 7 Redis security tests, 40 contract tests passed.
- Full implementation browsers, worker/D1 browser and offline browser checks passed. Native browser bridge is mocked, not actual Android consent/network acceptance.
- 18 native JVM tests passed: 7 transfer-discovery + 11 index coordinator tests, including cancellation, CAS races, anchor changes, limits and concurrent deletion after commit. These use fake repositories/RPC, not Android SQLite.
- Android app/test APK build and lint passed (0 errors; intentional JavaScript-enabled warning). Fifteen instrumentation tests compiled, including three new SQLite reopen/profile/epoch/bounds/concurrent-CAS tests. **No instrumentation tests executed here: no authorized device/emulator.**
- Real public Cronos read-only probe started and resumed the coordinator across blocks 107734691–107734692, revision 2, zero candidates. It used RAM storage and tiny public ranges; it proves neither positive token extraction nor SQLite, holdings, finality or provider completeness.
- Fresh extracted source: actual npm ci, 166 engineering tests, frontend build and 18 JVM tests passed with JDK17. An initial clean test run used the system older JDK and failed its Java17 harness compilation; environment corrected, full rerun passed. No application code change was needed.
- App and instrumentation APK v2 debug signatures verified; dependency audit reported zero vulnerabilities (not certification).
- Evidence: `checks/v14-verification.json`, versioned logs, `checks/v14-public-index-probe.log`. Build/signature/package and clean-source evidence are recorded separately as generated.

## What this is not

Transfer hints include sent-away NFTs. This is not wallet-wide discovery, current ownership, collection authenticity, a complete provider index or a finality guarantee. Provider omissions may be undetectable. The 1000-ID bound is deliberate; hitting it fails rather than silently trimming/advancing. The separate browser candidate store remains limited to 200 hints/profile.

Substantive open engineering remains: wallet-wide discovery and coverage validation; authenticated encrypted automatic sync; UnixFS/DAG integrity and broader media/cache policy; real wallet return/account-change/process-death integration; real Android runtime/performance/fault acceptance. Deployment, licensing, independent security review, owner-held production signing and explicitly approved mainnet transaction acceptance also remain. See `REMAINING-RELEASE-GATES.md`.

No credentials/funds were supplied, no wallet secrets created or disclosed, and no mainnet writes/deployment/signing transactions were sent. Gas and IPFS retention are never waived by zero platform fee/free mint.
