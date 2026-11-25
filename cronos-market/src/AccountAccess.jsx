import React,{useEffect,useState} from 'react';
import {useWallet} from './WalletContext.jsx';
import {creatorRequest,signInCreator} from './creator-client.js';
import AccountProfile from './AccountProfile.jsx';
export default function AccountAccess({run,toast,busy}){
 const {address,connect}=useWallet(),[session,Session]=useState(null);
 useEffect(()=>{let active=true;Session(null);if(address)creatorRequest('/auth/session').then(s=>{if(active&&s.address===address.toLowerCase())Session(s)}).catch(()=>{});return()=>{active=false}},[address]);
 if(!address)return null;
 const signed=session?.address===address.toLowerCase();
 async function requireSession(){const s=await creatorRequest('/auth/session');if(s.address!==address.toLowerCase())throw Error('Sign in with the connected wallet again');return s;}
 return <details className="creator-panel"><summary>My private account profile</summary><p>Portfolio reads do not require a signature. Saving a backend profile requires a separate wallet-message sign-in, not a spending approval.</p>
 {!signed?<button className="secondary" disabled={busy} onClick={()=>run(async()=>{Session(await signInCreator(connect));toast('Account signed in. No transaction sent.');})}>Sign in to account</button>:<><button className="secondary" disabled={busy} onClick={()=>run(async()=>{await creatorRequest('/auth/logout',{method:'POST',body:{}});Session(null);})}>Sign out of account</button><AccountProfile onSessionRevoked={()=>Session(null)} key={session.address} requireSession={requireSession} run={run} toast={toast} busy={busy}/></>}
 </details>;
}
