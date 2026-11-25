// Share concurrent initialization, but permit an explicit retry after failure.
export function singleFlightInitializer(factory) {
  let pending;
  return function initialize() {
    if (!pending) {
      pending = Promise.resolve().then(factory).catch(error => {
        pending = undefined;
        throw error;
      });
    }
    return pending;
  };
}

export function validateSigningRequest(args, accounts) {
  const authorized = value => typeof value === 'string' && accounts.includes(value.toLowerCase());
  if (args.method === 'personal_sign') {
    // EIP-191 / WalletConnect parameter order is message, account.
    if (!Array.isArray(args.params) || args.params.length !== 2 || !authorized(args.params[1])) {
      throw Error('Signing account is not authorized by this session');
    }
    if (typeof args.params[0] !== 'string' || !/^0x(?:[0-9a-f]{2})*$/i.test(args.params[0])) {
      throw Error('Personal signing requires a hex-encoded message');
    }
  }
  if (args.method === 'eth_signTypedData_v4') {
    if (!Array.isArray(args.params) || args.params.length !== 2 || !authorized(args.params[0])) {
      throw Error('Signing account is not authorized by this session');
    }
    let data;
    try { data = typeof args.params[1] === 'string' ? JSON.parse(args.params[1]) : args.params[1]; }
    catch { throw Error('Malformed typed data'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || !data.domain || typeof data.domain !== 'object' || Array.isArray(data.domain) || !data.types || typeof data.types !== 'object' || Array.isArray(data.types) || typeof data.primaryType !== 'string' || !data.message || typeof data.message !== 'object' || Array.isArray(data.message)) {
      throw Error('Malformed typed data');
    }
    if (data.domain.chainId !== undefined) {
      let chain;
      try { chain = BigInt(data.domain.chainId); } catch { throw Error('Invalid typed-data chain'); }
      if (chain !== 25n) throw Error('Typed data must target Cronos chain 25');
    }
  }
  // RIFT does not use raw eth_sign or legacy typed-data signing.
  if (['eth_sign', 'eth_signTypedData', 'eth_signTypedData_v1', 'eth_signTypedData_v3'].includes(args.method)) {
    throw Error('Unsupported signing method');
  }
}

// Cancellation invalidates results immediately but keeps the lock until the
// underlying wallet request settles; EIP-1193 prompts cannot reliably be aborted.
export function connectionAttemptGate() {
  let active = null;
  return {
    begin() {
      if (active) throw Error('Previous wallet connection is still settling');
      const token = {cancelled: false};
      active = token;
      return {
        check() { if (active !== token || token.cancelled) throw Error('Wallet connection cancelled'); },
        current() { return active === token && !token.cancelled; },
        finish() { if (active === token) active = null; },
      };
    },
    cancel() { if (active) active.cancelled = true; },
  };
}
