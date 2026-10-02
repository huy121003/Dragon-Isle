"use strict";

/* UI: All nút hiển thị has handler trong bộ điều phối sự kiện ở cuối khối này. */
function toast(message){
  dom.toast.textContent=message;dom.toast.classList.add("show");
  clearTimeout(ui.toastTimer);
  ui.toastTimer=setTimeout(function(){dom.toast.classList.remove("show");},2400);
}
function secondsLeft(end){return Math.max(0,Math.ceil((end-Date.now())/1000));}
function duration(seconds){
  seconds=Math.max(0,Math.floor(seconds));
  if(seconds>=3600)return Math.floor(seconds/3600)+"h "+Math.floor(seconds%3600/60)+"m";
  if(seconds>=60)return Math.floor(seconds/60)+"m "+seconds%60+"s";
  return seconds+"s";
}
function countdown(end){return '<span data-end="'+end+'">'+duration(secondsLeft(end))+'</span>';}
function esc(value){return String(value).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
});}
function refreshCountdowns(){
  let finishedInSheet=false;
  document.querySelectorAll("[data-end]").forEach(function(el){
    const left=secondsLeft(Number(el.dataset.end));
    el.textContent=duration(left);
    if(left>0)el.dataset.countdownPending="1";
    else if(el.dataset.countdownPending==="1"&&el.closest("#sheet")){
      delete el.dataset.countdownPending;
      finishedInSheet=true;
    }
  });
  if(finishedInSheet&&ui.modal&&["hatchery","breeding","crops"].includes(ui.modal.name)){
    const scroll=dom.body.scrollTop;renderModal();dom.body.scrollTop=scroll;
  }
}
function updateHeader(){
  document.getElementById('game').classList.toggle('night',daylightAt(Date.now())<.48);
  const goldElement=document.getElementById("goldAmount");
  goldElement.textContent=headerGold(state.gold);
  goldElement.title=goldDecimal(state.gold)+" gold";
  const rate=state.buildings.filter(function(b){return b.type==="habitat"&&!b.stored;})
    .reduce(function(sum,b){return sum+habitatIncomePerMinute(b);},0);
  document.getElementById("incomeRate").textContent="+"+goldPerMinute(rate)+"/min";
  document.getElementById("foodAmount").textContent=money(state.food);
  document.getElementById("gemAmount").textContent=money(state.gems);
  const collected=new Set(state.discovered);
  document.getElementById("collectionProgress").textContent=BOOK_SPECIES_IDS.filter(function(id){
    return collected.has(id);
  }).length+"/"+BOOK_SPECIES_IDS.length;
  document.getElementById("playerLevel").textContent="Level "+state.player.level;
  const maximum=state.player.level>=60,needed=maximum?0:playerXPNeeded(state.player.level);
  const shown=maximum?0:Math.max(0,Math.floor(state.player.xp));
  const track=document.getElementById("xpTrack");
  document.getElementById("xpFill").style.width=(maximum?100:clamp(shown/needed*100,0,100))+"%";
  document.getElementById("xpText").textContent=maximum?"MAX LEVEL":money(shown)+" / "+money(needed)+" XP";
  track.setAttribute("aria-valuenow",maximum?60:shown);
  track.setAttribute("aria-valuemax",maximum?60:needed);
}
function stopMode(){ui.mode=null;dom.bar.classList.remove("visible");}
function beginMode(mode){
  if(mode.kind!=="buy"&&!buildingById(mode.id))return;
  if(mode.kind==="buy"){
    const reason=buildLockReason(mode.type,mode.element);
    if(reason){toast(reason);return;}
  }else if(mode.kind==="move"&&buildingById(mode.id).upgradeEnds){
    toast("This building cannot be moved during an upgrade.");return;
  }
  ui.mode=Object.assign({x:null,y:null},mode);
  ui.selection=null;dom.inspector.innerHTML="";
  dom.bar.classList.add("visible");
  const f=placementFootprint(mode);
  dom.barText.textContent=mode.kind==="buy"?"Tap a free plot to place "+(mode.type==="habitat"?"Habitat "+DATA.elements[mode.element].name:DATA.buildings[mode.type].name)+" · "+f.w+"×"+f.h+" tiles · "+
    (mode.type==="premiumCave"?"♦ ":"● ")+money(buildingPurchaseCost(mode.type,mode.element))+" on placement":
    mode.kind==="inventory"?"Drag or tap a tile to place a stored building":"Drag or tap a tile to move this building";
  closeModal();
}
function updateInspector(){
  if(ui.mode){dom.inspector.innerHTML="";return;}
  const s=ui.selection;
  if(!s){dom.inspector.innerHTML="";return;}
  if(s.type==="island"){
    const island=DATA.islands[s.index];
    if(!island){ui.selection=null;return;}
    const issue=s.index>=state.unlockedIslands?islandUnlockIssue(s.index):"";
    const ready=s.index===state.unlockedIslands&&!issue;
    const element=island.element&&DATA.elements[island.element];
    dom.inspector.innerHTML='<div class="panel"><div class="panel-head"><h3>'+esc(island.name)+'</h3><button class="btn icon" data-action="clear-selection">×</button></div>'+
      '<p>'+(element?esc(element.name)+' element':'Starting island')+'</p>'+
      '<p>'+esc(island.description||'')+'</p>'+
      '<p>'+island.size+'×'+island.size+' tiles · '+islandRegionTotal(s.index)+' land regions of '+DATA.islandRegionSize+'×'+DATA.islandRegionSize+' tiles.</p>'+
      (s.index<state.unlockedIslands?'<p>'+islandRegionCount(s.index)+'/'+islandRegionTotal(s.index)+' regions unlocked.</p>':
      ready?'<p>Unlock for ♦ '+money(islandUnlockCost(s.index))+' gems. The center region opens with the island.</p><button class="btn primary" data-action="unlock-island" data-id="'+s.index+'">Unlock island</button>':
      '<p>Unlock for ♦ '+money(islandUnlockCost(s.index))+' gems. '+esc(issue)+'</p>')+'</div>';
    return;
  }
  if(s.type==="land"){
    if(unlocked(s.x,s.y)){ui.selection=null;dom.inspector.innerHTML="";return;}
    const region=regionOf(s.x,s.y);
    if(!region||region.index>=state.unlockedIslands){ui.selection=null;dom.inspector.innerHTML="";return;}
    const can=regionAdjacent(region),price=expansionCost(s.x,s.y),count=expansionTiles(s.x,s.y).length;
    dom.inspector.innerHTML='<div class="panel"><div class="panel-head"><h3>🗺️ '+esc(DATA.islands[region.index].name)+'</h3><button class="btn icon" data-action="clear-selection">×</button></div>'+
      '<p>Open a '+DATA.islandRegionSize+'×'+DATA.islandRegionSize+' region ('+count+' new tiles). Progress: '+islandRegionCount(region.index)+'/'+islandRegionTotal(region.index)+' regions.'+
      (can?'':' Unlock a neighboring region first.')+'</p>'+
      (can?'<div class="actions"><button class="btn primary" data-action="unlock-land" data-x="'+s.x+'" data-y="'+s.y+
      '">● '+money(price)+' gold</button><button class="btn" data-action="unlock-land-gem" data-x="'+s.x+'" data-y="'+s.y+
      '">♦ '+money(Math.max(1,Math.ceil(price/100)))+' gem</button></div>':'')+'</div>';
    return;
  }
  if(s.type==="dragon"){
    const d=dragonById(s.id);
    if(!d){ui.selection=null;dom.inspector.innerHTML="";return;}
    const html='<div class="panel"><div class="panel-head"><b>Dragon details</b>'+
      '<button class="btn icon" data-action="clear-selection">×</button></div>'+
      dragonDetailHtml(DATA.species[d.species],d)+'</div>';
    if(dom.inspector.innerHTML!==html){dom.inspector.innerHTML=html;renderDragonPortraits();}
    return;
  }
  const b=buildingById(s.id);
  if(!b||b.stored){ui.selection=null;dom.inspector.innerHTML="";return;}
  let body='<div class="panel"><div class="panel-head"><h3>'+buildingName(b)+' · Level '+b.level+
    '</h3><button class="btn icon" data-action="clear-selection">×</button></div>'+
    '<p>Footprint '+buildingFootprint(b).w+'×'+buildingFootprint(b).h+' tiles'+
    (b.level<maxBuildingLevel(b)?' · Next level '+buildingFootprint(b,b.level+1).w+'×'+
    buildingFootprint(b,b.level+1).h+' tiles':'')+'</p>';
  if(b.type==="habitat"){
    const ds=occupants(b);
    body+='<p>'+ds.length+'/'+habitatCapacity(b.level)+' dragons · '+goldPerMinute(habitatIncomePerMinute(b))+' gold/min</p>'+
      '<p>💎 '+habitatGemRate(b)+' gem/hour · one gem per dragon/hour'+
      ((b.storedGems||0)>=habitatGemCapacity(b)?' · gem storage full':ds.length?' · next gem in '+duration(gemNextSeconds(b)):'')+'</p>'+
      '<div class="row"><span class="pill">🪙 '+goldDecimal(b.storedGold)+' gold</span>'+ 
      '<span class="pill">💎 '+money(b.storedGems||0)+'/'+habitatGemCapacity(b)+' stored gems</span></div>'+
      '<p>Gold capacity: '+money(habitatGoldCapacity(b))+'</p>'+
      '<div class="actions"><button class="btn primary" data-action="collect" data-id="'+b.id+'"'+
      (b.storedGold>=.005||(b.storedGems||0)>=1?'':' disabled')+'>Thu '+
      goldDecimal(b.storedGold)+' gold · '+money(b.storedGems||0)+' gem</button>';
    ds.forEach(function(d){body+='<button class="btn" data-action="inspect-dragon" data-id="'+d.id+'">🐲 '+esc(d.nickname)+' · '+esc(DATA.species[d.species].name)+'</button>';});
    body+='</div>';
  }else if(b.type==="farm"){
    if(!b.crop)body+='<p>Choose a crop to produce food.</p><div class="actions"><button class="btn good" data-action="crop-menu" data-id="'+b.id+'">Plant crop</button></div>';
    else if(Date.now()>=b.crop.readyAt)body+='<p>'+cropById(b.crop.id).name+' is ready.</p><div class="actions"><button class="btn good" data-action="harvest" data-id="'+b.id+'">Harvest</button></div>';
    else body+='<p>Growing '+cropById(b.crop.id).name+'</p>'+
      inlineTimer(b.crop.startedAt,b.crop.readyAt)+
      '<button class="btn primary" data-action="skip-timer" data-kind="crop" data-id="'+b.id+'">♦ '+
      gemSkipCost(b.crop.readyAt,Date.now())+' Skip</button>';
  }else if(b.type==="hatchery"){
    const eggs=eggsInHatchery(b.id),ready=eggs.filter(function(e){return e.readyAt<=Date.now();}).length;
    body+='<p>'+eggs.length+'/'+hatcheryCapacity(b.level)+' nests occupied · '+ready+
      ' ready to hatch. Ready eggs occupy a nest until collected or sold.</p>'+
      '<div class="actions"><button class="btn good" data-action="hatchery-menu" data-id="'+b.id+
      '">Manage eggs</button></div>';
  }else if(isBreedingCave(b)){
    body+='<p>'+(b.breeding?(b.breeding.readyAt<=Date.now()?"The bred egg is ready.":"Breeding"):
      "Choose two dragons at level 5 or above to breed.")+'</p><div class="actions"><button class="btn good" data-action="breeding-menu" data-id="'+b.id+
      '">Open '+esc(buildingName(b))+'</button></div>';
  }else if(b.type==="arena"){
    body+='<p>Set attack and defense teams to challenge another player.</p><div class="actions">'+
      '<button class="btn good" data-action="open-arena">Enter Arena</button></div>';
  }else if(b.type==="academy"){
    body+='<p>Dragon level cap: <b>'+dragonLevelCap()+'</b> / 100.</p>';
    if(b.level<maxBuildingLevel(b)){
      const cost=academyUpgradeCost(b.level);
      body+='<p>Next cap: '+DATA.progression.academyCaps[b.level]+'. Requires player level '+cost.playerLevel+
        ', '+money(cost.gold)+' gold, '+money(cost.food)+' food and '+money(cost.gems)+' gems.</p>';
    }
  }else body+='<p>Decoration for your island.</p>';
  if(b.upgradeEnds)body+='<p>Upgrading</p>'+inlineTimer(b.upgradeStartedAt,b.upgradeEnds)+
    '<button class="btn primary" data-action="skip-timer" data-kind="upgrade" data-id="'+b.id+'">♦ '+
    gemSkipCost(b.upgradeEnds,Date.now())+' Skip</button>';
  body+='<div class="actions">';
  if(!b.upgradeEnds&&b.level<maxBuildingLevel(b)&&
    (b.type!=="hatchery"||state.player.level>=1+b.level*4))
    body+='<button class="btn" data-action="upgrade" data-id="'+b.id+'">Upgrade · '+(b.type==="academy"?money(academyUpgradeCost(b.level).gold)+' gold · '+money(academyUpgradeCost(b.level).food)+' food · '+money(academyUpgradeCost(b.level).gems)+' gems · Player Lv'+academyUpgradeCost(b.level).playerLevel:money(upgradeCost(b))+' gold')+' · '+
      duration(upgradeSeconds(b))+'</button>';
  if(!b.upgradeEnds){
    body+='<button class="btn" data-action="move" data-id="'+b.id+'">Move</button>';
    if(b.type==="habitat")body+='<button class="btn" data-action="store" data-id="'+b.id+'">Store</button>'+
      (!occupants(b).length?'<button class="btn danger" data-action="sell" data-id="'+b.id+'">Sell</button>':'');
  }
  body+='</div></div>';
  dom.inspector.innerHTML=body;
}
function updateUI(){
  updateHeader();updateInspector();updateTimerBar();
  if(ui.modal){
    const scroll=dom.body.scrollTop;
    renderModal();dom.body.scrollTop=scroll;
  }
  window.dispatchEvent(new Event('dragon-ui-update'));
}
/* UI: Đồng bộ mục được chọn ở thanh điều hướng để biết người chơi đang ở đâu. */
function syncDock(){
  const section={shop:"open-shop",dragons:"open-dragons",book:"open-book",inventory:"open-inventory",islands:"open-islands",guide:"open-guide",arena:"open-arena"};
  const arenaButton=document.getElementById("arenaDockButton");
  if(arenaButton)arenaButton.hidden=!state?.buildings.some(b=>b.type==="arena"&&!b.stored);
  const name=ui.modal&&ui.modal.name;
  const origin=name==="book-detail"&&ui.returnModal?ui.returnModal.name:
    name==="shop-egg-detail"?"shop":name;
  document.querySelectorAll("#dock .dock-btn").forEach(function(button){
    button.classList.toggle("active",section[origin]===button.dataset.action);
  });
}
function closeModal(){
  ui.modal=null;ui.returnModal=null;ui.dragonReturn=null;
  dom.overlay.classList.remove("open");dom.body.innerHTML="";syncDock();
  if(ui.lastFocus&&ui.lastFocus.isConnected&&ui.lastFocus.focus)ui.lastFocus.focus();
  ui.lastFocus=null;
  window.dispatchEvent(new Event('dragon-ui-update'));
}
function openModal(name,extra){
  if(!ui.modal)ui.lastFocus=document.activeElement;
  ui.modal={name:name,extra:extra||null};
  dom.overlay.classList.add("open");
  renderModal();
  dom.body.scrollTop=0;syncDock();
  if(dom.title.focus)dom.title.focus({preventScroll:true});
  window.dispatchEvent(new Event('dragon-ui-update'));
}
