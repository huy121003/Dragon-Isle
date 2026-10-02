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

  it('preserves incubation and breeding timing',()=>{
    expect(hatching.seconds({rarity:'common',elements:['fire']},{fire:1})).toBe(30);
    const hybrid={rarity:'rare',elements:['fire','water']};
    expect(hatching.seconds(hybrid,{fire:1,water:2})).toBe(258);
    expect(breeding.seconds(hybrid,2,{fire:1,water:2},[],false)).toBe(192);
  });

  it('keeps world care and timer rules deterministic',()=>{
    expect(world.elapsedMs(0,13*60*60*1000)).toBe(12*60*60*1000);
    expect(world.feedNeeds({hunger:10,happiness:80})).toEqual({hunger:2,happiness:85});
    expect(timers.skipCost(600000,0)).toBe(1);
    expect(timers.progress(0,1000,500)).toBe(50);
  });
});
