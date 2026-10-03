import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

const progression=require('../../js/rules/progression.js');
const buildings=require('../../js/rules/buildings.js');
const hatching=require('../../js/rules/hatching.js');
const breeding=require('../../js/rules/breeding.js');
const world=require('../../js/rules/world.js');
const timers=require('../../js/rules/timers.js');

describe('shared gameplay rules',()=>{
  it('preserves player progression and feeding formulas',()=>{
    expect(progression.playerXPNeeded(1)).toBe(93);
    expect(progression.playerXPNeeded(60)).toBe(5278);
    expect(progression.contentRequirementLevel(125)).toBe(60);
    expect(progression.dragonFeedCost(1,100)).toBe(14);
    expect(progression.farmLimit(60)).toBe(12);
    expect(progression.levelReward(5)).toEqual({gold:2250,food:450,gems:4});
  });

  it('preserves building capacities and price curves',()=>{
    expect(buildings.capacityAt(1,[2,3,4,5])).toBe(2);
    expect(buildings.capacityAt(9,[2,3,4,5])).toBe(5);
    expect(buildings.habitatPurchaseCost(1200,1,0)).toBe(1200);
    expect(buildings.habitatPurchaseCost(1200,2,0)).toBe(1310);
    expect(buildings.habitatGoldCapacity(1,1)).toBe(5000);
    expect(buildings.islandUnlockCost(3)).toBe(300);
    expect(buildings.landRegionCost(0,1)).toBe(1200);
    expect(buildings.goldToGemCost(10000)).toBe(2);
  });

  it('builds normalized breeding candidates in the pure rule layer',()=>{
    const speciesById={
      fire:{id:'fire',elements:['fire']},
      water:{id:'water',elements:['water']},
      'fire>water':{id:'fire>water',elements:['fire','water']},
      'water>fire':{id:'water>fire',elements:['water','fire']}
    };
    const options=breeding.offspringOptions({
      fatherSpecies:speciesById.fire,motherSpecies:speciesById.water,
      fatherLevel:10,motherLevel:10,speciesById,
      elementOrder:['fire','water'],fourIds:[],doubleIds:[],quads:{},premium:false
    });
    expect(options.map(option=>option.id).sort()).toEqual(
      ['fire','fire>water','water','water>fire'].sort());
    expect(options.reduce((sum,option)=>sum+option.chance,0)).toBeCloseTo(1,10);
    expect(options.find(option=>option.id==='fire>water').chance).toBeCloseTo(.375,10);
  });

  it('preserves incubation and breeding timing',()=>{
    expect(hatching.seconds({rarity:'common',elements:['fire']},{fire:1})).toBe(30);
    const hybrid={rarity:'rare',elements:['fire','water']};
    expect(hatching.seconds(hybrid,{fire:1,water:2})).toBe(180);
    expect(breeding.seconds(hybrid,2,{fire:1,water:2},[],false)).toBe(240);
    expect(breeding.seconds({rarity:'common',elements:['fire']},1,{fire:1},[],false)).toBe(60);
    expect(hatching.seconds({rarity:'rare',elements:['fire','time']},{})).toBe(21600,
      'A late-element hybrid uses its component times and the tier cap');
  });

  it('keeps world care and timer rules deterministic',()=>{
    expect(world.elapsedMs(0,13*60*60*1000)).toBe(12*60*60*1000);
    expect(world.feedNeeds({hunger:10,happiness:80})).toEqual({hunger:2,happiness:85});
    expect(timers.skipCost(600000,0)).toBe(1);
    expect(timers.progress(0,1000,500)).toBe(50);
  });
});
