"use strict";

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
function focusIsland(index){
  const island=DATA.islands[index];if(!island)return;
  const center=gridToScreen(island.x+island.size/2,island.y+island.size/2);
  ui.camera.x=center.x;ui.camera.y=center.y;
  ui.camera.zoom=clamp(Math.min(viewW/(island.size*DATA.tileW*1.15),
    viewH/(island.size*DATA.tileH*1.15)),.08,.75);
  clampCamera();
  ui.selection=null;closeModal();updateUI();
}
function showWorld(){
  const points=DATA.islands.flatMap(i=>footprintVertices(i.x,i.y,i.size,i.size));
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  ui.camera.x=(Math.min(...xs)+Math.max(...xs))/2;
  ui.camera.y=(Math.min(...ys)+Math.max(...ys))/2;
  ui.camera.zoom=Math.min(viewW/((Math.max(...xs)-Math.min(...xs))*1.15),
    viewH/((Math.max(...ys)-Math.min(...ys))*1.15));
  clampCamera();ui.selection=null;closeModal();updateUI();
}
function upgradeBuilding(id){
  const b=buildingById(id);
  if(!b||b.stored||b.type==="decor")return;
  if(b.level>=maxBuildingLevel(b)){toast("This building is at its maximum level.");return;}
  if(b.upgradeEnds){toast("This building is upgrading.");return;}
  const hatcheryGate=b.type==="hatchery"?hatcheryUpgradePlayerLevel(b.level):1;
  if(b.type==="hatchery"&&state.player.level<hatcheryGate){
    toast("Hatchery level "+(b.level+1)+" unlocks at player level "+hatcheryGate+".");return;
  }
  const academyCost=b.type==="academy"?academyUpgradeCost(b.level):null;
  if(academyCost&&state.player.level<academyCost.playerLevel){
    toast("Dragon Academy level "+(b.level+1)+" requires player level "+academyCost.playerLevel+".");return;
  }
  if(academyCost&&academyQualifiedDragonCount(academyCost)<academyCost.requiredDragons){
    toast("Dragon Academy level "+(b.level+1)+" requires owning "+academyCost.requiredDragons+
      " dragons at level "+academyCost.requiredDragonLevel+" or above.");return;
  }
  if(!footprintValid(b.x,b.y,buildingFootprint(b,b.level+1),b.id)){
    toast("Unlock enough free land around the building before upgrading.");return;
  }
  if(academyCost){
    if(state.gold<academyCost.gold||state.food<academyCost.food||state.gems<academyCost.gems){
      toast("Upgrade needs "+academyCost.gold+" gold, "+academyCost.food+" food and "+academyCost.gems+" gems.");return;
    }
    state.gold-=academyCost.gold;state.food-=academyCost.food;state.gems-=academyCost.gems;
  }else{
    const cost=standardUpgradeCost(b);
    if(state.gold<cost.gold||state.gems<cost.gems){
      toast("Upgrade needs "+money(cost.gold)+" gold and "+money(cost.gems)+" gems.");return;
    }
    state.gold-=cost.gold;state.gems-=cost.gems;
  }
  b.upgradeStartedAt=Date.now();
  b.upgradeEnds=b.upgradeStartedAt+upgradeSeconds(b)*1000;
  toast("Upgrading "+buildingName(b)+".");
  AUDIO.play("place");updateUI();saveGame();
}
function plantCrop(buildingId,cropId){
  const b=buildingById(buildingId),crop=cropById(cropId);
  if(!b||b.type!=="farm"||b.stored||!crop)return false;
  if(DATA.crops.indexOf(crop)>=b.level){toast("Upgrade the Farm to unlock this crop.");return false;}
  if(b.crop){toast("The Farm is growing a crop.");return false;}
  if(!spendGold(crop.cost))return false;
  const startedAt=Date.now();
  b.crop={id:crop.id,startedAt:startedAt,readyAt:startedAt+crop.duration*1000};
  toast("Planted "+crop.name+".");
  AUDIO.play("place");updateUI();saveGame();
  return true;
}
function harvest(b){
  if(!b.crop||Date.now()<b.crop.readyAt){toast("The crop is not ready.");return;}
  const crop=cropById(b.crop.id);
  const amount=Math.round(crop.yield*(1+(b.level-1)*window.DragonConfig.buildings.farm.yieldBonusPerExtraLevel));
  state.food+=amount;b.crop=null;
  gainPlayerXP(window.DragonConfig.progression.xpSources.crop[DATA.crops.indexOf(crop)]||0);
  const center=buildingCenter(b);
  burst(center.x,center.y,"#a8e873",18);
  floating("+"+money(amount)+" food",center.x,center.y-12);
  AUDIO.play("coin");updateUI();saveGame();
}
function storeBuilding(id){
  const b=buildingById(id);
  if(!b||b.stored)return;
  if(b.type!=="habitat"||b.upgradeEnds){toast("Only Habitats can be stored.");return;}
  if(b.type==="habitat"&&occupants(b).some(function(d){return dragonBusy(d.id);})){
    toast("Wait for breeding dragons before storing this Habitat.");return;
  }
  advanceWorld(Date.now());
  b.stored=true;ui.selection=null;
  toast(buildingName(b)+" was stored. Dragons stop producing gold and gems while it is stored.");
  updateUI();saveGame();
}
function sellBuilding(id){
  const b=buildingById(id);
  if(!b)return;
  if(b.type!=="habitat"||b.upgradeEnds){toast("Only Habitats can be sold.");return;}
  if(b.type==="habitat"&&occupants(b).length){toast("Move or sell every dragon before selling the Habitat.");return;}
  if(b.type==="habitat"&&occupants(b).some(function(d){return dragonBusy(d.id);})){
    toast("Wait for breeding dragons before selling the Habitat.");return;
  }
  const refund=Math.round((b.purchaseCost||habitatPurchaseCost(b.element,0))*
    Math.pow(window.DragonConfig.buildings.upgrade.goldFactor,b.level-1)*DATA.buildings[b.type].sellRate*window.DragonConfig.buildings.upgrade.sellMultiplier);
  if(!window.confirm("Sell "+buildingName(b)+" for "+money(refund)+" gold?"))return;
  state.gold+=refund+(b.storedGold||0);
  state.gems+=Math.max(0,Math.floor(Number(b.storedGems)||0));
  state.buildings=state.buildings.filter(function(item){return item.id!==id;});
  ui.selection=null;toast("Building sold.");
  updateUI();saveGame();
}
function sellDragon(id){
  const dragon=dragonById(id);
  if(!dragon||dragonBusy(id)){toast("A breeding dragon cannot be sold.");return;}
  const species=DATA.species[dragon.species];
  const resale=window.DragonConfig.dragons.resale;
  const price=Math.max(resale.minimumGold,Math.round((species.detail.giaBan||resale.minimumGold)*
    window.DragonConfig.buildings.upgrade.sellMultiplier*(1+(dragon.level-1)*resale.levelBonus)));
  if(!window.confirm("Sell "+dragon.nickname+" for "+money(price)+" gold?"))return;
  advanceWorld(Date.now());
  state.dragons=state.dragons.filter(d=>d.id!==id);
  state.gold+=price;ui.selection=null;
  toast("Sold dragon for "+money(price)+" gold.");
  openModal("dragons");updateUI();saveGame();
}
function assignDragon(dragonId,buildingId){
  const d=dragonById(dragonId),b=buildingById(buildingId);
  if(d&&dragonBusy(d.id)){toast("Breeding dragons cannot change Habitats.");return;}
  if(!d||!b||!habitatHasRoom(b)||!DATA.species[d.species].elements.includes(b.element)){
    toast("The Habitat is full or its element does not match.");return;
  }
  advanceWorld(Date.now());
  d.habitatId=b.id;
  toast("Moved "+d.nickname+" into "+buildingName(b)+".");
  openModal("dragons");saveGame();
}
