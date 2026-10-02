/**
 * Shared combat balance parameters used by browser previews and server battles.
 *
 * IMPORTANT: Changing values here changes every combat mode. Keep formulas in
 * js/data/combat-rules.js deterministic and free of hidden constants.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.combat=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    elementWeights:Object.freeze({
      1:Object.freeze([1]),2:Object.freeze([.6,.4]),3:Object.freeze([.5,.3,.2]),4:Object.freeze([.4,.3,.2,.1])
    }),
    transcendentWeights:Object.freeze([.25,.25,.3,.2]),
    defenseScale:.6,
    /** Combat-power weights; derived stats already include element, rarity, level and stars. */
    powerWeights:Object.freeze({hp:.1,attack:2,defense:1.5}),
    statGrowth:Object.freeze({linear:.07,quadratic:.0003,hpLinear:.08,hpQuadratic:.00035,hpBaseMultiplier:5}),
    star:Object.freeze({max:5,statBonusPerStar:.05}),
    armorCoefficient:.8,
    variance:Object.freeze({min:.9,max:1.1}),
    critical:Object.freeze({chance:.10,multiplier:1.5}),
    maxAccuracyPenalty:.75
  });
});
