import {mobilePairingUri,copyPairingUri} from './wallet-pairing-actions.js';
import {walletConnectProjectId} from './walletconnect-config.js';
import {singleFlightInitializer,connectionAttemptGate} from './wallet-session-policy.js';
import React,{createContext,useContext,useEffect,useState,useRef}from'react';import{BrowserProvider,getAddress,isAddress}from'ethers';import{Wallet,X,ShieldCheck,ArrowUpRight,CheckCircle2}from'lucide-react';
import {forgetCreatorSession} from './creator-client.js';
const WC_PROJECT=walletConnectProjectId(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID);const Context=createContext(null),SESSION='rift:wallet-session:v1';const key=e=>e.info.rdns||e.info.uuid;
export const useWallet=()=>useContext(Context);
export function WalletProvider({children}){const[wallets,Wallets]=useState([]),[selected,Selected]=useState(null),[address,Address]=useState(''),[chainId,Chain]=useState(null),[picker,Picker]=useState(false),[loading,Loading]=useState(false),[error,E]=useState(''),[qrURI,QR]=useState(''),[qrImage,QI]=useState('');const creatorIdentity=useRef('');function updateAddress(a){if(creatorIdentity.current.toLowerCase()!==a.toLowerCase())forgetCreatorSession();creatorIdentity.current=a;Address(a)}const wc=useRef(null),wcInitialize=useRef(null);if(!wcInitialize.current)wcInitialize.current=singleFlightInitializer(async()=>{const{createWalletConnect}=await import('./walletconnect');const provider=await createWalletConnect({projectId:WC_PROJECT,origin:location.origin,onURI:QR});wc.current=provider;return provider});async function walletConnectProvider(){return wcInitialize.current()}
useEffect(()=>{let active=true;QI('');if(qrURI)import('qrcode').then(m=>(m.default||m).toDataURL(qrURI,{width:280,margin:2,errorCorrectionLevel:'M'})).then(image=>{if(active)QI(image)}).catch(()=>E('QR generation failed. Copy the pairing URI instead.'));return()=>{active=false}},[qrURI]);
useEffect(()=>{let active=true;let saved;try{saved=JSON.parse(localStorage.getItem(SESSION)||'null')}catch{}if(saved?.key!=='com.walletconnect'||!WC_PROJECT)return;walletConnectProvider().then(p=>{if(active&&p.session)Wallets(prev=>prev.some(e=>e.provider===p)?prev:[...prev,{provider:p,info:{uuid:'walletconnect',rdns:'com.walletconnect',name:'WalletConnect'}}])}).catch(()=>{});return()=>{active=false}},[]);
useEffect(()=>{
 if(!picker)return;
 const previous=document.activeElement,dialog=document.querySelector('.wallet-picker');
 dialog?.querySelector('button')?.focus();
 const keydown=e=>{if(e.key==='Escape'){e.preventDefault();close();return}if(e.key!=='Tab')return;
 const nodes=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')];
 const first=nodes[0],last=nodes.at(-1);if(!nodes.length){e.preventDefault();dialog.focus()}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};
 document.addEventListener('keydown',keydown);return()=>{document.removeEventListener('keydown',keydown);previous?.focus?.()};
},[picker]);
const attempts=useRef(null);if(!attempts.current)attempts.current=connectionAttemptGate();
const pending=useRef(null),enabled=useRef(false),restored=useRef(false),current=useRef(null);current.current=selected;
useEffect(()=>{const add=entry=>Wallets(prev=>prev.some(e=>e.provider===entry.provider)?prev:[...prev,entry]);const announced=e=>{const d=e.detail;if(d?.provider?.request&&d.info?.name&&d.info?.uuid)add({provider:d.provider,info:{uuid:String(d.info.uuid),rdns:String(d.info.rdns||''),name:String(d.info.name).slice(0,60)}})};window.addEventListener('eip6963:announceProvider',announced);window.dispatchEvent(new Event('eip6963:requestProvider'));const legacy=()=>{let list=window.ethereum?.providers||[window.ethereum];for(let p of list){if(!p?.request)continue;add({provider:p,info:{uuid:'legacy-'+(p.isMetaMask?'metamask':p.isRabby?'rabby':p.isCoinbaseWallet?'coinbase':'evm'),rdns:'',name:p.isRabby?'Rabby':p.isMetaMask?'MetaMask':p.isCoinbaseWallet?'Coinbase Wallet':'Browser EVM Wallet'}})}};legacy();let t=setTimeout(legacy,600);return()=>{clearTimeout(t);window.removeEventListener('eip6963:announceProvider',announced)}},[]);
useEffect(()=>{if(restored.current||!wallets.length)return;let saved;try{saved=JSON.parse(localStorage.getItem(SESSION)||'null')}catch{}if(!saved)return;let entry=wallets.find(e=>key(e)===saved.key||e.info.name===saved.name);if(!entry)return;restored.current=true;let active=true;(async()=>{try{let [accounts,chain]=await Promise.all([entry.provider.request({method:'eth_accounts'}),entry.provider.request({method:'eth_chainId'})]);if(active&&accounts?.length&&isAddress(accounts[0])){enabled.current=true;Selected(entry);updateAddress(getAddress(accounts[0]));Chain(Number(BigInt(chain)))}}catch{}})();return()=>{active=false}},[wallets]);
useEffect(()=>{if(!selected)return;const p=selected.provider;const accounts=a=>{if(!enabled.current)return;if(!a?.length||!isAddress(a[0])){Selected(null);updateAddress('');Chain(null);enabled.current=false;try{localStorage.removeItem(SESSION)}catch{}}else updateAddress(getAddress(a[0]))};const chain=c=>{forgetCreatorSession();try{Chain(Number(BigInt(c)))}catch{Chain(null)}};const disconnected=()=>{Selected(null);Selected(null);updateAddress('');Chain(null);enabled.current=false;try{localStorage.removeItem(SESSION)}catch{}};p.on?.('accountsChanged',accounts);p.on?.('chainChanged',chain);p.on?.('disconnect',disconnected);return()=>{p.removeListener?.('accountsChanged',accounts);p.removeListener?.('chainChanged',chain);p.removeListener?.('disconnect',disconnected)}},[selected]);
// Foreground checks are read-only: never reconnect, sign, switch chain or submit here.
useEffect(()=>{
 if(!selected)return;
 let active=true,inFlight=false;
 const refresh=async()=>{
  if(document.visibilityState==='hidden'||inFlight)return;
  inFlight=true;
  try{
   const [accounts,chain]=await Promise.all([selected.provider.request({method:'eth_accounts'}),selected.provider.request({method:'eth_chainId'})]);
   if(!active||current.current?.provider!==selected.provider)return;
   const network=Number(BigInt(chain));
   if(!Number.isSafeInteger(network)||network!==25||!Array.isArray(accounts)||!isAddress(accounts[0]||'')){
    forgetCreatorSession();updateAddress('');Chain(Number.isSafeInteger(network)?network:null);E('Wallet session changed or is unavailable. Reconnect explicitly on Cronos.');return;
   }
   updateAddress(getAddress(accounts[0]));Chain(network);
  }catch{
   if(active){forgetCreatorSession();updateAddress('');Chain(null);E('Could not recheck wallet session. Reconnect before continuing.');}
  }finally{inFlight=false;}
 };
 window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
 return()=>{active=false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)};
},[selected]);
async function ensure(entry,check=()=>{}){
 const p=entry.provider;check();
 if(entry.info.uuid==='walletconnect'&&!p.session){await p.connect({chains:[25]});check();}
 let accounts=await p.request({method:'eth_requestAccounts'});check();
 if(!accounts?.length||!isAddress(accounts[0]))throw Error('Wallet did not provide an account');
 let chain=await p.request({method:'eth_chainId'});check();
 if(BigInt(chain)!==25n){
  try{await p.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x19'}]});check();}
  catch(e){check();if(e.code===4902||e.data?.originalError?.code===4902){
   await p.request({method:'wallet_addEthereumChain',params:[{chainId:'0x19',chainName:'Cronos Mainnet',nativeCurrency:{name:'Cronos',symbol:'CRO',decimals:18},rpcUrls:['https://evm.cronos.org'],blockExplorerUrls:['https://explorer.cronos.org']}]});check();
   await p.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x19'}]});check();
  }else throw e;}
 }
 chain=await p.request({method:'eth_chainId'});check();
 if(BigInt(chain)!==25n)throw Error('Switch your wallet to Cronos mainnet (chain 25)');
 const browser=new BrowserProvider(p,'any'),signer=await browser.getSigner();check();
 const address=await signer.getAddress();check();
 enabled.current=true;Selected(entry);updateAddress(address);Chain(25);
 try{localStorage.setItem(SESSION,JSON.stringify({key:key(entry),name:entry.info.name}))}catch{}
 return signer;
}
async function attemptConnection(factory){
 const attempt=attempts.current.begin();Loading(true);E('');
 try{const entry=await factory();attempt.check();return await ensure(entry,()=>attempt.check());}
 finally{attempt.finish();Loading(false);}
}
function openPicker(){E('');Picker(true)}
async function connect(){if(current.current)return attemptConnection(async()=>current.current);if(pending.current)return pending.current.promise;let resolve,reject,promise=new Promise((a,b)=>{resolve=a;reject=b});pending.current={promise,resolve,reject};openPicker();return promise}
async function chooseFactory(factory){
 const waiting=pending.current;
 try{
  const signer=await attemptConnection(factory);
  Picker(false);waiting?.resolve(signer);if(pending.current===waiting)pending.current=null;
 }catch(e){
  // A closed attempt must not overwrite a newly opened picker or promise.
  if(pending.current===waiting){E(e.code===4001?'Connection or network switch was declined.':e.shortMessage||e.message||'Connection failed');waiting?.reject(e);pending.current=null;}
 }
}
async function chooseWC(){return chooseFactory(async()=>{
 const provider=await walletConnectProvider();
 const entry={provider,info:{uuid:'walletconnect',rdns:'com.walletconnect',name:'WalletConnect'}};
 Wallets(prev=>prev.some(w=>w.provider===provider)?prev:[...prev,entry]);return entry;
})}
async function choose(entry){return chooseFactory(async()=>entry)}
function close(){
 attempts.current.cancel();wc.current?.cancel?.();QR('');Picker(false);
 if(pending.current){pending.current.reject(Error('Wallet connection cancelled'));pending.current=null;}
}
async function disconnect(){attempts.current.cancel();wc.current?.cancel?.();const p=selected?.provider;enabled.current=false;updateAddress('');Chain(null);Selected(null);restored.current=true;try{localStorage.removeItem(SESSION)}catch{}if(p?.session&&p.disconnect)try{await p.disconnect()}catch{}if(p)try{await p.request({method:'wallet_revokePermissions',params:[{eth_accounts:{}}]})}catch{}}
return <Context.Provider value={{wallets,address,chainId,walletName:selected?.info.name||'',wrongNetwork:!!address&&chainId!==25,connect,openPicker,disconnect}}>{children}{picker&&<div className="overlay wallet-overlay" onClick={close}><section role="dialog" aria-modal="true" aria-labelledby="wallet-picker-title" tabIndex={-1} className="wallet-picker" onClick={e=>e.stopPropagation()}><button className="close" onClick={close} aria-label="Close wallet selection"><X size={19}/></button><div className="wallet-picker-icon"><Wallet size={25}/></div><span className="eyebrow">YOUR KEYS. YOUR UNIVERSE.</span><h2 id="wallet-picker-title">Connect to RIFT</h2><p>Select a wallet to continue on Cronos.</p>{wallets.length?<div className="wallet-provider-list">{wallets.map((e,i)=><button key={key(e)+i} disabled={loading} onClick={()=>choose(e)}><span className="wallet-provider-avatar">{e.info.name.slice(0,2).toUpperCase()}</span><b>{e.info.name}</b><span>{selected?.provider===e.provider?'Selected':'Detected'}</span><ArrowUpRight size={15}/></button>)}</div>:<div className="wallet-no-provider"><Wallet size={28}/><h3>No browser wallet detected</h3><p>Install an EVM wallet extension, or open this site inside a Cronos-compatible mobile wallet browser.</p><a href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get MetaMask <ArrowUpRight size={13}/></a></div>}{loading&&<p className="wallet-working">Confirm connection/network in your wallet…</p>}{error&&<div className="warning">{error}</div>}<div className="wallet-privacy"><ShieldCheck size={16}/><p>Connection shares your public address. Portfolio reads never request approvals, signatures or transfers. Public indexers receive the address when loading assets.</p></div>{qrURI&&<div className="wallet-qr">{qrImage&&<img src={qrImage} alt="WalletConnect pairing QR code"/>}<p>Scan with your wallet. Pairing expires after two minutes. Treat the pairing URI as private.</p>{mobilePairingUri(qrURI)&&<a className="secondary" href={mobilePairingUri(qrURI)} rel="noreferrer" referrerPolicy="no-referrer">Open mobile wallet</a>}<p>Return to RIFT after approving in your wallet. If no app opens, scan the QR on another device or copy the pairing URI.</p><button className="secondary" onClick={()=>copyPairingUri(qrURI,navigator.clipboard).catch(e=>E(e.message))}>Copy pairing URI</button><button className="secondary" onClick={close}>Cancel pairing</button></div>}<button className="secondary" style={{width:'100%',marginTop:18}} disabled={loading||!WC_PROJECT} onClick={chooseWC}>WalletConnect · QR / mobile{!WC_PROJECT&&' (setup required)'}</button><small className="wallet-mobile-note">{WC_PROJECT?'Scan with a Cronos-compatible wallet. WalletConnect relay receives session connection data.':'QR requires a WalletConnect project ID. Browser wallets remain available.'}</small></section></div>}</Context.Provider>}
