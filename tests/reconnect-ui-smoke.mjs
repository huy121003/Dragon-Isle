/* Reconnect UI must be blocking and driven by the dedicated connection service. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const react=readFileSync(path.join(root,'src/features/connection/ReconnectModal.jsx'),'utf8');
const connection=readFileSync(path.join(root,'js/network/connection.js'),'utf8');
const systemConfig=readFileSync(path.join(root,'js/config/system.js'),'utf8');
const input=readFileSync(path.join(root,'js/ui/input.js'),'utf8');
const main=readFileSync(path.join(root,'js/main.js'),'utf8');

assert(react.includes('className="connection-modal"'));
assert(react.includes('open={!!connection?.blocked}'));
assert(react.includes('closable={false}'));
assert(react.includes('maskClosable={false}'));
assert(react.includes('keyboard={false}'));
assert(react.includes('zIndex={5000}'));
assert(react.includes('Retrying automatically in'));
assert(react.includes('Still trying to reconnect'));
assert(react.includes('Try again now'));
assert(react.includes('Session expired'));

assert(connection.includes('DragonConfig.system.connection'));
assert(connection.includes('config.retryMs'));
assert(connection.includes('config.prolongedMs'));
assert(systemConfig.includes('retryMs:5_000'));
assert(systemConfig.includes('prolongedMs:120_000'));
assert(connection.includes('fetch("/api/auth/me"'));
assert(connection.includes('response.status===401'));
assert(connection.includes('expire()'));
assert(connection.includes('DragonConnectionApi={retry,fail,expire,connected,configure'));
assert(!connection.includes('/api/auth/logout'),
  'Reconnect state must never auto-logout merely because the server is unavailable');

assert(input.includes('window.DragonConnectionState?.blocked'));
assert(main.includes('addEventListener("online"'));
assert(main.includes('addEventListener("pagehide"'));

console.log('PASS non-dismissible reconnect UI and retry policy');
