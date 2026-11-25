// Validate persisted normalized directory structure, not provider authenticity or freshness.
export function validateDirectorySnapshot(value){
 if(!value||value.chainId!==25||!Array.isArray(value.collections)||value.collections.length>200||!value.counts||typeof value.updatedAt!=='string'||!Number.isFinite(Date.parse(value.updatedAt)))throw Error('Invalid saved Cronos directory');
 const addresses=new Set(),all=new Set(),week=new Set();
 for(const row of value.collections){
  if(!row||typeof row.address!=='string'||!/^0x[a-f0-9]{40}$/.test(row.address)||addresses.has(row.address)||typeof row.name!=='string'||row.name.length>180||typeof row.description!=='string'||row.description.length>6000)throw Error('Invalid saved collection');addresses.add(row.address);
  if(typeof row.category!=='string'||row.category.length>80||row.categorySource!==null&&(typeof row.categorySource!=='string'||row.categorySource.length>300))throw Error('Invalid saved category');
  for(const key of ['owners','items'])if(row[key]!==null&&(!Number.isSafeInteger(row[key])||row[key]<0))throw Error('Invalid saved count');
  if(row.image!==null){if(typeof row.image!=='string'||row.image.length>2048||/\s/.test(row.image))throw Error('Invalid saved image');let image;try{image=new URL(row.image);}catch{throw Error('Invalid saved image');}if(image.protocol!=='https:'||image.username||image.password)throw Error('Invalid saved image');}
  for(const field of ['volumeTotal','volume7d','floor'])if(row[field]!==null&&(typeof row[field]!=='string'||!/^\d{1,78}(?:\.\d{1,18})?$/.test(row[field])))throw Error('Invalid saved amount');
  for(const [field,ranks,amount] of [['allTimeRank',all,'volumeTotal'],['weeklyRank',week,'volume7d']]){const rank=row[field];if(rank!==null){if(!Number.isInteger(rank)||rank<1||rank>100||ranks.has(rank)||row[amount]===null||!/[1-9]/.test(row[amount]))throw Error('Invalid saved rank');ranks.add(rank);}}
  if(row.allTimeRank===null&&row.weeklyRank===null)throw Error('Unranked saved collection');
 }
 for(const [key,ranks] of [['allTime',all],['weekly',week]]){if(!Number.isInteger(value.counts[key])||value.counts[key]!==ranks.size)throw Error('Invalid saved rank counts');for(let i=1;i<=ranks.size;i++)if(!ranks.has(i))throw Error('Saved rank gap');}
 return value;
}
