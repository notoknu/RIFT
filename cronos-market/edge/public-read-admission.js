/** Shared D1 counter for public read routes, including projection detail reads.
 * CF-Connecting-IP is a platform boundary; direct unproxied deployments must
 * establish their own trusted client identity rather than trusting this header. */
export async function edgePublicReadAdmission(request,env){
 const period=Math.floor(Date.now()/60000),ip=request.headers.get('CF-Connecting-IP')||'local';
 const admitted=await env.DB.prepare('INSERT INTO creator_edge_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<90 RETURNING count').bind('read:'+ip+':'+period,Date.now()+120000).first();
 return admitted?null:Response.json({error:'Public read limit reached'},{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
}
