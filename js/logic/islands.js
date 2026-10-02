"use strict";

/**
 * Island/Land actions and camera navigation for the world map.
 * Pricing and gates are delegated to shared state/rule helpers.
 */
/** Buy one adjacent land region using Gold or Gems. */
function unlockLand(x,y,currency){
  const region=regionOf(x,y);
  if(!region||region.index>=state.unlockedIslands||unlocked(x,y)||!regionAdjacent(region))return;
  const tiles=expansionTiles(x,y),cost=expansionCost(x,y),gemCost=expansionGemCost(x,y);
  if(!tiles.length)return;
  if(currency==="gem"){
    if(state.gems<gemCost){toast("Not enough gems.");return;}
    state.gems-=gemCost;
  }else if(!spendGold(cost))return;
  state.regions.push(region.id);state.expansions+=tiles.length;
  gainPlayerXP(window.DragonConfig.progression.xpSources.land);
  const effect=gridToScreen(x+.5,y+.5);burst(effect.x,effect.y,"#c9f89b",15);
  ui.selection=null;
  AUDIO.play("place");updateUI();saveGame();
}
/** Unlock the next island after progression, ownership and Gem requirements pass. */
function unlockIsland(index){
  if(!Number.isInteger(index)||index!==state.unlockedIslands||index>=DATA.islands.length)return;
  const issue=islandUnlockIssue(index);
  if(issue){toast(issue);return;}
  const island=DATA.islands[index];
  const cost=islandUnlockCost(index);
  state.gems-=cost;state.unlockedIslands++;
  ui.cloudReveal={index,startedAt:performance.now()};
  const middle=Math.floor(island.size/DATA.islandRegionSize/2);
  state.regions.push(index+":"+middle+":"+middle);
  gainPlayerXP(window.DragonConfig.progression.xpSources.island);
  ui.selection=null;
  focusIsland(index);
  toast("Unlocked "+island.name+"!");AUDIO.play("place");updateUI();saveGame();
}
/** Center/zoom the camera onto one island without changing progression state. */
function focusIsland(index){
  const island=DATA.islands[index];if(!island)return;
  const center=gridToScreen(island.x+island.size/2,island.y+island.size/2);
  ui.camera.x=center.x;ui.camera.y=center.y;
  ui.camera.zoom=clamp(Math.min(viewW/(island.size*DATA.tileW*1.15),
    viewH/(island.size*DATA.tileH*1.15)),.08,.75);
  clampCamera();
  ui.selection=null;closeModal();updateUI();
}
/** Fit every island into the current viewport. */
function showWorld(){
  const points=DATA.islands.flatMap(i=>footprintVertices(i.x,i.y,i.size,i.size));
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  ui.camera.x=(Math.min(...xs)+Math.max(...xs))/2;
  ui.camera.y=(Math.min(...ys)+Math.max(...ys))/2;
  ui.camera.zoom=Math.min(viewW/((Math.max(...xs)-Math.min(...xs))*1.15),
    viewH/((Math.max(...ys)-Math.min(...ys))*1.15));
  clampCamera();ui.selection=null;closeModal();updateUI();
}
