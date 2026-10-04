"use strict";

const APEX_RECIPES=DRAGON_DB.species.filter(species=>species.doHiem==="apex");
const APEX_PRIMARY_ELEMENTS=Object.keys(DATA.elements);

function ensureAchievementState(){
  state.achievements??={apexEggs:{}};
  state.achievements.apexEggs??={};
  return state.achievements;
}

/** Award one non-breedable Apex egg after all three Double dragons of a primary are discovered. */
function checkApexAchievements(){
  const progress=ensureAchievementState().apexEggs,awarded=[];
  const discovered=new Set(state.discovered||[]);
  for(const element of APEX_PRIMARY_ELEMENTS){
    const required=DRAGON_DB.species.filter(species=>species.doHiem==="transcendent"&&
      species.elements[0]===element);
    const count=required.filter(species=>discovered.has(species.id)).length;
    if(required.length!==3||count<required.length||progress[element])continue;
    const apex=APEX_RECIPES.find(species=>species.apexPrimary===element);
    if(!apex)continue;
    progress[element]=true;
    const egg=addEgg(apex.id,"achievement",null);
    awarded.push({element,egg,dragon:apex});
    toast("Thành tựu hoàn tất: nhận được trứng "+apex.tenTrung+"!");
  }
  return awarded;
}
