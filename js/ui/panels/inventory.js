"use strict";

/* UI PANEL: Stored-building and waiting-egg inventory presentation. */
function renderInventory(){
  const stored=state.buildings.filter(function(b){return b.stored;});
  const waiting=state.eggs.filter(function(egg){return egg.hatcheryId===null;});
  dom.title.textContent="🎒 Inventory · "+waiting.length+" eggs";
  let html='<div class="note">Eggs wait for an available Hatchery. Stored buildings keep their levels.</div>'+
    '<h3>🥚 Waiting eggs · '+waiting.length+'</h3>';
  if(!waiting.length)html+='<p>No waiting eggs. Buy one from the Shop or breed dragons.</p>';
  const room=!!freeHatchery();
  waiting.forEach(function(egg){
    html+='<div class="egg-card inventory-egg-card">'+eggShellHtml(egg,false)+
      '<div><b>Mystery Egg</b><small>Waiting for a free nest</small></div>'+
      '<button class="btn good" data-action="egg-find-home" data-id="'+egg.id+'"'+
      (room?'':' disabled')+'>'+(room?'Incubate':'Hatchery full')+'</button></div>';
  });
  html+='<h3>🏠 Stored buildings · '+stored.length+'</h3><div class="cards">';
  if(!stored.length)html+='<p>Select a building on the island and choose Store.</p>';
  stored.forEach(function(b){
    html+='<button class="shop-item" data-action="place-inventory" data-id="'+b.id+'"><span class="shop-icon">'+
      (b.type==="habitat"?DATA.elements[b.element].mark:b.type==="farm"?"🌱":b.type==="hatchery"?"🥚":isBreedingCave(b)?"💞":b.type==="arena"?"⚔️":"🚩")+
      '</span><span><b>'+buildingName(b)+'</b><small>Level '+b.level+' · '+
      reservedFootprint(b).w+'×'+reservedFootprint(b).h+' tiles · tap to place on the island</small></span></button>';
  });
  dom.body.innerHTML=html+"</div>";
}
