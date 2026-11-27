/** A primary-first D1 session provides sequential reads, not a transaction.
 * Cooperative state bracketing detects publication/rebuild changes; it is not
 * protection against arbitrary SQL writers or cross-request snapshot pinning. */
export async function stableD1ProjectionRead(db,{sql,args=[]},read){
 const session=typeof db.withSession==='function'?db.withSession('first-primary'):db;
 const state=()=>session.prepare(sql).bind(...args).first();
 const before=await state(),result=await read(session,before),after=await state();
 if(JSON.stringify(before)!==JSON.stringify(after))return Response.json({error:'Projection changed during read; retry'},{status:503,headers:{'Retry-After':'1','Cache-Control':'no-store'}});
 return result;
}
