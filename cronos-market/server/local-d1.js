import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {CREATOR_SCHEMA} from '../shared/creator-schema.js';
export function localD1(path='data/creator.sqlite') {
 mkdirSync(dirname(path),{recursive:true,mode:0o700});const db=new DatabaseSync(path),statements=new WeakMap();
 if(path!==':memory:')chmodSync(path,0o600);
 db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');db.exec(CREATOR_SCHEMA);
 return {close:()=>db.close(),async batch(items){
  const specs=items.map(item=>{const spec=statements.get(item);if(!spec)throw Error('Statement belongs to another database');return spec});
  db.exec('BEGIN IMMEDIATE');try{const results=specs.map(({sql,params})=>{const s=db.prepare(sql);if(s.columns().length)return {results:s.all(...params),meta:{changes:0}};return {results:[],meta:{changes:Number(s.run(...params).changes)}}});db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}
 },prepare(sql){return {bind(...params){const bound={
  async first(){return db.prepare(sql).get(...params)||null},
  async all(){return {results:db.prepare(sql).all(...params)}},
  async run(){const r=db.prepare(sql).run(...params);return {meta:{changes:r.changes}}}
 };statements.set(bound,{sql,params});return bound}}}};
}
