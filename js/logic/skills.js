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
/* LOGIC: Element: đầu tiên là elements chủ đạo duy nhất used để tính khắc chế. */
function primaryMultiplier(attackerSpecies,defenderSpecies){
  return DRAGON_DATA.TYPE_CHART[attackerSpecies.elements[0]][defenderSpecies.elements[0]];
}
function speciesStats(species,level){
  const raw=DRAGON_DATA.getStats(species.detail,level);
  return {hp:raw.hp,attack:raw.tanCong,defense:raw.phongThu,speed:raw.tocDo};
}
function elementalBonus(skill,level,rarity){
  return skill.element?Math.round(skill.bonus*(1+.1*(level-1))*DATA.rarities[rarity].statFactor):0;
}
function skillPowerPreview(species,level,skill){
  return Math.round(speciesStats(species,level).attack*skill.power+
    elementalBonus(skill,level,species.rarity));
}
function calculateSkillDamage(attacker,defender,skill,variance){
  if(!skillUnlocked(attacker,skill))return 0;
  const attackSpecies=DATA.species[attacker.species],defenseSpecies=DATA.species[defender.species];
  const attack=speciesStats(attackSpecies,attacker.level).attack;
  const defense=speciesStats(defenseSpecies,defender.level).defense;
  const type=skill.element?primaryMultiplier(attackSpecies,defenseSpecies):1;
  const roll=variance===undefined?1:clamp(variance,.9,1.1);
  return Math.max(1,Math.round((attack*skill.power+
    elementalBonus(skill,attacker.level,attackSpecies.rarity))*type*roll-defense*.5));
}
function matchupFor(species){
  const primary=species.elements[0],strong=[],weak=[];
  Object.keys(DATA.elements).forEach(function(id){
    if(id===primary)return;
    if(DRAGON_DATA.TYPE_CHART[primary][id]>1)strong.push(id);
    if(DRAGON_DATA.TYPE_CHART[id][primary]>1)weak.push(id);
  });
  return {strong:strong,weak:weak};
}
