import React,{useState,useEffect} from 'react';
import {inspectExchangeApprovals,revokeExchangeApproval} from './exchange-approvals.js';

export default function ExchangeApprovalTools({connect,run,toast,busy,exchangeAddress,wallet}) {
 const [nft,Nft]=useState(''),[tokenId,Token]=useState('0'),[multi,Multi]=useState(false),[snapshot,Snapshot]=useState(null);
 useEffect(()=>{Snapshot(null)},[wallet,exchangeAddress]);
 const update=(setter,value)=>{setter(value);Snapshot(null)};
 const input={nft,tokenId,multi,exchangeAddress};
 async function inspect(){await run(async()=>{const signer=await connect();Snapshot(await inspectExchangeApprovals(signer,input))})}
 async function revoke(scope){await run(async()=>{const signer=await connect();await revokeExchangeApproval(signer,input,{scope});Snapshot(null);toast('Approval revocation confirmed. Inspect again for current permissions. Orders and escrow are unchanged.')})}
 return <details className="exchange-create"><summary>Inspect / revoke exchange NFT approvals</summary>
  <p>An approval can remain after a failed or cancelled trade. Inspection only reads permissions; revocation requires your wallet confirmation and network gas. It does not cancel orders, close offers, withdraw CRO or reclaim escrow.</p>
  <label>NFT approval contract<input value={nft} disabled={busy} onChange={e=>update(Nft,e.target.value)} placeholder="0x… NFT contract"/></label>
  <label>NFT approval token ID<input value={tokenId} disabled={busy||multi} onChange={e=>update(Token,e.target.value)} inputMode="numeric"/><small>ERC721 requires an existing token ID. ERC1155 uses collection-wide operator approval.</small></label>
  <label><input type="checkbox" checked={multi} disabled={busy} onChange={e=>{update(Multi,e.target.checked);Token('0')}}/>ERC1155 approval (otherwise ERC721)</label>
  <button className="secondary" disabled={busy} onClick={inspect}>Inspect current exchange approvals</button>
  {snapshot&&snapshot.spender.toLowerCase()===exchangeAddress?.toLowerCase()&&<div role="status">
   <p>Observation block: {snapshot.blockNumber}<br/>Observed wallet: {snapshot.wallet}<br/>Verified exchange spender: {snapshot.spender}</p>
   <p>Collection operator approval: {snapshot.collectionApproved?'ACTIVE':'Not active'}{!snapshot.multi&&<> · Owned-token approval: {snapshot.tokenApproved?'ACTIVE':'Not active'}</>}</p>
   {!snapshot.multi&&snapshot.tokenApproved&&<button className="secondary" disabled={busy} onClick={()=>revoke('token')}>Review token approval revocation</button>}
   {snapshot.collectionApproved&&<button className="secondary" disabled={busy} onClick={()=>revoke('collection')}>Review collection approval revocation</button>}
   <small>Observation only; permissions are rechecked before revocation. This tool covers the currently configured RIFT exchange, not all wallet approvals. Review older/custom spenders in your wallet.</small>
  </div>}
 </details>;
}
