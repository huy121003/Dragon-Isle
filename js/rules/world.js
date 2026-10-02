/**
 * Pure real-time world simulation helpers.
 */
(function(root,factory){
  const config=typeof module!=="undefined"&&module.exports?
    require("../config/world.js"):root.DragonConfig.world;
  const api=factory(config);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root){root.DragonRules=root.DragonRules||{};root.DragonRules.world=api;}
})(typeof window!=="undefined"?window:globalThis,function(config){
  "use strict";

  /** Clamp an offline gap to the maximum amount of progress the game processes. */
  function elapsedMs(lastTick,now){
    return Math.max(0,Math.min(now-lastTick,config.offlineCapMs));
  }

  /** Update hunger/happiness for a number of elapsed minutes. */
  function advanceNeeds(dragon,minutes){
    const h=config.hunger;
    const hunger=Math.min(h.max,Math.max(0,dragon.hunger+minutes));
    let happiness=dragon.happiness;
    if(hunger>=h.unhappyAt){
      const loss=hunger>=h.severeAt?h.severeHappinessLossPerMinute:h.normalHappinessLossPerMinute;
      happiness=Math.min(100,Math.max(0,happiness-minutes*loss));
    }
    return {hunger,happiness};
  }

  /** Resulting care values after one feeding action. */
  function feedNeeds(dragon){
    return {hunger:Math.max(0,dragon.hunger-config.feeding.hungerReduction),
      happiness:Math.min(100,dragon.happiness+config.feeding.happinessGain)};
  }

  /** Gold/hour multiplier from happiness, Habitat level and starvation. */
  function incomeMultiplier(dragon,habitatLevel){
    const g=config.goldIncome;
    return (g.happinessBase+dragon.happiness/100)*(1+g.habitatLevelBonus*habitatLevel)*
      (dragon.hunger>=g.starvationAt?g.starvationMultiplier:1);
  }

  return {elapsedMs,advanceNeeds,feedNeeds,incomeMultiplier};
});
