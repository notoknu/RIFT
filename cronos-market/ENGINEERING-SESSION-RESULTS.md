# RIFT engineering continuation — implemented and verified

## Scope and honesty

This was a completed focused implementation pass, NOT a claim that five uninterrupted hours elapsed or that every engineering gap is solved. No account-controlled cloud deployment, mainnet transaction, paid plan or wallet funding was performed. The latest source supersedes earlier source ZIPs. Read the remaining-work section before any launch.

## Implemented in this pass

### 1. Bounded same-origin frontend delivery

`edge/frontend.js` now provides:

- Fixed exact HTTPS *.surge.sh upstream validation; no arbitrary destination proxy.
- API and health routing never fall through to a static HTML shell.
- GET/HEAD static delivery only; private dotfiles, common key/database/source-map paths refused.
- Redirect refusal; no user Cookie/Authorization/Origin forwarding to Surge.
- No upstream Set-Cookie or arbitrary upstream headers propagated to the public app.
- 10-second upstream/body timeout and 8 MiB static-response bound (including bodies without Content-Length).
- CSP, no-sniff, referrer and permission headers for both static delivery modes.
- Same-origin Worker Static Assets option with SPA fallback.

The CSP allows HTTPS/WSS connections for the existing wallet/provider surface; it is not a minimal per-provider allowlist or proof of wallet compatibility. More restrictive provider-by-provider policy needs actual pairing acceptance. Hosted quotas/latency and real Surge behavior are unmeasured.

### 2. Pure validated deployment configuration

`scripts/edge-config.js` and `scripts/configure-edge.js`:

- Validate account resource ID shape, exact frontend origin, Worker name and optional Surge origin.
- Mutually exclusive static-assets and Surge modes.
- Generated config explicitly keeps v2 trading and sponsored uploads disabled.
- Scheduled indexing is OFF by default; enable deliberately with EDGE_SCHEDULED_ENABLED=1 after database/config/quota review.
- Do not copy arbitrary environment variables or private keys into public Worker vars.
- Do not create any account resource themselves.

Legacy/v2 contract addresses and reviewed ingestion bindings are not automatically activated by evaluation deployment. Disabling this config flag is not a universal stop for previously deployed contracts or a public chain.

### 3. Manual evaluation deployment workflow

`.github/workflows/deploy-evaluation.yml`:

- workflow_dispatch only, main branch only, explicit `DEPLOY EVALUATION` confirmation.
- Read-only GitHub repository permissions and serialized deployments.
- Separate validation/deployment jobs; provider secrets scoped to provider steps.
- Engineering, contract, production build and browser gates before deployment.
- Optional Surge publish, optional explicitly approved D1 migration, Worker deployment and read-only hosted smoke checks.
- Pinned CLI versions: Surge 0.58.0 and Wrangler 4.167.0 (downloaded/transitive packages still require supply-chain review).
- Uses GitHub `evaluation` environment. Owner MUST configure environment reviewers/rules; YAML alone does not enforce human approval.

No workflow execution occurred on GitHub. Failed post-deploy smoke tests do NOT undo an applied migration or already published static revision. Releasing both services is not an atomic transaction.

### 4. Publication and hosted smoke tooling

- `npm run source:audit`: checks tracked files when Git is available, otherwise filtered working tree; flags private/runtime paths, symlinks, oversized files and some credential markers without printing their contents.
- `node scripts/source-audit.js --require-license`: additionally fails if LICENSE is absent. License presence does not prove correctness/ownership.
- `npm run check:hosted`: verifies HTTPS target, built HTML shell, SPA route, health JSON, unknown API JSON 404, private path refusal and creator/D1 capabilities. Read-only, not transaction/audit/persistence proof.
- CONTRIBUTING.md, SECURITY.md and THIRD_PARTY_NOTICES.md document operating boundaries and publication responsibilities.

Source audit is heuristic: it is NOT exhaustive secret detection, a Git-history scan or legal review. Project-wide license remains an owner decision and is not silently chosen.

### 5. Real Worker/D1 frontend/session acceptance tests

- New actual workerd/D1 test migrates all ten schemas, serves assets/SPA routes, signs in with a new random wallet, checks production Secure/HttpOnly/SameSite cookie headers, writes a draft, rejects cross-origin mutation and invalidates logout sessions.
- New built-frontend desktop Chromium test runs against real local workerd/D1, not Express, exercises browser cookie storage, draft creation, reload continuity and logout under the frontend CSP.
- Browser test covers 360/393/768/1440 viewport widths. This is NOT an actual phone, mobile WebView or external wallet pairing test.
- Existing combined browser runner now includes platform/navigation, metadata and collection-workspace regressions.

### 6. Removed external font dependency

The new CSP/browser test caught the old Google Fonts stylesheet request being blocked. Rather than loosen CSP, fonts are now self-hosted:

- Inter and Space Grotesk Latin variable subsets from Fontsource 5.3.0.
- Full OFL notices, source URLs and archive/font SHA-256 provenance under third-party/fonts/.
- Same visual font families retained; no external font stylesheet/network request required.
- System fallbacks remain for other scripts/languages.

### 7. Wallet and Android verification

A new seeded 32-sequence ERC1155 conservation model exercises partial listing purchases, funded offers, oversized-fill rejection, residual cancellation/refunds, 7.5% royalty credits and periodic withdrawals. It checks token balances and exact backing of all proceeds after each completed sequence. This is one deterministic seed, not exhaustive fuzzing.

The disposable-wallet contract scenario now explicitly requires chain ID 31337 before any local balance allocation. It creates random in-memory seller/buyer wallets, signs local transactions and writes public-address-only results. Do NOT fund these addresses: their keys are discarded.

Android assets were refreshed and preview versionCode 5 / 0.3.1-preview rebuilt/linted/signature-verified. It still has no configured backend, is debug-signed and is not accepted on an Android device. Native uploads/blob exports and wallet callbacks are not fixed by this build.

## Executed evidence

| Gate | Result | Evidence |
|---|---|---|
| Engineering | 103 passed | checks/session-engineering.log |
| Solidity | 40 passed | checks/session-contracts.log |
| Redis security | 7 passed, none skipped | checks/session-security.log |
| Implementation regressions | 6 passed | checks/session-implementation.log |
| Existing combined browser suites | passed | checks/session-browser.log |
| Built frontend + real Worker/D1 browser | passed, no reported page/CSP errors | checks/session-edge-browser.log and edge-app-browser.json |
| Worker Static Assets deployment dry-run | passed with Wrangler 4.167.0 | checks/session-wrangler-dry-run.log |
| Surge gateway deployment dry-run | passed with Wrangler 4.167.0 | checks/session-surge-dry-run.log |
| Production build | passed; large-chunk warning remains | checks/session-build.log |
| Dependency audit | zero reported vulnerabilities at execution | checks/session-audit.json |
| Android source/asset checks | 3 passed | checks/session-android-shell.log |
| Offline desktop browser equivalent | passed | checks/session-android-offline.log |
| Android build/lint/signature | passed | checks/session-android-build.log and session-android-signature.log |
| Publication heuristic | no findings; project LICENSE absent | checks/session-source-audit.log |

Dry-runs used clearly isolated configuration fixtures and did not submit IDs to create/migrate a remote resource. They prove bundling/configuration acceptance, NOT successful hosting. Font/package downloads and local CLI use do not establish an account deployment.

## Owner account setup for the workflow

1. Publish source privately first; review license/rights/secrets/history before making public.
2. Create GitHub environment `evaluation`; add reviewers if supported; protect main.
3. Add environment VARIABLES: PUBLIC_ORIGIN, D1_DATABASE_ID, CLOUDFLARE_ACCOUNT_ID. Optional WORKER_NAME, SURGE_ORIGIN, VITE_WALLETCONNECT_PROJECT_ID.
4. Add environment SECRETS: CLOUDFLARE_API_TOKEN; if using Surge, SURGE_TOKEN and SURGE_LOGIN. Never paste these into chat or commit them.
5. Create the actual D1 database `rift-core` under your account. Record its real ID.
6. PUBLIC_ORIGIN is the actual public Worker/custom-domain app origin; SURGE_ORIGIN is ONLY the static upstream. Set Reown allowlist to the public app origin.
7. On a NEW empty DB, explicitly approve initial migrations. Existing DBs require backup and migration review first.
8. Run the evaluation workflow manually from main with the exact confirmation. Review its logs and hosted smoke result. Do not enable public trading based on this alone.

## Remaining engineering — not reassigned to the owner as mere configuration

- Production-scale Node/Worker ingestion parity and throughput: admission/backfill, dense histories, holder scaling, metadata coverage and free-plan budgets.
- Complete external-order adapters if desired, indexed price/status discovery, validated rarity/history and broad multi-trait search. A static metric strip is not these features.
- Native Android uploads/exports, App Links/wallet callback lifecycle, production signing and actual device/WebView acceptance.
- Full creator launch-to-resale acceptance on an approved persistent deployment and stronger generative/on-chain feature coverage where required.
- Independent adversarial contract review, additional property/fuzz testing and exact reviewed runtime release manifests.
- Actual off-host retention/storage replication, hosted backup/restore acceptance, alert delivery and production load testing.
- Frontend bundle optimization; dependency supply-chain and project/asset licensing review.
- Account-owned deployment, real wallet pairing and any explicitly approved bounded mainnet test plan.

See ENGINEERING-COMPLETION-CHECKLIST.md for detailed pre-existing limitations. These tasks are not all solved by receiving API tokens, funding a wallet or spending a fixed number of hours.
