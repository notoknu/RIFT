> Latest: read ENGINEERING-SESSION-RESULTS.md first. The manual evaluation workflow and real Worker/D1/browser acceptance tests now exist. `npm run edge:configure`, `npm run source:audit`, `npm run check:hosted`, and `npm run test:edge-browser` are available. Scheduled indexing is OFF by default; EDGE_SCHEDULED_ENABLED=1 is an explicit resource-consuming opt-in. Android preview v5 is the latest offline debug build.

# RIFT deployment preparation: what is now ready

## New same-origin delivery options

Frontend/API routing has now been implemented in the Worker. Choose ONE:

**A. Simplest: Worker Static Assets + D1**

- Run `npm ci` then `npm run build`.
- Do not set SURGE_ORIGIN.
- Create your real D1 database `rift-core` through Wrangler.
- Set D1_DATABASE_ID and PUBLIC_ORIGIN to your actual final HTTPS app origin.
- Run `node scripts/configure-edge.js`.
- Generated config includes `dist`, ASSETS binding and SPA fallback; Worker runs first so `/api` never becomes an HTML fallback.
- Inspect config, apply ten migrations to the NEW empty database, then deploy:

```
npx wrangler@latest d1 migrations apply rift-core --remote --config wrangler.generated.json
npx wrangler@latest deploy --config wrangler.generated.json
```

**B. Surge frontend files + Worker/D1 public gateway**

1. Build locally: `npm run build`.
2. Create fallback: `node -e "require('fs').copyFileSync('dist/index.html','dist/200.html')"`.
3. Publish ONLY `dist` to your chosen available HTTPS Surge subdomain.
4. Set SURGE_ORIGIN to the exact real `https://your-name.surge.sh` origin.
5. Set PUBLIC_ORIGIN to the WORKER public app URL, NOT Surge.
6. Set real D1_DATABASE_ID; run `node scripts/configure-edge.js`.
7. Inspect generated config; migrate NEW empty D1 and deploy as above.
8. Share/open the WORKER URL as the app. It serves `/api` itself and retrieves static frontend files from the configured Surge host. Browser cookies/API calls remain on the Worker origin.
9. In Reown allowlist the public WORKER app origin and rebuild frontend with your public project ID.

This does NOT turn the direct `*.surge.sh` URL into a working same-origin app. Use the Worker URL as your public address (or engineer/configure a custom domain). No paid Surge proxy feature is needed by this gateway approach, but both providers' quotas apply.

Surge routing allows only a configured exact HTTPS *.surge.sh origin. Session cookies, Authorization, upstream cookies and redirects are not forwarded. Static responses revalidate rather than receiving long HTML caches. Worker /api and /healthz always bypass static delivery. This is not an arbitrary URL proxy.

## Inputs you may safely drop in this conversation

- Desired public repository name and GitHub username.
- Your preferred open-source license and copyright holder (MIT / Apache-2.0 / AGPL-3.0 are choices, not equivalent policies).
- Actual public Surge URL and assigned Worker app URL.
- Public D1 database ID (an account resource identifier, not a private token).
- Public Reown project ID and approved origin.
- Redacted deployment/build errors; inspect before sending.
- Public contract addresses, receipt transaction hashes and deployment blocks AFTER approved deployment.
- Public support/security contact you control, if you want it in docs.

Do NOT drop seeds, private keys, provider API tokens, keystores/passwords, raw database exports or recovery keys. Set private provider credentials through your provider's secret interface. D1 IDs/account domains may reveal account associations; share only if you are comfortable with that.

No connected account or safe deployment credential channel exists in this session. You must perform browser login/authorization and account-controlled deployment commands, or enable an available supported connection; posting public identifiers alone does not grant deployment authority. GitHub connector lookup returned unsupported in this environment; use local Git and the website.

## New wallet testing

`test/disposable-wallet.js` creates NEW random seller and buyer keys in process memory on each run, funds them only through local Hardhat balance allocation, executes actual signed local EVM transactions and discards keys. Public-address-only evidence is in `checks/disposable-wallet-result.json`.

```
npm run contracts:test
```

It verifies mint/approve/list, wrong-payment rejection, buy/ownership transfer, full-price seller proceeds, withdrawal, relisting, cancellation and message-signature recovery. Other contract suites cover v2/ERC1155/offers/bulk/drop/adversarial flows using local accounts. The Worker runtime suite independently uses a random wallet to sign in and checks D1 drafts/favorites/replay rejection.

These are not one persistent mainnet wallet and not proof of all possible paths. Never send real CRO/NFTs to evidence addresses: keys are NOT retained, and they could not be recovered from this process later. No seed/private key has been saved or printed. No real funds or mainnet transactions were used.

For mainnet acceptance use a user-controlled fresh wallet on your own device. Approve a specific bounded plan and cost ceiling before real transactions. Phone wallet UI, deep links and actual transaction signing cannot be fully accepted by a local simulated wallet.

## Current acceptance status

- 93 engineering tests passed (includes four frontend delivery cases).
- 39 Solidity tests passed (includes fresh disposable-wallet scenario).
- Production build passed; bundle-size warning remains.
- Existing real workerd/D1 authentication tests passed as part of engineering.
- Gateway routing/header isolation tests passed with controlled responses.
- No real Surge, Worker, D1 or GitHub deployment performed.
- No hosted CPU/quota/load/retention guarantee established.
- Existing Worker/Node parity, storage, wallet-device and independent audit gaps remain in ENGINEERING-COMPLETION-CHECKLIST.md.
- No license was selected for you. Repository publication is prepared but must wait for rights/license and secret review.

The earlier beginner guide's same-origin blocker is superseded for these TWO delivery paths by this implementation. Its remaining provider durability/mainnet warnings still apply. The old v4 APK was not rebuilt: no Android UI change was made and its backend remains unconfigured. Older ZIP files do not contain this continuation.
