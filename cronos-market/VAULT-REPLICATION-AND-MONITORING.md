# Recovery-vault replication and bounded monitoring

## What is implemented

A reviewed, explicit selected-artifact transfer between two **distinct filesystem vault identities with different catalog secrets**, plus bounded foreground audit monitoring and uninstalled systemd templates. This can operate on an operator-mounted filesystem; it does not supply cloud transport credentials, prove the mount is remote, prove independent power/failure domains, implement WORM or grant deletion/revocation authority.

Keep source vault ID/head and destination ID/head independently pinned. Do not use public Filebin for private operational backups/keys. Both vaults must already be initialized with the existing vault CLI. The operator's directory/key and encrypted-working-storage assumptions from `RECOVERY-VAULT-RUNBOOK.md` still apply.

## Replication workflow

`npm run platform:replica -- plan --config /ABS/PRIVATE/config.json`

The configuration must be an absolute regular non-symlink JSON file, mode 0600 (no group/other permissions), <=64 KiB. Unknown top-level and side fields are rejected. Format:

```json
{
  "format": "rift-vault-replica-config-v1",
  "sourceVault": {
    "vault": "/ABS/source-vault",
    "catalogKeyFile": "/ABS/private/source-catalog.key",
    "catalogKeyId": "source-catalog-id",
    "expectedVaultId": "PINNED_SOURCE_UUID",
    "expectedHead": "PINNED_SOURCE_HEAD"
  },
  "targetVault": {
    "vault": "/ABS/target-vault",
    "catalogKeyFile": "/ABS/private/target-catalog.key",
    "catalogKeyId": "target-catalog-id",
    "expectedVaultId": "PINNED_TARGET_UUID",
    "expectedHead": "EMPTY"
  },
  "fileHashes": ["EXACT_SELECTED_ARTIFACT_SHA256"],
  "keyFiles": {"artifact-key-id": "/ABS/private/artifact.key"},
  "workDir": "/ABS/private/encrypted-working-directory",
  "maxArtifacts": 8,
  "maxBytes": 1073741824
}
```

This is explanatory syntax, not an executable configuration. Substitute independently reviewed actual IDs/hashes/absolute paths locally. Keys are private 32-byte files; do not put raw key bytes in JSON or arguments. Source/target catalog keys must differ from each other and every artifact key. Key-file mapping supports up to 32 IDs; selected artifact count must be 1–32, unique and within configured count/byte allowance. Defaults: 8 selected artifacts/1 GiB. Maximum scheduling allowance: 32 artifacts/8 GiB. Bounds count selected artifacts, including already recorded copies, so verified-existing paths cannot bypass the reviewed scope.

Planning authenticates both catalogs and external pins, rejects identical vault identity/path/inode and reused catalog secrets, blocks observed locks/orphans/interrupted work, fully verifies selected source artifacts and any already recorded destination copies, checks target capacity, then repeats pinned inventories. Selection order is canonical source receipt order, not attacker-controlled iteration order. Planning writes no vault data.

Review and save the JSON plan, then execute:

```text
npm run platform:replica -- execute --config /ABS/PRIVATE/config.json --plan /ABS/plan.json --confirm "REPLICATE REVIEWED VAULT ARTIFACTS" --approve PLAN_HASH --reviewer REVIEWER --evidence EVIDENCE_SHA256
```

The exact plan is regenerated and compared before any writes. The outer reviewed selection authorizes only those exact artifact commitments. Each new target publication also uses an exact underlying publication plan; the outer review's reviewer/evidence is carried into its receipt. Already-recorded copies get full readback, not a blind filename/metadata skip. No source artifact/key/receipt is changed or removed, and no destination object/receipt is overwritten. Return success includes full destination readback of every selected copy.

### Partial progress and interruption

**A multi-artifact replication is not one atomic transaction.** Every target receipt is an individual commit. Acknowledged publications are recorded as a retained committed prefix **before** optional readback. Once execution starts, any later failure/cancellation returns `inspection-required` (CLI exit 2), completed/verified entries, last acknowledged target head and any unacknowledged in-flight publication. In-flight publication may have committed: do not infer absence from an error or old last-acknowledged pin.

Never auto-rollback or blindly retry. Inspect the destination on the actual storage, reconcile any unknown commit and independently pin the verified current head. Diagnose stale writer locks/orphan objects/interrupted work; they are not automatically stolen/deleted. Create and review a new config/plan at that head. Already recorded copies will be reverified and omitted from new publication. Preflight/approval failures occur before execution and exit 1 (or observed preflight cancellation 130). Plan/review strings are evidence commitments, not authentication or multi-person approval.

A controlled child SIGKILL test after first receipt publication verifies that observed committed copies remain authentic after process death, with explicit unknown-prefix handling. It is not a filesystem power-loss/fsync certification. The maximum 32-artifact selected-batch local test passes. No WAN/network/long-duration/fleet load acceptance is implied.

## Audit monitoring

`npm run platform:vault-watch -- --vault ABS_PATH --vault-id PINNED_ID --head PINNED_HEAD --ticks 1 --work-dir PRIVATE_ABS_DIR`

Uses the Batch 16 audit's private environment variables/keyring; accepts `--max-artifacts`, `--max-bytes`, `--interval-ms` and `--run-ms`. Defaults: one tick, 1000 ms interval and 300000 ms cancellation budget. Valid bounds: 1–1000 ticks, 100–60000 ms interval, 1–3600000 ms run budget. There is no overlapping audit; sink callback acknowledgment is awaited before another tick. Cancellation is cooperative, not a hard syscall/resolver/sink deadline.

- Each report's canonical self-hash, exact external pins, unique result identities, result/count/status consistency and non-destructive scope are checked before emitting a summary.
- Only a fully verified, non-empty, warning-free audit continues. Attention-required emits one checked event then stops; no automatic repair, restore, retry, stale-lock takeover or job replay.
- Audit failures emit no success heartbeat. Sink failures stop with `VAULT_MONITOR_SINK_UNCERTAIN`, not a fabricated notification acknowledgment. A sink may have performed a side effect before its failure; no automatic retry.
- CLI emits compact JSONL heartbeat and final summary to stdout. Completion exits 0, blocked/uncertain exits 2, observed cancellation exits 130, invalid CLI configuration exits 1.
- Report hashes are **not signatures, timestamps or freshness/identity proof**. This validates self-consistency against supplied pins; use trusted audit execution and independently protected pins. Audits are not point-in-time snapshots.
- Local stdout/journal acceptance is not external alert delivery. An optional signed HTTPS webhook transport is implemented below, but no real receiver, pager or email destination has been configured or contacted.

A real subprocess SIGTERM test after one heartbeat exits 130 without another audit. Arbitrary error text/key paths are not emitted. Sink acknowledgment remains accounted for if cancellation arrives after it completed.

## Uninstalled Linux service/timer templates

`deployment/rift-vault-audit.service`, `.timer`, and `vault-audit.env.example` prepare a non-root, read-only audit process. They are **not installed/enabled or certified on a host**. Assumptions: source at `/opt/rift/cronos-market`, runtime `/usr/bin/node` is compatible Node 22, non-root `rift-vault` user, vault mount `/srv/rift-recovery-vault`, private environment/key references under `/etc/rift`, encrypted private scratch `/var/lib/rift-recovery-work`, working native dependencies and supported systemd version/directives. Review/adjust exact paths on the authorized host.

The unit is oneshot; only the audit monitor is invoked. It has no repair command/restart-on-error, disallows network address families other than local Unix sockets, restricts filesystem writes to private scratch, and sets resource/time bounds. The timer schedules the audit after boot and 15 minutes after prior inactivity. Static tests verify these intended restrictions, **not live service sandbox correctness**. Never use the example replacement pins as real trust anchors. Updating the pinned head after reviewed publication is an explicit operational step, not automatic discovery of whatever storage currently claims.

External alert routing, journal/disk retention, deployment lifecycle, systemd execution, reboot/mount failures, quotas, separate-host restore and sustained monitoring acceptance remain to be implemented/configured/tested on the designated infrastructure. No production or account changes were made here.

## Optional signed notification transport (explicit opt-in)

`platform:vault-watch` defaults to `--sink stdout` even if alert environment variables exist. Only explicit `--sink webhook` enables one signed HTTPS POST per checked summary, after the local stdout sink accepts it. Configure `RIFT_VAULT_ALERT_URL`, `RIFT_VAULT_ALERT_KEY_FILE` and `RIFT_VAULT_ALERT_KEY_ID` privately. Use an independently generated dedicated 32-byte notification key, never an artifact-encryption/catalog key. The CLI reads private key-file bytes and clears its owned buffer on exit; no raw-key CLI argument is supported.

Transport checks and limits:
- Direct HTTPS only, default port 443, no URL user/password/query/fragment, <=2048-character URL; no redirect following and **no automatic retry**.
- DNS resolves all addresses once for the attempt; empty/oversized/private/loopback/link-local/mixed-public-private results are blocked. The connection lookup is pinned to those validated public addresses while preserving normal TLS hostname/certificate verification. Environment proxy rewriting is not used.
- A single combined deadline bounds the admitted DNS/request attempt; default 7000 ms, API range 1–30000 ms. DNS or preflight cancellation fails not-sent; cancellation/error **after an HTTP request is attempted is delivery-uncertain**. A timed-out receiver could already have accepted the message. Do not blindly resend to hide uncertainty.
- Payload is rebuilt from an allowlist: format/vaultId/head/reportHash/tick/status/counts. Extra fields, raw error text, private paths and key bytes are not serialized.
- Event ID is SHA-256 of the exact JSON payload. Headers: `X-Rift-Event-Id`, `X-Rift-Key-Id`, `X-Rift-Signature: sha256=HMAC_SHA256_HEX`. Signature covers the exact transmitted body bytes. Receiver must authenticate in constant time with its configured matching key and implement explicit event-ID deduplication/rate limits.
- Success requires 2xx and a <=1024-byte JSON acknowledgment with exactly matching `eventId` and `accepted: true`. A generic 200 page or redirect is not acceptance. All post-attempt failures are uncertain and stop the monitor; local output is not relabeled receiver acknowledgment.

Receiver acknowledgment means only that this protocol peer accepted those bytes. It does **not** prove a human received an alert, configure paging escalation or validate the underlying audit's time/freshness. Stable identical summary payloads have identical event IDs; this is useful for deduplication, not a new freshness timestamp. A replayed old signature cannot be treated as a fresh audit merely because HMAC verifies. Protect endpoint key custody and independently track current pinned heads/receive times and expected scheduling. There is no hosted receiver deployment, remote acceptance test, key-custody/revocation service or durable notification outbox in this pass.

The shipped systemd template is intentionally the **local stdout-only, AF_UNIX-only** profile. It will not enable HTTPS alerts unchanged. A separate reviewed host-specific egress/service configuration and actual receiver/key policy must be prepared and tested before using the optional webhook there. The assistant can prepare that integration once an exact authorized destination/host scope exists; the owner is not being asked to design or code it.

Controlled mock-transport tests verify exact body/signature/pinned lookup, payload exclusion, private/mixed DNS refusal, redirect/error/oversized/wrong-ack handling, DNS/request cancellation/deadlines and no retry. These do not claim an actual public webhook was contacted or a real firewall/TLS/notification path accepted.
