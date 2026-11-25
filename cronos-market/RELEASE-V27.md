# RIFT v27 — exact device evidence, wallet-session checks and SQLite recovery

## Work across remaining items1–5

### 1. Android acceptance preparation
The device checker binds installed app versionCode, both installed APK SHA-256 hashes and runner target to the exact release build report before instrumentation can execute. It rejects malformed/split paths, mismatched hashes/versions, runner targets and invalid expected counts. Raw instrumentation transcript text is not retained; the report stores a digest and parsed verdict. Four policy tests and four mock-ADB CLI scenarios cover successful binding and fail-closed gating. These are not real device tests. No automatic install/uninstall/data clearing was added.

### 2. WalletConnect session hardening
Malformed chain events clear the previous chain assumption to unknown chain0 and emit empty authorized accounts. Valid number/decimal/hex/eip155 chain events remain supported. Only generic eip155 or exact eip155:25 namespace keys may supply Cronos accounts. Explicit relay-method allowlisting blocks unsupported signing, batched execution, permission and plugin methods rather than forwarding arbitrary requests. Four new lifecycle tests cover these conditions. Real relay/pairing still needs an owned project ID and authorized wallet/device access.

### 3. Local recovery implementation/evidence
Snapshot/restore rejects preexisting manifests, bounds data/manifest sizes, validates exact private staged bytes and table evidence before fresh-path publication, and never overwrites destinations/WAL/SHM. IndexStore main database permissions are0600 before WAL initialization. Four new snapshot tests and two actual child-process SIGKILL/WAL drills cover committed survival, uncommitted rollback and independent restored application reads. This does not establish hosted or Android lifecycle acceptance; see LOCAL-RECOVERY-ACCEPTANCE.md.

### 4. Trading/security gate
Independent review and approved mainnet acceptance remain necessary. Local security/contract/build regression evidence is reported in the exact build report. No trading activation, deployment, new approval, funded-wallet import or mainnet spend is authorized/inferred.

### 5. Broader feature implementation
These changes improve existing wallet/session, account/index recovery and release evidence rather than adding fake external venue adapters. External marketplace execution, requested discovery coverage, full launchpad/provider acceptance, global provider coordination and encrypted automatic synchronization remain incomplete.

## Scope
This is an Android/frontend/source/backend-tooling update. Old APKs do not include the wallet changes. Use successfully verified v27 artifacts and their matching full source. Instrumentation suite remains19; compilation is not execution. License choice remains explicitly undecided (item6).
