/* Reconnect UI must be blocking and driven by the dedicated connection service. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const modal=readFileSync(path.join(root,'src/features/connection/ReconnectModal.jsx'),'utf8');
const connection=readFileSync(path.join(root,'js/network/connection.js'),'utf8');
const saveClient=readFileSync(path.join(root,'js/persistence/save-client.js'),'utf8');
const input=readFileSync(path.join(root,'js/ui/input.js'),'utf8');
const main=readFileSync(path.join(root,'js/main.js'),'utf8');

assert.match(modal,/className="connection-modal"/);
assert.match(modal,/open={!!connection\?\.blocked}/);
assert.match(modal,/closable={false}/);
assert.match(modal,/maskClosable={false}/);
assert.match(modal,/keyboard={false}/);
assert.match(modal,/zIndex=\{5000\}/);
assert.match(modal,/Retrying automatically in/);
assert.match(modal,/Still trying to reconnect/);
assert.match(modal,/Try again now/);
assert.match(modal,/Session expired/);

assert.match(connection,/RECONNECT_MS=5000/);
assert.match(connection,/PROLONGED_MS=120000/);
assert.match(connection,/fetch\("\/api\/auth\/me"/);
assert.match(connection,/response\.status===401/);
assert.match(connection,/function expire\(\)/);
assert.match(connection,/DragonConnectionApi=\{retry,fail,expire,connected,configure/);
assert.doesNotMatch(connection,/\/api\/auth\/logout/,
  'Reconnect state must never auto-logout merely because the server is unavailable');
assert.match(saveClient,/DragonConnectionApi\?\.configure/);

assert.match(input,/window\.DragonConnectionState\?\.blocked/);
assert.match(main,/addEventListener\("online"/);
assert.match(main,/addEventListener\("pagehide"/);

console.log('PASS non-dismissible reconnect UI and retry policy');
