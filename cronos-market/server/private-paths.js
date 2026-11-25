// Refuse hidden/private paths before plugins, static serving and SPA fallback.
export function privatePathGuard(req,res,next){
 let path=String(req.originalUrl||req.url||'/').split('?')[0];
 try{for(let i=0;i<2&&path.includes('%');i++)path=decodeURIComponent(path)}catch{return res.status(400).set('Cache-Control','no-store').json({error:'Invalid path'})}
 const segments=path.replaceAll('\\','/').split('/').filter(Boolean);
 const hidden=segments.some((part,i)=>part.startsWith('.')&&!(i===0&&part==='.well-known'));
 if(hidden||/[\u0000-\u001f\u007f]/.test(path))return res.status(404).set('Cache-Control','no-store').json({error:'Not found'});
 next();
}
