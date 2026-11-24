# RIFT deployment handoff — Surge + Render

## Live endpoints

- Frontend: **https://rift.surge.sh** — published successfully under the requested Surge account (CLI authenticated that account).
- Backend: **https://rift-q6qs.onrender.com** — Render service `RIFT` in the existing `RIFT` project, **free plan**.
- Backend dashboard: https://dashboard.render.com/web/srv-dc2lor4s728c73avrom0
- Repository: https://github.com/notoknu/RIFT — read access checked; **no GitHub write access was available and no commit/push was made**.

This is a **public-read-only browsing preview**, not a full-mainnet or wallet release. Creator accounts/uploads are disabled, no RIFT trading contract is configured, and the native wallet is still test-only with no embedded signing. Do not import a funded wallet or fund generated addresses.

## URGENT: credentials and repository hygiene

The supplied provider credentials were used only with their intended providers and were not written into source, frontend assets or the APK. Exact-value checks found neither credential in the checked project source/artifacts. This is not a forensic guarantee about chat/provider/platform logs. They were pasted into chat: **revoke/rotate both credentials now and store replacements in secret settings, not chat or source**. Credential rotation should not remove the already deployed site/service; neither key is needed by the running app.

Repository filename inventory (contents NOT opened) showed `.android/adbkey`, `.android/debug.keystore`, local configuration and logs in the public repository. **Make the repository private immediately while cleaning it.** Treat the published ADB key as compromised; revoke matching device authorizations if it was ever trusted and generate a replacement locally. The debug keystore is disposable and must never be a production signing key; do not trust it for funded-wallet builds. Review local configuration/logs for other credentials and rotate anything exposed. Removing a file in a new commit does not remove it from Git history, cached pages or prior clones. Do not publish this whole workspace again.

No remote files/history were deleted here. The patch includes a root `.gitignore` and manual cleanup guidance; it does not erase your local originals or rewrite Git history automatically.

## What was actually configured

Render uses the existing public repository's `cronos-market` root and Node 22.16.0. The free single-process abuse-limit mode is explicit. Background indexing is disabled. No paid resources, database or persistent disk were provisioned. `PUBLIC_ORIGIN` is intentionally blank to disable creator auth/writes on ephemeral free storage. Automatic deploys are OFF pending repository cleanup.

Because GitHub write access was absent, the Render build command reconstructs the two credential-free deployment helper files, verifies the original `server/production.js` SHA256, and applies the small public-read CORS middleware during the build. This build-time change is not a GitHub commit. It fails closed if that source server file changes. The initial build omitted dev dependencies under NODE_ENV=production and failed; the corrected `npm ci --include=dev --ignore-scripts` build succeeded and became live.

The Surge build pins its public API origin to the Render URL, routes public `/api/` GET/HEAD fetches without cookies/authorization, routes API-backed images, includes SPA `200.html` fallback, and displays the preview limitations. Cross-origin writes are explicitly rejected. Existing same-origin creator cookies were NOT weakened to unsafe cross-site cookies. A future full-account deployment needs a durable authenticated design or a proper same-origin reverse proxy/custom domain arrangement.

Free Render services can sleep/cold-start and are quota/provider dependent. **This is not an always-on availability guarantee.** No uptime pinger or paid plan was silently added. Surge domain permanence and availability depend on the account/provider remaining active.

## Verification actually executed

- Live Surge publication succeeded, HTTPS enabled.
- Real browser rendered the deployed app and performed a cross-origin backend health fetch: HTTP 200, status ok, chain 25.
- Real public collection API returned HTTP 200 with **134 collections** in the observed response. Coverage, freshness, provider verification and completeness remain as reported by the source/API, not independently certified.
- `/about` SPA deep link worked; no page exceptions were recorded; tested 393px viewport had no horizontal overflow.
- Unknown API returned JSON 404; creator capabilities returned an explicit disabled 503, as intended.
- **181 local engineering tests passed**, including three new public-routing/CORS tests. This was not another Android build/custody acceptance run; v18 native limitations remain unchanged.
- Evidence: `checks/live-public-hosting.json`, `checks/live-public-hosting.log`, `checks/surge-publish.log`, `checks/hosting-engineering.log`, `checks/render-deployment-result.json` and `checks/render-redeploy.json`.

## Android connection setting

In the v18 app, use **https://rift-q6qs.onrender.com** as Shared service origin, NOT the Surge URL. Save edits (disconnects), then Connect saved services and close settings to reload. The public site is https://rift.surge.sh; it is not a same-origin backend API endpoint. Creator/trading limitations remain even after connecting successfully.

## Bringing the changes into GitHub

1. Make the repository private and rotate exposed credentials first.
2. Download/extract `RIFT-hosting-cleanup-patch.zip` into a local clone of `notoknu/RIFT`, preserving its root structure. It supplies the root `.gitignore`, a manual-only Surge workflow, and the new frontend/deployment/test files. It contains NO provider credentials.
3. From the repository root in Git Bash/macOS/Linux, remove accidentally tracked local directories from the index WITHOUT deleting local originals:

   ```sh
   git rm -r --cached --ignore-unmatch .android .config
   git rm --cached --ignore-unmatch .sudo_as_admin_successful
   git status
   ```

   Review APK/history archives/runtime caches too; they belong in controlled release/download storage, not a blind workspace upload. Review every staged change before committing. This alone does NOT clean old history; after rotating credentials, decide whether to rewrite history with appropriate backups/review. Do not blindly force-push a shared repository.
4. Commit/push the reviewed cleanup and patch through your own GitHub login. No GitHub password/token should be pasted here.
5. In GitHub repository Settings → Secrets and variables → Actions, set a newly rotated `SURGE_TOKEN` secret and a `SURGE_LOGIN` variable for your account. Set up the `production` environment with manual approval if desired. The supplied workflow lives at ROOT `.github/workflows/deploy-surge.yml` (not nested under cronos-market) and runs only on manual dispatch.
6. In Render, link/authorize the now-private repository through your own GitHub integration before expecting future builds. Existing deployed service stays separate from this setup. Keep auto-deploy disabled until cleanup and tests are reviewed. The temporary build patch pins a server hash; deliberate server changes require reviewing/updating that patch rather than bypassing its check.

For local frontend updates:

```sh
cd cronos-market
npm ci --include=dev --ignore-scripts
# Set this environment variable in your shell; it is public configuration:
# VITE_PUBLIC_API_ORIGIN=https://rift-q6qs.onrender.com
npm run build:surge
# Publish dist/ to rift.surge.sh using your own Surge login/secret environment.
```

Future deployment target configuration is recorded in `deployment/site.json`. No credentials are in that file. The existing v18 APK/source package is not rebuilt or relabelled by this web-hosting increment.
