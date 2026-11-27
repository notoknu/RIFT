# Opt-in independent chain checkpoint reads

## Scope

`server/chain-read-quorum.js` provides read-only, bounded agreement at a caller-selected block number. `server/chain-read-config.js` loads versioned endpoint configuration and injects provider constructors. Neither module switches existing workers or APIs. This is checkpoint/header agreement, NOT log/receipt completeness, proof verification, automatic indexing integration or a general ethers Provider replacement.

## Configuration

Keep configuration server-side; never embed private endpoints in frontend builds. Example only (reserved domains, not working infrastructure):

```json
{"version":1,"chainId":25,"quorum":2,"timeoutMs":5000,"maxHeadLag":24,"providers":[{"id":"provider_a","failureDomain":"operator_a","url":"https://a.example/rpc"},{"id":"provider_b","failureDomain":"operator_b","url":"https://b.example/rpc"},{"id":"provider_c","failureDomain":"operator_c","url":"https://c.example/rpc"}]}
```

At most five providers. HTTPS endpoints only; no credentials, query strings, fragments or duplicate origins. Failure-domain declarations must be unique, but cannot prove actual operator independence. Two hostnames controlled by the same upstream do not provide meaningful independence. Review operator ownership and outage correlation before deployment. API-key URL paths, if used, remain sensitive even though errors/diagnostics do not echo URLs.

## Usage with an injected ethers transport

```js
import {FetchRequest, JsonRpcProvider} from 'ethers';
import {openChainReadQuorum} from './server/chain-read-config.js';
const reader = openChainReadQuorum(configurationText, {
  createProvider: ({url, timeoutMs}) => {
    const request = new FetchRequest(url);
    request.timeout = timeoutMs;
    return new JsonRpcProvider(request);
  }
});
try {
  const evidence = await reader.readCheckpoint(reviewedBlockNumber);
  // Record/compare the checkpoint evidence; this does not publish index data.
} finally { reader.close(); }
```

The caller must select an explicit safe integer height with its own confirmation/reorg policy. `latest` is rejected. Each provider must identify the expected chain, advertise a sufficient head, and return the requested number plus well-formed block/parent hashes. Network responses must be bounded by the underlying transport too.

## Failure policy

- Minimum two eligible independent providers must agree.
- Any valid contradictory hash/parent response fails closed, even if outvoted or head-stale.
- Wrong chain, invalid blocks, behind-checkpoint heads, timeouts and unavailable providers do not count toward quorum.
- Head lag is compared to the highest valid observed head. This is conservative: a faulty exaggerated head can stop availability.
- Three configured providers with quorum two tolerate one unavailable provider. Two providers cannot continue after one fails.
- One bounded attempt per provider; no background retry, cooldown scheduler, persistence or automatic resend.
- The timeout bounds the caller's wait; noncancellable underlying reads may continue. Late results do not change the returned evidence.
- `diagnostics()` is the most recently completed acquisition, not continuous health monitoring or durable evidence. Concurrent callers should record their own returned result.
- Agreement is not a cryptographic proof and does not detect colluding providers, omitted logs, or a self-consistent fabricated history. No complete index acquisition should be labeled independently verified from this header check alone.

## Signing boundary

Only `readCheckpoint`, `diagnostics`, and configuration-layer `close` are exposed. No request passthrough, transaction preparation signing, broadcast, private keys or wallet methods are accepted. Wallet signing remains in the existing user-authorized flows.

## Tests and activation

Run `npm run test:chain-quorum`. Tests use injected fixtures and no real endpoints. Before production selection: review provider independence and transport limits, verify live chain compatibility and rate limits, bind header agreement to the complete acquisition/publication protocol, test reorg/disagreement recovery and record rollback criteria. Do not silently swap production workers to this checkpoint-only adapter.

## Candidate index publication integration

`syncPlatformExchange` now accepts opt-in `chainReader` and `chainAgreementTimeoutMs` (default 15 seconds). With a reader selected, `span` must be at most 32. Pass an `openChainReadQuorum(...)` reader explicitly; the existing default span of 128 must be reduced by the caller. No production worker selects this automatically.

Before its final repository revision check and before either direct commit or a custom publication handler, the synchronizer compares every acquired header and the retained boundary checkpoint against independent agreement. A mismatch, timeout, cancellation or lost quorum prevents publication. Empty blocks are included. The existing lease/revision fence and final cancellation check remain in place. Idle steps make no independent-verification claim.

Example candidate call (requires already initialized store, immutable binding, lease and primary provider):

```js
const result = await syncPlatformExchange({
  store, binding, lease, provider: primaryProvider,
  span: 16, chainReader: reader, chainAgreementTimeoutMs: 15000
});
```

The returned `chainAgreement` summary is result evidence, not a persisted audit record. Its scope is HEADER AGREEMENT ONLY. Runtime bytes, logs and receipt data still come from the primary acquisition; omitted events from an otherwise correctly headed chain are not detected by this gate. It is not full redundant index acquisition. A quorum outage prevents publication; it does not switch the primary log source. Callers must record outcome evidence and retain operator review for disagreements. Header reads race chain changes just as other RPC observations do; this is not a finality guarantee.

`server/chain-publication-gate.js` limits the additional work to 33 contiguous headers (32 range blocks plus boundary), checks the whole gate deadline and ignores late results. Underlying transports should still bound/cancel their own IO. The helper does not sign, broadcast, migrate, publish or retry. Run `npm run test:chain-publication` for the integration and RPC tests.
