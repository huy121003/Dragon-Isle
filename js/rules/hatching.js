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
    if(species.rarity==="apex")return "apex";
    if(species.rarity==="transcendent")return "double";
    return Math.max(1,Math.min(4,species.elements.length));
  }

  /**
   * Calculate incubation duration in seconds.
   * @param {object} species - Catalog species.
   * @param {object} _elementUnlocks - Retained for compatibility with existing callers.
   */
  function seconds(species,_elementUnlocks){
    if(!species)return config.fallbackSeconds;
    const tier=tierOf(species);
    if(tier===1)return config.pureElementSeconds[species.elements[0]]||60;
    const elementTime=species.elements.reduce((sum,id)=>sum+(config.pureElementSeconds[id]||60),0);
    const multiplier=config.tierMultipliers[tier]||config.tierMultipliers[4];
    const maximum=config.maxTierSeconds[tier]||config.maxTierSeconds[4];
    const seconds=Math.min(maximum,Math.round(elementTime*multiplier));
    return tier==='apex'?Math.max(config.apexMinimumSeconds,seconds):seconds;
  }

  return {tierOf,seconds};
});
