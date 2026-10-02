"use strict";

/**
 * Habitat collection actions.
 */
function collect(building){
  if(!building||building.type!=="habitat"||building.stored)return;
  advanceWorld(Date.now());
  const amount=Math.max(0,Number(building.storedGold)||0);
  const gems=Math.max(0,Math.floor(Number(building.storedGems)||0));
  if(amount<.005&&!gems){toast("Gold and gems are still being produced.");return;}
  building.storedGold=0;
  building.storedGems=0;
  state.gold+=amount;
  state.gems+=gems;
  const center=buildingCenter(building);
  burst(center.x,center.y,"#ffd657",16);
  if(amount>=.005)floating("+"+goldDecimal(amount)+" gold",center.x,center.y-12);
  if(gems)floating("+"+money(gems)+" gem",center.x,center.y-36);
  if(gems)toast("Collected "+money(gems)+" gems from the Habitat.");
  AUDIO.play("coin");
  updateUI();saveGame();
}
