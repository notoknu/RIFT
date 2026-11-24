# v21 — Creator workflow integration increment

## Delivered in source

The Create route now includes a unified launch-workflow panel for on-chain and IPFS paths. It follows storage selection, shows free/paid mint classification independently, links each stage to existing tools, and exports a planning report. Stages distinguish action-needed, prepared, partial, recorded and external acceptance. It never labels the platform production-ready or permits a manual checkbox to masquerade as verified evidence.

IPFS mode adds local metadata validation and a recovery manifest export: exactly numbered JSON plus contract.json, bounded file sizes, valid IPFS references/traits, per-file SHA-256 and deterministic manifest hash. The hash is explicitly NOT an IPFS CID and proves neither public availability nor durable pinning. Metadata bytes remain on the device. Pinata/Filebase/own-node links are provider guidance, NOT newly integrated direct-upload adapters or a promise of free storage.

Existing generation, metadata exports, contract deployment/gas review, allowlists, verification ZIP, mint management, readiness inspector, profile source and signed-in sponsored upload tools remain connected in the same Create screen. The sponsored upload service still requires owner configuration and finite quota.

## Not completed by this increment

- No live Render deployment: owner selected manual deployment, and no authorized deployment channel is available in the session.
- No live profile activation or persistent Render volume/redeploy acceptance.
- No automatic source-verification submission/status polling.
- No direct creator-account uploads to every external pin provider.
- No universal marketplace integration or third-party collection verification.
- No new contract deployment, collection creation, funded-wallet spending, paid provisioning or mainnet transactions.
- No claim of fully generated unique ULTRA CAT-equivalent on-chain art: current renderer and supplied shared-SVG mode retain their documented limitations.
- No physical-device acceptance or production-wallet approval.

This is a tested integration increment, not completion of the entire master plan. It was not a five-hour unattended engineering run.

## Render handoff

The full-source ZIP uses repository-root layout, including cronos-market/. It is not a dist-only upload. Apply it through the owner's reviewed source/deployment path. Do not upload the secret-bearing reference attachment.

Root directory: cronos-market
Build: npm ci --include=dev --ignore-scripts && npm run build
Start: npm start
Node: supported Node 22 >=22.13

For profiles, follow RENDER-FIRST-V20.md. PUBLIC_ORIGIN must be the exact Render app origin. CREATOR_DB must be an absolute path on a real persistent mount, and CREATOR_STORAGE_PERSISTENT=1 only after owner verification. Keep the same-origin frontend API override variables unset. Do not pay for or enable a disk merely by assuming this release authorizes it.

Acceptance after owner deployment: health chain 25; Create route has the workflow panel; anonymous profile route rejects authentication rather than Unknown endpoint; a signed-in profile survives redeploy; snapshot/restore tested in an isolated fresh destination. Android external-wallet pairing still requires separate real-device testing.

## APK

Version code 21; same preview application ID and preserved debug signing key. Update without uninstalling if Android accepts the existing signing identity. Preserve local data; never clear app data to solve a backend availability issue. Do not import funded wallets into this debug-signed preview.
