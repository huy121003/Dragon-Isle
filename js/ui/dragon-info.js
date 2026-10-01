"use strict";

/* UI: Hình Canvas used chung trong chuồng, danh sách, Dragon Book và trang chi tiết. */
function dragonPortrait(speciesId,level,size){
  const s=DATA.species[speciesId],rarity=DATA.rarities[s.rarity];
  const width=size==="large"?240:92,height=size==="large"?172:78;
  return '<span class="dragon-preview '+(size==="large"?'large':'')+'" style="--rarity:'+rarity.color+
    ';--element:'+DATA.elements[s.elements[0]].light+'"><canvas width="'+width+'" height="'+height+
    '" data-dragon-art="'+esc(speciesId)+'" data-art-level="'+level+'"></canvas></span>';
}
function renderDragonPortraits(){
  document.querySelectorAll('canvas[data-dragon-art]').forEach(function(canvas){
    const species=DATA.species[canvas.dataset.dragonArt];
    if(!species)return;
    const c=canvas.getContext('2d');
    c.clearRect(0,0,canvas.width,canvas.height);
    const level=Number(canvas.dataset.artLevel)||1;
    const stage=level<10?.74:level<30?1:1.22;
    const scale=Math.min(canvas.width/142,canvas.height/114)/stage;
    drawDragon(c,{dragon:{id:0,species:species.id,level:level},
      x:canvas.width*.54,y:canvas.height*.74,time:900,scale:scale});
  });
}
/* UI: Cờ hệ và viên đá bậc gọn; title/aria-label giữ tên đầy đủ. */
function elementFlag(id,primary,size='sm'){
  const e=DATA.elements[id];
  return '<span class="element-flag flag-'+size+(primary?' primary':'')+'" style="--element:'+e.color+
    '" title="'+esc(e.name+(primary?' · Primary element':''))+'" aria-label="'+
    esc(e.name+(primary?' · Primary element':''))+'"><svg viewBox="0 0 32 42" aria-hidden="true">'+
    '<path d="M1 1H31V41L16 32 1 41Z" fill="'+e.dark+'"/>'+
    '<path d="M3.5 3.5H28.5V36.5L16 29 3.5 36.5Z" fill="'+e.color+'"/>'+
    '<path d="M5 5H27V9H5Z" fill="#ffffff33"/>'+
    '<svg x="5" y="8" width="22" height="22" viewBox="0 0 24 24" color="white">'+
    '<use href="#flag-'+id+'"/></svg></svg></span>';
}
function rarityGem(id,elementId){
  const rarity=DATA.rarities[id];
  const gemColor=DATA.elements[elementId]?.color||rarity.color;
  return '<span class="rarity-gem" style="--gem:'+gemColor+';--tier:'+rarity.color+'" title="'+esc(rarity.name)+
    '" aria-label="'+esc(rarity.name)+'"><svg viewBox="0 0 40 46" aria-hidden="true">'+
    '<path d="M20 1 37 11 36 30 20 45 4 30 3 11Z" fill="'+rarity.color+'" stroke="#283a4b" stroke-width="2"/>'+
    '<path d="M20 5 33 13 32 28 20 40 8 28 7 13Z" fill="'+gemColor+'" stroke="#ffffffbb" stroke-width="1.5"/>'+
    '<path d="M8 13 20 5 32 13 20 15Z" fill="#ffffff55"/>'+
    '<text x="20" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" font-weight="900" fill="white" stroke="#182839" stroke-width="2" paint-order="stroke">'+
    esc(rarity.name[0])+'</text></svg></span>';
}
function elementBadges(species,size='sm'){
  return species.elements.map(function(id,index){
    return elementFlag(id,index===0,size);
  }).join('');
}
function skillHex(skill,locked=false){
  const e=skill.element?DATA.elements[skill.element]:null;
  const glyph=e?'<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#flag-'+skill.element+'"/></svg>':'⚔';
  return '<span class="skill-hex '+(e?'elemental':'neutral')+(locked?' locked':'')+'" style="--skill-color:'+(e?e.color:'#bd7520')+'"'+
    ' title="'+esc(e?e.name+' element skill':'Normal skill')+'">'+glyph+(locked?'<i aria-label="Locked">🔒</i>':'')+'</span>';
}
function matchupBadges(ids){
  return ids.length?ids.map(function(id){return elementFlag(id,false);}).join(''):
    '<span class="muted">None</span>';
}
/* UI: Một khung chi tiết duy nhất cho cả dragons sở hữu lẫn species chưa khám phá. */
function dragonDetailHtml(species,dragon){
  const level=dragon?dragon.level:1;
  const stats=speciesStats(species,level),rarity=DATA.rarities[species.rarity];
  const house=dragon?buildingById(dragon.habitatId):null;
  const gold=dragon&&house&&!house.stored?dragonIncomePerMinute(dragon,house):
    Math.max(1,Math.round(rarity.income/60));
  const matchup=matchupFor(species);
  const skillList=skillsForSpecies(species);
  let html='<div class="dragon-detail" style="--rarity:'+rarity.color+'">'+
    dragonPortrait(species.id,level,'large')+
    '<div class="dragon-detail-heading"><h3>'+esc(dragon?dragon.nickname:species.name)+'</h3>'+rarityGem(species.rarity,species.elements[0])+
    '</div><p class="muted">'+(dragon?esc(species.name)+' · Level '+level+' · '+stageOf(dragon):
    'Sample stats · Level 1')+'</p><div class="element-list">'+elementBadges(species,'lg')+
    (species.rarity==='transcendent'?'<b class="double-affinity">'+esc(DATA.elements[species.elements[0]].name)+' ×2 · Double Element</b>':'')+'</div>'+
    '<h4>⚔️ Four skills · unlock at levels 10 / 15 / 20 / 25</h4><div class="skills-grid">';
  skillList.forEach(function(skill,index){
    const required=skillUnlockLevel(index),unlocked=!!dragon&&dragon.level>=required;
    if(!unlocked){
      html+='<div class="skill-card skill-locked">'+skillHex(skill,true)+'<div><b>'+ 
        esc(skill.name)+'</b><small>Unlocks at level '+required+'</small></div></div>';
      return;
    }
    const element=skill.element?DATA.elements[skill.element]:null;
    const extra=elementalBonus(skill,level,species);
    const description=skill.special?esc(skill.description)+' · Cooldown '+skill.cooldown+' turns':
      element?'100% base attack + '+Math.round(skill.bonus*100)+'% elemental attack ('+extra+')':
        Math.round(skill.power*100)+'% base attack';
    html+='<div class="skill-card" style="--element:'+(element?element.color:'#8194a1')+'">'+
      skillHex(skill)+'<div><b>'+esc(skill.name)+'</b><small>'+ 
      (element?esc(element.name):'Neutral')+' · '+description+
      '</small><strong>'+(skill.special&&skill.power===0?'Support skill · no damage':
        'Attack preview '+money(skillPowerPreview(species,level,skill)))+'</strong></div></div>';
  });
  html+='</div><div class="stat-grid"><div><span>🪙 Gold/min</span><b>'+goldPerMinute(gold)+'</b></div>'+
    '<div><span>❤️ HP</span><b>'+money(stats.hp)+'</b></div>'+
    '<div><span>⚔️ base attack</span><b>'+money(stats.attack)+'</b></div>'+
    '<div><span>🛡️ Defense</span><b>'+money(stats.defense)+'</b></div></div>'+
    '<small class="muted">Base attack at the shown level, before skill power. '+
    (dragon&&house&&!house.stored?'Actual gold at '+esc(buildingName(house)):
    'Base gold before happiness and Habitat bonuses')+'</small>'+
    '<div class="matchup"><h4>Element matchups · '+elementFlag(species.elements[0],true)+'</h4><p>Can counter ×1.5: '+matchupBadges(matchup.strong)+
    '</p><p>Primary weak to ×1.5: '+matchupBadges(matchup.weak)+'</p></div>'+
    '<p class="muted">'+esc(species.detail.hienTuong)+'</p>';
  if(dragon){
    const feedCost=dragonFeedCost(dragon.level);
    const busy=dragonBusy(dragon.id);
    html+='<div class="row"><span class="pill">'+(dragon.level>=dragonLevelCap()?'Level cap '+dragonLevelCap():'Fed '+dragonFeedProgress(dragon)+'/4 feedings at this level')+'</span>'+
      '<span class="pill">'+(busy?'💞 Breeding':dragonActivity(dragon,Date.now()).label)+'</span>'+
      (dragon.hunger>=80?'<span class="pill">Needs food</span>':'')+
      '</div><div class="actions"><button class="btn good" data-action="feed" data-id="'+
      dragon.id+'"'+(busy||dragon.level>=dragonLevelCap()||state.food<feedCost?' disabled':'')+'>Feed · '+money(feedCost)+' food</button><button class="btn" data-action="assign-menu" data-id="'+
      dragon.id+'"'+(busy?' disabled':'')+'>Change Habitat</button>'+
      '<button class="btn danger" data-action="sell-dragon" data-id="'+dragon.id+'"'+
      (busy?' disabled':'')+'>Sell dragon</button></div>';
  }
  return html+'</div>';
}
