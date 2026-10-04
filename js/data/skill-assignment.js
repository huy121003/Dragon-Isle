/* Deterministic skill variation: each species gets a stable, balanced-looking
 * choice between the two ordinary skills for every element it contains. */
(function(root){
  'use strict';

  /** Select one of an element's two ordinary skills from the species ID. */
  function elementalSkillId(speciesId,element){
    const seed=String(speciesId)+'|'+String(element);
    let hash=2166136261;
    for(let index=0;index<seed.length;index++){
      hash^=seed.charCodeAt(index);
      hash=Math.imul(hash,16777619);
    }
    hash^=hash>>>16;
    return element+'-'+((hash>>>0&1)+1);
  }

  /** Build exactly four battle slots for a species, preserving its unique special skill. */
  function skillIdsFor(elements,speciesId=elements.join('>'),specialSkillId=null){
    const unique=[...new Set(elements)];
    if(unique.length===1&&!specialSkillId)
      return ['claw','slam',unique[0]+'-1',unique[0]+'-2'];
    const neutralCount=Math.max(0,4-unique.length-(specialSkillId?1:0));
    const ids=neutralCount>=2?['claw','slam']:neutralCount===1?['claw']:[];
    ids.push(...unique.map(element=>elementalSkillId(speciesId,element)));
    if(specialSkillId)ids.push(specialSkillId);
    if(ids.length!==4||new Set(ids).size!==4)
      throw new Error('A dragon must resolve to four unique skill slots: '+speciesId);
    return ids;
  }

  const api={elementalSkillId,skillIdsFor};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.DragonSkillAssignment=api;
})(typeof window!=='undefined'?window:globalThis);
