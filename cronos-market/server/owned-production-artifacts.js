import {productionExact,requireProduction as need} from './owned-production-config.js';
import {projectionPublicationHash} from './projection-publication.js';
/** Shared semantic binding after callers have pinned the exact file bytes.
 * Deliberately separate from expiry admission so audits can report expiration. */
export function validateProductionArtifactBindings({receipt,data,evidence,intent=null}){
 const hash=v=>projectionPublicationHash(v);
 need(receipt?.format==='rift-owned-projection-production-receipt-v1'&&receipt.verified===false&&receipt.activated===false,'PRODUCER_RECEIPT_INVALID');
 need(receipt.datasetId===data.datasetId&&receipt.expiresAt===data.expiresAt&&receipt.collectionCount===data.collections.length&&receipt.candidateCount===data.walletCandidates.length,'PRODUCER_RECEIPT_SUMMARY_CHANGED');
 need(evidence?.format==='rift-owned-projection-production-evidence-v1'&&evidence.chainId===25&&evidence.generatedAt===data.generatedAt&&evidence.expiresAt===data.expiresAt,'PRODUCER_EVIDENCE_METADATA_CHANGED');
 need(hash(receipt.rebuildLineage)===hash(evidence.rebuildLineage)&&hash(receipt.collectionRebuildLineages)===hash(evidence.collectionRebuildLineages)&&hash(receipt.marketplaceRebuildLineage)===hash(evidence.exchangeAccounting?.rebuildLineage||evidence.legacyAccounting?.rebuildLineage||null),'PRODUCER_RECEIPT_LINEAGE_CHANGED');
 need(data.coverage.evidenceDigests.length===1&&data.coverage.evidenceDigests[0]===receipt.evidenceSha256,'PRODUCER_EVIDENCE_PIN_MISMATCH');
 if(receipt.requestDigest!==undefined){need(/^[a-f0-9]{64}$/.test(receipt.requestDigest)&&productionExact(intent,['format','requestDigest','generatedAt'])&&intent.format==='rift-owned-production-intent-v1'&&intent.requestDigest===receipt.requestDigest&&intent.generatedAt===data.generatedAt,'PRODUCER_INTENT_CHANGED')}
 return data;
}
