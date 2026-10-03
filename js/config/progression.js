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
    /** Hard battle/progression cap for an individual dragon. */
    dragonMaxLevel:100,
    /** Dragon level required before it can enter breeding. */
    breedLevel:5,
    /** Dragon levels that unlock skill slots 1..4. */
    skillUnlockLevels:Object.freeze([1,5,10,15]),
    /** Element/player-level unlock gates used by islands, shop, breeding and hatching pressure. */
    elementUnlocks:Object.freeze({
      fire:1,water:2,earth:4,wind:6,ice:8,thunder:11,nature:14,dark:18,
      light:22,metal:27,war:32,pure:37,legend:42,primal:48,time:55
    }),
    /** Dragon level cap granted by each Dragon Academy level. */
    academyCaps:Object.freeze([40,50,60,70,80,90,100]),
    /** Requirements to upgrade Academy from level 1->2 through 6->7. */
    academyUpgrades:Object.freeze([
      Object.freeze({playerLevel:10,requiredDragons:2,requiredDragonLevel:40}),
      Object.freeze({playerLevel:18,requiredDragons:3,requiredDragonLevel:50}),
      Object.freeze({playerLevel:28,requiredDragons:4,requiredDragonLevel:60}),
      Object.freeze({playerLevel:38,requiredDragons:5,requiredDragonLevel:70}),
      Object.freeze({playerLevel:48,requiredDragons:6,requiredDragonLevel:80}),
      Object.freeze({playerLevel:58,requiredDragons:8,requiredDragonLevel:90})
    ]),
    /** Permanent star-upgrade requirements for stars 1..5. */
    starUpgrades:Object.freeze([
      Object.freeze({dragons:2,level:30,gold:75000,food:7500,gems:8}),
      Object.freeze({dragons:4,level:40,gold:200000,food:20000,gems:20}),
      Object.freeze({dragons:6,level:50,gold:500000,food:50000,gems:45}),
      Object.freeze({dragons:8,level:60,gold:1200000,food:120000,gems:90}),
      Object.freeze({dragons:10,level:70,gold:2500000,food:250000,gems:180})
    ]),
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
