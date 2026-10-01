"use strict";

/* LOGIC: Bốn chiêu lấy từ JSON theo số elements: 2+2, 2+1+1, 1+3 hoặc 4 elements. */
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
/* LOGIC: Mỗi vị trí chiêu mở ở cấp 10/15/20/25, áp dụng cho mọi số elements. */
function skillUnlockLevel(index){return DATA.progression.skillUnlockLevels[index];}
function skillUnlocked(dragon,skill){
  if(!dragon)return false;
  const species=DATA.species[dragon.species];
  return dragon.level>=skillUnlockLevel(species.detail.skillIds.indexOf(skill.id));
}
function speciesStats(species,level,stars=0){
  return window.DragonCombat.stats(species.elements,species.rarity,level,DRAGON_DB.elements,DRAGON_DB.rarities,stars);
}
function elementalBonus(skill,level,species,stars=0){
  return skill.element?Math.round(speciesStats(species,level,stars).attack*skill.bonus):0;
}
function skillPowerPreview(species,level,skill,stars=0){
  return Math.round(window.DragonCombat.skillPower(speciesStats(species,level,stars).attack,skill));
}
function calculateSkillDamage(attacker,defender,skill,variance){
  if(!skillUnlocked(attacker,skill))return 0;
  const attackSpecies=DATA.species[attacker.species],defenseSpecies=DATA.species[defender.species];
  const actor=speciesStats(attackSpecies,attacker.level,attacker.stars);
  const target={...speciesStats(defenseSpecies,defender.level,defender.stars),parts:defenseSpecies.elements};
  return window.DragonCombat.damage(actor,target,skill,DRAGON_DB.typeChart,variance);
}
function matchupFor(species){
  const primary=species.elements[0],strong=[],weak=[];
  Object.keys(DATA.elements).forEach(function(id){
    if(species.elements.some(function(e){return DRAGON_DATA.TYPE_CHART[e][id]>1;}))strong.push(id);
    if(DRAGON_DATA.TYPE_CHART[id][primary]>1)weak.push(id);
  });
  return {strong:strong,weak:weak};
}
