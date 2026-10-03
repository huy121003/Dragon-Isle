/**
 * Pure breeding probability and duration helpers.
 *
 * Candidate discovery and probability distribution both live here so the
 * client orchestration layer only passes catalog/parent inputs and mutates state.
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

  /**
   * Build normalized offspring candidates without mutating game state.
   *
   * @param {object} input
   * @param {object} input.fatherSpecies - Catalog species of the first parent.
   * @param {object} input.motherSpecies - Catalog species of the second parent.
   * @param {number} input.fatherLevel - Current first-parent level.
   * @param {number} input.motherLevel - Current second-parent level.
   * @param {object} input.speciesById - Species id -> catalog species lookup.
   * @param {string[]} input.elementOrder - Stable element ordering used by 3-element IDs.
   * @param {string[]} input.fourIds - Valid 4-element catalog IDs.
   * @param {string[]} input.doubleIds - Valid Double-tier catalog IDs.
   * @param {object} input.quads - Sorted 4-element set -> canonical species ID.
   * @param {boolean} input.premium - Whether a Premium Breeding Cave is used.
   * @returns {{id:string,chance:number}[]} Normalized candidates with decimal probabilities.
   */
  function offspringOptions({fatherSpecies,motherSpecies,fatherLevel,motherLevel,speciesById,
    elementOrder,fourIds,doubleIds,quads,premium}){
    if(!fatherSpecies||!motherSpecies)return [];
    const pool=[...new Set(fatherSpecies.elements.concat(motherSpecies.elements))];
    const canInherit=parts=>parts.some(e=>fatherSpecies.elements.includes(e))&&
      parts.some(e=>motherSpecies.elements.includes(e));
    const groups=[pool.slice(),[],[],[],[]];

    for(const first of pool)for(const second of pool){
      if(first===second)continue;
      const parts=[first,second];
      if(canInherit(parts))groups[1].push(parts.join(">"));
    }

    if(pool.length>=3)for(const first of pool){
      const rest=elementOrder.filter(e=>e!==first&&pool.includes(e));
      for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++){
        const parts=[first,rest[i],rest[j]],id=parts.join(">");
        if(canInherit(parts)&&speciesById[id])groups[2].push(id);
      }
    }

    groups[3]=pool.length<4?[]:fourIds.filter(id=>{
      const parts=speciesById[id].elements;
      return parts.every(e=>pool.includes(e))&&canInherit(parts)&&
        quads[parts.slice().sort().join("|")]===id;
    });

    const readyForDouble=fatherSpecies.elements.length===4&&motherSpecies.elements.length===4&&
      fatherSpecies.elements[0]===motherSpecies.elements[0]&&
      fatherLevel>=config.double.minParentLevel&&motherLevel>=config.double.minParentLevel&&
      new Set(fatherSpecies.elements).size>=3&&new Set(motherSpecies.elements).size>=3;
    groups[4]=!readyForDouble?[]:doubleIds.filter(id=>
      speciesById[id].elements[0]===fatherSpecies.elements[0]);

    const tierKey=[fatherSpecies.elements.length,motherSpecies.elements.length]
      .sort((a,b)=>a-b).join("+");
    const averageLevel=(fatherLevel+motherLevel)/2;
    const rare=rareTierChances({
      averageLevel,hasThree:!!groups[2].length,hasFour:!!groups[3].length,
      hasDouble:!!groups[4].length,
      bothTriple:fatherSpecies.elements.length===3&&motherSpecies.elements.length===3,
      poolSize:pool.length,premium
    });
    const common=commonTierChances(tierKey,rare.three+rare.four+rare.double,!!groups[1].length);
    const weights=[common.one,common.two,rare.three,rare.four,rare.double];

    return groups.flatMap((ids,index)=>{
      if(!ids.length||!weights[index])return [];
      const bias=ids.map(id=>candidateBias(
        speciesById[id].elements,fatherSpecies.elements,motherSpecies.elements));
      const total=bias.reduce((sum,value)=>sum+value,0);
      return ids.map((id,i)=>({id,chance:weights[index]*bias[i]/total}));
    });
  }

  /** Breeding duration in seconds for the resulting species and parent mix. */
  function seconds(species,tier,_elementUnlocks,parentSpecies=[],premium){
    const elementTime=species.elements.reduce((sum,id)=>sum+(config.elementSeconds[id]||config.fallbackSeconds),0);
    const multiplier=tier===1?1:(config.tierMultipliers[tier]||config.tierMultipliers[4]);
    let duration=elementTime*multiplier;
    if(parentSpecies.length===2){
      const union=new Set(parentSpecies.flatMap(parent=>parent.elements));
      const parentScale=1+Math.max(0,union.size-2)*config.parentUnionPercent+
        (parentSpecies[0].elements.length!==parentSpecies[1].elements.length?config.mixedParentPercent:0);
      duration*=parentScale;
    }
    duration=Math.round(duration*(premium?config.premium.timeFactor:1));
    return tier===1?duration:Math.min(duration,config.maxTierSeconds[tier]||config.maxTierSeconds[4]);
  }

  return {rareTierChances,commonTierChances,candidateBias,offspringOptions,seconds};
});
