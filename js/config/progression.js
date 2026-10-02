/**
 * Progression configuration.
 *
 * SOURCE OF TRUTH:
 * Keep player XP, level rewards, feeding cost and content-gate parameters here.
 * Formula code belongs in js/rules/progression.js; do not duplicate these numbers
 * inside UI, services or server code.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.progression=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    /** Content unlock requirements stop increasing after this player level. Player level itself is unlimited. */
    contentLevelCap:60,
    /** Player XP curve: base + linear*level + power*level^exponent. */
    xp:Object.freeze({base:60,linear:25,power:8,exponent:1.5}),
    /** Rewards granted for each new player level. */
    rewards:Object.freeze({goldBase:1000,goldStep:250,foodBase:200,foodStep:50,
      gems:1,milestoneEvery:5,milestoneGemBonus:3}),
    /** XP granted by gameplay actions. */
    xpSources:Object.freeze({
      buildingBuild:Object.freeze({habitat:35,farm:30,cave:75,premiumCave:100,academy:100,arena:100,decor:5}),
      buildingUpgradeBase:30,buildingUpgradePerLevel:15,land:60,island:250,
      crop:Object.freeze([8,20,55,150]),hatchKnown:25,hatchNew:50,breed:45,
      dragonLevelBase:8,dragonLevelPerTen:3
    }),
    /** Farm availability grows by one every N levels until maxFarms. */
    farms:Object.freeze({everyLevels:5,maxFarms:12}),
    /** Required player levels for Hatchery upgrades from level 1->2 onward. */
    hatcheryUpgradeLevels:Object.freeze([5,12,22,35]),
    /** Food cost curve per single feeding action. */
    feedingCost:Object.freeze({base:10,linear:3,quadratic:.18}),
    /** Gold production growth by dragon level. */
    incomeGrowth:Object.freeze({linear:.08,quadratic:.0004,multiplier:2.5}),
    /** Reference exchange rate used when the game converts Food price to Gold. */
    foodGoldPrice:15
  });
});
