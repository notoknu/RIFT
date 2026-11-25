# Wallet-first delivery plan

## Boundaries

Cronos EVM mainnet, chain25. No contract deployment, trading activation, mainnet spend, paid provider provisioning or secret reuse in this batch. Keep current Render publication boundary explicit. A public WalletConnect project ID is not a private wallet key; use a project owned by the operator with origin restrictions, not a borrowed ID. Do not promise unlimited free quotas or availability.

## Batch A — adapter hardening implemented locally

- Validate request shape and configurable bounded pairing timeout.
- Preserve single pairing, cancellation quarantine and disconnection of late approvals.
- Never emit raw account-change payloads; derive accounts from authoritative session namespaces and emit refreshed scoped accounts on session_update.
- Expose accounts only on Cronos and block signing/transaction forwarding without an authorized Cronos account.
- Permit chain switch/add requests only for chain25.
- Validate eth_sendTransaction sender against the session and explicit transaction chainId if supplied.
- Never automatically retry signing or transaction submission.
- Added five lifecycle/security tests to the existing seven.

This does not establish trustworthy transaction semantics, prevent malicious contracts, or prove real phone pairing. Signature address/typed-data-domain validation and SDK session_update ordering need additional integration coverage. Wallet events may arrive before namespace updates; the adapter deliberately does not trust event account payloads.

## Batch B — remaining wallet work

- Single-flight SDK initialization and connection UI race acceptance.
- Validate personal_sign and typed-data requested account/domain chain at the app boundary without breaking supported wallet encodings.
- Recheck session and chain after browser foreground/resume; show stale/revoked state without silent sign-in.
- Test real-wallet QR and supported deep links, approval/rejection, user cancellation, timeout, relay failure, app switch, wallet switch, session expiration/deletion, browser refresh and process death.
- Establish an explicit supported mobile/browser matrix and record wallet versions. No claim of all-device support.
- Public read RPC failover: validate chain25, timeout, backoff/jitter and rate-limit handling; independent read observations, not automatic transaction rebroadcast. Keep provider connect/disconnect/reset controls and default public Cronos RPC.

## Batch C — explorer and provider choices

Cronos official documentation identifies Cronos Explorer as Blockscout-powered, with an Etherscan-compatible verification API and an API-key requirement. Source: https://docs.cronos.com/for-dapp-developers/contract-verification

Use https://explorer.cronos.org for user-facing explorer links; investigate documented read endpoints and quotas separately. An open-source explorer implementation does not mean its hosted API is unlimited or free to operate. No old Cronoscan or speculative alternate-host API should be introduced as a dependency. Existing Sourcify verification remains separate from an audit.

WalletConnect documentation requires a dedicated project ID; do not reuse sample IDs. Source: https://github.com/WalletConnect/walletconnect-docs/blob/main/docs/cloud/relay.mdx

Confirm actual plan limits in the operator dashboard before enabling a hosted plan. No free-plan provisioning or API key has been performed.

## Batch D — marketplace acceptance after wallet acceptance

- Existing own-exchange contracts: independent review, accidental-transfer policy, exact runtime hash, indexed listing/order reconciliation and buyer/seller/refund/withdrawal wallet tests.
- Seller royalty/net estimate already exists; test changed royalties, partial fills and unsupported royalty reverts end-to-end.
- Other marketplaces: inventory exact Cronos deployment addresses, supported order APIs/SDKs, current terms, cancellation and fill simulation. Add only verified per-venue adapters; no generic blind calldata proxy or unlimited approvals. A listing link is not an integrated purchase.
- All-collection/wallet coverage requires durable historical indexing with bounded backfill, reorg handling and quotas; no promise that public RPC alone can fetch everything instantly.

## Batch E — launchpad acceptance

Existing SVG/generative/IPFS paths are the starting point, not a new collection launch. Verify draft -> generation -> metadata validation -> storage/retention choice -> exact deployment simulation -> approval -> deploy -> receipt registration -> mint -> source verification -> collection discovery. Include retry/recovery receipts and explicit incomplete-provider states.

Like existing Cronos on-chain SVG collections, embedded art may avoid an external media host, but deployment/mint gas still costs CRO. Zero platform fee/free mint does not mean sponsored gas. No ULTRA CAT or Six Seven assets, branding or contract ownership permissions are implied. No new collection deployment is authorized in this batch.

## Release gate

Keep all current changes local until source publication/authentication is available. Regenerate APK/build/source evidence after the wallet batch; existing post-audit APK predates these wallet changes. Release only with explicit tested capabilities and open gaps, not a perfectly-working-everywhere statement.

## Executed Batch A evidence

The wallet-hardening regression finished successfully: 239 engineering tests, 7 security tests including Redis, frontend build and the complete implementation browser runner passed. The dedicated WalletConnect lifecycle suite has 12 passing tests. SDK/wallet behaviors are simulated in automated lifecycle tests; browser tests do not establish real relay/phone acceptance. No new APK was built for this wallet batch and no changes were deployed. The prior post-audit ZIP/APK remains an older snapshot.

## Batch B — second local implementation

- SDK initialization is single-flight across restoration and explicit connect, caches success, and resets on failure so explicit retry is possible.
- personal_sign validates authorized account and hex message using the standard message/account order; it never rewrites bytes.
- Typed-data v4 validates authorized account, basic payload structure and chain25 when the domain specifies a chain. Chainless typed data is allowed; that is not a replay-safety guarantee.
- Raw eth_sign and legacy typed-data methods are rejected. Payload validation is not contract/order security review.
- Selected wallets are rechecked on browser focus/visibility return using eth_accounts and eth_chainId only. No reconnect, signing, network switching or transaction happens automatically. Unavailable/wrong-chain identity clears displayed address and local creator-session credentials and requires explicit user recovery. This does not revoke an already-issued server session.
- Added five focused policy tests and a browser assertion that foreground refresh does not prompt/sign.
- ANDROID-BUILD-REPORT.json explicitly identifies these later wallet changes as not included in the already-built APK. No new package upload/deployment in this batch.

Remaining: real-wallet relay/mobile deep links, initialization-cancellation UX race, provider outage/backoff, typed-data semantic review and wallet/device matrix. Basic payload/chain validation cannot establish a safe trade.

Batch B regression finished: 244/244 engineering tests, 7/7 security tests including Redis, frontend build and complete implementation browser runner passed. Focused lifecycle/policy suites: 17/17 passed. The browser creator workflow includes the foreground read-only assertion. No live WalletConnect relay, physical wallet/device or process-death acceptance was performed. Full log: /home/user/RIFT-wallet-recovery-regression.log.

## Batch C — connection cancellation race fixed

Connection attempts now use a lock plus invalidation checks after awaited initialization, account permission, chain switching and signer lookup. Closing the picker cancels the logical attempt immediately, clears pairing display and rejects its pending consumer. A late successful initialization cannot start pairing; a late wallet approval cannot proceed to chain switching or save the connected identity. The underlying request keeps its lock until settlement because browser-wallet permission prompts cannot reliably be aborted. This is not cancellation of any transaction or approval already sent to a wallet.

Added two attempt-gate unit tests and a 393px mobile browser regression against a deferred injected wallet: close during eth_requestAccounts, deliver late approval, verify no subsequent chain/signing request or saved identity, and reopen picker successfully. This browser test uses a controlled wallet, not a physical phone or live WalletConnect relay.

Verification: 246 engineering tests passed; all 7 security tests including Redis passed; frontend build and full implementation browser runner (including the new mobile cancellation scenario) passed. Focused policy/lifecycle suites: 19 tests passed. Log: /home/user/RIFT-wallet-cancellation-regression.log. No APK rebuild, source upload, backend deployment, contract deployment or mainnet spend in this batch. Existing APK excludes all wallet continuation batches.

## Batch D — bounded read-only RPC failover

Implemented src/read-rpc.js and integrated it into launchpad collection loading. Official public Cronos RPC remains first; PublicNode is fallback. Endpoints must use credential-free HTTPS. Each provider is chain25-probed before reads (shared probe cached 30 seconds), wrong-chain providers are quarantined for the transport lifetime, failures enter a 5-second cooldown, and the endpoint list is bounded to three. Defaults: 8-second per HTTP exchange timeout, 1MiB streamed response cap. Redirects/cookies/referrers are disabled. No endless retry loop or transaction/signing fallback exists. Contract execution reverts and invalid-parameter errors propagate without trying another provider. Pause invalidates returned in-flight results; it does not claim every in-flight network request is physically cancelled. Explicit reset preserves wrong-chain quarantine.

Launchpad now uses this read-only adapter rather than a single hard-coded static-network JsonRpcProvider. Mint/deploy/admin actions still use the user's wallet and are not routed through this fallback. CSP explicitly permits PublicNode; launch deployment-success links use explorer.cronos.org instead of the legacy Cronoscan host. This is not app-wide server/indexer provider migration or global provider-control integration.

Tests: 8 new transport tests cover chain probes, wrong-chain quarantine, HTTP429/cooldown, timeout, terminal reverts, bounded/malformed responses, pause and write-method refusal. New browser test uses a primary503 and working mocked fallback, verifies real contract ABI decoding in the UI and CSP. Regression: 254 engineering tests, 7 security including Redis, frontend build and full implementation browser suite passed.

A separate live read-only sandbox probe successfully read chain0x19 and block number from both endpoints (evidence/READ-RPC-LIVE-PROBE.json). Different returned heights demonstrate provider observations are not a coherent snapshot. This is not uptime, throughput, complete holdings, real-wallet or device acceptance. No quota guarantee or API plan was provisioned. No APK rebuild/upload/deployment/mainnet spend in this batch. Previously generated APK/archive predates this code.

Remaining provider work: bounded concurrency, jitter/exponential rate-limit backoff, provider diagnostics and user-configurable controls, coherent block-pinned launch snapshots and broader indexer/server integration. Live mobile pairing/deep-link acceptance still requires an operator project ID and usable wallet/device environment; no borrowed project ID or wallet secret was introduced.

## Batch E — fixed-block collection snapshots and read selection

Launch collection loading now reads all 13 fields from one provider at a fixed block number, with at most four concurrent contract calls. It verifies matching block number/hash before and after the reads. Missing headers, partial read failures or changed hashes invalidate the snapshot; fallback re-reads the entire snapshot on a single alternative provider instead of mixing fields across providers. Outstanding workers settle before fallback begins. This is consistency checking, not proof of finality or honest provider responses.

Launch UI now offers default public Cronos RPC -> PublicNode fallback, official-only and PublicNode-only read selection. Changing selection clears the displayed snapshot. Loaded collections show the observation block/provider and a freshness warning. These controls apply only to launchpad reads; they neither alter wallet signing nor claim to configure the whole app. No manual arbitrary-endpoint UI or global provider diagnostics was added.

Five snapshot tests cover fixed-block/concurrency, reorg discard/full fallback, missing block headers, partial failures and invalid configurations. Updated the existing unsupported-storage-mode browser fixture to implement the new block header RPCs after its initial obsolete fixture crashed. Full browser rerun passed, including the fallback UI test checking fixed block tags and displayed block256.

Current results: 259 engineering tests passed; 7 security including Redis passed; frontend build passed; full implementation browser rerun passed. Logs: /home/user/RIFT-drop-snapshot-regression.log and /home/user/RIFT-drop-snapshot-browser-rerun.log. No APK rebuild, remote publication/deployment or mainnet spend. Existing distributed APK/archive still excludes all wallet continuation batches.

## Batch F — mint preflight and cost review

Added src/mint-review.js and wired launchpad mint actions through it. Before any mint transaction is requested it verifies Cronos, signer/address/code presence, quantity and bounded proof shape, fresh paused/window/supply/per-wallet/per-transaction limits and mint price. It simulates the exact call, estimates gas/fee, checks CRO balance against price plus estimated gas, and asks explicit confirmation showing contract, wallet, quantity, mint total, network fee and total. A free mint is explicitly not gas-free. Confirmation rechecks signer/network and repeats simulation; no automatic retry/send occurs in the review helper. Only then does the existing trackedTransaction recovery flow request the mint. The fee remains an estimate; simulation and code presence are not authenticity/audit guarantees. Local wall-clock window checks are preliminary; simulation remains the chain-state preflight. State may change before inclusion.

Seven controlled-contract tests cover free/paid prices, live/paused windows and limits, wrong chain/missing code/balance, malformed quantities/proofs/fees, declined confirmation/reverted simulation, and changed signer/network. Regression: 266 engineering and 7 security tests including Redis passed, frontend build and complete implementation browser suite passed. Full log: /home/user/RIFT-mint-review-regression.log. Mint-specific behavior was unit-tested against controlled contracts; no real wallet mint, new collection, mainnet spend, APK rebuild or deployment took place. Existing APK excludes this change.

## Batch G — compiled-contract mint acceptance and consolidated v23 APK

Added test/mint-review.js: six acceptance tests run the frontend mint-review and fixed-block snapshot helpers against actual compiled RiftDrop deployments on an isolated in-process EDR chain configured with chainId25. No HTTP/mainnet connection. Tests cover tracked mint/receipt/owner/embedded metadata, paid mint value, generated allowlist proof acceptance and outsider rejection, pause between simulations, declined-review nonce preservation and post-mint snapshot refresh. Entire contract suite: 46 passed. This is local integration, NOT physical-wallet/mainnet acceptance.

Mint-window preflight now reads a valid chain block timestamp rather than trusting device wall time; an additional unit test fails closed on missing/malformed timestamps. Current regression: 267 engineering, 7 security including Redis, 6 implementation, 3 Android shell tests, frontend build and complete implementation browser runner passed. Android build: 42 JVM tests passed, 0 lint errors/8 warnings; instrumentation compiled, not executed.

Consolidated all wallet/launch continuation changes into v23 Android preview (versionCode23, preserved debug signer). Exact APK/hash/assets evidence is ANDROID-BUILD-REPORT.json; v22 report retained under evidence/historical/. Prior batch notes about the old APK remain historical; this v23 APK includes the continuation. Backend publication and device/live-relay acceptance are STILL absent. No deployment or real CRO spend.

## Batch H — marketplace client acceptance against compiled v2

Added test/exchange-client-acceptance.js with eight actual client-to-contract tests on isolated EDR chain25. Uses controlled capabilities fetch/confirmation and ephemeral transaction storage; no HTTP chain/mainnet access. Covers ERC721 token-only approval/list/buy/withdraw, ERC1155 partial fills/royalties/residual cancellation, funded partial offer fills/refund/withdraw, disabled-trading/runtime-hash refusal before approval, declined royalty review, self-private-listing rejection, disable-after-approval gate and exits while disabled. Entire contract suite now 54 passed.

Client changes: listing/offer expiry preflight uses chain timestamp instead of the device clock; self-directed private listings fail before approval. Immediately before settlement simulation/submission, the client rechecks capabilities, expected exchange address and exact runtime; exits use the configured-but-disabled path. A confirmed approval may remain if the later release check fails: tested and disclosed in the UI. Operator gating is a client preflight and can change after checking; it is not on-chain revocation. No contract bytecode or independent audit status changed.

Regression: 267 engineering and all 7 security tests passed; frontend build and full implementation browser suite passed. Logs: /home/user/RIFT-market-client-acceptance.log and /home/user/RIFT-market-settlement-regression.log. Compiled-client tests use real local transactions but not the browser wallet path, hosted order index, external marketplace adapters or real devices. V23 APK/archive already distributed predates these settlement-client changes. No APK rebuild, source publication, backend/contract deployment, activation or mainnet spend this batch.

## Batch I — royalty re-review after approval

Listing creation and funded-offer acceptance now re-read royalties after NFT approval. A changed gross/royalty/recipient requires explicit renewed consent; failed reads or unsupported royalties block settlement. Quote reads use an explicit freshly requested block number for interface and royalty calls, rather than relying on repeated `latest` calls and their short-lived provider cache. This narrows the review gap but is NOT on-chain royalty slippage protection: responses/state can still change after re-review and before inclusion.

Added four unit/policy tests and one actual-client/compiled-contract test. The latter confirms ERC1155 approval, changes the mock NFT's on-chain royalty from 5% to 10%, declines the renewed review and verifies no escrow/listing submission while the confirmed approval remains active. Initial test harness attempted to intercept TransactionResponse.wait, which the ethers Contract wrapper replaces; corrected the harness to mutate royalties after the actual approval receipt before returning the transaction. Final full contract run: 55 passed.

Regression: 271 engineering tests, 7 security including Redis, frontend build and complete implementation browser suite passed. Logs: /home/user/RIFT-royalty-rereview-contracts.log and /home/user/RIFT-royalty-rereview-regression.log. No bytecode change, independent audit, mainnet/external-marketplace acceptance, deployment, API provisioning or spend. This source batch is not in the existing v23 APK/archive.

## Batch J — compiled exchange -> durable Node index/API acceptance

Added four actual-chain/index integration tests. On isolated EDR, compiled RiftExchange events are projected into a temporary on-disk SQLite index, compared with actual listing/offer contract state, reopened after restart, incrementally backfilled with span1, paginated without duplicate orders, served through the real local read-only Express API and recovered after evm_revert/replacement-branch fills. The API fixture keeps trading disabled. This tests Node/SQLite integration, not hosted Render/Turso/D1 persistence or quotas.

Hardened server/exchange-index.js: validate safe nonnegative log positions and safe block numbers, reject conflicting duplicate block/log positions across transactions, compare every distinct returned event block hash with its canonical header before committing. Header validation runs with at most four concurrent reads, bounded by configured span (up to2000 distinct blocks; default256). This adds RPC cost and needs hosted quota/throughput acceptance; it is not a cryptographic provider-truth proof or protection against every dishonest RPC.

Added three engineering regressions: orphan log with otherwise stable end checkpoint, malformed numeric positions and duplicate block-log position. An earlier moving-checkpoint fixture now accepts the stronger canonical-header rejection as well as the end-checkpoint-change error; checkpoint remains unchanged.

Final pass: 59 local contract/integration tests, 274 engineering tests, all 7 security tests including Redis, frontend build and complete implementation browser suite passed. Log: /home/user/RIFT-canonical-index-regression.log. No edge/D1 parity or hosted deployment claimed. No APK rebuild/publication, exchange activation or real CRO spend. Existing v23 artifacts predate this batch.

## Batch K — bounded edge/D1 canonical-header checks and local parity

Edge exchange normalization now rejects unsafe block numbers. Range logs are checked against canonical headers before staging; pending event chunks are rechecked before applying; receipt-scan event rows are checked before queueing. Distinct event-header probes are capped at8 per validation step. Ranges containing more than8 distinct event blocks shrink their span before staging, preserving the checkpoint. This bounds the extra header work, NOT all Worker subrequests/CPU/D1 costs for every branch; hosted limits/latency still require acceptance.

Added three actual local-D1 tests: orphan logs with stable end checkpoint cannot stage; changed staged-event block cannot apply; a nine-block event range reduces span and eventually publishes via smaller ranges. Existing receipt-queue and fork-rebuild tests continue passing. Pending mismatches fail closed and may require operator/provider recovery; no universal autonomous repair claim.

Added compiled-exchange -> local D1 parity acceptance: actual EDR events feed both Node SQLite and workerd/D1; resulting listing documents agree after a partial fill. The fixture asserts <=12 header RPCs per tested normal-sync invocation; this is not a guarantee for every reorg/receipt path or hosted quotas.

Results: 60 local contract/integration tests and 277 engineering tests passed; 7 security including Redis passed; frontend build, complete implementation browser, edge browser and split creator Node/Worker acceptance all passed. Logs /home/user/RIFT-edge-parity-contracts.log and /home/user/RIFT-edge-parity-regression.log. No hosted deployment, external marketplace adapter, real-device test, APK rebuild or mainnet spend. Existing v23 package excludes this batch.

## Batch L — disk-persisted D1 restart/lease acceptance

Extended actual workerd/D1 tests to persist database files outside the emulator process. During oversized-log receipt backfill, applied only part of a 25-event staging queue, disposed the worker, recreated it from disk without rerunning migrations, verified identical pending offset/events and zero exposed partial orders, completed publication with exactly25 events/orders and cleared delta, then reopened again to verify checkpoint/orders persisted.

A second test persisted an interrupted-worker lease, restarted D1 and verified an unexpired lease returns busy without making any RPC call. After simulated lease expiry, a fresh invocation published the pending work and released the lease. This models durable pending state and abandoned-lease handling; orderly worker disposal and a seeded lease are NOT a power-loss, mid-transaction crash or remote-provider restore drill.

Eight edge exchange tests passed; full rerun: 279 engineering tests, 7 security including Redis and 60 local contract/integration tests passed. Log /home/user/RIFT-d1-restart-regression.log. App/contract production code unchanged in this batch; frontend/browser results remain from the prior batch, not newly rerun here. No hosted D1 deployment/quota/backup recovery, Android runtime, API provisioning or mainnet spend. Existing v23 ZIP/APK does not contain these later tests/source changes.

## Batch M — explicit NFT approval inspection/revocation

Added exchange-approvals.js and ExchangeApprovalTools.jsx, integrated into the configured exchange panel. A connected user can inspect ERC721 token-specific and ERC721/ERC1155 operator approvals for the current runtime-verified exchange, even when new trading is disabled. Reads use an explicit observation block; token-specific approval is only reported active when the connected wallet owns that token. UI shows block/wallet/spender, clears observations on input/account/release changes, and never automatically sends a transaction. ERC721 inspection requires a valid existing token ID.

Revocation requires scope-specific confirmation describing contract, wallet, spender, gas and collection-wide consequences; fresh identity/approval checks, simulation and gas estimation precede tracked submission. Token revocation clears only a matching exchange approval; it refuses an unrelated spender or another owner's permission. Collection revocation does not cancel orders, close/refund offers, withdraw CRO or recover escrow. Current-release/runtime binding deliberately excludes older/custom spenders; review those in the wallet. Permission state can still change after checks; no atomic on-chain spender guard is added to standard approve().

Four actual compiled-client tests cover ERC721 revoke while trading disabled, ERC1155 revoke with escrow/order unchanged and later cancellation still functioning, unrelated-spender/declined revoke refusal and other-owner token refusal. Controlled mobile browser checks show read-only inspection/no signature or transaction request, disabled-trading availability and stale-input clearing. No actual phone/relay acceptance.

Verification: 64 local contract/integration tests, 279 engineering tests, 7 security including Redis, frontend build and complete implementation browser suite passed. Log /home/user/RIFT-approval-recovery-regression.log. No APK rebuild, deployment/activation or real CRO spend; existing v23 package excludes this batch.

## Batch N — ambiguous submission outcomes are not labelled safe-to-retry

Changed transaction journaling: a wallet/send failure before a valid hash reaches RIFT is submission-unknown, not not-submitted. Explicit top-level wallet rejection codes4001/ACTION_REJECTED are separately wallet-rejected only when no valid hash is recorded; known-hash confirmation errors remain submitted-uncertain. Malformed/absent transaction responses are unknown, not proof of non-broadcast. The journal never retries or broadcasts during recovery.

Transaction recovery UI warns about hashless/awaiting/legacy not-submitted records and requires wallet/explorer inspection before repeating a value action. It explicitly explains hashless records cannot be found by automatic receipt checks. Old records are not silently rewritten or represented as verified outcomes. A rejection label means what the wallet reported, not an independent broadcast proof.

Four engineering cases cover transport failure, rejection versus generic/nested errors, invalid responses and known-hash errors. New controlled393px browser regression restores an unknown and a legacy record, verifies warnings and read-only checks without receipt lookup, signing or broadcast. Regression:64 local contract/integration,283 engineering,7 security tests passed; frontend build and full implementation browser suite passed. Log /home/user/RIFT-submission-uncertainty-regression.log. No actual device/relay acceptance, APK rebuild/deployment or mainnet spend. Existing v23 package predates these changes.

## Batch O — scoped plaintext transaction report export

Added transaction-report.js and recovery-panel export action. A valid connected wallet can export up to50 journal entries scoped to chain25 and that wallet. Export allowlists status/action/timestamps/valid hashes/nonnegative numeric receipt fields/valid deployment address; excludes raw context, calldata, arbitrary fields, recovery notes and nested secrets. Action labels and wallet history are still potentially sensitive plaintext. Malformed, inaccessible or oversized journal data fails closed rather than producing a misleading empty success. Report explicitly states unverified local observations, no finality, no RPC/signing/broadcast and no import/replay or wallet-backup functionality.

UI requires plaintext/privacy confirmation and uses the existing browser/native export transport. Six unit tests cover scope, allowlisting, bounds, invalid data, timestamps and empty journal. Controlled393px browser test downloaded and parsed the actual JSON, verified unknown/legacy statuses remained unchanged and no wallet signing/broadcast calls occurred. Android file transport itself was not retested on a device.

Regression:289 engineering tests and7 security including Redis passed; frontend build and complete implementation browser suite passed. Contract production code unchanged; latest contract suite remains64 passes from prior batch, not rerun here. Log /home/user/RIFT-transaction-report-regression.log. No APK rebuild, deployment, mainnet spend or new API provisioning. Existing v23 package predates this feature.

User standing instruction: every session-end response must explicitly state remaining work; see CURRENT-REMAINING.md for consolidated open gates and feature gaps.

## Batch P — end-to-end device-test preparation without account access

Added four isolated AndroidKeyStore instrumentation tests using unique disposable aliases: nonexportable AES key/reopen roundtrip, changed ciphertext/AAD rejection, fresh IVs and alias deletion. These do not touch the production WalletVault or establish device-credential/biometric/hardware-backed-key acceptance. Updated the device checker with explicit expected count19 and a tested parser that rejects skips/assumptions, failures, crashes and mismatched/duplicate summaries. Added4 parser tests. Prepared cloud/device procedure and updated optional emulator workflow description.

Restored dependencies/JDK17/SDK35 in the current runtime. Built version24 application and matching instrumentation APK, preserving preview signer, verified signatures/version/bundled asset hashes. Current run293 engineering,3 Android shell and42 JVM tests passed; frontend/Android builds passed; lint0 errors/8 warnings. Native19 tests compiled, ZERO executed. Device inventory actually reports no authorized device. No Google/Firebase account authorization or cloud run, live WalletConnect, biometric, SAF/process-death test, deployment or mainnet spend. Security/browser/contract suites were not rerun this batch; older passes are not attributed to it. Exact evidence ANDROID-BUILD-REPORT.json and /home/user/RIFT-v24-device-build.log.

V24 bundles the current source; earlier notes about exclusion from v23 remain historical. Item3 is NOT complete: Android/cloud runtime, wallet relay/deep links, authenticated vault and file/process-death gates remain open. See ANDROID-CLOUD-ACCEPTANCE.md. User requested autonomous steps when possible and explicit remaining work in every final response.

## V27 autonomous acceptance-hardening batch

Completed exact installed app/test/version/runner gating, private instrumentation verdicts, fail-closed WalletConnect chain/namespace/relay-method handling, bounded staged SQLite restore, and two real local SIGKILL/WAL plus independent restored-store drills. Exact current results:326 engineering,7 security(with Redis),64 local contracts,6 implementation,3 Android shell,42 JVM,full controlled-browser/build PASS. Native19 compiled/0executed; local crash drills are not Android/hosted acceptance. See RELEASE-V27.md, LOCAL-RECOVERY-ACCEPTANCE.md and CURRENT-REMAINING.md. Items1–5 still have access/runtime/security/integration gates; item6 license remains undecided. No deployment or CRO spend.

## V28 comparison resilience batch

Implemented bounded Node comparison refresh/stale recovery and source validation, plus honest whole-comparison stale and floor-history-gap UI. Rebuilt matched v28 APKs and reran367engineering/7security/64local contracts/6implementation/3shell/42JVM/full controlled-browser/build. Native19compiled/0executed; real pairing, vault/SAF/lifecycle, hosted deployment/recovery, independent review and integrations remain. See RELEASE-V28.md and CURRENT-REMAINING.md. No paid resources/deployment/CRO spend; no license decision.
