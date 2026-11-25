import test from 'node:test';
import assert from 'node:assert/strict';
import {walletConnectProjectId,PUBLIC_REOWN_PROJECT_ID} from '../src/walletconnect-config.js';
test('official public project is reproducible without an excluded local environment file',()=>{assert.equal(walletConnectProjectId(undefined),'6192620197a83e8b29a98f8eb68ecc89');assert.match(PUBLIC_REOWN_PROJECT_ID,/^[a-f0-9]{32}$/);});
test('explicit empty disables pairing and valid environment overrides remain supported',()=>{assert.equal(walletConnectProjectId(''),'');assert.equal(walletConnectProjectId('  '+ 'a'.repeat(32)+'  '),'a'.repeat(32));for(const value of ['bad',null,{},'a'.repeat(33)])assert.throws(()=>walletConnectProjectId(value),/Invalid/);});
