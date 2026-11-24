# Replace repository contents with this clean bundle

## First

1. Make `notoknu/RIFT` private while cleaning it.
2. Rotate the Surge and Render credentials previously pasted into chat. Review exposed repository configuration/logs too. Treat the published ADB key as compromised and revoke matching authorizations on any devices that trusted it; the debug Keystore must not be used for production or funded-wallet builds.
3. Back up any files you actually need outside the working clone, privately. Do NOT copy `.android`, `.config`, secrets, live databases, APKs or history archives back into this bundle.

## Folder structure after extracting

Extract the CONTENTS into the repository root, not into an extra nested folder:

```
RIFT/
  .git/                         # keep the existing Git metadata; not supplied in the ZIP
  .gitignore
  .github/workflows/
  README.md
  UPLOAD-TO-GITHUB.md
  REPOSITORY-MANIFEST.sha256
  cronos-market/
    package.json
    package-lock.json
    src/
    server/
    android/
    deployment/
    ...
```

Do not delete `.git` or put the ZIP itself in the repository. Ensure your file manager copies hidden `.github`, `.gitignore` and `.env.example` files.

## Git commands (Git Bash on Windows, macOS or Linux)

Use a fresh local clone rather than deleting your only working copy. Authenticate with your own browser/Git credential manager; do not paste credentials into chat or a remote URL.

```sh
git clone https://github.com/notoknu/RIFT.git RIFT-clean
cd RIFT-clean
```

In this FRESH CLONE ONLY, after checking `pwd` / the current folder and keeping any needed private backup, remove its tracked working files:

```sh
git rm -r -- .
```

This stages removal and deletes tracked files in this clone; it does not erase past commits. Next extract this ZIP's contents INTO `RIFT-clean`, leaving its `.git` folder intact. Then:

```sh
git add -A
git status
# Review every staged file; there should be no keys, credentials, databases or APKs.
git diff --cached --stat
git commit -m "Replace workspace upload with clean RIFT source and hosting configuration"
git push origin main
```

If your default branch is not main, use its actual branch name. No force push is required for this normal replacement. GitHub may reject or block exposed secrets until the history issue is resolved. A new clean commit is NOT proof that leaked keys are gone from history/caches/clones. After rotating credentials, decide on history cleanup with appropriate review/backups; do not blindly force-push shared history.

## Deployment after the push

- The already live Surge site/service is NOT automatically updated just because files were replaced. The supplied Surge workflow is manual-only; Render automatic deploy is intentionally off.
- Root GitHub workflows are adapted for the `cronos-market/` subfolder. Security/Android CI runs on push/pull request and can consume your included GitHub Actions quota; the optional emulator is manual.
- Add a newly rotated `SURGE_TOKEN` repository/environment secret and a `SURGE_LOGIN` Actions variable for your Surge account. Configure/approve the `production` environment, then manually run **Deploy RIFT public preview to Surge**. Its fixed target is `rift.surge.sh`.
- If the repository is private, authorize Render's GitHub integration under your own account before future builds. Existing service: `RIFT`, root directory `cronos-market`, backend `https://rift-q6qs.onrender.com`.
- The current Render build command contains a small credential-free public-CORS helper and checks the original server source hash. This bundle preserves that original server source; intentional server changes require updating/reviewing the build patch. No shared credentials or sign-in weakening is needed.
- No provider secrets, Git metadata, node_modules, APKs, Android SDK/cache, local runtime data or old build archives are supplied. npm/Gradle recreate dependencies; `npm run android:prepare` regenerates bundled Android web assets.

This bundle is source for the existing engineering preview, NOT production-wallet or mainnet acceptance. No signing/deployment transactions are authorized by these instructions.
