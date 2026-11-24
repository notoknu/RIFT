import React,{useEffect,useState} from 'react';
import {creatorRequest} from './creator-client.js';
const empty={version:0,displayName:'',bio:'',website:'',avatar:''};
export default function AccountProfile({requireSession,run,toast,busy}){
 const [profile,Profile]=useState(empty),[loaded,Loaded]=useState(false),[error,ErrorText]=useState('');
 async function load(){await requireSession();const result=await creatorRequest('/profile');const p=result.profile||empty;Profile({version:p.version,displayName:p.displayName,bio:p.bio,website:p.website,avatar:p.avatar});Loaded(true);ErrorText('');}
 useEffect(()=>{let active=true;(async()=>{try{await requireSession();const result=await creatorRequest('/profile');if(active){const p=result.profile||empty;Profile({version:p.version,displayName:p.displayName,bio:p.bio,website:p.website,avatar:p.avatar});Loaded(true);}}catch(e){if(active)ErrorText(e.message)}})();return()=>{active=false}},[]);
 const field=(key,value)=>Profile(p=>({...p,[key]:value}));
 return <section className="creator-profile"><h3>My account profile</h3><p>Private profile stored by the configured backend after wallet-message sign-in. Not a verified public identity. Never enter a seed phrase, private key, API token or other secret. Device wallet secrets are not uploaded.</p>
 {error&&<p role="status">Profile unavailable: {error}</p>}
 <label>Display name<input maxLength={48} value={profile.displayName} onChange={e=>field('displayName',e.target.value)}/></label>
 <label>Bio<textarea maxLength={500} value={profile.bio} onChange={e=>field('bio',e.target.value)}/></label>
 <label>Website · optional HTTPS<input type="url" maxLength={300} value={profile.website} onChange={e=>field('website',e.target.value)}/></label>
 <label>Avatar · optional IPFS URI<input maxLength={512} value={profile.avatar} placeholder="ipfs://…" onChange={e=>field('avatar',e.target.value)}/></label>
 <div className="creator-actions"><button className="secondary" disabled={busy} onClick={()=>run(load)}>Reload profile</button>
 <button className="secondary" disabled={busy||!loaded} onClick={()=>run(async()=>{await requireSession();const result=await creatorRequest('/profile',{method:'PUT',body:profile});Profile(p=>({...p,version:result.version}));toast('Account profile saved by backend. Keep independent backups.');})}>Save profile</button>
 <button className="secondary" disabled={busy||!loaded||!profile.version} onClick={()=>run(async()=>{await requireSession();if(!confirm('Delete this account profile? Wallet, drafts, favorites and on-chain assets are unchanged.'))return;await creatorRequest('/profile',{method:'DELETE',body:{version:profile.version}});Profile(empty);toast('Account profile deleted.');})}>Delete profile</button></div></section>;
}
