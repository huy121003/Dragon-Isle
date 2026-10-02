/**
 * Compatibility facade for legacy code that still reads window.DragonEconomy.
 *
 * New code must import/read js/config/* directly. This file intentionally
 * exposes the old shape so the refactor can remain behavior-compatible while
 * callers are migrated gradually.
 */
(function(root,factory){
  const configs=typeof module!=="undefined"&&module.exports?{
    progression:require("../js/config/progression.js"),
    economy:require("../js/config/economy.js"),
    buildings:require("../js/config/buildings.js"),
    breeding:require("../js/config/breeding.js"),
    hatching:require("../js/config/hatching.js"),
    arena:require("../js/config/arena.js"),
    timers:require("../js/config/timers.js"),
    world:require("../js/config/world.js")
  }:root.DragonConfig;
  const value=factory(configs);
  if(typeof module!=="undefined"&&module.exports)module.exports=value;
  if(root)root.DragonEconomy=value;
})(typeof window!=="undefined"?window:globalThis,function(c){
  "use strict";
  const p=c.progression,b=c.buildings,e=c.economy,breed=c.breeding;
  return {
    starting:e.starting,
    progression:{
      contentLevelCap:p.contentLevelCap,
      xpBase:p.xp.base,xpLinear:p.xp.linear,xpPower:p.xp.power,xpExponent:p.xp.exponent,
      levelGoldBase:p.rewards.goldBase,levelGoldStep:p.rewards.goldStep,
      levelFoodBase:p.rewards.foodBase,levelFoodStep:p.rewards.foodStep,
      levelGems:p.rewards.gems,milestoneGemBonus:p.rewards.milestoneGemBonus,
      xpSources:p.xpSources,farmEveryLevels:p.farms.everyLevels,maxFarms:p.farms.maxFarms,
      hatcheryUpgradeLevels:p.hatcheryUpgradeLevels,
      feedBase:p.feedingCost.base,feedLinear:p.feedingCost.linear,feedQuadratic:p.feedingCost.quadratic,
      goldLevelLinear:p.incomeGrowth.linear,goldLevelQuadratic:p.incomeGrowth.quadratic,
      goldIncomeMultiplier:p.incomeGrowth.multiplier,foodGoldPrice:p.foodGoldPrice
    },
    breeding:{
      threeBase:breed.three.base,threePerTenLevels:breed.three.perTenLevels,threeCap:breed.three.cap,
      fourBase:breed.four.base,fourPerTenLevels:breed.four.perTenLevels,fourCap:breed.four.cap,
      fourGrowthStartLevel:breed.four.growthStartLevel,
      doubleBase:breed.double.base,doublePerTenLevels:breed.double.perTenLevels,
      doubleCap:breed.double.cap,doubleMinParentLevel:breed.double.minParentLevel,
      premiumRareFactor:breed.premium.rareFactor,premiumTimeFactor:breed.premium.timeFactor,
      timeByTier:breed.timeByTier,elementLevelPercent:breed.elementLevelPercent,
      maxElementBonusPercent:breed.maxElementBonusPercent,
      parentUnionPercent:breed.parentUnionPercent,mixedParentPercent:breed.mixedParentPercent
    },
    island:e.island,land:e.land,
    habitat:b.habitat,hatchery:b.hatchery,shop:e.shop,
    buildings:{
      upgradeFactor:b.upgrade.goldFactor,sellMultiplier:b.upgrade.sellMultiplier,
      upgradeGemBase:b.upgrade.gemBase,upgradeGemLevelFactor:b.upgrade.gemLevelFactor,
      habitatGemUnlockLinear:b.upgrade.habitatGemUnlockLinear
    },
    timers:c.timers,hatching:c.hatching,
    rewards:{
      arenaGoldBase:c.arena.rewards.goldBase,
      arenaGoldPerOpponentLevel:c.arena.rewards.goldPerOpponentLevel,
      arenaFoodBase:c.arena.rewards.foodBase,
      arenaFoodPerOpponentLevel:c.arena.rewards.foodPerOpponentLevel,
      arenaGemBase:c.arena.rewards.gemBase,
      arenaGemPer20Levels:c.arena.rewards.gemPer20Levels
    },
    academy:b.academy,visual:c.world.visual
  };
});
