import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>readFileSync(path.join(root,file),'utf8');

describe('logic architecture boundaries',()=>{
  it('keeps editable balance parameters under js/config',()=>{
    const names=readdirSync(path.join(root,'js/config'));
    for(const required of ['progression.js','economy.js','buildings.js','dragons.js','breeding.js',
      'hatching.js','combat.js','arena.js','challenge.js','world.js','timers.js','farming.js'])
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
    const migrations=read('js/persistence/migrations.js');
    expect(state).not.toContain('DATA.buildings.habitat.cost');
    expect(calculations).not.toContain('DATA.progression');
    expect(calculations).not.toContain('DATA.upgradeTimes');
    expect(calculations).not.toContain('DATA.gemPerDragonPerHour');
    expect(calculations).not.toContain('DATA.buildings.habitat.cost');
    expect(calculations).not.toContain('DATA.buildings[type].cost');
    expect(selectors).not.toContain('DATA.buildings[building.type].maxLevel');
    expect(selling).not.toContain('DATA.buildings[b.type].sellRate');
    expect(migrations).not.toContain('DATA.progression');
    expect(migrations).not.toContain('DATA.buildings[out.type].maxLevel');
  });

  it('does not reintroduce core combat/arena/challenge balance constants in services',()=>{
    const combat=read('js/data/combat-rules.js');
    const arena=read('server/arena.cjs');
    const challenge=read('server/challenge.cjs');
    expect(combat).not.toMatch(/const\s+DEFENSE_SCALE|critical\?1\.5|target\.defense\*\.8/);
    expect(arena).not.toMatch(/const\s+TEAM_SIZE|const\s+MIN_BATTLE_LEVEL|const\s+COOLDOWN/);
    expect(challenge).not.toMatch(/ONLINE_SAVE_MS|INVITE_MS|MATCH_RECONNECT_MS|MATCH_HEARTBEAT_MS/);
  });

  it('documents the intended config -> rules -> service -> UI flow',()=>{
    const docs=read('docs/LOGIC_ARCHITECTURE.md');
    expect(docs).toContain('js/config/');
    expect(docs).toContain('js/rules/');
    expect(docs).toContain('Clock và RNG');
    expect(docs).toContain('Chuẩn comment/JSDoc');
  });
});
