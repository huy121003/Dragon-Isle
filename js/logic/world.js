"use strict";

/**
 * Real-time world simulation.
 *
 * This module only advances clocks, production, care decay and upgrade completion.
 * Player rewards, placement and UI-side actions live in dedicated logic files.
 */
/** Complete every building upgrade due by the supplied epoch-millisecond timestamp. */
function finishUpgrades(time){
  let finished=0;
  state.buildings.forEach(function(b){
    if(b.upgradeEnds&&b.upgradeEnds<=time){
      b.level=Math.min(maxBuildingLevel(b),b.level+1);b.upgradeEnds=0;b.upgradeStartedAt=0;finished++;
      const xp=window.DragonConfig.progression.xpSources;
      gainPlayerXP(xp.buildingUpgradeBase+xp.buildingUpgradePerLevel*b.level);
      if(b.type==="hatchery")autoAssignWaitingEggs();
    }
  });
  return finished;
}
/**
 * Advance offline/real-time production to the supplied timestamp.
 * @param {number} now - Epoch milliseconds.
 */
function advanceWorld(now){
  const delta=window.DragonRules.world.elapsedMs(state.lastTick,now);
  if(delta<=0){state.lastTick=now;return {gold:0,finished:0,elapsed:0};}
  const startGold = state.buildings.reduce(function(sum,b){return sum+(b.storedGold||0);},0);
  let remaining=delta,clock=state.lastTick,finished=0;
  const houses = new Map(state.buildings.filter(function(b){return b.type==="habitat"&&!b.stored;})
    .map(function(b){return [b.id,b];}));
  while(remaining>0){
    const step=Math.min(remaining,window.DragonConfig.world.simulationStepMs);
    clock+=step;
    finished+=finishUpgrades(clock);
    const minutes=step/60000;
    state.dragons.forEach(function(d){
      const house=houses.get(d.habitatId);
      if(house){
        const goldLimit=habitatGoldCapacity(house),gemLimit=habitatGemCapacity(house);
        if(house.storedGold<goldLimit)house.storedGold=Math.min(goldLimit,
          house.storedGold+dragonIncomePerMinute(d,house)*step/60000);
        if((house.storedGems||0)<gemLimit){
          const progress=(d.gemProgress||0)+step/1000/window.DragonConfig.world.gemSecondsPerHour*
            window.DragonConfig.world.gemPerDragonPerHour;
          const earned=Math.floor(progress+1e-9);
          d.gemProgress=Math.max(0,progress-earned);
          house.storedGems=Math.min(gemLimit,(house.storedGems||0)+earned);
        }
      }
      const needs=window.DragonRules.world.advanceNeeds(d,minutes);
      d.hunger=needs.hunger;d.happiness=needs.happiness;
    });
    remaining-=step;
  }
  state.lastTick=now;
  const endGold=state.buildings.reduce(function(sum,b){return sum+(b.storedGold||0);},0);
  return {gold:endGold-startGold,finished:finished,elapsed:delta};
}
