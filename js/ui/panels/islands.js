"use strict";

/* UI PANEL: Island browser/unlock modal presentation. */
function renderIslands(){
  dom.title.textContent="🗺️ Island World";
  let html='<div class="note">All '+DATA.islands.length+' floating islands share one continuous map. Drag the world to travel and use the mouse wheel or pinch to zoom.</div><div class="actions"><button class="btn primary" data-action="show-world">See entire world on the map</button></div><div class="island-list">';
  DATA.islands.forEach(function(island,index){
    const owned=index<state.unlockedIslands,next=index===state.unlockedIslands;
    const count=owned?islandRegionCount(index):0,total=islandRegionTotal(index);
    const issue=next?islandUnlockIssue(index):"",ready=next&&!issue;
    const element=island.element&&DATA.elements[island.element];
    html+='<div class="island-item '+(owned?'owned':'locked')+'"><span class="island-symbol" style="--island-color:'+(element?element.color:'#86c981')+'">'+(element?element.mark:'🏝️')+'</span><div class="island-info"><b>'+(index+1)+'. '+esc(island.name)+'</b><small>'+(element?element.name+' element · ':'Starting island · ')+island.size+'×'+island.size+' tiles</small><small>'+esc(island.description||'')+'</small><small>'+(owned?count+'/'+total+' regions unlocked':next?resourceAmount('gems',islandUnlockCost(index))+(issue?' · '+esc(issue):''):'Unlock the previous island first')+'</small>'+(owned?'<div class="island-progress"><span style="width:'+(count/total*100)+'%"></span></div>':'')+'</div><div class="island-actions">'+
      (owned?'<button class="btn primary" data-action="focus-island" data-id="'+index+'">View on map</button>':ready?'<button class="btn resource-action" data-action="unlock-island" data-id="'+index+'">Unlock · '+resourceAmount('gems',islandUnlockCost(index))+'</button>':
      '<button class="btn" disabled>🔒 Locked</button>')+'</div></div>';
  });
  dom.body.innerHTML=html+'</div>';
}
