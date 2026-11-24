export function assertFreshPreflight(report,{hash,admin,now=Date.now()}={}){
 const timestamp=typeof report?.timestamp==='string'?Date.parse(report.timestamp):NaN;
 if(!report||report.chainId!==25||typeof report.admin!=='string'||report.admin.toLowerCase()!==admin.toLowerCase()||report.bytecodeHash!==hash||!Number.isFinite(timestamp)||timestamp>now+60000||now-timestamp>86400000)throw Error('Preflight is invalid, stale, future-dated or does not match chain/admin/bytecode');
 return report;
}
