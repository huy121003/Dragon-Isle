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
    expect(read('index.html')).toContain('js/config/system.js');
    expect(read('index.html')).toContain('js/network/connection.js');
    expect(read('index.html')).toContain('js/persistence/migrations.js');
    expect(read('index.html')).toContain('js/persistence/save-client.js');
  });
  it('uses the React ecosystem for app and server state boundaries',()=>{
    expect(read('src/main.jsx')).toContain('QueryClientProvider');
    expect(read('src/app/store.js')).toContain("from 'zustand'");
    expect(read('src/features/challenge/useChallenge.js')).toContain("from '@tanstack/react-query'");
    expect(read('server/validation.cjs')).toContain("require('zod')");
  });
  it('keeps Arena screen, shared roster and battle presentation separated',()=>{
    const view=read('src/features/arena/ArenaView.jsx');
    const shared=read('src/features/arena/ArenaShared.jsx');
    const battle=read('src/features/arena/ArenaBattle.jsx');
    const challenge=read('src/features/challenge/ChallengeView.jsx');
    expect(view.split('\n').length).toBeLessThan(100);
    expect(view).toContain("from './ArenaShared.jsx'");
    expect(view).toContain("from './ArenaBattle.jsx'");
    expect(shared).toContain('export function RosterCard');
    expect(shared).toContain('export function ElementFilter');
    expect(battle).toContain('export function Battle');
    expect(challenge).toContain("from '../arena/ArenaShared.jsx'");
    expect(challenge).toContain("from '../arena/ArenaBattle.jsx'");
    expect(challenge).not.toContain("from '../arena/ArenaView.jsx'");
  });

  it('separates fighter construction from battle turn resolution',()=>{
    const engine=read('server/arena/battle-engine.cjs');
    const fighter=read('server/arena/fighter.cjs');
    const view=read('server/arena/battle-view.cjs');
    const ai=read('server/arena/battle-ai.cjs');
    expect(engine).toContain("require('./fighter.cjs')");
    expect(engine).toContain("require('./battle-view.cjs')");
    expect(engine).toContain("require('./battle-ai.cjs')");
    expect(engine).toContain('createFighterFactory({catalog,game})');
    expect(engine).not.toContain('function species(id)');
    expect(engine).not.toContain('function publicBattle(battle)');
    expect(engine).not.toContain('function chooseDefenseSkill(battle)');
    expect(fighter).toContain('function createFighterFactory');
    expect(fighter).toContain('function makeFighter');
    expect(view).toContain('function record');
    expect(view).toContain('function publicBattle');
    expect(ai).toContain('function createBattleAi');
    expect(ai).toContain('function chooseDefenseSkill');
  });

  it('keeps server routes out of the bootstrap',()=>{
    const server=read('server.cjs');
    expect(server).not.toContain("pathname==='/api/");
    expect(read('server/app.cjs')).toContain('createSaveRoutes');
    expect(read('server/routes/auth.cjs')).toContain('/api/auth/login');
    expect(read('server/arena.cjs')).toContain('catalogDir=dataDir');
  });
});
