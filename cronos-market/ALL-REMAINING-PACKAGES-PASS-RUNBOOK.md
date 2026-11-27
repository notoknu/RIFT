# Integrated packages5/6/7/8 pass — continuation70

No phase permission gate. All four remaining packages were addressed in this run; none is declared fully complete. Source-only/unverified: no tests/builds/syntax checks/runtime imports/CLI/RPC/artifact creation/enrollment/deployment/activation/signing/spend executed. No unattended session was started. Historical Markdown/TXT and snapshots retained; wallet-only signing and1CRO ceiling unchanged.

## Package5 — historical holdings and selected escrow accounting
Added server/owned-holdings-accounting.js, optionally invoked by owned:produce through exact holdingsPolicy:{marketplaceEscrow:boolean}. Existing source acceptance/shape/checkpoint/confirmation/expiry checks remain mandatory. A false policy produces direct custody accounting only. True requires the explicitly selected accepted legacy or v2 native RIFT marketplace source; it does not discover or trust arbitrary vault protocols.

The helper independently reconciles collection token supplies with unique positive balances, canonical uint256 IDs/quantities, ERC721 supply constraints, all selected sources at a common checkpoint. Limits:16 selected collections,128 selected public wallets,50000 aggregate processed token/balance rows,2000 output positions, existing source-image/input limits. Overflow/mismatch fails rather than truncates.

Optional escrow attribution first replays/reconciles the accepted marketplace projection, then considers open listing obligations only (not offers). It sums obligations for **all sellers** on selected collections before crediting any requested seller. Total obligations for each NFT/token ID may not exceed actual admitted collection custody at the selected marketplace address. ERC721/ERC1155 standard mismatch fails. Listings that are expired but remain unclosed still represent escrow obligations; expiry is not assumed to transfer assets out.

Report fields distinguish directQuantity, marketplaceEscrowQuantity, custodyAttributedToSellers and historicalBeneficialQuantity. If the marketplace address itself is among selected wallets, obligations allocated to listing sellers are subtracted from that wallet's custody before beneficial totals, avoiding that double count. Unallocated vault custody is not attributed to unrelated users. Multiple open721 obligations for one unit fail custody reconciliation.

The bounded report and source pins are embedded in the existing dataset-pinned private production evidence, not promoted to live portfolio ownership or signing authority. Normalized discovery/portfolio paths still do their own RPC verification and cannot list escrowed assets as directly wallet-owned merely from this report. Native/ERC20 balances remain null; staking, bridges, arbitrary vaults, CRO offer refunds/proceeds, fee/net accounting and complete chain acquisition remain unimplemented. Optional report size can cause the existing1MiB evidence ceiling to reject production; it does not bypass output budgets.

The shared CLI/maintenance loader admits holdingsPolicy and includes it in the canonical request digest. Prior workflow requests therefore require their own matching source/config identity; changed requests are never silently resumed into previous output directories. Publication/live routing is still separate and unauthorized by these source edits.

## Package6 — explicit transaction-density budget expansion
Existing chain read config gains optional completeBlockTransactionLimit, integer256..2048, requiring completeBlockEvents:true. Omission preserves normalized policy content/default256 so old policy fingerprints are not changed solely by adding this optional capability. No default resource increase or automatic config/cutover occurs.

Configured limits are exposed on read-only receiptLimits and propagated to primary wallet complete-receipt acquisition, wallet independent quorum and wallet publication verification. Primary RPC call allowance grows only to maxTransactions+8, within the existing5000-call wrapper ceiling. Exact transaction-list/content/count and receipt/log/byte checks remain; all configured provider checks still apply. No partial-block checkpoint is authorized when a bound is hit.

Generic completeBlockReader and its publication gate also honor the explicit limit while retaining existing log/byte/deadline bounds. This does **not** claim every downstream path supports2048 transactions: platform native staged/candidate-complete-block/audit profiles and ordinary platform receipt scans retain their256-transaction contracts. A larger generic reader can still be rejected by those stricter consumers. No historical proof/profile schema is silently loosened. Worker acquisition remains subject to its own persisted-work and invocation limits.

Raising transaction count does not raise data/log bounds, remove timeouts, cancel underlying noncancellable provider work, prove receipt tries or solve all truncation/omission cases. Expensive blocks may still time out and fail closed. Arbitrarily large ERC1155 expansion, all dense block acquisition and full coverage remain open Package6 work. Only explicit reviewed operator policy can enable the larger bound.

## Package7 — non-destructive recurring lifecycle audit
Added server/owned-artifact-audit.js and owned:audit CLI. Exact policy/config: version:1, action:inspect, minFreeBytes (safe integer0..1TiB), minRemainingMs (0..7days), artifacts (1..64 exact entries{id,directory,receiptSha256}). IDs are unique bounded ASCII identifiers; directories absolute; receipt pins are exact raw SHA256. Policy files are private protected JSON, up to64KiB.

Reads only explicitly pinned private receipt/dataset/evidence files, with shared32MiB aggregate audit-byte budget; verifies raw pins, dataset evidence link and optional intent/request/generation identity. Historical shape admission deliberately uses the artifact's own generation time while requiring that time not be future, so an expired artifact can be reported as expired rather than falsely accepted as currently valid. It never extends expiry/source approval or pretends the old artifact is live-ready.

Per-artifact observations expose only supplied ID, expiry/remaining time, free-space byte string and issue codes (expired, expiring, low-headroom, unavailable-or-changed). No directory/endpoint/wallet content is printed. statfs is point-in-time, not a reservation against other writers. Unexpected byte-budget exhaustion fails the audit instead of returning an apparently complete partial report. There is no deletion, retention authorization, repair, renewal, publication or live pointer change.

Added recurring maintenance kind owned-artifact-audit. Exact spec: runtimeId,runtimeFingerprint,intervalMs (1minute..30days). Runtime exact config: version:1,kind:owned-artifact-audit,auditConfigFile. Fingerprint commits the actual loaded audit policy. Existing finite scheduler guards/cadence apply; each unit returns ready after interval with sanitized checked/degraded counts, not a production-readiness assertion. Full reports are available through the read-only CLI; no new report files or active jobs were created in this turn. A host must still invoke an authorized finite runner; no cron/daemon/enrollment was installed.

## Package8 — enrollment/integration defects
Runtime-fingerprint inspection now returns the sanitized requestDigest needed to enroll owned-data-production and providerPolicyDigest needed by timestamp acquisition. Previously those job fields existed but the fingerprint workflow omitted them, forcing awkward out-of-band derivation. Inspect-only timed runtime metadata is initialized without constructing provider adapters. No source contents/paths/credentials are included in those outputs.

All new holding/audit/density options are wired through shared production/config and scheduler admission rather than left as standalone unused modules. Existing no-overwrite, deterministic-resume, source-expiry, source-review and activation boundaries remain. Default read-profile limits are preserved; consumers with narrower contracts are explicitly documented rather than broadly labelled compatible.

## Remaining and authority
Complete applicable holdings/native/ERC20 balances, arbitrary escrow/staking/bridge protocols, richer legacy history/economics, multi-venue aggregation, arbitrary density/oversized event acquisition, reviewed rebuild-to-publication/cutover progression, remote credential/media/delivery/retention automation and full integration correctness remain unfinished. Phases1–4 retain only their previously documented bounded source status;5–8 remain open. No percentage, universal real-world fitness, full completion or runtime correctness claim is made. Operator authority over hosts/providers/credentials/budget/review/activation remains intact.

## Pass71 source review
Replay transition checks, timestamped accounting, shared production artifact bindings and timestamp acquisition directory durability advanced. See `/home/user/RIFT-deliverables/71-WORKFLOW-SOURCE-REVIEW.md`. No execution verification; phases5–8 remain open.

## Pass73 local failure remediation
All pass72 reported failures resolved in reruns: engineering1133/1133, implementation6/6, security7/7 including local Redis, contract64/64;249 JS syntax checks and frontend build pass. See `/home/user/RIFT-deliverables/73-TEST-FAILURES-RESOLVED.md`. Local verification only; phases5–8 remain open, no activation.
