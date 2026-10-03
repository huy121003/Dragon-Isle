import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {analyzePlayer,createVirtualRivals,unlockedPlayerElements}=
  require('../../server/arena/virtual-rivals.cjs');

const arenaConfig={teamSize:3,minBattleLevel:5,maxBattleLevel:100,
  rivalPowerRatios:[.65,.82,1,1.12,1.25],rivalCandidateTeams:80};
const progressionConfig={contentLevelCap:60,elementUnlocks:{fire:1,water:2,earth:4,wind:6}};
const catalog={species:[
  {id:'fire-owned',elements:['fire'],doHiem:'common'},
  {id:'water-owned',elements:['water'],doHiem:'common'},
  {id:'earth-owned',elements:['earth'],doHiem:'common'},
  {id:'fire-catalog-a',elements:['fire'],doHiem:'common'},
  {id:'water-catalog-a',elements:['water'],doHiem:'common'},
  {id:'earth-catalog-a',elements:['earth'],doHiem:'common'},
  {id:'wind-catalog-a',elements:['wind'],doHiem:'common'},
  {id:'event-catalog-a',elements:['event'],doHiem:'common'},
  {id:'event-catalog-b',elements:['event'],doHiem:'common'},
  {id:'event-catalog-c',elements:['event'],doHiem:'common'},
  {id:'event-owned',elements:['event'],doHiem:'common'},
  {id:'fire-water-rare',elements:['fire','water'],doHiem:'rare'}
]};
const catalogIds=new Set(catalog.species.map(item=>item.id));
function makeFighter(dragon){
  const species=catalog.species.find(item=>item.id===dragon.species);
  if(!species)return null;
  return {power:dragon.level*100+(dragon.stars||0)*250+(species.elements.length-1)*120,
    rarity:species.doHiem};
}
const profile={dragons:[
  {id:1,species:'fire-owned',level:28,stars:2},
  {id:2,species:'water-owned',level:24,stars:1},
  {id:3,species:'earth-owned',level:20,stars:0}
]};

describe('catalog-backed virtual Arena rivals',()=>{
  it('creates fresh fighters from catalog species, not owned dragon records',()=>{
    const rivals=createVirtualRivals({profile,playerLevel:6,roundKey:3,makeFighter,catalog,
      arenaConfig,progressionConfig});
    expect(rivals).toHaveLength(5);
    for(const rival of rivals){
      expect(rival.team).toHaveLength(3);
      expect(new Set(rival.team.map(dragon=>dragon.species)).size).toBe(3);
      expect(rival.team.every(dragon=>catalogIds.has(dragon.species))).toBe(true);
      expect(rival.team.every(dragon=>dragon.id<0)).toBe(true);
    }
    expect(rivals.flatMap(rival=>rival.team).some(dragon=>
      !profile.dragons.some(owned=>owned.species===dragon.species))).toBe(true);
  });

  it('uses level gates without requiring ownership for normally unlocked elements',()=>{
    const earlyProfile={dragons:[
      {id:1,species:'fire-owned',level:28,stars:2},
      {id:2,species:'water-owned',level:24,stars:1},
      {id:3,species:'fire-owned',level:20,stars:0}
    ]};
    const rivals=createVirtualRivals({profile:earlyProfile,playerLevel:2,roundKey:5,makeFighter,catalog,
      arenaConfig,progressionConfig});
    expect(rivals).toHaveLength(5);
    expect(rivals.flatMap(rival=>rival.team).every(dragon=>
      catalog.species.find(species=>species.id===dragon.species).elements.every(element=>
        ['fire','water'].includes(element)))).toBe(true);
  });

  it('allows a new event element when the player owns a dragon with that element',()=>{
    const eventProfile={dragons:[...Array.from({length:20},(_,index)=>({id:index+1,
      species:index%2?'fire-owned':'water-owned',level:50-index,stars:0})),
      {id:21,species:'event-owned',level:5,stars:0}]};
    const allowed=unlockedPlayerElements(eventProfile,1,progressionConfig,catalog);
    expect(allowed.has('event')).toBe(true);
    expect(analyzePlayer(eventProfile,makeFighter,arenaConfig).owned.some(item=>
      item.dragon.species==='event-owned')).toBe(false);
    const rivals=createVirtualRivals({profile:eventProfile,playerLevel:1,roundKey:6,makeFighter,
      catalog,arenaConfig,progressionConfig});
    expect(rivals.flatMap(rival=>rival.team).some(dragon=>
      catalog.species.find(species=>species.id===dragon.species).elements.includes('event'))).toBe(true);
  });

  it('only uses rarity tiers represented in the top 20 baseline',()=>{
    const rivals=createVirtualRivals({profile,playerLevel:6,roundKey:7,makeFighter,catalog,
      arenaConfig,progressionConfig});
    expect(rivals.flatMap(rival=>rival.team).every(dragon=>
      catalog.species.find(species=>species.id===dragon.species).doHiem==='common')).toBe(true);
  });

  it('returns no rivals when the account cannot establish a three-dragon baseline',()=>{
    expect(createVirtualRivals({profile:{dragons:profile.dragons.slice(0,2)},playerLevel:6,
      roundKey:9,makeFighter,catalog,arenaConfig,progressionConfig})).toEqual([]);
  });

  it('still creates full squads for an early account with fewer than three legal species',()=>{
    const earlyCatalog={species:catalog.species.filter(species=>
      ['fire-owned','water-owned'].includes(species.id))};
    const earlyProfile={dragons:[1,2,3].map(id=>({id,species:'water-owned',level:8,stars:0}))};
    const rivals=createVirtualRivals({profile:earlyProfile,playerLevel:1,roundKey:10,makeFighter,
      catalog:earlyCatalog,arenaConfig,progressionConfig});
    expect(rivals).toHaveLength(5);
    for(const rival of rivals){
      expect(rival.team).toHaveLength(3);
      expect(new Set(rival.team.map(dragon=>dragon.id)).size).toBe(3);
    }
  });

  it('recreates the same round deterministically',()=>{
    const create=()=>createVirtualRivals({profile,playerLevel:6,roundKey:11,makeFighter,catalog,
      arenaConfig,progressionConfig});
    expect(create()).toEqual(create());
  });
});
