export const RANKING_QUERY=`query RiftDirectory($after:String,$sort:CollectionSortInput!){collections(first:50,after:$after,filter:{chains:[CRONOS],verifiedOnly:false},sort:$sort){edges{node{address name chain{name} description logo{url} assetCount ownerCount status floorPrice{latestFloorPriceNative} volume{volumeAllNative volume7dNative}}}pageInfo{hasNextPage endCursor}}}`;
// Identical bounded acquisition policy for Node and edge. Not a provider snapshot/finality guarantee.
export async function collectRankingPages(readPage){
 if(typeof readPage!=='function')throw Error('Ranking page reader required');
 const nodes=[],periods=[];
 for(const field of ['VOLUME_ALL','VOLUME_SEVEN_DAY']){
  let after=null,pages=0,rows=0,hasMore=false;const cursors=new Set();
  for(let page=0;page<2;page++){
   const body=await readPage({query:RANKING_QUERY,variables:{after,sort:{field,isAscending:false}}});
   const connection=body?.data?.collections;
   if(body?.errors!==undefined&&(!Array.isArray(body.errors)||body.errors.length)||!Array.isArray(connection?.edges)||connection.edges.length>50||typeof connection.pageInfo?.hasNextPage!=='boolean')throw Error('Invalid bounded ranking page');
   if(connection.edges.some(edge=>!edge||typeof edge.node!=='object'||edge.node===null||Array.isArray(edge.node)))throw Error('Invalid ranking edge');
   hasMore=connection.pageInfo.hasNextPage;pages++;rows+=connection.edges.length;nodes.push(...connection.edges.map(edge=>edge.node));
   if(!hasMore)break;
   const cursor=connection.pageInfo.endCursor;
   if(!connection.edges.length||typeof cursor!=='string'||!cursor||cursor.length>2048||cursors.has(cursor))throw Error('Invalid ranking pagination');
   cursors.add(cursor);after=cursor;
  }
  periods.push({field,pages,rows,moreSourceRows:hasMore});
 }
 return {nodes,acquisition:{pageLimitPerPeriod:2,pageSizeLimit:50,periods,atomicSnapshot:false}};
}
