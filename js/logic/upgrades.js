"use strict";

/**
 * Building upgrade orchestration.
 * Costs and timing come from shared config/rules; this module applies state changes.
 */
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
