/**
 * Pure breeding probability and duration helpers.
 *
 * Candidate discovery remains catalog-driven in js/logic/breeding.js; all
 * editable probability math is centralized here.
 */
(function(root,factory){
  const config=typeof module!=="undefined"&&module.exports?
    require("../config/breeding.js"):root.DragonConfig.breeding;
  const api=factory(config);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root){root.DragonRules=root.DragonRules||{};root.DragonRules.breeding=api;}
})(typeof window!=="undefined"?window:globalThis,function(config){
  "use strict";

  /** Return rare-tier probabilities before distributing candidates inside each tier. */
  function rareTierChances({averageLevel,hasThree,hasFour,hasDouble,bothTriple,poolSize,premium}){
    const three=hasThree?Math.min(config.three.cap,
      config.three.base+Math.floor(averageLevel/10)*config.three.perTenLevels):0;
    const four=hasFour&&bothTriple&&poolSize>=4?Math.min(config.four.cap,
      config.four.base+Math.floor(Math.max(0,averageLevel-config.four.growthStartLevel)/10)*
      config.four.perTenLevels):0;
    const double=hasDouble?Math.min(config.double.cap,
      config.double.base+Math.floor((averageLevel-config.double.minParentLevel)/10)*
      config.double.perTenLevels):0;
    const factor=premium?config.premium.rareFactor:1;
    return {three:three*factor,four:four*factor,double:double*factor};
  }

  /** Split the remaining common probability between 1- and 2-element tiers. */
  function commonTierChances(tierKey,rareTotal,hasTwo){
    const pair=config.tierWeights[tierKey]||[1,0],remaining=Math.max(0,1-rareTotal);
    const two=hasTwo?remaining*pair[1]/(pair[0]+pair[1]):0;
    return {one:remaining-two,two};
  }

  /** Bias a candidate toward elements shared by both parents. */
  function candidateBias(parts,fatherElements,motherElements){
    const b=config.inheritanceBias;
    return 1+b.sharedElement*parts.filter(e=>fatherElements.includes(e)&&motherElements.includes(e)).length+
      b.parentPrimary*(fatherElements.includes(parts[0])?1:0)+
      b.parentPrimary*(motherElements.includes(parts[0])?1:0);
  }

  /** Breeding duration in seconds for the resulting species and parent mix. */
  function seconds(species,tier,elementUnlocks,parentSpecies,premium){
    const pressure=species.elements.reduce((sum,id)=>sum+(elementUnlocks[id]||1),0)/species.elements.length;
    let base=(config.timeByTier[tier]||config.timeByTier[4])+
      Math.min(config.maxElementBonusSeconds,pressure*config.elementLevelSeconds);
    if(parentSpecies.length===2){
      const union=new Set(parentSpecies.flatMap(parent=>parent.elements));
      base+=Math.max(0,union.size-2)*config.combinationSecondsPerExtraElement;
      if(parentSpecies[0].elements.length!==parentSpecies[1].elements.length)base+=config.mixedTierSeconds;
    }
    return Math.round(base*(premium?config.premium.timeFactor:1));
  }

  return {rareTierChances,commonTierChances,candidateBias,seconds};
});
