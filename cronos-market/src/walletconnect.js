import {validateSigningRequest} from './wallet-session-policy.js';
const RELAY_METHODS=new Set(['eth_sendTransaction','personal_sign','eth_signTypedData_v4','wallet_switchEthereumChain','wallet_addEthereumChain','eth_blockNumber','eth_call','eth_getCode','eth_getBalance','eth_getTransactionCount','eth_getTransactionReceipt','eth_getTransactionByHash','eth_getBlockByNumber','eth_getBlockByHash','eth_getLogs','eth_estimateGas','eth_gasPrice','eth_maxPriorityFeePerGas','eth_feeHistory','net_version']);
// Minimal EIP-1193 adapter around WalletConnect UniversalProvider.
// No Reown/AppKit dependency tree or third-party wallet catalog code.
export async function createWalletConnect({projectId,origin,onURI,init,pairingTimeoutMs=120000}={}){
 if(!Number.isSafeInteger(pairingTimeoutMs)||pairingTimeoutMs<10||pairingTimeoutMs>300000)throw Error('Invalid pairing timeout');
 if(!/^[a-f0-9]{32}$/i.test(projectId||''))throw Error('WalletConnect requires a valid public project ID.');
 let site;try{site=new URL(origin);if(site.origin!==origin||site.username||site.password||site.protocol!=='https:'&&!(site.protocol==='http:'&&['localhost','127.0.0.1'].includes(site.hostname)))throw Error()}catch{throw Error('WalletConnect requires an exact HTTPS origin (HTTP loopback only for development).')}
 const initialize=init||(await import('@walletconnect/universal-provider')).UniversalProvider.init;
 const u=await initialize({projectId,metadata:{name:'RIFT Cronos',description:'Cronos NFT marketplace',url:origin,icons:[]}});
 const listeners=new Map();let chain=25,activeAttempt=null,pairingInFlight=false,quarantined=false,revoked=false;
 const emit=(name,value)=>listeners.get(name)?.forEach(fn=>fn(value));
 const expired=()=>u.session?.expiry!==undefined&&(!Number.isSafeInteger(u.session.expiry)||u.session.expiry<=Math.floor(Date.now()/1000));
 const accounts=()=>chain!==25||quarantined||revoked||expired()?[]:[...new Set(Object.entries(u.session?.namespaces||{}).filter(([k])=>k==='eip155'||k==='eip155:25').flatMap(([,n])=>Array.isArray(n?.accounts)?n.accounts:[]).filter(a=>typeof a==='string'&&new RegExp('^eip155:'+chain+':0x[0-9a-fA-F]{40}$').test(a)).map(a=>a.split(':')[2].toLowerCase()))];
 u.on('display_uri',uri=>{if(activeAttempt&&!activeAttempt.cancelled&&typeof uri==='string'&&uri.startsWith('wc:')&&uri.length<4096)onURI?.(uri)});
 // SDK session namespaces are authoritative; never forward unvalidated event payloads.
 u.on('accountsChanged',()=>emit('accountsChanged',accounts()));
 u.on('session_update',()=>emit('accountsChanged',accounts()));
 u.on('chainChanged',c=>{
  // Unknown/malformed chain events revoke the old chain assumption instead of retaining authority.
  const raw=typeof c==='number'&&Number.isSafeInteger(c)?String(c):typeof c==='string'?c:'';
  const valid=/^(?:eip155:[1-9][0-9]*|[1-9][0-9]*|0x[0-9a-fA-F]+)$/.test(raw);
  const n=valid?Number(raw.startsWith('eip155:')?raw.slice(7):raw):0;
  chain=Number.isSafeInteger(n)&&n>0?n:0;emit('chainChanged','0x'+chain.toString(16));emit('accountsChanged',accounts());
 });
 const deleted=()=>{revoked=true;onURI?.('');emit('disconnect',{code:4900,message:'WalletConnect session disconnected'})};u.on('disconnect',deleted);u.on('session_delete',deleted);
 const api={get session(){return u.session},on:(e,f)=>{if(!listeners.has(e))listeners.set(e,new Set());listeners.get(e).add(f)},removeListener:(e,f)=>listeners.get(e)?.delete(f),
 async connect(){if(activeAttempt)return activeAttempt.promise;if(pairingInFlight||quarantined)throw Error('Previous pairing is still settling or needs wallet disconnection; no new pairing started.');if(u.session){if(revoked||expired())throw Error('Session expired or disconnected; disconnect stale session before reconnecting');if(!accounts().length)throw Error('Session has no authorized Cronos account');return u.session;}let rejectCancel;const cancel=new Promise((_,reject)=>{rejectCancel=reject}),attempt={reject:rejectCancel};activeAttempt=attempt;pairingInFlight=true;const pairing=Promise.resolve().then(()=>u.connect({namespaces:{eip155:{chains:['eip155:25'],methods:['eth_sendTransaction','personal_sign','eth_signTypedData_v4','wallet_switchEthereumChain','wallet_addEthereumChain'],events:['accountsChanged','chainChanged'],rpcMap:{25:'https://evm.cronos.org'}}}}));pairing.then(async()=>{if(attempt.cancelled){try{await u.disconnect()}catch{}}},()=>{}).finally(()=>{pairingInFlight=false;if(attempt.cancelled&&!u.session)quarantined=false});const timer=setTimeout(()=>api.cancel(),pairingTimeoutMs);attempt.promise=Promise.race([pairing,cancel]).then(session=>{chain=25;revoked=false;if(!accounts().length)throw Error('Wallet did not authorize a Cronos account');return session}).finally(()=>{clearTimeout(timer);if(activeAttempt===attempt)activeAttempt=null;onURI?.('')});return attempt.promise},
 cancel(){if(activeAttempt){activeAttempt.cancelled=true;quarantined=true;activeAttempt.reject(Error('WalletConnect pairing cancelled'));u.abortPairingAttempt?.();onURI?.('')}},
 async disconnect(){api.cancel();if(u.session)await u.disconnect();if(!pairingInFlight&&!u.session)quarantined=false;deleted()},
 async request(args){if(!args||typeof args.method!=='string'||!args.method)throw Error('Invalid wallet request');if(args.method==='eth_accounts')return accounts();if(args.method==='eth_requestAccounts'){if(!u.session||revoked||expired())await api.connect();return accounts()}if(args.method==='eth_chainId')return'0x'+chain.toString(16);if(args.method==='wallet_revokePermissions'){await api.disconnect();return null}if(!u.session||quarantined||revoked||expired())throw Error('WalletConnect session is disconnected or cancelled');
 if(!RELAY_METHODS.has(args.method))throw Error('Unsupported wallet request method');
 const switching=['wallet_switchEthereumChain','wallet_addEthereumChain'].includes(args.method);
 if(switching){let target;try{target=BigInt(args.params?.[0]?.chainId)}catch{throw Error('Invalid target chain')}if(target!==25n)throw Error('Only Cronos chain 25 is supported');}
 else if(chain!==25||!accounts().length)throw Error('Authorized Cronos account required before wallet requests');
 if(args.method==='eth_sendTransaction'){
  const tx=args.params?.[0];
  if(!tx||typeof tx.from!=='string'||!accounts().includes(tx.from.toLowerCase()))throw Error('Transaction sender is not authorized by this session');
  if(tx.chainId!==undefined){let txChain;try{txChain=BigInt(tx.chainId)}catch{throw Error('Invalid transaction chain')}if(txChain!==25n)throw Error('Transaction must target Cronos chain 25');}
 }
 validateSigningRequest(args,accounts());
 // Never retry wallet signing or transaction requests automatically.
 return u.request(args,'eip155:'+chain)}};
 return api;
}
