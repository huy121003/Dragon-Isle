"use strict";

/**
 * Player/dragon progression mutations.
 *
 * Pure XP/reward formulas live in js/rules/progression.js. Functions here apply
 * those results to the current save state and emit presentation side effects.
 */
/** Add player XP and apply every crossed level reward. */
function gainPlayerXP(value){
  state.player.xp+=value;
  let levels=0,rewardGold=0,rewardFood=0,rewardGems=0;
  while(state.player.xp>=playerXPNeeded(state.player.level)){
    state.player.xp-=playerXPNeeded(state.player.level);
    state.player.level++;levels++;
    const reward=window.DragonRules.progression.levelReward(state.player.level);
    rewardGold+=reward.gold;rewardFood+=reward.food;rewardGems+=reward.gems;
  }
  if(levels){
    state.gold+=rewardGold;state.food+=rewardFood;state.gems+=rewardGems;
    toast("Reached level "+state.player.level+"! +"+money(rewardGold)+" gold, +"+
      money(rewardFood)+" food, +"+money(rewardGems)+" gems.");
    const home=state.buildings.find(function(b){return !b.stored;});
    if(home){const center=buildingCenter(home);burst(center.x,center.y,"#ffe68d",30);}
  }
}
function recordDragonFeeding(dragon){
  if(dragon.level>=dragonLevelCap())return;
  dragon.feedProgress=dragonFeedProgress(dragon)+1;
  const feedsPerLevel=window.DragonConfig.world.feeding.feedsPerLevel;
  if(dragon.feedProgress===feedsPerLevel){
    dragon.feedProgress=0;dragon.level++;
    const xp=window.DragonEconomy.progression.xpSources;
    gainPlayerXP(xp.dragonLevelBase+Math.floor(dragon.level/10)*xp.dragonLevelPerTen);
    toast(dragon.nickname+" ("+DATA.species[dragon.species].name+") reached level "+dragon.level+"!");
  }else toast(dragon.nickname+" has been fed "+dragon.feedProgress+"/"+feedsPerLevel+" times at level "+dragon.level+".");
}
