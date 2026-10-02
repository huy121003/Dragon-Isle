"use strict";

/**
 * Selection inspector presentation for islands, land, dragons and buildings.
 *
 * This module renders contextual actions only; domain mutation remains in
 * js/logic/* and is reached through data-action routing.
 */
/**
 * Render the contextual selection inspector from current UI/save state.
 * This function emits only HTML/actions; mutation occurs later through handleAction().
 */
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
      '">♦ '+money(expansionGemCost(s.x,s.y))+' gem</button></div>':'')+'</div>';
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
      '<p>💎 '+habitatGemRate(b)+' gem/hour · '+window.DragonConfig.world.gemPerDragonPerHour+' gem per dragon/hour'+
      ((b.storedGems||0)>=habitatGemCapacity(b)?' · gem storage full':ds.length?' · next gem in '+duration(gemNextSeconds(b)):'')+'</p>'+
      '<div class="row"><span class="pill">🪙 '+goldDecimal(b.storedGold)+' gold</span>'+
      '<span class="pill">💎 '+money(b.storedGems||0)+'/'+habitatGemCapacity(b)+' stored gems</span></div>'+
      '<p>Gold capacity: '+money(habitatGoldCapacity(b))+'</p>'+
      '<div class="actions"><button class="btn" data-action="habitat-menu" data-id="'+b.id+'">Habitat details</button>'+
      '<button class="btn primary" data-action="collect" data-id="'+b.id+'"'+
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
      "Choose two dragons at level "+window.DragonConfig.progression.breedLevel+" or above to breed.")+'</p><div class="actions"><button class="btn good" data-action="breeding-menu" data-id="'+b.id+
      '">Open '+esc(buildingName(b))+'</button></div>';
  }else if(b.type==="arena"){
    body+='<p>Set attack and defense teams to challenge another player.</p><div class="actions">'+
      '<button class="btn good" data-action="open-arena">Enter Arena</button></div>';
  }else if(b.type==="academy"){
    body+='<p>Dragon level cap: <b>'+dragonLevelCap()+'</b> / '+window.DragonConfig.progression.dragonMaxLevel+'.</p>';
    if(b.level<maxBuildingLevel(b)){
      const cost=academyUpgradeCost(b.level);
      const qualified=academyQualifiedDragonCount(cost);
      body+='<p>Next cap: '+window.DragonConfig.progression.academyCaps[b.level]+'. Requires player level '+cost.playerLevel+
        ', '+money(cost.gold)+' gold, '+money(cost.food)+' food, '+money(cost.gems)+' gems, and '+
        '<b>'+qualified+'/'+cost.requiredDragons+'</b> owned dragons at level '+cost.requiredDragonLevel+'+.</p>';
    }
  }else body+='<p>Decoration for your island.</p>';
  if(b.upgradeEnds)body+='<p>Upgrading</p>'+inlineTimer(b.upgradeStartedAt,b.upgradeEnds)+
    '<button class="btn primary" data-action="skip-timer" data-kind="upgrade" data-id="'+b.id+'">♦ '+
    gemSkipCost(b.upgradeEnds,Date.now())+' Skip</button>';
  body+='<div class="actions">';
  if(!b.upgradeEnds&&b.level<maxBuildingLevel(b)&&
    (b.type!=="hatchery"||state.player.level>=hatcheryUpgradePlayerLevel(b.level)))
    body+='<button class="btn" data-action="upgrade" data-id="'+b.id+'">Upgrade · '+(b.type==="academy"?money(academyUpgradeCost(b.level).gold)+' gold · '+money(academyUpgradeCost(b.level).food)+' food · '+money(academyUpgradeCost(b.level).gems)+' gems · '+academyQualifiedDragonCount(academyUpgradeCost(b.level))+'/'+academyUpgradeCost(b.level).requiredDragons+' dragons Lv'+academyUpgradeCost(b.level).requiredDragonLevel+'+ · Player Lv'+academyUpgradeCost(b.level).playerLevel:money(standardUpgradeCost(b).gold)+' gold · '+money(standardUpgradeCost(b).gems)+' gems')+' · '+
      duration(upgradeSeconds(b))+'</button>';
  if(!b.upgradeEnds){
    body+='<button class="btn" data-action="move" data-id="'+b.id+'">Move</button>';
    if(b.type==="habitat")body+='<button class="btn" data-action="store" data-id="'+b.id+'">Store</button>'+
      (!occupants(b).length?'<button class="btn danger" data-action="sell" data-id="'+b.id+'">Sell</button>':'');
  }
  body+='</div></div>';
  dom.inspector.innerHTML=body;
}
