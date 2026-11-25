// Read-only EIP-1193 transport. Never use this for signing or broadcasting.
const READ_METHODS = new Set(['eth_chainId','eth_blockNumber','eth_call','eth_getCode','eth_getBalance','eth_getTransactionCount','eth_getTransactionReceipt','eth_getTransactionByHash','eth_getBlockByNumber','eth_getBlockByHash','eth_getLogs']);
export const CRONOS_READ_ENDPOINTS = ['https://evm.cronos.org','https://cronos-evm-rpc.publicnode.com'];

export function createReadRpc({endpoints=CRONOS_READ_ENDPOINTS,fetcher=globalThis.fetch,timeoutMs=8000,maxBytes=1048576,now=Date.now,random=Math.random}={}) {
  if (!Array.isArray(endpoints) || !endpoints.length || endpoints.length>3 || !Number.isSafeInteger(timeoutMs) || timeoutMs<10 || timeoutMs>30000 || !Number.isSafeInteger(maxBytes) || maxBytes<128 || maxBytes>4194304) throw Error('Invalid read RPC limits');
  if(typeof now!=='function'||typeof random!=='function'||typeof fetcher!=='function')throw Error('Invalid read RPC dependencies');
  const urls=[...new Set(endpoints.map(value=>{
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search)throw Error('Read RPC requires credential-free HTTPS endpoints');
    return url.href;
  }))];
  let id=0,paused=false,generation=0;
  const controllers=new Set();
  function invalidate(){generation++;for(const controller of controllers)controller.abort();controllers.clear();}
  function cooldown(s,error){
    s.failures=Math.min(s.failures+1,5);
    const base=Math.min(5000*2**(s.failures-1),60000);
    const sample=Number(random());const jitter=Number.isFinite(sample)?Math.floor(Math.max(0,Math.min(sample,1))*base*0.2):0;
    s.retryAfter=now()+Math.min(120000,Math.max(base+jitter,error.retryAfterMs||0));
    s.lastFailure=s.wrongChain?'wrong-chain':error.rateLimited?'rate-limited':'unavailable';
  }
  const state=new Map(urls.map(url=>[url,{verifiedUntil:0,probe:null,retryAfter:0,wrongChain:false,failures:0,lastFailure:null}]));
  async function call(url,method,params){
    const requestId=++id,controller=new AbortController();
    controllers.add(controller);
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:requestId,method,params}),signal:controller.signal,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok){
        const error=Error('Read RPC HTTP '+response.status);error.rateLimited=response.status===429;
        if(response.status===429||response.status===503){
          const value=response.headers.get('retry-after');
          if(value){const seconds=/^\d+$/.test(value.trim())?Number(value.trim())*1000:Date.parse(value)-now();if(Number.isFinite(seconds)&&seconds>0)error.retryAfterMs=Math.min(seconds,120000);}
        }
        // Release a failed response body without reading untrusted error content.
        try{await response.body?.cancel();}catch{}
        throw error;
      }
      const size=Number(response.headers.get('content-length'));if(size>maxBytes)throw Error('Read RPC response too large');
      const reader=response.body?.getReader();if(!reader)throw Error('Read RPC response stream unavailable');
      let total=0,chunks=[];
      try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes)throw Error('Read RPC response too large');chunks.push(value);}}
      catch(error){await reader.cancel().catch(()=>{});throw error;}
      const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
      const payload=JSON.parse(new TextDecoder().decode(bytes));
      if(!payload||payload.jsonrpc!=='2.0'||payload.id!==requestId||Array.isArray(payload)||('result' in payload)===('error' in payload))throw Error('Invalid read RPC response');
      if(payload.error){const error=Error('Read RPC rejected '+method);error.code=payload.error.code;
        // Execution reverts and invalid caller input must not be hidden by another provider.
        if(error.code===3||error.code===-32602||/revert/i.test(payload.error.message||'')){error.terminal=true;error.data=payload.error.data;}
        throw error;
      }
      return payload.result;
    }finally{clearTimeout(timer);controllers.delete(controller);}
  }
  async function verify(url,s){
    if(s.wrongChain)throw Error('Read RPC is quarantined for wrong chain');
    if(now()<s.verifiedUntil)return;
    if(!s.probe){
      const epoch=generation;
      const probe=(async()=>{const chain=await call(url,'eth_chainId',[]);if(generation!==epoch||paused)throw Error('Read RPC request invalidated');if(chain!=='0x19'){s.wrongChain=true;throw Error('Read RPC is not Cronos chain 25');}s.verifiedUntil=now()+30000;})();
      s.probe=probe;
      // An invalidated probe must not clear a replacement probe created after reset.
      probe.then(()=>{if(s.probe===probe)s.probe=null;},()=>{if(s.probe===probe)s.probe=null;});
    }
    await s.probe;
  }
  return {
    pause(){paused=true;invalidate();for(const s of state.values())s.probe=null;},
    resume(){paused=false;},
    reset(){invalidate();for(const s of state.values()){s.probe=null;s.verifiedUntil=0;s.retryAfter=0;s.failures=0;s.lastFailure=s.wrongChain?'wrong-chain':null;}},
    diagnostics(){const time=now();return {paused,providers:urls.map((url,index)=>{const s=state.get(url);return {index,status:s.wrongChain?'quarantined':time<s.retryAfter?'cooling-down':time<s.verifiedUntil?'verified':'unverified',retryInMs:Math.max(0,s.retryAfter-time),consecutiveFailures:s.failures,lastFailure:s.lastFailure};})};},
    async request({method,params=[]}={}){
      if(!READ_METHODS.has(method))throw Error('Only allowlisted blockchain reads are permitted');
      if(!Array.isArray(params))throw Error('Invalid read RPC params');
      if(paused)throw Error('Read RPC is paused');
      const started=generation;
      for(const url of urls){
        const s=state.get(url);if(s.wrongChain||now()<s.retryAfter)continue;
        try{
          await verify(url,s);if(paused||generation!==started)throw Error('Read RPC request invalidated');
          const result=method==='eth_chainId'?'0x19':await call(url,method,params);
          if(paused||generation!==started)throw Error('Read RPC request invalidated');
          s.failures=0;s.retryAfter=0;s.lastFailure=null;
          return result;
        }catch(error){
          if(paused||generation!==started)throw Error('Read RPC request invalidated');
          if(error.terminal)throw error;
          s.verifiedUntil=0;cooldown(s,error);
        }
      }
      throw Error('Cronos read providers unavailable or cooling down; retry explicitly later');
    },
  };
}
