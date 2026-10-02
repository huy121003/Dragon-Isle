"use strict";

/** Resolve the four catalog skill IDs of a species into runtime skill definitions. */
function skillsForSpecies(species){
  const registry=new Map();
  DATA.skills.neutral.forEach(function(skill){registry.set(skill.id,Object.assign({element:null,bonus:0},skill));});
  Object.keys(DATA.skills.elemental).forEach(function(element){
    DATA.skills.elemental[element].forEach(function(skill){
      registry.set(skill.id,Object.assign({element:element},skill));
    });
  });
  return species.detail.skillIds.map(function(id){return registry.get(id);});
}
/** Return the configured dragon level required to unlock a zero-based skill slot. */
function skillUnlockLevel(index){return window.DragonConfig.progression.skillUnlockLevels[index];}
/** Return whether a concrete dragon has unlocked a catalog skill. */
function skillUnlocked(dragon,skill){
  if(!dragon)return false;
  const species=DATA.species[dragon.species];
  return dragon.level>=skillUnlockLevel(species.detail.skillIds.indexOf(skill.id));
}
/** Build combat stats for a species preview or owned dragon. */
function speciesStats(species,level,stars=0){
  return window.DragonCombat.stats(species.elements,species.rarity,level,DRAGON_DB.elements,DRAGON_DB.rarities,stars);
}
/** Return the flat elemental bonus shown in skill detail UI. */
function elementalBonus(skill,level,species,stars=0){
  return skill.element?Math.round(speciesStats(species,level,stars).attack*skill.bonus):0;
}
/** Return pre-defense skill power for display; actual battle damage remains server authoritative. */
function skillPowerPreview(species,level,skill,stars=0){
  return Math.round(window.DragonCombat.skillPower(speciesStats(species,level,stars).attack,skill));
}
/** Calculate a local deterministic damage preview using an injected variance value. */
function calculateSkillDamage(attacker,defender,skill,variance){
  if(!skillUnlocked(attacker,skill))return 0;
  const attackSpecies=DATA.species[attacker.species],defenseSpecies=DATA.species[defender.species];
  const actor=speciesStats(attackSpecies,attacker.level,attacker.stars);
  const target={...speciesStats(defenseSpecies,defender.level,defender.stars),parts:defenseSpecies.elements};
  return window.DragonCombat.damage(actor,target,skill,DRAGON_DB.typeChart,variance);
}
/** Return element IDs this species can hit strongly and elements that counter its primary element. */
function matchupFor(species){
  const primary=species.elements[0],strong=[],weak=[];
  Object.keys(DATA.elements).forEach(function(id){
    if(species.elements.some(function(e){return DRAGON_DATA.TYPE_CHART[e][id]>1;}))strong.push(id);
    if(DRAGON_DATA.TYPE_CHART[id][primary]>1)weak.push(id);
  });
  return {strong:strong,weak:weak};
}
