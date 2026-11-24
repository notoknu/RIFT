import {staticOrigin} from '../edge/frontend.js';
export function edgeConfig(env){
 const {D1_DATABASE_ID,PUBLIC_ORIGIN}=env;
 if(!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(D1_DATABASE_ID||''))throw Error('Set real D1_DATABASE_ID from your own account');
 let origin;try{origin=new URL(PUBLIC_ORIGIN)}catch{throw Error('Set exact HTTPS PUBLIC_ORIGIN')}
 if(origin.protocol!=='https:'||origin.origin!==PUBLIC_ORIGIN||origin.username||origin.password)throw Error('Set exact HTTPS PUBLIC_ORIGIN');
 const name=env.WORKER_NAME||'rift-api';if(!/^[a-z][a-z0-9-]{0,62}$/.test(name))throw Error('Invalid WORKER_NAME');
 const config={name,main:'edge/worker.js',compatibility_date:'2026-11-01',workers_dev:true,vars:{PUBLIC_ORIGIN,PIN_SPONSORED_BYTES:'0',PIN_SPONSORED_FILES:'0',EXCHANGE_TRADING_ENABLED:'0'},d1_databases:[{binding:'DB',database_name:'rift-core',database_id:D1_DATABASE_ID,migrations_dir:'edge/migrations'}]};
 // Scheduling is an explicit resource-consuming opt-in, not an automatic idle expense.
 if(env.EDGE_SCHEDULED_ENABLED==='1')config.triggers={crons:['* * * * *']};
 if(env.SURGE_ORIGIN)config.vars.SURGE_ORIGIN=staticOrigin(env.SURGE_ORIGIN).origin;
 else config.assets={directory:'./dist',binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:true};
 return config;
}
