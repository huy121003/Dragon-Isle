"use strict";

/* UI PANEL: Owned-dragon, Habitat detail and dragon assignment panels. */
function renderDragons(){
  dom.title.textContent="🐲 Owned Dragons · "+state.dragons.length;
  const feedsPerLevel=window.DragonConfig.world.feeding.feedsPerLevel;
  let html='<div class="note">Tap a dragon card for its stats and skills. Feed '+feedsPerLevel+' times to level up. Dragon level cap: '+dragonLevelCap()+'.</div>'+elementFilter('dragon',ui.dragonElements)+'<div class="cards">';
  const visible=state.dragons.filter(d=>matchesElementFilter(DATA.species[d.species],ui.dragonElements));
  if(!visible.length)html+='<div class="note">No dragons match all selected elements.</div>';
  visible.forEach(function(d){
    const s=DATA.species[d.species];
    const home=buildingById(d.habitatId),busy=dragonBusy(d.id);
    const progress=d.level>=dragonLevelCap()?100:dragonFeedProgress(d)*100/feedsPerLevel;
    const feedCost=dragonFeedCost(d.level);
    html+='<div class="dragon-card" data-action="dragon-detail" data-id="'+d.id+'" role="button" tabindex="0">'+
      dragonPortrait(s.id,d.level,'small')+
      '<div class="dragon-info"><b>'+esc(d.nickname)+' · Level '+d.level+'</b>'+dragonStars(d.stars)+
      '<span class="dragon-summary">'+
      elementBadges(s)+rarityGem(s.rarity,s.elements[0])+'</span><small>'+esc(s.name)+' · '+stageOf(d)+
      ' · '+(home?(home.stored?"Stored Habitat":buildingName(home)):"No Habitat")+
      (home&&!home.stored?' · '+goldPerMinute(dragonIncomePerMinute(d,home))+' gold/min':'')+
      (busy?' · 💞 Breeding':'')+' · '+(d.level>=dragonLevelCap()?'Level cap '+dragonLevelCap():'Fed '+dragonFeedProgress(d)+'/'+feedsPerLevel+' feedings')+'</small><div class="meter"><span style="width:'+progress+'%"></span></div>'+
      '<div class="actions"><button class="btn good" data-action="feed" data-id="'+d.id+'"'+(busy||d.level>=dragonLevelCap()||state.food<feedCost?' disabled':'')+'>Feed · '+money(feedCost)+' food</button>'+
      '<button class="btn" data-action="assign-menu" data-id="'+d.id+'"'+(busy?' disabled':'')+'>Change Habitat</button></div></div></div>';
  });
  dom.body.innerHTML=html+"</div>";
  renderDragonPortraits();
}
/* UI: Chạm Habitat mở danh sách dragons, sản lượng, tiles trống và thao tác nâng cấp. */

function renderHabitat(id){
  const b=buildingById(id);
  if(!b||b.type!=="habitat"||b.stored){closeModal();return;}
  const ds=occupants(b),rate=habitatIncomePerMinute(b);
  dom.title.textContent=DATA.elements[b.element].mark+' '+buildingName(b)+' · Level '+b.level;
  let html='<div class="panel"><h3>Habitat details</h3><div class="element-list">'+
      elementFlag(b.element,true)+'</div>'+
    '<div class="stat-grid"><div><span>📐 Footprint</span><b>'+buildingFootprint(b).w+'×'+buildingFootprint(b).h+' tiles</b></div>'+
    '<div><span>🐉 Capacity</span><b>'+ds.length+'/'+habitatCapacity(b.level)+'</b></div>'+ 
    '<div><span>🪙 Gold/min</span><b>'+goldPerMinute(rate)+'</b></div>'+ 
    '<div><span>🏦 Stored gold</span><b>'+goldDecimal(b.storedGold)+' / '+money(habitatGoldCapacity(b))+'</b></div>'+ 
    '<div><span>💎 Gems/hour</span><b>'+habitatGemRate(b)+'</b></div>'+ 
    '<div><span>💎 Stored gems</span><b>'+money(b.storedGems||0)+' / '+money(habitatGemCapacity(b))+'</b></div></div>'+ 
    '<p class="muted">Each dragon produces '+window.DragonConfig.world.gemPerDragonPerHour+' gem per hour; progress persists when moving between Habitats.'+
    ((b.storedGems||0)>=habitatGemCapacity(b)?' Gem storage is full.':ds.length?' Next gem in about '+duration(gemNextSeconds(b))+'.':'')+
    ' Gold income is the total from dragons. Production stops at capacity. Hunger and happiness affect income.'+
    (b.level<maxBuildingLevel(b)?' Next upgrade needs '+buildingFootprint(b,b.level+1).w+'×'+
      buildingFootprint(b,b.level+1).h+' free tiles.':'')+'</p>'+
    '<div class="actions"><button class="btn primary" data-action="collect" data-id="'+b.id+'"'+
    (b.storedGold>=.005||(b.storedGems||0)>=1?'':' disabled')+'>Thu '+
    goldDecimal(b.storedGold)+' gold · '+money(b.storedGems||0)+' gem</button>';
  if(b.upgradeEnds)html+=inlineTimer(b.upgradeStartedAt,b.upgradeEnds)+
    '<button class="btn primary" data-action="skip-timer" data-kind="upgrade" data-id="'+b.id+'">♦ '+
    gemSkipCost(b.upgradeEnds,Date.now())+' Skip</button>';
  else if(b.level<maxBuildingLevel(b))html+='<button class="btn good" data-action="upgrade" data-id="'+b.id+'">Upgrade · '+
    money(standardUpgradeCost(b).gold)+' gold · '+money(standardUpgradeCost(b).gems)+' gems</button>';
  if(!b.upgradeEnds)html+='</div><div class="actions"><button class="btn" data-action="move" data-id="'+b.id+'">Move</button>'+
    '<button class="btn" data-action="store" data-id="'+b.id+'">Store</button>'+
    (!ds.length?'<button class="btn danger" data-action="sell" data-id="'+b.id+'">Sell Habitat</button>':'')+'</div>'+
    '</div><h3>Dragons in Habitat · '+ds.length+'</h3><div class="cards">';
  else html+='</div></div><h3>Dragons in Habitat · '+ds.length+'</h3><div class="cards">';
  if(!ds.length)html+='<p>This Habitat is empty. Assign a dragon of the matching element.</p>';
  ds.forEach(function(d){
    const s=DATA.species[d.species],stats=dragonStats(d);
    html+='<button class="shop-item" data-action="dragon-detail" data-id="'+d.id+'">'+
      dragonPortrait(s.id,d.level,'small')+'<span><b>'+esc(d.nickname)+' · Lv'+d.level+'</b>'+dragonStars(d.stars)+'<small>'+esc(s.name)+
      ' · '+elementBadges(s)+rarityGem(s.rarity,s.elements[0])+(dragonBusy(d.id)?' · 💞 Breeding':'')+'</small><small>🪙 '+goldPerMinute(dragonIncomePerMinute(d,b))+
      '/min · ❤️ '+stats.hp+' · ⚔️ '+stats.attack+' · 🛡️ '+stats.defense+'</small></span></button>';
  });
  dom.body.innerHTML=html+'</div>';
  renderDragonPortraits();
}

function renderDragonDetail(id){
  const d=dragonById(id);
  if(!d){closeModal();return;}
  dom.title.textContent='🐉 Dragon details';
  dom.body.innerHTML=dragonDetailHtml(DATA.species[d.species],d)+
    '<div class="actions"><button class="btn" data-action="dragon-back">‹ Back to '+
    (ui.dragonReturn?.name==="habitat"?'Habitat':'Dragons')+'</button></div>';
  renderDragonPortraits();
}

function renderAssign(dragonId){
  const d=dragonById(dragonId);
  if(!d){closeModal();return;}
  if(dragonBusy(d.id)){toast("Breeding dragons cannot change Habitats.");closeModal();return;}
  const s=DATA.species[d.species];
  dom.title.textContent="Choose a Habitat for "+d.nickname;
  const homes=state.buildings.filter(function(b){return habitatHasRoom(b)&&s.elements.includes(b.element);});
  let html='<div class="cards">';
  if(!homes.length)html+='<div class="note">No matching Habitat has room. Build or upgrade one.</div>';
  homes.forEach(function(b){
    html+='<button class="shop-item" data-action="assign" data-dragon="'+dragonId+'" data-building="'+b.id+'">'+
      '<span class="shop-icon" style="color:'+DATA.elements[b.element].color+'">'+DATA.elements[b.element].mark+
      '</span><span><b>'+buildingName(b)+'</b><small>Level '+b.level+' · '+occupants(b).length+'/'+
      habitatCapacity(b.level)+' dragons</small></span></button>';
  });
  dom.body.innerHTML=html+"</div>";
}
/* UI: Hatchery hiển thị tiles ấp, eggs chờ, đồng hồ và phí ấp nhanh. */
