# v15 — selectable connections plus manual input

## How to use

1. Install the v15 debug APK, open **Connections & local tools**.
2. Choose **Direct-read** (or Hybrid if you own a deployed compatible RIFT API).
3. Choose the Primary provider: Cronos public RPC, PublicNode, dRPC, or manual/provider-issued URL. Tap **Apply Primary provider to editable fields**. Manual inputs remain editable. Repeat for Backup if wanted. No selection contacts a server or saves automatically.
4. Public presets need no token. For your own provider use its complete HTTPS URL or documented Bearer authentication; use the authentication-help selector. Arbitrary x-api-key/basic authentication headers are not implemented. Never enter seed phrases/private keys.
5. Tap **Save mode & protected connections**, then **Test saved primary connection** and optionally **Test saved backup connection**. Tests check Cronos chain 25; preset inclusion does not promise uptime, trust, availability or provider completeness. Public hosts see requests/IP and may throttle. No automatic fallback forwards credentials.
6. Shared API section: choose Worker / Node hosting / own server / manual for setup guidance, then enter your **actual deployed RIFT API HTTPS origin**. A hosting-provider homepage, static Surge site, Redis URL or unrelated NFT API is not a compatible RIFT backend. No fake service address is filled.

## Section coverage and deliberate limits

| Section | Available now |
|---|---|
| Primary RPC | Three public presets + manual HTTPS/provider-issued URL |
| Backup RPC | Same independent presets + manual URL; existing explicit swap/test/remove |
| Credentials | Public/no key, URL-key or Bearer guidance for each slot; manual protected input and existing deletion controls |
| Shared RIFT API | Hosting/setup choices + manual actual service origin; no hosted service provisioned |
| Native IPFS JSON/artwork | Existing fixed ipfs.io gateway + manually entered IPFS URI/CID path; gateway picker is NOT implemented |
| Rankings/discovery upstream services | Backend configuration, not arbitrary native endpoint replacement |
| Upload/pinning provider secrets | Backend-only authorization/configuration; no new insecure client-side secret entry |
| WalletConnect project ID/contract deployment | Existing build/deployment configuration, not editable native connection fields |
| Explorer | Existing links; not a configurable RPC/API credential |

Thus this increment covers the existing native connection inputs; **not every backend/build-only API now has a functional in-app provider adapter**. Those require compatible adapters and security work, not merely URL dropdowns. Existing connection mode/network policy, Keystore protection, chain checks, source-revision invalidation and paused receipt checks on save remain intact. Applying public presets clears typed credential text; saving a public preset with no new token clears an old saved token even if its URL is unchanged. Manually typed replacement values are never saved just by selecting a dropdown.

## Verification

166 engineering tests passed. Android test/build/lint passed; 21 native JVM tests (18 existing + 3 preset catalog tests). Fifteen instrumentation tests compiled, NOT executed. No authorized Android device/emulator: native picker touch/accessibility/runtime acceptance remains open. No full browser/contract/mainnet rerun is claimed for this native-settings-only increment. See `checks/v15-android.log`, `checks/v15-native-preset-tests.xml` and `checks/v15-engineering.log` for results. APK uses a disposable debug certificate, not production signing.

Provider catalog source: https://chainid.network/chain/25/ (Cronos chain 25). Manual fields remain available if provider terms/addresses change. No remote catalog or embedded provider secrets.

Previous full milestone report remains `HYBRID-V14-IMPLEMENTATION-REPORT.md`. This is an engineering preview, not full marketplace/launch acceptance. All previously recorded release gates still apply.
