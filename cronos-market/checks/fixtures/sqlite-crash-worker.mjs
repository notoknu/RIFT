// Disposable test child only. Parent creates/removes the temporary database directory.
import {IndexStore} from '../../server/index-store.js';
if(!process.send)throw Error('IPC test worker required');
const [file,mode]=process.argv.slice(2);
const wallet='0x'+'1'.repeat(40),contract='0x'+'2'.repeat(40);
const store=new IndexStore(file);
store.db.exec('PRAGMA synchronous=FULL; PRAGMA wal_autocheckpoint=0;');
store.track(wallet);
store.commit(wallet,[{address:contract,tokenId:'7',standard:'ERC-721',block:7}],7,'0x'+'7'.repeat(64),9);
if(mode==='uncommitted'){
 store.db.exec('BEGIN IMMEDIATE');
 store.db.prepare('UPDATE wallets SET last=999,hash=? WHERE address=?').run('uncommitted-hash',wallet);
 store.db.prepare('INSERT INTO observations VALUES(?,?,?,?,?)').run(wallet,contract,'999','ERC-721',999);
}
process.send({ready:true});
// Keep the transaction and database open. The parent kills this process, not close().
setInterval(()=>{},1000);
