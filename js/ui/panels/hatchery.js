"use strict";

/* UI PANEL: Hatchery nests, ready eggs and Hatchery-selection panels. */
function renderHatchery(id){
  const b=buildingById(id);
  if(!b||b.type!=="hatchery"||b.stored){closeModal();return;}
  const incubating=eggsInHatchery(id),waiting=state.eggs.filter(function(egg){return egg.hatcheryId===null;});
  dom.title.textContent="🥚 Hatchery · "+incubating.length+"/"+hatcheryCapacity(b.level);
  let html='<div class="note">Hatchery level '+b.level+' has '+hatcheryCapacity(b.level)+
    ' incubation '+(hatcheryCapacity(b.level)===1?'nest':'nests')+'. Ready eggs occupy their nests until hatched or sold. Speed up cost scales with remaining time using the current Gem timer rate.</div>';
  if(!incubating.length)html+='<p>No eggs in this Hatchery.</p>';
  incubating.forEach(function(egg){
    const ready=egg.readyAt<=Date.now();
    const fresh=ready&&!state.discovered.includes(egg.species);
    html+='<div class="egg-card hatchery-egg-card">'+eggShellHtml(egg,ready)+
      '<div><b>'+(ready?'Egg ready':'Mystery Egg')+
      (fresh?' <span class="new-badge">NEW</span>':'')+'</b><small>'+ 
      (ready?'View details and choose a Habitat':'Remaining: '+countdown(egg.readyAt))+'</small>'+ 
      inlineTimer(egg.startedAt,egg.readyAt)+'</div>'+ 
      (ready?'<button class="btn good" data-action="view-ready-egg" data-id="'+egg.id+'">View dragon</button>':
      '<button class="btn primary" data-action="speed-hatch" data-id="'+egg.id+'">♦ '+
      gemSkipCost(egg.readyAt,Date.now())+' Skip</button>')+'</div>';
  });
  html+='<h3>Stored eggs · '+waiting.length+'</h3>';
  if(incubating.length>=hatcheryCapacity(b.level))html+='<p>All nests are occupied. Hatch or sell a ready egg to free a nest.</p>';
  else if(!waiting.length)html+='<p>Buy an egg in the Shop or collect one from the Breeding Cave.</p>';
  else waiting.forEach(function(egg){
    html+='<div class="egg-card hatchery-egg-card">'+eggShellHtml(egg,false)+
      '<div><b>Mystery Egg</b><small>Waiting for a nest</small></div>'+
      '<button class="btn good" data-action="start-incubation" data-id="'+egg.id+
      '" data-building="'+b.id+'">Incubate</button></div>';
  });
  if(b.level<5){
    const required=hatcheryUpgradePlayerLevel(b.level);
    html+='<div class="actions">'+(b.upgradeEnds?inlineTimer(b.upgradeStartedAt,b.upgradeEnds):
      state.player.level<required?'<span class="pill">Upgrade Hatchery to level '+(b.level+1)+' at player level '+required+'</span>':
      '<button class="btn good" data-action="upgrade" data-id="'+b.id+'">Upgrade · '+
      money(upgradeCost(b))+' gold</button>')+'</div>';
  }
  dom.body.innerHTML=html;
}
/* UI: Chỉ khi ấp xong mới tiết lộ dragons, sau đó chọn Habitat hoặc bán eggs trùng. */

function renderReadyEgg(id){
  const egg=eggById(id);
  if(!egg||!egg.hatcheryId||egg.readyAt>Date.now()){
    toast("This egg is still incubating or no longer in the Hatchery.");openModal("inventory");return;
  }
  const s=DATA.species[egg.species],fresh=!state.discovered.includes(s.id);
  const homes=state.buildings.filter(function(b){
    return habitatHasRoom(b)&&s.elements.includes(b.element);
  });
  dom.title.textContent="🥚 Egg ready to hatch";
  let html='<div class="note ready-egg-note">'+(fresh?'<span class="new-badge">NEW</span> New dragon for your Dragon Book.':
    '✓ You have collected this species before.')+' Choose a matching Habitat to hatch.'+
    '</div>'+dragonDetailHtml(s,null)+'<h3>🏡 Place in Habitat</h3><div class="cards">';
  if(!homes.length)html+='<div class="note">No matching Habitat has room. The egg stays safely in the Hatchery until you build or upgrade one.</div>';
  homes.forEach(function(b){
    html+='<button class="shop-item" data-action="place-ready-egg" data-id="'+egg.id+
      '" data-building="'+b.id+'"><span class="shop-icon" style="color:'+DATA.elements[b.element].color+'">'+
      DATA.elements[b.element].mark+'</span><span><b>'+buildingName(b)+'</b><small>Level '+b.level+
      ' · '+occupants(b).length+'/'+habitatCapacity(b.level)+' dragons</small></span><strong>Place in ›</strong></button>';
  });
  html+='</div><div class="actions"><button class="btn" data-action="hatchery-menu" data-id="'+
    egg.hatcheryId+'">‹ Hatchery</button>';
  if(!fresh)html+='<button class="btn danger" data-action="sell-ready-egg" data-id="'+egg.id+
    '">Sell egg · 🪙 '+money(s.detail.giaBan)+'</button>';
  dom.body.innerHTML=html+'</div>';
  renderDragonPortraits();
}

function renderChooseHatchery(eggId){
  if(!eggById(eggId)){closeModal();return;}
  dom.title.textContent="Choose a Hatchery";
  const rooms=state.buildings.filter(function(b){
    return b.type==="hatchery"&&!b.stored&&eggsInHatchery(b.id).length<hatcheryCapacity(b.level);
  });
  let html='<div class="cards">';
  if(!rooms.length)html+='<div class="note">No Hatchery has an empty nest. Take or sell the current egg first.</div>';
  rooms.forEach(function(b){
    html+='<button class="shop-item" data-action="start-incubation" data-id="'+eggId+'" data-building="'+b.id+'">'+
      '<span class="shop-icon">🥚</span><span><b>Hatchery level '+b.level+'</b><small>'+
      eggsInHatchery(b.id).length+'/'+hatcheryCapacity(b.level)+' tiles occupied</small></span></button>';
  });
  dom.body.innerHTML=html+"</div>";
}
/* Preserve tiny per-species probabilities instead of rounding them to 0.00%. */
