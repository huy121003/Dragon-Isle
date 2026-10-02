"use strict";

/* Five upgrades, each adding 5% to the dragon's HP, attack and defense. */
function starRequirement(dragon){
  return DATA.progression.starUpgrades[Math.max(0,Math.floor(Number(dragon.stars)||0))]||null;
}
function starDonors(dragon,requirement=starRequirement(dragon)){
  if(!dragon||!requirement)return [];
  // Spend unassigned dragons first and the lowest qualifying levels next.
  return state.dragons.filter(function(other){
    return other.id!==dragon.id&&other.species===dragon.species&&
      other.level>=requirement.level&&(other.stars||0)===0&&!dragonBusy(other.id);
  }).sort(function(a,b){
    return Number(!!a.habitatId)-Number(!!b.habitatId)||a.level-b.level||a.id-b.id;
  });
}
function upgradeDragonStar(id){
  const dragon=dragonById(id);
  if(!dragon||dragonBusy(id)){toast("This dragon is unavailable while breeding.");return false;}
  const required=starRequirement(dragon);
  if(!required){toast("This dragon already has five stars.");return false;}
  const donors=starDonors(dragon,required);
  if(donors.length<required.dragons){
    toast("Need "+required.dragons+" same-species dragons at level "+required.level+" or above.");return false;
  }
  if(state.gold<required.gold||state.food<required.food||state.gems<required.gems){
    toast("Not enough gold, food or gems for the next star.");return false;
  }
  const used=donors.slice(0,required.dragons);
  const names=used.map(d=>d.nickname+" (Lv"+d.level+")").join(", ");
  if(!window.confirm("Raise "+dragon.nickname+" to "+((dragon.stars||0)+1)+" star(s)?\n"+
      "Spend "+money(required.gold)+" gold, "+money(required.food)+" food, "+
      money(required.gems)+" gems and permanently consume "+used.length+" dragons:\n"+
      names+"."))return false;
  advanceWorld(Date.now());
  // Recheck after confirmation, before charging or removing any dragons.
  if(!state.dragons.includes(dragon)||dragonBusy(id)||
      state.gold<required.gold||state.food<required.food||state.gems<required.gems||
      starDonors(dragon,required).length<required.dragons)return false;
  const ids=new Set(used.map(d=>d.id));
  state.gold-=required.gold;state.food-=required.food;state.gems-=required.gems;
  state.dragons=state.dragons.filter(d=>!ids.has(d.id));
  dragon.stars=(dragon.stars||0)+1;
  if(ui.selection?.type==='dragon'&&ids.has(ui.selection.id))ui.selection=null;
  if(ui.arena?.draft){
    ui.arena.draft.attack=ui.arena.draft.attack.filter(id=>!ids.has(id));
    ui.arena.draft.defense=ui.arena.draft.defense.filter(id=>!ids.has(id));
  }
  const bonus=Math.round(dragon.stars*window.DragonConfig.combat.star.statBonusPerStar*100);
  toast(dragon.nickname+" reached "+dragon.stars+" star(s)! HP, attack and defense +"+bonus+"%.");
  openModal("dragon-detail",dragon.id);updateUI();saveGame();
  return true;
}
