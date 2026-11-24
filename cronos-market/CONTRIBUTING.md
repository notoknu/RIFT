# Contributing to RIFT

This repository is a locally tested engineering candidate, not an audited mainnet release. Do not infer production readiness from a green CI badge.

## Development

Use Node 22.13+ (Node 22 line) and `npm ci`. Then:

```
npm run source:audit
npm run test:local-engineering
npm run contracts:test
npm run test:implementation
npm run build
npx playwright install chromium
npm run test:browser:implementation
npm run test:edge-browser
```

Redis integration tests require your own disposable local Redis and `TEST_REDIS_URL`. Never point tests at a production Redis/database.

## Changes

- Preserve chain 25 checks, source provenance, null-versus-zero, and explicit index coverage.
- Never turn external venue data into executable RIFT orders without a separately reviewed adapter.
- Keep legacy marketplace and v2 exchange identities/configuration separate.
- Add regression tests for security, auth, event/reorg and amount/quantity changes.
- Do not commit credentials, databases, SQL exports, uploaded user data, private keys or signing material.
- Do not weaken CSRF, same-origin session rules, private-network restrictions or receipt/runtime checks to make a demo pass.
- Remote migrations/deployments require account-owner approval; mainnet transactions require a separately reviewed signing plan.
- Check dependency and artwork/font licensing. Do not add third-party branding/art without permission.

The project owner must select a project-wide license and copyright holder before calling a public copy an open-source release. Bundled dependencies/fonts retain their respective licenses. Contributing source does not establish permission to relicense other people's work.

The engineering suite now also runs pure Java native policy/parser tests: install JDK 17 and set JAVA_HOME. These do not run Android Keystore/SQLite. Native test harness sources under checks/native must be retained in publication packages. Native settings store only user-owned provider credentials; never add wallet keys or platform tokens.
