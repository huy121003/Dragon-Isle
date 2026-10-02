import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>readFileSync(path.join(root,file),'utf8');

describe('logic architecture boundaries',()=>{
  it('keeps editable balance parameters under js/config',()=>{
    const names=readdirSync(path.join(root,'js/config'));
    for(const required of ['progression.js','economy.js','buildings.js','dragons.js','breeding.js',
      'hatching.js','combat.js','arena.js','challenge.js','world.js','timers.js','farming.js','system.js'])
      expect(names).toContain(required);
  });

  it('keeps game.json free of duplicated balance sources',()=>{
    const game=JSON.parse(read('data/game.json'));
    for(const key of ['progression','elementUnlocks','upgradeTimes','breedingTimes','crops',
      'gemPerDragonPerHour','testResources'])expect(game[key]).toBeUndefined();
    for(const meta of Object.values(game.buildings))
      expect({cost:meta.cost,maxLevel:meta.maxLevel,sellRate:meta.sellRate})
        .toEqual({cost:undefined,maxLevel:undefined,sellRate:undefined});
  });

  it('keeps rule modules pure from presentation/network side effects',()=>{
    for(const name of readdirSync(path.join(root,'js/rules'))){
      const source=read('js/rules/'+name);
      expect(source).not.toMatch(/\btoast\s*\(/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/\bsaveGame\s*\(/);
      expect(source).not.toMatch(/\bupdateUI\s*\(/);
      expect(source).not.toMatch(/\bAUDIO\b/);
    }
  });

  it('keeps core state/calculations/migrations off DATA balance facades',()=>{
    const state=read('js/core/state.js');
    const calculations=read('js/core/calculations.js');
    const selectors=read('js/core/selectors.js');
    const selling=read('js/logic/selling.js');
    const breeding=read('js/logic/breeding.js');
    const resources=read('js/logic/resources.js');
    const stars=read('js/logic/stars.js');
    const world=read('js/logic/world.js');
    const migrations=read('js/persistence/migrations.js');
    const catalog=read('js/data/catalog.js');
    const fighter=read('server/arena/fighter.cjs');
    expect(state).not.toContain('DATA.buildings.habitat.cost');
    expect(calculations).not.toContain('DATA.progression');
    expect(calculations).not.toContain('DATA.upgradeTimes');
    expect(calculations).not.toContain('DATA.gemPerDragonPerHour');
    expect(calculations).not.toContain('DATA.buildings.habitat.cost');
    expect(calculations).not.toContain('DATA.buildings[type].cost');
    expect(selectors).not.toContain('DATA.buildings[building.type].maxLevel');
    expect(selling).not.toContain('DATA.buildings[b.type].sellRate');
    expect(breeding).not.toContain('DATA.progression.breedLevel');
    expect(resources).not.toContain('DATA.testResources');
    expect(stars).not.toContain('DATA.progression.starUpgrades');
    expect(world).not.toContain('DATA.gemPerDragonPerHour');
    expect(migrations).not.toContain('DATA.progression');
    expect(migrations).not.toContain('DATA.buildings[out.type].maxLevel');
    expect(catalog).toContain('CONFIG.dragons.maxElementsPerDragon');
    expect(fighter).toContain('dragonConfig.maxElementsPerDragon');
    expect(catalog).not.toContain('parts.length>4');
    expect(fighter).not.toContain('parts.length>4');
  });

  it('keeps presentation layers on shared balance config',()=>{
    const guide=read('js/ui/guide.js');
    const core=read('js/ui/core.js');
    const dock=read('src/components/GameDock.jsx');
    const arenaView=read('src/features/arena/ArenaView.jsx');
    const arenaShared=read('src/features/arena/ArenaShared.jsx');
    const arenaBattle=read('src/features/arena/ArenaBattle.jsx');
    const challengeView=read('src/features/challenge/ChallengeView.jsx');
    for(const source of [guide,core,dock,arenaView,arenaShared,arenaBattle,challengeView])
      expect(source).not.toContain('DragonEconomy');
    expect(guide).not.toContain('DATA.progression');
    expect(guide).not.toContain('DATA.gemPerDragonPerHour');
    expect(core).not.toContain('DATA.progression');
    expect(core).not.toContain('DATA.gemPerDragonPerHour');
    expect(dock).toContain('DragonConfig.arena');
    expect(arenaShared).toContain('DragonConfig.arena');
    expect(arenaShared).toContain('DragonConfig.dragons');
    expect(arenaBattle).toContain('DragonConfig.system.presentation');
    expect(challengeView).toContain('DragonConfig.challenge');
  });

  it('does not reintroduce core combat/arena/challenge balance constants in services',()=>{
    const combat=read('js/data/combat-rules.js');
    const arena=read('server/arena.cjs');
    const challenge=read('server/challenge.cjs');
    expect(combat).not.toMatch(/const\s+DEFENSE_SCALE|critical\?1\.5|target\.defense\*\.8/);
    expect(arena).not.toMatch(/const\s+TEAM_SIZE|const\s+MIN_BATTLE_LEVEL|const\s+COOLDOWN/);
    expect(challenge).not.toMatch(/ONLINE_SAVE_MS|INVITE_MS|MATCH_RECONNECT_MS|MATCH_HEARTBEAT_MS/);
  });

  it('centralizes platform, persistence and validation parameters',()=>{
    const state=read('js/core/state.js');
    const main=read('js/main.js');
    const connection=read('js/network/connection.js');
    const saveClient=read('js/persistence/save-client.js');
    const validation=read('server/validation.cjs');
    const auth=read('server/auth.cjs');
    const rateLimit=read('server/rate-limit.cjs');
    const saveRoute=read('server/routes/save.cjs');
    const authRoute=read('server/routes/auth.cjs');
    const adminRoute=read('server/routes/admin.cjs');
    const arenaRoute=read('server/routes/arena.cjs');
    const challengeRoute=read('server/routes/challenge.cjs');
    const profile=read('server/profile.cjs');
    const arenaLogic=read('js/logic/arena.js');
    expect(state).toContain('DragonConfig.system.save.version');
    expect(main).toContain('DragonConfig.system.runtime');
    expect(connection).toContain('DragonConfig.system.connection');
    expect(saveClient).toContain('DragonConfig.system.save.keepaliveMaxBytes');
    expect(validation).toContain('systemConfig.save.version');
    expect(validation).toContain('challengeConfig.teamSize');
    expect(auth).toContain('systemConfig.auth');
    expect(rateLimit).toContain('system.js');
    expect(saveRoute).toContain('systemConfig.save.maxBytes');
    expect(authRoute).toContain('systemConfig.api.authBytes');
    expect(adminRoute).toContain('systemConfig.api.adminBytes');
    expect(arenaRoute).toContain('systemConfig.api.arenaActionBytes');
    expect(challengeRoute).toContain('systemConfig.api.challengeControlBytes');
    expect(challengeRoute).toContain('systemConfig.api.challengeTurnBytes');
    expect(profile).toContain('worldConfig.initialDragon');
    expect(arenaLogic).toContain('DragonConfig.system.presentation');
    expect(arenaLogic).not.toMatch(/Math\.max\(1900,events\.length\*1600\+400\)/);
    expect(connection).not.toMatch(/RECONNECT_MS|PROLONGED_MS/);
  });

  it('documents the intended config -> rules -> service -> UI flow',()=>{
    const docs=read('docs/LOGIC_ARCHITECTURE.md');
    expect(docs).toContain('js/config/');
    expect(docs).toContain('js/rules/');
    expect(docs).toContain('Clock và RNG');
    expect(docs).toContain('Chuẩn comment/JSDoc');
  });
});
