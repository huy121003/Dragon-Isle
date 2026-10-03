"use strict";

/**
 * Farm planting and harvesting actions.
 */
/** Start one crop when the Farm level/cost/state permits it. */
function plantCrop(buildingId,cropId){
  const b=buildingById(buildingId),crop=cropById(cropId);
  if(!b||b.type!=="farm"||b.stored||!crop)return false;
  if((crop.unlockLevel||DATA.crops.indexOf(crop)+1)>b.level){toast("Upgrade the Farm to unlock this crop.");return false;}
  if(b.crop){toast("The Farm is growing a crop.");return false;}
  if(!spendGold(crop.cost))return false;
  const startedAt=Date.now();
  b.crop={id:crop.id,startedAt:startedAt,readyAt:startedAt+crop.duration*1000};
  toast("Planted "+crop.name+".");
  AUDIO.play("place");updateUI();saveGame();
  return true;
}
/** Harvest a ready crop, grant Food/XP and clear the Farm slot. */
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
