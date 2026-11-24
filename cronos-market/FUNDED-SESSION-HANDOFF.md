# RIFT funded-wallet verification session

## Funds and transaction boundaries

Read-only Cronos RPC confirmed 3 CRO at `0x49E3c82Ee961635658b9C5590aa0147B693fA331`, chain ID 25, nonce 0. No transaction was signed or broadcast by this session. The wallet's private material remains outside the project and is not in this patch. This workspace-generated wallet is disposable testing custody only.

At the sampled gas price of 378.75 gwei, mainnet `eth_estimateGas` returned:

- RiftMarket deployment: 1,069,133 gas, approximately 0.404934 CRO.
- Disposable RiftNFT deployment: 1,226,175 gas, approximately 0.464414 CRO.

The previous local-EVM complete minimal cycle measured 2,829,629 gas (~1.071722 CRO), or ~1.607583 CRO with 50% buffer. This excludes drop/factory/exchange deployments. Gas prices and real execution may change. Re-estimate before spending. Funding does not establish contract security approval or justify enabling production signing.

## Verified repository and hosting state

- GitHub source commit checked: `b8bf48100b197283025bd730b5a84db798948732`.
- Both GitHub security and Android verification runs succeeded.
- The source image fix was present in GitHub, but live Surge still served the old image component when checked. The sampled live images had no anonymous CORS attribute and were blocked by the browser.
- Locally built Surge candidate, loaded at the approved frontend origin with REAL remote backend requests, decoded three real collection thumbnails with zero recorded cross-origin artwork blocks.
- This is sample coverage, not a claim that all collections, IPFS content or upstream gateways are available.

## Changes supplied in this patch

1. `src/artwork-policy.js`: bounded three-gateway IPFS image fallback; URI validation; exact public API routing; anonymous CORS only for configured backend API artwork.
2. `src/Artwork.jsx`: applies the policy, bounded retries, no-referrer image requests and honest unavailable states. No invented collection artwork.
3. `checks/artwork-policy.test.mjs`: five tests for gateway routing, unsafe references, backend image routing and anonymous CORS boundaries.
4. `checks/hosted-artwork.mjs`: checks actual decoded browser images, not just HTTP 200; optional local candidate verification at the approved origin.
5. `checks/live-public-hosting.mjs`: prior live smoke test now fails when its artwork sample does not decode.
6. `.github/workflows/deploy-surge.yml`: candidate artwork gate before publish, live gate after publish and retained verification artifacts.
7. `scripts/mainnet-testing-preflight.mjs`: read-only estimates; never loads the wallet, signs or broadcasts.
8. `package.json`: adds artwork policy tests to engineering tests. No dependency changes.

## Executed checks

- Final integrated engineering regression: 186 passed, 0 failed, 0 skipped (including five new artwork-policy tests).
- Implementation checks: 6 passed.
- Security checks with real Redis on local port 6380: 7 passed, none skipped.
- Contract tests: 40 passed, entirely local simulation.
- npm audit: 0 reported vulnerabilities at the time checked; not a contract audit.
- Production-build browser suite: passed saved collections, malformed metadata, public order browsing, pixel builder, responsive widths 375/768/1440, wallet-dialog focus/Escape, creator routes, platform/navigation, collection metadata, collection workflows, IndexedDB workspaces, encrypted backups and direct-read/cancellation scenarios.
- Real local Worker/D1 browser session: passed.
- Surge candidate build: passed; three real remote collection images decoded.
- Source audit: no heuristic findings; no top-level LICENSE found. Do not claim independently reviewed licensing/security.

The first local regression run used an older system Java and failed a JVM harness; rerun with required Java 17 passed. The first implementation browser attempt used a Surge-specific build rather than the required same-origin build; rebuilding the correct target resolved it. Neither initial failure was hidden or accepted as a pass.

## Apply without replacing the whole repository

Extract this PATCH into the repository root, merging its files. Keep every other source file. Commit and push. Root `.github/workflows/deploy-surge.yml` must be updated, not only the template under `cronos-market/deployment/`.

Then in GitHub:
1. Set Actions secret `SURGE_TOKEN` to a rotated token, and Actions variable `SURGE_LOGIN` to the Surge account. Never put tokens in code/chat.
2. Open Actions -> Deploy RIFT public preview to Surge -> Run workflow on main.
3. Review candidate artwork, publish, and live-artwork results. Fix failures rather than disabling gates.

There are no active GitHub/Surge/Render write credentials in this session, so no push, workflow dispatch, provider settings change or live publish was performed. Source upload alone does not run the manual deployment workflow.

## Remaining production blockers

This is NOT a launch approval. Durable creator sessions/storage, reviewed same-origin architecture, independent contract review, deployment/admin decisions, real-device wallet security acceptance, production monitoring/backups, and legal/licensing review remain. The mainnet deployment script's security gate was preserved. No public trading or native signing was enabled.

Automated tests use isolated fixtures and local funded simulation accounts where appropriate. They do not prove real mainnet execution, complete metadata coverage, permanent IPFS availability or production-wallet safety.
