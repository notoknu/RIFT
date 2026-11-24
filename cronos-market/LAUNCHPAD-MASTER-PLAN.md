# RIFT launchpad — SISE/ULTRA CAT lessons and execution record

## Authorization and current truth

Owner selected manual Render dashboard deployment and authorized at most **1 CRO total** from the dedicated RIFT testing wallet for RIFT test-contract deployment/functional tests. No third-party purchases or unlimited operator approvals. This cap is cumulative, not per transaction. Nothing has been spent in this workstream. No existing SISE/ULTRA CAT owner wallet is authorized for use.

Read-only RPC check: PublicNode returned Cronos chain 25; dedicated testing wallet balance 3 CRO, pending nonce 0. Default public RPC rejected this environment's requests. Recheck before signing. Do not rely on an old gas quote. No production deployment is inferred from source availability.

The supplied project notes are historical user records, not independently verified current platform capabilities. The attachment contains plaintext secrets: never publish it, include it in export ZIPs or serve it from the app. Rotate service credentials; exposed blockchain keys require an owner-approved asset/admin migration, not just a password change.

## What the two launches demonstrate (historical record)

SISE used a small fixed-supply ERC-721, paid public mint, wallet/transaction limits, ERC-2981, mutable URI configuration, image/metadata directories, a standalone mint website, contract verification and signed external-market listings. Its critical failure was metadata availability: a CID existing locally did not mean a marketplace crawler could retrieve it. HTTP mirrors restored practical indexing, but added hosting dependence. Traits, images, source verification and marketplace visibility required separate checks.

ULTRA CAT used a larger fully on-chain collection and renderer, distribution/airdrop, reserve listings, collection artwork and independent galleries. On-chain data URIs removed dependence on a media host but did not make third-party crawlers compatible. An ownerless contract blocked owner()-based collection editing even while listings could trade. Exact compiler/settings preservation mattered for explorer verification. Listing request acceptance was not proof of complete item metadata, verified status, sale proceeds or indexed holders.

These cases do not establish guaranteed future demand, profitability, liquidity or project survival. RIFT should provide reliable operations and transparent evidence, not fabricate scarcity, activity, affiliation or success.

## Feature and use-case matrix

| Stage/use case | RIFT source today | Next acceptance gate |
|---|---|---|
| Private creator profiles | Wallet-message session, own-wallet CRUD, version checks, SQLite schema | Owner deploys updated backend to real persistent disk; save across redeploy and tested restore |
| Generated SVG / creator SVG / IPFS launch | RiftDrop modes 0/1/2 | Exact metadata, sanitization, gas/bytecode size and crawler compatibility per mode |
| Paid open mint | Immutable price/window, wallet/tx limits, exact payment | Deploy isolated fixture; positive/negative mint receipts and supply reconciliation |
| Free-mint zone | price=0 supported; gas still paid by user | Real free mint, reject accidental value, UI fee disclosure, no promise of sponsored gas |
| Allowlist-to-public launch | Merkle root + allowlist end | Valid/invalid proof and timestamp-boundary tests |
| Royalties | ERC-2981, maximum 10% | Read royaltyInfo; explain marketplaces may not enforce payment |
| Creator operations | Pause/unpause, withdrawal, ownership transfer | Unauthorized calls, withdrawal destination, ownership/royalty mismatch review |
| Collection identity | owner(), originalCreator, contractURI, image/banner | Ownership proof distinct from platform verification; account profile is not collection ownership |
| Durability | IPFS content references and CAR/export tooling | Actual pin replication, complete directory manifests, recovery on fresh infrastructure |
| External marketplace discovery | Existing venue adapters and directory | Revalidate each documented API and chain/address; freshness/errors visible |
| External listings/buying | Venue-specific integration required | Current contract/domain/fee/approval checks; official permitted submission; no blind replay of old endpoints |
| RIFT secondary marketplace | Market/exchange contracts and source clients | Isolated lifecycle tests, deployment, indexer, recovery and separate security review |
| Collection promotion/community | Creator content and external links | Creator-authored campaign kit, factual disclosures, no automated spam or fabricated engagement |
| Post-launch survival tooling | Partial indexes/monitoring/recovery source | Durable workers, stale-feed alarms, metadata health, treasury records and owner runbooks |

## Contract improvement review — do before production deployment

1. **Two-step ownership transfer:** current Ownable transfer is one-step. Consider Ownable2Step to prevent transfer typos; update tests and disclose any change to admin permissions.
2. **Payout identity:** withdraw currently pays owner(), while royalties stay with originalCreator. Document this split or explicitly model immutable treasury / separately reviewed payout management. Never silently change funds destination on ownership transfer.
3. **Renderer uniqueness:** current generated visual palette is derived largely from a 360-value hue, not an ULTRA CAT-style multi-layer rarity system. Do not market it as guaranteed unique artwork. Add deterministic layer/trait configuration, provenance commitments, duplicate checks and honest rarity reports before claiming parity.
4. **Creator SVG mode:** shared art is intentionally repeated; distinguish editions from individually generated art. Client sanitization is not enough to assume arbitrary on-chain SVG is safe for every consumer. Enforce limits and safe rendering paths.
5. **IPFS validation:** contract validates an ipfs://-shaped directory, not availability or cryptographic directory contents. Pre-deployment manifest checks must validate CIDs, token numbering and contract.json coverage. No hidden mutable HTTPS fallback.
6. **Admin compatibility without trust inflation:** keep verifiable creator/owner identity separate from metadata mutability. Any renunciation/freeze option must explain which marketplace self-service paths may stop working.
7. **Metadata refresh/freeze:** evaluate ERC-4906 if metadata mutability is introduced. Do not add arbitrary editing merely to satisfy a third-party indexer.
8. **Reproducibility:** retain exact Standard JSON input, compiler binary version, optimizer, EVM version, constructor args, library/immutable references, deployment receipt and source hashes. Never rewrite pragmas to pretend an exact verification.
9. **Security expansion:** adversarial receiver/reentrancy tests, withdrawal failures, sold-out race, supply/payment invariants, allowlist boundaries and fuzz tests. A passing suite is not an independent audit.
10. **Gas/scale:** benchmark full deployments before considering clones. Any clone/renderer redesign needs a new template version and new compatibility tests; never silently swap a previously reviewed template.

## Platform-integrated launch flow to implement/complete

Draft -> artwork/rights -> supply/traits/provenance -> storage strategy -> metadata/compatibility probes -> mint economics and gas -> contract review/simulation -> wallet-approved deployment -> receipt/source verification -> publish mint page -> first mint proof -> index collection -> optional venue listing -> monitoring/export/recovery.

Each stage needs explicit pending/passed/failed/external-action-required status with evidence and a retry path. A submitted job is not completion. Do not let a launch readiness badge hide missing storage or disabled trading.

Built-in connectors should use documented current interfaces, narrowly scoped auth, visible approval targets and explicit wallet signatures. External platforms can still gate collection verification, logos/banners, indexing and listing access. Provide direct links and a prepared evidence package when no legitimate self-service API exists; never claim RIFT controls their database or bypass their gates.

## Manual Render activation — next owner action

1. Open existing RIFT Render service. Confirm service root is cronos-market and uploaded/pushed source includes the v20 profile files. The APK does not deploy these files.
2. Confirm an actual persistent disk is mounted. If the plan requires payment, review/approve its price in Render; no paid provisioning is authorized here. Do not set the persistence flag without the volume.
3. Normal same-origin build: npm ci --include=dev --ignore-scripts && npm run build. Start npm start, supported Node 22 >=22.13.
4. Set PUBLIC_ORIGIN=https://rift-q6qs.onrender.com, NODE_ENV=production, CREATOR_AUTH_TRANSPORT=cookie, CREATOR_DB=/var/data/rift/creator.sqlite, CREATOR_STORAGE_PERSISTENT=1 ONLY when /var/data is the persistent mount. Keep frontend API origin override variables unset for this same-origin build.
5. Use reviewed Redis limits, or ALLOW_SINGLE_PROCESS_LIMITS=1 only for one instance. Keep sponsored upload quotas zero until storage-provider configuration is separately approved.
6. Deploy. Verify profile routes exist; anonymous GET should reject authentication rather than return Unknown endpoint or disabled storage. Sign in using a wallet message, save a non-sensitive profile and reload.
7. Redeploy/restart and confirm the same profile survives. Make a protected database snapshot; verify restore into an isolated fresh destination. Do not test restoration destructively against production.
8. Test logout, expired session, wrong origin, other wallet isolation and simultaneous-edit conflicts. Keep accounts unavailable if durability acceptance fails.
9. Android account sign-in additionally needs supported external-wallet pairing; native vault is not a signer. Perform real-device pairing and update acceptance separately.

## Budgeted test sequence

First: compile exact source, run complete local contract tests, estimate deployment/operation gas on current mainnet. Choose a minimal isolated fixture only if the full planned cycle plus safety margin fits the remaining 1 CRO. The estimate must include deployment, mint, transfer, pause/unpause and any approved cleanup; fewer representative mainnet tests may fit than the complete platform lifecycle.

Record each operation's purpose, expected result, simulated result, tx hash, mined status, gas fee, cumulative spend and remaining cap. Reverted transactions consume gas and count toward the cap. Never fund a purchase to fabricate marketplace volume; use local accounts for two-party trade coverage. Stop on unexpected state, nonce, code, fees, or insufficient safety margin. No unlimited approvals, third-party purchases, legacy-collection actions or budget top-ups.

Current result: read-only wallet check completed; dependency restore underway. **No transaction broadcast and profiles not live.** This is a working execution plan, not a completion certificate.

## Latest measured gate: deployment exceeds authorization

Restored dependencies, compiled Solidity 0.8.24 / Paris and reran the current contract suite: **40 passed**. This includes free/paid mint, allowlist, collection metadata, factory, escrow/exchange and adversarial cases; these are local tests, not mainnet outcomes.

A live `eth_estimateGas` for direct deployment of a three-token generated-SVG free-mint RiftDrop fixture returned **3,283,166 gas** at **378.75 gwei**, or **1.2434991225 CRO deployment alone**. A 30% deployment margin is **1.61654885925 CRO**, before mint/admin/transfer tests. This exceeds the authorized cumulative **1 CRO** cap. **No transaction was signed or broadcast.** A factory deployment would not make this current full-contract template free. Do not deploy a different toy contract and claim the actual RIFT launchpad was tested.

Next engineering decision: optimize/version and locally benchmark the actual template, or present a revised full-cycle cost for explicit owner approval. Merely increasing the budget does not resolve missing durability, external integration or production review.
