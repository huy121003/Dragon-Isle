/**
 * Battle fighter construction.
 *
 * Converts persisted owned-dragon records into mutable combat fighters. Catalog
 * resolution belongs here so Arena and Challenge always build fighters identically.
 */
const combat=require('../../js/data/combat-rules.js');
const dragonConfig=require('../../js/config/dragons.js');

/**
 * Create fighter/species helpers for one immutable catalog snapshot.
 * @param {object} options.catalog - Extended dragon catalog and element/rarity stats.
 * @param {object} options.game - Skill metadata catalog.
 */
function createFighterFactory({catalog,game}){
  const elements=catalog.elements,rarities=catalog.rarities;
  const skillRegistry=new Map([
    ...(game.skills.neutral||[]).map(skill=>[skill.id,{...skill}]),
    ...Object.entries(game.skills.elemental||{}).flatMap(([element,list])=>
      list.map(skill=>[skill.id,{...skill,element}]))
  ]);

  /** Resolve element slots/rarity for a catalog or legacy species id. */
  function species(id){
    const raw=catalog.species.find(dragon=>dragon.id===id);
    const parts=raw?.elements||String(id||'').split('>').filter(Boolean);
    const doubled=raw?.doHiem==='transcendent'&&parts.length===4&&
      parts[0]===parts[1]&&new Set(parts).size===3;
    if(!parts.length||parts.length>dragonConfig.maxElementsPerDragon||parts.some(element=>!elements[element])||
      (!doubled&&new Set(parts).size!==parts.length))return null;
    const rarity=raw?.doHiem||(parts.length===1?'common':parts.length===2?
      parts.some(element=>['light','dark','metal'].includes(element))?'epic':'rare':
      parts.length===3?'legendary':'mythic');
    return {parts,rarity};
  }

  /**
   * Convert an owned dragon into a mutable battle fighter.
   * @returns {object|null} Fighter state or null when species data is invalid.
   */
  function makeFighter(dragon){
    const resolved=species(dragon.species);if(!resolved)return null;
    const stats=combat.stats(resolved.parts,resolved.rarity,dragon.level,elements,rarities,dragon.stars);
    const skillIds=(catalog.species.find(item=>item.id===dragon.species)?.skillIds||
      (resolved.parts.length===1?['claw','slam',resolved.parts[0]+'-1',resolved.parts[0]+'-2']:
        (resolved.parts.length===2?['claw','slam']:resolved.parts.length===3?['claw']:[])
          .concat(resolved.parts.map(element=>element+'-1'))));
    return {...dragon,power:combat.power(stats),parts:resolved.parts,rarity:resolved.rarity,maxHp:stats.hp,
      hp:stats.hp,attack:stats.attack,defense:stats.defense,
      statuses:[],cooldowns:[0,0,0,0],skills:skillIds.map(id=>skillRegistry.get(id))};
  }

  return {species,makeFighter};
}

module.exports={createFighterFactory};
