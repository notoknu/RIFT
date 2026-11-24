import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {CREATOR_SCHEMA} from '../shared/creator-schema.js';
// Minimal D1 API adapter: the service only depends on prepare/bind/first/all/run.
export function localD1(path='data/creator.sqlite') {
 mkdirSync(dirname(path),{recursive:true,mode:0o700});const db=new DatabaseSync(path);
 if(path!==':memory:')chmodSync(path,0o600);
 db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');db.exec(CREATOR_SCHEMA);
 return {close:()=>db.close(),prepare(sql){return {bind(...params){return {
  async first(){return db.prepare(sql).get(...params)||null},
  async all(){return {results:db.prepare(sql).all(...params)}},
  async run(){const r=db.prepare(sql).run(...params);return {meta:{changes:r.changes}}}
 }}}}};
}
