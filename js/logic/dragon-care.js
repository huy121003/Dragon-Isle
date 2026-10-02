"use strict";

/**
 * Dragon care actions such as feeding.
 *
 * Feed cost and care deltas come from shared rules/config. This module only
 * validates the action, mutates state and triggers presentation/save effects.
 */
/** Validate and perform one feeding action, including food charge and progression. */
function feedDragon(id){
  const d=dragonById(id);
  if(!d)return;
  if(dragonBusy(id)){toast("This dragon is breeding. Wait until it finishes.");return;}
  if(d.level>=dragonLevelCap()){toast("Dragon level cap: "+dragonLevelCap()+". Upgrade the Dragon Academy to raise it.");return;}
  const cost=dragonFeedCost(d.level);
  if(state.food<cost){toast("Requires "+money(cost)+" food to feed "+d.nickname+".");return;}
  advanceWorld(Date.now());
  state.food-=cost;
  const needs=window.DragonRules.world.feedNeeds(d);
  d.hunger=needs.hunger;d.happiness=needs.happiness;
  recordDragonFeeding(d);
  const home=buildingById(d.habitatId);
  if(home&&!home.stored){const center=buildingCenter(home);burst(center.x,center.y,"#ffb0bd",12);}
  AUDIO.play("feed");
  updateUI();saveGame();
}
