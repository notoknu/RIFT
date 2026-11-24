> UPDATE: Same-origin Worker frontend delivery is now implemented and locally tested. Read DEPLOY-NEXT.md FIRST for Worker Static Assets or Surge-behind-Worker instructions. Earlier statements below about the integration not being implemented describe the prior package; the direct Surge URL still does not serve the API. Hosted acceptance remains unfinished.

# RIFT: beginner hosting and open-source guide

Prepared 22 November 2026. This guide matches the current project, not a generic React tutorial.

## 1. Understand the pieces

- **Git** keeps a history of changes on your computer.
- **GitHub** stores a remote copy and lets you publish the source. Git and GitHub are different things.
- **Surge** serves the built HTML/JavaScript/images. It does not run our Node backend.
- **Backend host** runs API code.
- **Database** keeps drafts, sessions, registry and indexed information.
- **Redis** is a separate cache/rate-limiting service. It cannot replace the backend or our SQLite/D1 databases. You do not need it for the explicitly single-process preview below.
- **Cronos** holds deployed contracts, NFTs and transactions. Hosting a website does not deploy contracts.
- **WalletConnect/Reown project ID** is public connection configuration, not a wallet private key.

## 2. Choose the correct path BEFORE creating services

| Path | What works | Limitation |
|---|---|---|
| GitHub public repository | Source hosting and change history | Does not run the backend |
| Surge alone | Public static frontend preview | Current `/api/...` calls have no backend there; data/sign-in features will fail |
| Render Free, serving frontend AND Node API | Same-origin integrated evaluation deployment | Sleeps; SQLite changes disappear on restart/redeploy/spin-down; NOT durable production |
| Cloudflare Worker + D1 | Existing bounded API implementation with persistent D1 | Not full Node parity; frontend must share the API origin; routing/asset integration and hosted acceptance still required |
| Persistent Node host + durable disk | Closest fit for current full Node implementation | A dependable always-on free offer is not established here; provider costs/eligibility vary |

**Recommended immediate sequence:** publish source → test locally → integrated Render evaluation → optional Surge visual preview. Do NOT treat the free evaluation as a money-handling launch.

**If Surge is mandatory for the final frontend:** stop before claiming an integrated launch. Current UI uses relative `/api` requests; creator auth uses Secure, HttpOnly, SameSite=Strict cookies and origin/CSRF checks. An API URL environment variable alone will not fix that. `VITE_API_URL` is not currently implemented. We must either engineer a same-origin gateway on a domain you control or deliberately implement/test cross-origin transport and auth. Do not disable CSRF or loosen cookies as a shortcut. Surge Free should not be assumed to proxy our backend.

## 3. Prepare your computer

1. Use a computer, not only your phone. Windows, macOS or Linux is fine.
2. Install Git from https://git-scm.com/downloads .
3. Install Node.js **22.13.0 or newer in the Node 22 line** from https://nodejs.org/ . The project uses Node's SQLite support; do not choose Node 20.
4. Install VS Code from https://code.visualstudio.com/ if you want an editor.
5. Open Terminal (macOS/Linux) or PowerShell (Windows).
6. Type these commands one at a time:

```sh
node --version
npm --version
git --version
```

Expected: Node says `v22...`; the others print version numbers. If a command is not found, finish installation and reopen the terminal.

## 4. Download and open the correct folder

1. Download `RIFT-ebisu-updated-complete.zip` from this conversation.
2. Extract/unzip it.
3. Find its `cronos-market` folder. It contains `package.json`, `src`, `server`, `edge` and `contracts`.
4. Open that folder in VS Code.
5. Choose Terminal → New Terminal. All project commands below run from this folder.
6. Verify by typing:

```sh
ls
```

You should see `package.json`. Do not run project commands from the outer ZIP folder. The ZIP predates this guide; download this guide separately if you want it alongside the extracted source.

## 5. Protect secrets BEFORE making anything public

Never upload:

- `.env`, `.env.local`, `.dev.vars` or provider tokens;
- wallet seeds/private keys;
- `data/`, `backups/`, database files or SQL exports;
- Android signing keystores, private backup keys or credentials;
- generated `wrangler.generated.json` account configuration.

The project has a `.gitignore`, but strengthen it before your first commit. Add these lines at the end of `.gitignore` with your editor:

```gitignore
.env.*
!.env.example
data/
backups/
*.sqlite
*.sqlite-*
*.db
*.db-*
*.sql.gz
*.riftbak
*.apk
*.zip
checks/backup-test.sqlite*
```

Keep `.env.example`: it documents variable names without real secrets. Keep `edge/migrations/*.sql`: those are schema source code, NOT private database exports. Store any real database exports OUTSIDE this repository.

The complete ZIP may contain diagnostic evidence. Review `checks/` before publication for private URLs, identifiers or operational details. Public wallet addresses are not private keys, but publishing them can associate them with you.

## 6. Put the project on GitHub

GitHub is used here through its website and your local Git CLI; no assistant account connection is required.

1. Create/sign into your account at https://github.com/ . Enable two-factor authentication and save recovery codes privately.
2. Click **+ → New repository**.
3. Name it `rift-cronos-marketplace`.
4. For maximum safety, start **Private**, inspect the upload, then change to Public. Your final goal remains an open-source public repository.
5. Do NOT initialize it with README, `.gitignore` or license: the local project already contains files.
6. Click **Create repository**.
7. In your project terminal run:

```sh
git init
git branch -M main
git config user.name "YOUR NAME"
git config user.email "YOUR GITHUB NOREPLY EMAIL"
git add .
git status --short
```

Replace the quoted values. Your GitHub Settings → Emails shows a privacy-preserving noreply email.

**STOP and inspect the staged list.** You should see source, documentation, lockfile and migration SQL. You should NOT see `.env`, data/backups, APKs, keystores, node_modules or dist.

Check ignored examples:

```sh
git check-ignore .env data/example.sqlite backups/example.sql
```

Those paths should print. To unstage an accidentally added file without deleting it:

```sh
git rm --cached -- "PATH-TO-FILE"
```

Then commit and connect the remote:

```sh
git commit -m "Initial public RIFT source"
git remote add origin https://github.com/YOUR-USERNAME/rift-cronos-marketplace.git
git push -u origin main
```

Replace YOUR-USERNAME. Complete Git's browser sign-in or credential-manager flow. Do not enter your wallet password. GitHub account passwords are not HTTPS Git credentials; use its supported sign-in/token flow if prompted. Never put a token directly in the remote URL.

8. Open the repository in your browser; inspect the files.
9. If you started Private: Settings → General → Danger Zone → Change repository visibility → Public, after the license/secret checks below.

If you committed a real secret, deleting its current file is not enough: rotate/revoke it immediately, then remove it from Git history with appropriate tooling.

## 7. Make it genuinely open source

Public code without a license is not enough to grant normal open-source reuse rights.

1. Decide who holds copyright and confirm you have rights to license your original contributions.
2. Choose an OSI-approved license. MIT is permissive; Apache-2.0 adds explicit patent terms; AGPL-3.0 has network-use source-sharing obligations. This is a legal/business choice, not an automatic setting.
3. Add the selected license as `LICENSE` using the correct holder/year. Do not blindly relicense third-party code/assets.
4. Add `THIRD_PARTY_NOTICES.md` with required dependency/asset notices. Preserve OpenZeppelin and other applicable notices.
5. Do not publish copied marketplace branding, collection artwork or user uploads as if you own their rights. A public image URL does not grant redistribution rights.
6. Add `SECURITY.md` with a PRIVATE vulnerability-reporting method you control. Never invent an email address.
7. Add `CONTRIBUTING.md`: setup, tests, code review and no-secrets rules.
8. In README prominently state: current release status, no audit claim, unsupported features and how to run locally.
9. Commit/push these files once reviewed.

`"private": true` in package.json prevents accidental npm publication. It does NOT prevent an open-source Git repository; leave it alone unless you intend to publish an npm package.

## 8. Run the project on your computer first

```sh
npm ci
npm run build
npm run test:local-engineering
npm run contracts:test
```

Let each command finish. Stop if it reports an error. Contract tests are local; they do not authorize mainnet deployment.

Create local configuration:

Windows PowerShell:
```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:
```sh
cp .env.example .env.local
```

Open `.env.local` and set:

```dotenv
PUBLIC_ORIGIN=http://localhost:5173
CRONOS_RPC_URL=https://evm.cronos.org
INDEXER_ENABLED=0
EXCHANGE_TRADING_ENABLED=0
```

Leave contract addresses, Pinata JWT and upload sponsorship blank/zero. Run:

```sh
npm run dev
```

Open the localhost address printed by Vite. If it chooses a different port, update PUBLIC_ORIGIN to match and restart. Press Ctrl+C to stop. Vite development loads its env files; `npm start` does NOT automatically load `.env.local`.

## 9. Deploy an integrated FREE EVALUATION on Render

**Warning:** this is a disposable evaluation. Current Node databases are SQLite files. Render Free loses filesystem changes on restart/redeploy/spin-down and sleeps after idle time. Do not collect important drafts or accept funds on this evaluation host. Adding Redis or a random Postgres URL does not migrate our SQLite code.

1. Register at https://render.com/ .
2. Click **New → Web Service**.
3. Authorize access to only the RIFT repository, or use the supported public Git repository flow.
4. Select branch `main`.
5. Choose **Node**, not Static Site or Docker for these instructions.
6. If package.json is at repository root, leave Root Directory empty. If you uploaded an outer folder containing `cronos-market`, set Root Directory to `cronos-market`.
7. Name: any available name, e.g. `rift-evaluation`.
8. Build Command:

```sh
npm ci --include=dev && npm run build
```

9. Start Command:

```sh
npm start
```

10. Choose the **Free service instance**, and review account billing/spend limits. Do not assume a free workspace means every created service is free.
11. Add environment variables:

```dotenv
NODE_VERSION=22.23.5
NODE_ENV=production
ALLOW_SINGLE_PROCESS_LIMITS=1
INDEXER_ENABLED=0
EXCHANGE_TRADING_ENABLED=0
PIN_SPONSORED_BYTES=0
PIN_SPONSORED_FILES=0
CRONOS_RPC_URL=https://evm.cronos.org
```

Leave REDIS_URL UNSET for this one-process evaluation. Do not paste the entire env example with blank keys. Render supplies PORT; leave it to the provider.

12. Set Health Check Path to `/healthz` if offered.
13. Deploy. Open Logs. Wait for successful build and `RIFT production server listening`.
14. Copy the ACTUAL HTTPS URL Render assigned, e.g. `https://your-real-service.onrender.com`.
15. Add PUBLIC_ORIGIN with exactly that URL: no path and no trailing `/`. Save/redeploy. The first pass may expose disabled creator functions before this is configured.
16. Visit the URL. Because the same server serves frontend and API, `/api` routing stays same-origin.
17. Visit `YOUR-ACTUAL-URL/healthz`; expect JSON containing status `ok` and chainId `25`. This confirms process health, NOT contract readiness or complete upstream data.
18. Test collection/search/token reads and check server logs for errors. Read failures/limits must stay visible, not be replaced with fake data.

Do not set TRUSTED_PROXY blindly. Validate Render's actual proxy topology and Express rate-limit behavior first. A wrong setting can group users into one limit or permit spoofing. This is an operator acceptance item, not fixed by blindly trusting all proxies.

DO NOT configure factory/market/v2 addresses on this disposable host to advertise a production release.

## 10. Optional: publish the frontend on Surge

This creates a static design preview with the CURRENT source. It is NOT the integrated Render app. Its relative API requests go to Surge and will fail; API-backed screens can show unavailable/error states.

1. From the project folder build:

```sh
npm run build
```

2. Create the SPA fallback (keep index.html too):

```sh
node -e "require('fs').copyFileSync('dist/index.html','dist/200.html')"
```

3. Publish ONLY the dist folder:

```sh
npx surge ./dist YOUR-AVAILABLE-NAME.surge.sh
```

Replace YOUR-AVAILABLE-NAME with an available name. Follow Surge's account/email prompts. Review any installation prompt before approving.

4. Open `https://YOUR-AVAILABLE-NAME.surge.sh`.
5. Try refreshing a collection route: 200.html should let the SPA load instead of a static 404, but it does not provide backend API routing.
6. Mark this site as a preview and link users to the integrated evaluation URL rather than inviting transactions.

**Never run `surge .` from the source folder.** It risks publishing files you did not intend to serve.

On future deployments repeat the build, fallback-copy and publish commands. Publishing new source without rebuilding does not update the built website.

## 11. Preferred free-tier backend candidate for later: Cloudflare Worker + D1

Why consider this: the repository already has a D1 backend; this avoids pretending ephemeral SQLite is durable. It is bounded, not unlimited, and not full Node parity.

Preparation only; obtain a finalized same-origin frontend integration before announcing a working public app.

1. Create a Cloudflare account; enable 2FA.
2. From the project folder:

```sh
npx wrangler@latest login
npx wrangler@latest d1 create rift-core
```

3. Complete browser authorization. Copy the REAL database_id printed by create. It is an identifier, not a private key.
4. Read `edge/README.md` and `scripts/configure-edge.js`. Set D1_DATABASE_ID and the exact final PUBLIC_ORIGIN in your terminal environment, then run:

```sh
node scripts/configure-edge.js
```

PowerShell environment syntax:
```powershell
$env:D1_DATABASE_ID="YOUR-REAL-DATABASE-ID"
$env:PUBLIC_ORIGIN="https://YOUR-FINAL-APP-ORIGIN"
```

macOS/Linux syntax:
```sh
export D1_DATABASE_ID="YOUR-REAL-DATABASE-ID"
export PUBLIC_ORIGIN="https://YOUR-FINAL-APP-ORIGIN"
```

Run the helper AFTER setting variables. Inspect `wrangler.generated.json`; keep it untracked. Do not substitute a made-up database ID or confuse the final app origin with a separate API hostname.

5. For the NEW empty `rift-core` database created above, inspect the generated configuration: binding `DB`, database_name `rift-core`, migrations_dir `edge/migrations`. Apply the ordered migrations:

```sh
npx wrangler@latest d1 migrations list rift-core --remote --config wrangler.generated.json
npx wrangler@latest d1 migrations apply rift-core --remote --config wrangler.generated.json
```

Review the confirmation and target database before approving. All ten migrations must be applied. Use the config flag for EVERY D1/deploy operation. If this is an EXISTING database rather than the new empty one, STOP: obtain a backup and migration review first. Do not reuse this step to overwrite production.
6. Use `npx wrangler@latest deploy --config wrangler.generated.json` only AFTER migration and routing review. Keep uploads/index/trading activation gated.
7. Configure private provider tokens via `wrangler secret put ... --config wrangler.generated.json`, NEVER public vars or VITE variables.
8. Validate D1 migrations, session cookies, origin/CSRF, sign-in and data persistence on the actual final origin.
9. Measure hosted CPU, read/write/storage and scheduled index throughput. A deployment success is not free-plan acceptance.

**This section is deliberately not a one-click production recipe.** Same-origin frontend integration, Node/Worker capability differences and quota acceptance must be finished first. No Redis is required for the Worker/D1 path. Do not attempt to run the Express server inside Workers unchanged.

## 12. WalletConnect setup

1. Create a Reown/WalletConnect dashboard project at https://cloud.reown.com/ .
2. Add the ACTUAL frontend HTTPS origin(s) to its allowed domains/origins as the dashboard requires.
3. Copy its public project ID into VITE_WALLETCONNECT_PROJECT_ID in your build environment.
4. Rebuild/redeploy frontend. On Render add the variable and trigger a new build. For Surge set it locally before `npm run build`.
5. Test QR/deep-link and wallet return on your actual phone. A connected wallet is not proof trading works.

Public VITE values are embedded into downloaded JavaScript. They must never contain provider secrets or deployment keys.

## 13. Contract deployment: STOP until reviewed

Website deployment does not create a marketplace contract. Do not put a seed phrase in hosting, GitHub Actions or .env to make deployment easier.

Before mainnet:

1. Obtain independent review of the exact contract source/build and admin powers.
2. Confirm zero-fee behavior and royalties/withdrawals for the chosen contract version.
3. Decide admin custody and retain an explicit record of who controls it.
4. Have an engineer prepare a deployment manifest and safe signing workflow. Do not assume the current deployment script covers every factory/v2 artifact.
5. Approve the specific Cronos mainnet transactions in your wallet and pay actual CRO gas.
6. Record receipt block, deployed address and verified runtime hash; verify source on the explorer where supported.
7. Configure matching frontend/backend addresses. Never mix the original marketplace with separate v2 exchange configuration.
8. Configure persistent indexers from actual deployment blocks, not guessed values or genesis scans.
9. Run end-to-end buy/list/cancel, offers, partial quantities, bulk failure and withdrawals as applicable, with a deliberately bounded funded acceptance plan.
10. Activate public trading only after review and acceptance. EXCHANGE_TRADING_ENABLED=0 is not a universal emergency stop for every original marketplace/contract action.

## 14. Durability, backups and release checklist

Before real users/funds:

- [ ] Backend storage survives redeploy AND restart; actually test it.
- [ ] Final browser origin serves API/session correctly; no permissive CORS workaround.
- [ ] No private secrets in public repository or build.
- [ ] License and third-party rights reviewed.
- [ ] Real contract deployment/review/runtime configuration verified.
- [ ] Indexers run reliably and report honest coverage.
- [ ] Private encrypted off-host backups and a restore drill succeed.
- [ ] Monitoring, provider quota and billing alerts are configured.
- [ ] Real phone/wallet flows pass.
- [ ] Android is rebuilt for the actual backend and tested; old offline APK does not auto-update.
- [ ] Unfinished features remain disabled or honestly labelled.
- [ ] Clear user-facing terms, privacy, support and vulnerability contact exist.

Code in Git is not a backup of database state or pinned artwork. GitHub source publication does not guarantee IPFS retention. Keep recovery keys separately from encrypted backups.

## 15. Your daily update workflow

```sh
git pull --ff-only
# Edit and test the code.
npm run build
npm run test:local-engineering
git status --short
git add PATH-TO-INTENDED-FILE
git commit -m "Describe the change"
git push
```

Add explicit intended files; inspect changes before committing. Render can rebuild from main when auto-deploy is enabled. Surge needs a fresh dist build, 200.html copy and surge publish. Database schema changes need a reviewed migration; reverting frontend source does not undo a database migration or blockchain transaction.

## 16. Common problems

| Symptom | Meaning / action |
|---|---|
| npm says package.json missing | Terminal is in wrong folder |
| node:sqlite unavailable | Wrong Node version/runtime |
| Surge loads but collections fail | Static site has no API; expected until integration is engineered |
| Unexpected token '<' in JSON | API request returned an HTML page/fallback, not JSON |
| 403 signing in | Check exact origin, same-origin routing, cookie and CSRF behavior; do not disable protections |
| Render loses drafts | Free ephemeral filesystem, not a wallet issue |
| Render takes time to wake | Free service idle spin-down |
| 429 | Rate/provider quota exceeded; wait and inspect limits |
| Trading says not configured | No accepted matching deployment; do not insert random addresses |
| New env setting has no frontend effect | VITE variables require rebuild |
| Old Android remains offline | APK was built unconfigured; rebuild and install the new accepted version |

## Official references

- Surge platform: https://surge.sh/docs/platform/
- Surge pricing: https://surge.sh/pricing
- Render Free limitations: https://render.com/docs/free
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Worker limits: https://developers.cloudflare.com/workers/platform/limits/
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Git downloads: https://git-scm.com/downloads
- GitHub: https://github.com/

Provider plans change. Verify current dashboard limits/pricing before accepting charges or declaring a production capacity guarantee. No account, deployment, purchase or mainnet action was performed by writing this guide.
