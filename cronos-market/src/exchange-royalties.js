import {Contract,formatEther,isAddress,ZeroAddress} from 'ethers';

const ABI = [
  'function supportsInterface(bytes4) view returns(bool)',
  'function royaltyInfo(uint256,uint256) view returns(address,uint256)',
];

// Mirror the exchange's execution policy. A failed lookup is NOT a zero royalty.
export async function royaltyEstimate(asset, tokenId, gross) {
  gross = BigInt(gross);
  if (gross <= 0n) throw Error('Gross proceeds must be positive');
  let recipient = ZeroAddress;
  let royalty = 0n;
  if (await asset.supportsInterface('0x2a55205a')) {
    const result = await asset.royaltyInfo(tokenId, gross);
    recipient = result[0];
    royalty = BigInt(result[1]);
    if (!isAddress(recipient) || royalty < 0n || royalty > gross / 10n || (royalty > 0n && recipient === ZeroAddress)) {
      throw Error('Unsupported royalty: exchange rejects this sale');
    }
  }
  return {gross, royalty, recipient, net: gross - royalty};
}

export function royaltyDisclosure(quote) {
  return [
    'Gross sale: ' + formatEther(quote.gross) + ' CRO',
    'Estimated royalty: ' + formatEther(quote.royalty) + ' CRO',
    'Royalty recipient: ' + (quote.royalty > 0n ? quote.recipient : 'None (zero royalty)'),
    'Estimated seller proceeds: ' + formatEther(quote.net) + ' CRO',
    'Platform fee: 0 CRO. Network gas is additional.',
    'Proceeds are credited for withdrawal, not paid immediately.',
    'Estimate only: the NFT royalty response may change before execution. Royalties above 10% are rejected, not capped.',
  ].join('\n');
}

async function freshRoyaltyAsset(provider,nft) {
  // Explicit block tags prevent ethers' short-lived `latest` call cache from
  // hiding a royalty change confirmed during approval.
  const block=await provider.send('eth_blockNumber',[]);
  if(typeof block!=='string'||!/^0x[0-9a-f]+$/i.test(block))throw Error('Royalty observation block unavailable');
  const contract=new Contract(nft,ABI,provider);
  return {
    supportsInterface:id=>contract.supportsInterface.staticCall(id,{blockTag:block}),
    royaltyInfo:(tokenId,gross)=>contract.royaltyInfo.staticCall(tokenId,gross,{blockTag:block}),
  };
}

export async function confirmSellerProceeds(provider, {nft, tokenId, gross}) {
  const quote = await royaltyEstimate(await freshRoyaltyAsset(provider,nft), tokenId, gross);
  if (!confirm(royaltyDisclosure(quote) + '\nContinue?')) throw Error('Sale review declined');
  return quote;
}

// Approval may take minutes. Re-read the quote instead of treating an earlier
// disclosure as permanent consent. No on-chain slippage protection is implied.
export async function recheckSellerProceeds(provider, input, previous, {asset,confirmAction=globalThis.confirm}={}) {
  const current=await royaltyEstimate(asset||await freshRoyaltyAsset(provider,input.nft),input.tokenId,input.gross);
  if(current.gross!==previous.gross||current.royalty!==previous.royalty||current.recipient.toLowerCase()!==previous.recipient.toLowerCase()) {
    if(!confirmAction('Royalty estimate changed after your earlier review.\nEarlier royalty: '+formatEther(previous.royalty)+' CRO\nEarlier recipient: '+previous.recipient+'\n\n'+royaltyDisclosure(current)+'\nContinue with this updated estimate?'))throw Error('Changed royalty review declined');
  }
  return current;
}
