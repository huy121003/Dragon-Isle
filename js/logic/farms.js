"use strict";

/**
 * Farm planting and harvesting actions.
 */
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
