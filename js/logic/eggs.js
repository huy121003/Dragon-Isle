"use strict";

/* LOGIC: Eggs tự tìm tiles ấp còn trống; eggs dư nằm trong kho chờ tiles tiếp theo. */
function eggById(id){return state.eggs.find(function(egg){return egg.id===id;});}
function eggsInHatchery(id){return state.eggs.filter(function(egg){return egg.hatcheryId===id;});}
function freeHatchery(){
  return state.buildings.find(function(b){
    return b.type==="hatchery"&&!b.stored&&
      eggsInHatchery(b.id).length<hatcheryCapacity(b.level);
  });
}
function assignIncubation(egg,house){
  if(!egg||egg.hatcheryId!==null||!house||house.type!=="hatchery"||house.stored||
    eggsInHatchery(house.id).length>=hatcheryCapacity(house.level))return false;
  egg.hatcheryId=house.id;
  egg.startedAt=Date.now();
  egg.readyAt=egg.startedAt+DATA.rarities[DATA.species[egg.species].rarity].incubate*1000;
  return true;
}
function addEgg(speciesId,source,parents,caveId){
  const egg={id:state.nextId++,species:speciesId,source:source,parents:parents||null,caveId:caveId||null,
    hatcheryId:null,startedAt:0,readyAt:0};
  state.eggs.push(egg);
  autoAssignWaitingEggs();
  return egg;
}
function autoAssignWaitingEggs(){
  let assigned=0;
  state.eggs.filter(function(egg){return egg.hatcheryId===null;}).forEach(function(egg){
    const house=freeHatchery();
    if(house&&assignIncubation(egg,house))assigned++;
  });
  return assigned;
}
function buyEgg(speciesId){
  const species=DATA.species[speciesId];
  if(!species||species.elements.length!==1||!species.detail.giaTrung){
    toast("The Shop only sells pure element dragon eggs.");return;
  }
  const level=ELEMENT_UNLOCK[species.elements[0]]||99;
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
function startIncubation(eggId,hatcheryId){
  const egg=eggById(eggId),house=buildingById(hatcheryId);
  if(!assignIncubation(egg,house)){
    toast("The Hatchery is full or the egg is unavailable.");return;
  }
  toast("The mystery egg is incubating.");
  AUDIO.play("place");openModal("hatchery",house.id);saveGame();
}
function speedHatch(eggId){
  skipTimer("egg",eggId);
}
function recordDiscovery(speciesId,parents){
  const fresh=!state.discovered.includes(speciesId);
  if(fresh)state.discovered.push(speciesId);
  if(parents&&parents.length===2){
    const recipe=parents[0]+"|"+parents[1]+"|"+speciesId;
    if(!state.recipes.includes(recipe))state.recipes.push(recipe);
  }
  return fresh;
}
/* LOGIC: Eggs chín được đưa into đúng Habitat người chơi chọn; khi thiếu chỗ vẫn giữ nguyên. */
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
  const dragon={id:state.nextId++,species:egg.species,nickname:nickname,level:1,stars:0,xp:0,hunger:10,
    happiness:80,habitatId:home.id};
  state.dragons.push(dragon);
  state.eggs=state.eggs.filter(function(item){return item.id!==egg.id;});
  const fresh=recordDiscovery(egg.species,egg.parents);
  gainPlayerXP(fresh?20:12);
  const house=buildingById(egg.hatcheryId);
  if(house&&!house.stored){const center=buildingCenter(house);burst(center.x,center.y,
    DATA.elements[species.elements[0]].light,30);}
  AUDIO.play("egg");
  autoAssignWaitingEggs();
  openModal("reveal",{species:egg.species,dragonId:dragon.id,nickname:nickname,fresh:fresh});
  updateHeader();updateTimerBar();saveGame();
}
/* LOGIC: Chỉ eggs trùng đã khám phá mới has thể bán sau khi hoàn tất ấp. */
function sellReadyEgg(eggId){
  const egg=eggById(eggId);
  if(!egg||!egg.hatcheryId||egg.readyAt>Date.now()||!state.discovered.includes(egg.species)){
    toast("Only ready eggs of previously discovered species can be sold.");return;
  }
  const species=DATA.species[egg.species],price=Math.max(1,Math.round(species.detail.giaBan||0));
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
