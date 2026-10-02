"use strict";

/* LOGIC: Eggs use free Hatchery nests first; shop eggs can wait in Inventory. */
/** Find one egg in current save state by numeric ID. */
function eggById(id){return state.eggs.find(function(egg){return egg.id===id;});}
/** Return all eggs currently occupying nests in one Hatchery. */
function eggsInHatchery(id){return state.eggs.filter(function(egg){return egg.hatcheryId===id;});}
/** Return the first active Hatchery with capacity, or undefined when all nests are occupied. */
function freeHatchery(){
  return state.buildings.find(function(b){
    return b.type==="hatchery"&&!b.stored&&
      eggsInHatchery(b.id).length<hatcheryCapacity(b.level);
  });
}
/**
 * Assign a waiting egg to a Hatchery and start its incubation clock.
 * @returns {boolean} True only when a nest was reserved and timer state was mutated.
 */
function assignIncubation(egg,house){
  if(!egg||egg.hatcheryId!==null||!house||house.type!=="hatchery"||house.stored||
    eggsInHatchery(house.id).length>=hatcheryCapacity(house.level))return false;
  egg.hatcheryId=house.id;
  egg.startedAt=Date.now();
  egg.readyAt=egg.startedAt+hatchingSeconds(DATA.species[egg.species])*1000;
  return true;
}
/** Create an egg, enqueue it, then assign any available Hatchery nest. Breeding checks space before calling this. */
function addEgg(speciesId,source,parents,caveId){
  const egg={id:state.nextId++,species:speciesId,source:source,parents:parents||null,caveId:caveId||null,
    hatcheryId:null,startedAt:0,readyAt:0};
  state.eggs.push(egg);
  autoAssignWaitingEggs();
  return egg;
}
/** Fill available Hatchery nests from Inventory order and return the number assigned. */
function autoAssignWaitingEggs(){
  let assigned=0;
  state.eggs.filter(function(egg){return egg.hatcheryId===null;}).forEach(function(egg){
    const house=freeHatchery();
    if(house&&assignIncubation(egg,house))assigned++;
  });
  return assigned;
}
/** Purchase an unlocked pure-element egg and persist the resulting resource/egg state. */
function buyEgg(speciesId){
  const species=DATA.species[speciesId];
  if(!species||species.elements.length!==1||!species.detail.giaTrung){
    toast("The Shop only sells pure element dragon eggs.");return;
  }
  const level=contentRequirementLevel(ELEMENT_UNLOCK[species.elements[0]]||99);
  if(state.player.level<level){toast("This egg unlocks at level "+level+".");return;}
  const price=shopEggPrice(species);
  if(price.vang&&!spendGold(price.vang))return;
  if(price.gem){
    if(state.gems<price.gem){toast("Not enough gems.");return;}
    state.gems-=price.gem;
  }
  const egg=addEgg(species.id,"shop",null);
  toast(egg.hatcheryId?"The egg entered the Hatchery and incubation began.":"The Hatchery is full; the egg is waiting in Inventory.");
  AUDIO.play("place");updateUI();saveGame();
}
/** Manually move a waiting Inventory egg into a specific Hatchery. */
function startIncubation(eggId,hatcheryId){
  const egg=eggById(eggId),house=buildingById(hatcheryId);
  if(!assignIncubation(egg,house)){
    toast("The Hatchery is full or the egg is unavailable.");return;
  }
  toast("The mystery egg is incubating.");
  AUDIO.play("place");openModal("hatchery",house.id);saveGame();
}
/** Delegate instant egg completion to the shared timer/Gem flow. */
function speedHatch(eggId){
  skipTimer("egg",eggId);
}
/** Record first discovery plus an optional two-parent breeding recipe. */
function recordDiscovery(speciesId,parents){
  const fresh=!state.discovered.includes(speciesId);
  if(fresh)state.discovered.push(speciesId);
  if(parents&&parents.length===2){
    const recipe=parents[0]+"|"+parents[1]+"|"+speciesId;
    if(!state.recipes.includes(recipe))state.recipes.push(recipe);
  }
  return fresh;
}
/**
 * Hatch a ready egg into a compatible Habitat.
 * The egg remains unchanged when no compatible Habitat has capacity.
 */
function hatchEgg(eggId,habitatId){
  const egg=eggById(eggId);
  if(!egg||!egg.hatcheryId||egg.readyAt>Date.now()){
    toast("The egg is not ready.");return;
  }
  const species=DATA.species[egg.species];
  const candidates=state.buildings.filter(function(b){
    return habitatHasRoom(b)&&species.elements.includes(b.element);
  });
  const home=habitatId?candidates.find(function(b){return b.id===habitatId;}):candidates[0];
  if(!home){
    toast("No matching Habitat has room. Build, move dragons, or upgrade one before hatching.");
    return;
  }
  advanceWorld(Date.now());
  const nickname=uniqueNickname(state.dragons.map(function(d){return d.nickname;}));
  const care=window.DragonConfig.world.initialDragon;
  const dragon={id:state.nextId++,species:egg.species,nickname:nickname,level:1,stars:0,xp:0,
    hunger:care.hunger,happiness:care.happiness,habitatId:home.id};
  state.dragons.push(dragon);
  state.eggs=state.eggs.filter(function(item){return item.id!==egg.id;});
  const fresh=recordDiscovery(egg.species,egg.parents);
  gainPlayerXP(fresh?window.DragonConfig.progression.xpSources.hatchNew:
    window.DragonConfig.progression.xpSources.hatchKnown);
  const house=buildingById(egg.hatcheryId);
  if(house&&!house.stored){const center=buildingCenter(house);burst(center.x,center.y,
    DATA.elements[species.elements[0]].light,30);}
  AUDIO.play("egg");
  autoAssignWaitingEggs();
  openModal("reveal",{species:egg.species,dragonId:dragon.id,nickname:nickname,fresh:fresh});
  updateHeader();updateTimerBar();saveGame();
}
/** Sell a fully incubated egg only when its species was already discovered. */
function sellReadyEgg(eggId){
  const egg=eggById(eggId);
  if(!egg||!egg.hatcheryId||egg.readyAt>Date.now()||!state.discovered.includes(egg.species)){
    toast("Only ready eggs of previously discovered species can be sold.");return;
  }
  const species=DATA.species[egg.species],resale=window.DragonConfig.dragons.resale;
  const price=Math.max(resale.minimumGold,Math.round((species.detail.giaBan||0)*
    window.DragonConfig.buildings.upgrade.sellMultiplier));
  if(!window.confirm("Sell egg "+species.name+" for "+money(price)+" gold?"))return;
  const house=buildingById(egg.hatcheryId);
  state.eggs=state.eggs.filter(function(item){return item.id!==eggId;});
  state.gold+=price;
  autoAssignWaitingEggs();
  if(house&&!house.stored){
    const center=buildingCenter(house);floating("+"+money(price)+" gold",center.x,center.y-12);
  }
  AUDIO.play("coin");toast("Sold the egg for "+money(price)+" gold.");
  if(house&&!house.stored)openModal("hatchery",house.id);else closeModal();
  updateUI();saveGame();
}
