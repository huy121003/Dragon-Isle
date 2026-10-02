/**
 * Building and Academy balance parameters.
 *
 * Names/icons/footprints remain content metadata in data/game.json. Prices,
 * max levels, resale rates and upgrade timers live here as balance source-of-truth.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.buildings=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    /** Per-building balance. cost currency follows existing shop semantics. */
    definitions:Object.freeze({
      habitat:Object.freeze({maxLevel:4,cost:1200,sellRate:.5}),
      farm:Object.freeze({maxLevel:4,cost:1000,sellRate:.5}),
      hatchery:Object.freeze({maxLevel:5,cost:3000,sellRate:.5}),
      cave:Object.freeze({maxLevel:1,cost:5000,sellRate:.5}),
      premiumCave:Object.freeze({maxLevel:1,cost:250,sellRate:0}),
      arena:Object.freeze({maxLevel:1,cost:10000,sellRate:.5}),
      decor:Object.freeze({maxLevel:1,cost:500,sellRate:.5}),
      academy:Object.freeze({maxLevel:7,cost:12000,sellRate:0})
    }),
    /** Upgrade duration in seconds indexed by current level (1->2 is index 0). */
    upgradeTimes:Object.freeze({
      habitat:Object.freeze([45,180,600]),
      farm:Object.freeze([30,120,480]),
      hatchery:Object.freeze([90,300,900,2400]),
      academy:Object.freeze([300,900,1800,3600,7200,14400])
    }),
    habitat:Object.freeze({
      goldBase:5000,goldPerUnlockLevel:450,goldLevelFactor:4.2,
      dragonCapacity:Object.freeze([2,3,4,5]),gemCapacityBase:3,
      upgradeTimeUnlockLinear:.018,upgradeTimeUnlockQuadratic:.00035
    }),
    hatchery:Object.freeze({nests:Object.freeze([1,2,3,4,5])}),
    upgrade:Object.freeze({
      goldFactor:2.25,sellMultiplier:1.75,
      gemBase:Object.freeze({habitat:2,farm:1,hatchery:3}),
      gemLevelFactor:1.8,habitatGemUnlockLinear:.035
    }),
    farm:Object.freeze({yieldBonusPerExtraLevel:.20}),
    academy:Object.freeze({baseGold:8000,baseFood:800,baseGems:5,costFactor:2.2})
  });
});
