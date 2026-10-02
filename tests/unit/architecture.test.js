import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const read=file=>readFileSync(path.join(root,file),'utf8');

describe('architecture boundaries',()=>{
  it('keeps entrypoints thin',()=>{
    expect(read('src/main.jsx').split('\n').length).toBeLessThan(40);
    expect(read('server.cjs').split('\n').length).toBeLessThan(45);
    expect(read('js/save.js').split('\n').length).toBeLessThan(100);
  });
  it('keeps network, persistence and migrations separated',()=>{
    expect(read('index.html')).toContain('js/network/connection.js');
    expect(read('index.html')).toContain('js/persistence/migrations.js');
    expect(read('index.html')).toContain('js/persistence/save-client.js');
  });
  it('uses the React ecosystem for app and server state boundaries',()=>{
    expect(read('src/main.jsx')).toContain('QueryClientProvider');
    expect(read('src/store/app-store.js')).toContain("from 'zustand'");
    expect(read('src/features/challenge/useChallenge.js')).toContain("from '@tanstack/react-query'");
    expect(read('server/validation.cjs')).toContain("require('zod')");
  });
  it('keeps server routes out of the bootstrap',()=>{
    const server=read('server.cjs');
    expect(server).not.toContain("pathname==='/api/");
    expect(read('server/app.cjs')).toContain('createSaveRoutes');
    expect(read('server/routes/auth.cjs')).toContain('/api/auth/login');
  });
});
