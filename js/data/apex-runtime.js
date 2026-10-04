"use strict";

/* Add Apex data after the legacy browser cache and before catalog adaptation. */
(function(root){
  const db=root.DragonDatabase,game=root.GameDatabase,config=root.DragonApexTier;
  if(!db||!game||!config||!root.DragonData)return;
  if(db.species.some(species=>species.doHiem==='apex'))return;
  if(config.dragons.length!==15||config.skills.length!==15)
    throw Error('The Apex browser catalog must contain 15 dragons and skills.');
  db.rarities[config.rarity]=JSON.parse(JSON.stringify(config.rarityConfig));
  for(const skill of config.skills){
    const row=game.skills.elemental[skill.element];
    if(!row||row.some(existing=>existing.id===skill.id))
      throw Error('Missing or duplicate Apex skill '+skill.id);
    row.push({...skill,icon:db.elements[skill.element].icon,special:true,apex:true});
  }
  const used=new Set();
  for(const recipe of config.dragons){
    const parts=[recipe.primary,...recipe.partners];
    if(parts.length!==4||new Set(parts).size!==4||
      db.species.some(species=>species.id===recipe.speciesId))
      throw Error('Invalid or duplicate Apex species '+recipe.speciesId);
    const dragon=root.DragonData.buildDragon(parts);
    const signature=config.skills.find(skill=>skill.id===recipe.skillId);
    if(!signature||signature.element!==recipe.primary)
      throw Error('Missing Apex signature skill for '+recipe.speciesId);
    const doubleSkills=recipe.partners.map((element,index)=>element+'-special-'+(index+1));
    for(const id of doubleSkills){
      if(used.has(id)||!game.skills.elemental[id.split('-special-')[0]]?.some(skill=>skill.id===id))
        throw Error('Invalid or repeated Double skill '+id);
      used.add(id);
    }
    dragon.id=recipe.speciesId;dragon.ten=recipe.name;dragon.elements=parts;
    dragon.soHe=4;dragon.slotCount=4;dragon.doHiem=config.rarity;
    dragon.doHiemTen=config.rarityConfig.ten;dragon.vienMau=config.rarityConfig.vien;
    dragon.doubleElement=null;dragon.apexPrimary=recipe.primary;dragon.apexForm='crown';
    dragon.specialSkillIds=[...doubleSkills,recipe.skillId];
    dragon.skillIds=dragon.specialSkillIds.slice();dragon.apGiay=config.rarityConfig.apGiay;
    dragon.giaTrung=null;dragon.giaBan=config.rarityConfig.banGia;
    dragon.tenTrung=recipe.name.replace(/ Dragon$/,'')+' Egg';
    dragon.vangGioGoc=config.rarityConfig.vangGio;
    dragon.moTa='Apex Dragon — '+db.elements[recipe.primary].ten+' primary with '+
      recipe.partners.map(element=>db.elements[element].ten).join(', ')+
      ' secondary affinities. Cannot be bred.';
    dragon.hienTuong=dragon.moTa;dragon.sachGhi=dragon.moTa;
    db.species.push(dragon);
  }
  if(used.size!==45)throw Error('Apex must use all Double skills exactly once.');
})(typeof window!=='undefined'?window:globalThis);
