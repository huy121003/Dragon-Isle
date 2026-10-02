import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const read=file=>readFileSync(path.join(root,file),'utf8');

describe('architecture boundaries',()=>{
  it('keeps entrypoints thin',()=>{
    expect(read('src/main.jsx').split('\n').length).toBeLessThan(40);
    expect(read('server.cjs').split('\n').length).toBeLessThan(45);
    expect(read('js/main.js').split('\n').length).toBeLessThan(50);
    expect(read('js/save.js').split('\n').length).toBeLessThan(100);
  });
  it('keeps the legacy modal router thin and panel domains split',()=>{
    const router=read('js/ui/panels.js');
    const index=read('index.html');
    expect(router.split('\n').length).toBeLessThan(60);
    expect(router).toContain('function renderModal');
    for(const file of ['islands','shop','filters','dragons','inventory','farms','hatchery','breeding','book','system'])
      expect(index).toContain('js/ui/panels/'+file+'.js');
    expect(read('js/ui/panels/shop.js')).toContain('function renderShop');
    expect(read('js/ui/panels/hatchery.js')).toContain('function renderHatchery');
    expect(read('js/ui/panels/breeding.js')).toContain('function renderBreeding');
    expect(read('js/ui/panels/book.js')).toContain('function renderBook');
  });

  it('separates boot, browser events, runtime loops and React bridge',()=>{
    const index=read('index.html');
    const main=read('js/main.js');
    expect(index).toContain('js/app/events.js');
    expect(index).toContain('js/app/runtime-loops.js');
    expect(index).toContain('js/app/bridge.js');
    expect(main).toContain('bindGameEvents(runtime)');
    expect(main).toContain('startGameRuntimeLoops(runtime)');
    expect(main).toContain('installGameBridge()');
    expect(main).not.toContain('addEventListener("pointerdown"');
    expect(main).not.toContain('requestAnimationFrame(frame)');
    expect(main).not.toContain('window.DragonGame={');
  });

  it('keeps building art primitives and type renderers separated',()=>{
    const index=read('index.html');
    const router=read('js/render/building-art.js');
    expect(router.split('\n').length).toBeLessThan(80);
    for(const file of ['building-primitives','habitat-art','facility-art','breeding-art','building-art'])
      expect(index).toContain('js/render/'+file+'.js');
    expect(read('js/render/building-primitives.js')).toContain('function structurePlinth');
    expect(read('js/render/habitat-art.js')).toContain('function paintHabitatBiome');
    expect(read('js/render/facility-art.js')).toContain('function paintHatchery');
    expect(read('js/render/breeding-art.js')).toContain('function paintPremiumCave');
    expect(router).toContain('function drawBuilding');
    expect(router).not.toContain('function paintHabitatBiome');
  });

  it('separates world camera geometry from island art',()=>{
    const index=read('index.html');
    const geometry=read('js/render/world-geometry.js');
    const world=read('js/render/world.js');
    expect(index).toContain('js/render/world-geometry.js');
    expect(geometry).toContain('function resizeCanvas');
    expect(geometry).toContain('function screenToGrid');
    expect(geometry).toContain('function clampCamera');
    expect(world).toContain('function drawBackground');
    expect(world).toContain('function drawIslandWeather');
    expect(world).not.toContain('function resizeCanvas');
    expect(world).not.toContain('function screenToGrid');
  });

  it('keeps guide registry separate from domain content',()=>{
    const index=read('index.html');
    const router=read('js/ui/guide.js');
    expect(router.split('\n').length).toBeLessThan(70);
    for(const file of ['shared','start','dragons','breeding','islands','resources','combat'])
      expect(index).toContain('js/ui/guide/'+file+'.js');
    expect(router).toContain('const GUIDE_SECTIONS');
    expect(router).toContain('function renderGuide');
    expect(router).not.toContain('function guideArena');
    expect(read('js/ui/guide/combat.js')).toContain('function guideArena');
    expect(read('js/ui/guide/breeding.js')).toContain('function guideBreeding');
  });

  it('separates canvas pointer input from action routing',()=>{
    const index=read('index.html');
    const input=read('js/ui/input.js');
    const actions=read('js/ui/actions.js');
    expect(index).toContain('js/ui/actions.js');
    expect(input).toContain('function pointerDown');
    expect(input).toContain('function wheelZoom');
    expect(input).not.toContain('function handleAction');
    expect(actions).toContain('function handleAction');
    expect(actions).toContain('DragonConnectionState?.blocked');
  });

  it('separates selection inspector from UI shell lifecycle',()=>{
    const index=read('index.html');
    const core=read('js/ui/core.js');
    const inspector=read('js/ui/inspector.js');
    expect(index).toContain('js/ui/inspector.js');
    expect(core).not.toContain('function updateInspector');
    expect(core).toContain('function updateUI');
    expect(core).toContain('function openModal');
    expect(inspector).toContain('function updateInspector');
    expect(inspector).toContain('data-action="open-arena"');
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
    const effects=read('src/features/arena/ArenaEffects.jsx');
    const challenge=read('src/features/challenge/ChallengeView.jsx');
    expect(view.split('\n').length).toBeLessThan(100);
    expect(battle.split('\n').length).toBeLessThan(130);
    expect(view).toContain("from './ArenaShared.jsx'");
    expect(view).toContain("from './ArenaBattle.jsx'");
    expect(shared).toContain('export function RosterCard');
    expect(shared).toContain('export function ElementFilter');
    expect(battle).toContain("from './ArenaEffects.jsx'");
    expect(battle).toContain('export function Battle');
    expect(effects).toContain('export function SkillEffect');
    expect(effects).toContain('export function battleSnapshot');
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

  it('separates Challenge DTO perspective mapping from state transitions',()=>{
    const challenge=read('server/challenge.cjs');
    const view=read('server/challenge/view.cjs');
    expect(challenge).toContain("require('./challenge/view.cjs')");
    expect(challenge).toContain('createChallengeView({users,presencePolicy,arena})');
    expect(challenge).not.toContain('function view(match,id)');
    expect(view).toContain('function createChallengeView');
    expect(view).toContain('function view(match,id)');
    expect(view).toContain('events:raw.events.map(swapEvent)');
  });

  it('keeps server routes out of the bootstrap',()=>{
    const server=read('server.cjs');
    expect(server).not.toContain("pathname==='/api/");
    expect(read('server/app.cjs')).toContain('createSaveRoutes');
    expect(read('server/routes/auth.cjs')).toContain('/api/auth/login');
    expect(read('server/arena.cjs')).toContain('catalogDir=dataDir');
  });
});
