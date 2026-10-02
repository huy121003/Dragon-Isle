/**
 * Pure incubation rules.
 */
(function(root,factory){
  const config=typeof module!=="undefined"&&module.exports?
    require("../config/hatching.js"):root.DragonConfig.hatching;
  const api=factory(config);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root){root.DragonRules=root.DragonRules||{};root.DragonRules.hatching=api;}
})(typeof window!=="undefined"?window:globalThis,function(config){
  "use strict";

  /** Convert a species to its incubation tier. */
  function tierOf(species){
    if(!species)return 1;
    if(species.rarity==="transcendent")return "double";
    return Math.max(1,Math.min(4,species.elements.length));
  }

  /**
   * Calculate incubation duration in seconds.
   * @param {object} species - Catalog species.
   * @param {object} elementUnlocks - Map element id -> player unlock level.
   */
  function seconds(species,elementUnlocks){
    if(!species)return config.fallbackSeconds;
    const tier=tierOf(species);
    if(tier===1)return config.pureElementSeconds[species.elements[0]]||60;
    const pressure=species.elements.reduce((sum,id)=>sum+(elementUnlocks[id]||1),0)/species.elements.length;
    return Math.round((config.tierSeconds[tier]||config.tierSeconds[4])+
      Math.min(config.maxElementBonusSeconds,pressure*config.elementLevelSeconds));
  }

  return {tierOf,seconds};
});
