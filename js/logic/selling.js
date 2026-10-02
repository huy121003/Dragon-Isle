"use strict";

/**
 * Building and dragon resale actions.
 */
/** Sell an empty Habitat and return configured resale resources. */
function sellBuilding(id){
  const b=buildingById(id);
  if(!b)return;
  if(b.type!=="habitat"||b.upgradeEnds){toast("Only Habitats can be sold.");return;}
  if(b.type==="habitat"&&occupants(b).length){toast("Move or sell every dragon before selling the Habitat.");return;}
  if(b.type==="habitat"&&occupants(b).some(function(d){return dragonBusy(d.id);})){
    toast("Wait for breeding dragons before selling the Habitat.");return;
  }
  const refund=Math.round((b.purchaseCost||habitatPurchaseCost(b.element,0))*
    Math.pow(window.DragonConfig.buildings.upgrade.goldFactor,b.level-1)*\n    window.DragonConfig.buildings.definitions[b.type].sellRate*\n    window.DragonConfig.buildings.upgrade.sellMultiplier);
  if(!window.confirm("Sell "+buildingName(b)+" for "+money(refund)+" gold?"))return;
  state.gold+=refund+(b.storedGold||0);
  state.gems+=Math.max(0,Math.floor(Number(b.storedGems)||0));
  state.buildings=state.buildings.filter(function(item){return item.id!==id;});
  ui.selection=null;toast("Building sold.");
  updateUI();saveGame();
}
/** Sell an idle dragon using configured level/resale scaling. */
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
