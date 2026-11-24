# RIFT hybrid v16 — hash-pinned known-NFT page observations

**Engineering/debug preview, not launch acceptance.** This is executed engineering work, not a claim of a five-hour elapsed session or completion of every outstanding subsystem.

## New end-to-end feature

In Create/Portfolio → Device direct reads → Local known-asset candidates, expand **Check saved NFT hints · hash-pinned page**. Use a public owner-address profile and explicitly request a page of up to 12 saved NFT hints. There are separate no-RPC previous/next controls. ERC20 hints remain separate known-token reads; they are not submitted to the NFT page checker.

The native bridge validates the narrow owner/contract/standard/token-ID schema, asks explicit consent, checks Cronos chain 25, obtains a block anchor and performs only fixed ERC721 ownerOf or ERC1155 balanceOf calls with EIP-1898 `{blockHash, requireCanonical:true}`. A final block-anchor check and connection-source/cancellation guards reject stale actions. At most 16 RPC calls per full page, within the existing shared 30/minute budget; prior activity can exhaust that budget and cause a safe failure. Provider support for hash-pinned calls is required; there is no latest-block fallback.

Any RPC error, unsupported hash parameter, malformed ABI result or detected reorg rejects the entire page. A burned ERC721 that reverts also causes whole-page failure: it is deliberately NOT guessed to be zero. Zero amounts are accepted only from successfully decoded contract responses. uint256 values remain exact decimal strings throughout native/browser/export paths. Browser results are bound back to the selected owner and each requested NFT.

Results are transient, explicitly labelled historical block observations. No background job, automatic hint removal, holdings database migration, cache substitution or trading permission was added. JSON export is optional and inert; imports are not added. Original saved hints remain independent. Profile/candidate changes clear/cancel the displayed observation. Provider reports are not independent chain proofs, current wallet completeness, finality, collection authenticity or contract-standard certification.

## Executed verification

- **170 engineering tests passed**, including four new frontend schema/source-boundary tests.
- **29 native JVM tests passed**, including eight new coordinator tests covering positive/sent-away responses, exact uint256 balances, strict calldata, 12-entry limit, duplicate/field rejection, cancellation, source changes and whole-page failure on reorg/provider/ABI errors. These use fake RPCs, not Android transport.
- **6 implementation, 7 real-local-Redis security and 40 local contract tests passed.**
- Implementation browser suite, Worker/D1 browser suite and offline browser suite passed. The new browser flow covers explicit request, large token ID preservation, denied consent without partial/zero result, and no hint deletion. Native transport is mocked in those tests.
- Android app/test APK build and lint passed. Fifteen instrumentation tests compiled, **none executed**: no authorized device/emulator. Native touch, accessibility, consent, process-death, decoding/storage and wallet lifecycle acceptance remain open.
- Read-only real public Cronos probe passed using the JVM coordinator and hardened HTTPS transport. Contract `0x00095839d3b6ea654a3bf46b77886e749e16dc86`, token `1`, returned positive amount `1` at block `107740006`, block hash `0x5f9b38f3419a9dd77f2153a8f04cfc68a1c498d1cfacadc933be81eb4f62198b`. Public observed owner was obtained from an initial read, not a user wallet or a newly created wallet. This is one provider observation, not independent proof/collection endorsement or complete coverage.
- Fresh extracted source: actual npm ci, 170 engineering tests, frontend build and 29 native JVM tests passed with JDK17. APK v2 debug signature verified.
- Machine evidence: `checks/v16-verification.json`, versioned verification logs, native JUnit XML and `checks/v16-public-holdings-probe.log`. See `checks/v16-clean-*` for fresh-source evidence.

## Remaining substantive engineering

Wallet-wide discovery and coverage reconciliation; authenticated encrypted automatic sync and identity/recovery/conflict design; UnixFS/DAG integrity and richer media/cache/gateway adapters; fully configurable backend/build-only API adapters; real mobile-wallet return/account/chain/process-death integration; Android runtime/fault/performance acceptance. See `REMAINING-RELEASE-GATES.md`.

Deployment, project licensing, owner-held production signing, independent security review and explicitly bounded mainnet acceptance are not completed. No credentials or funds were supplied. No signing, approvals, transfers, deployment or other mainnet writes were made. Zero platform fees/free mint never waive gas or guarantee IPFS retention.

Previous generated ZIP/APKs through v15 are preserved byte-exact in `/home/user/RIFT-previous-builds-history.zip`; use the adjacent restore script/inventory. Current deliverables are the debug APK and source ZIP; regenerate frontend/native assets with `npm run android:prepare` before building from source.
