/**
 * Building and Academy balance parameters.
 *
 * Building definitions (names, footprints, base prices and max levels) still
 * live in data/game.json. This file stores reusable formulas/scaling values.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.buildings=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
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
