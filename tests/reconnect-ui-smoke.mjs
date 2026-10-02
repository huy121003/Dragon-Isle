/* Reconnect UI must be blocking and driven by the save-layer connection state. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const react=readFileSync(path.join(root,'src/main.jsx'),'utf8');
const save=readFileSync(path.join(root,'js/save.js'),'utf8');
const input=readFileSync(path.join(root,'js/ui/input.js'),'utf8');
const main=readFileSync(path.join(root,'js/main.js'),'utf8');

assert.match(react,/className="connection-modal"/);
assert.match(react,/open={!!connection\?\.blocked}/);
assert.match(react,/closable={false}/);
assert.match(react,/maskClosable={false}/);
assert.match(react,/keyboard={false}/);
assert.match(react,/zIndex=\{5000\}/);
assert.match(react,/Retrying automatically in/);
assert.match(react,/Still trying to reconnect/);
assert.match(react,/Try again now/);
assert.match(react,/Session expired/);

assert.match(save,/SERVER_RECONNECT_MS=5000/);
assert.match(save,/SERVER_PROLONGED_MS=120000/);
assert.match(save,/fetch\("\/api\/auth\/me"/);
assert.match(save,/response\.status===401/);
assert.match(save,/markSessionExpired\(\)/);
assert.match(save,/DragonConnectionApi=\{retry:retryServerConnection/);
assert.doesNotMatch(save,/\/api\/auth\/logout/,
  'Reconnect state must never auto-logout merely because the server is unavailable');

assert.match(input,/window\.DragonConnectionState\?\.blocked/);
assert.match(main,/addEventListener\("online"/);
assert.match(main,/addEventListener\("pagehide"/);

console.log('PASS non-dismissible reconnect UI and retry policy');
