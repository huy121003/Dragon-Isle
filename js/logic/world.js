"use strict";

/* LOGIC: Thu nhập tích lũy, đói, hạnh phúc và nâng cấp chạy bằng thời gian thực. */
function finishUpgrades(time){
  let finished=0;
  state.buildings.forEach(function(b){
    if(b.upgradeEnds&&b.upgradeEnds<=time){
      b.level=Math.min(maxBuildingLevel(b),b.level+1);b.upgradeEnds=0;b.upgradeStartedAt=0;finished++;
      if(b.type==="habitat")gainPlayerXP(20);
      if(b.type==="hatchery")autoAssignWaitingEggs();
    }
  });
  return finished;
}
function advanceWorld(now){
  const delta = Math.max(0,Math.min(now-state.lastTick,12*60*60*1000));
  if(delta<=0){state.lastTick=now;return {gold:0,finished:0,elapsed:0};}
  const startGold = state.buildings.reduce(function(sum,b){return sum+(b.storedGold||0);},0);
  let remaining=delta,clock=state.lastTick,finished=0;
  const houses = new Map(state.buildings.filter(function(b){return b.type==="habitat"&&!b.stored;})
    .map(function(b){return [b.id,b];}));
  while(remaining>0){
    const step=Math.min(remaining,60000);
    clock+=step;
    finished+=finishUpgrades(clock);
    const minutes=step/60000;
    state.dragons.forEach(function(d){
      const house=houses.get(d.habitatId);
      if(house){
        const goldLimit=habitatGoldCapacity(house),gemLimit=habitatGemCapacity(house);
        if(house.storedGold<goldLimit)house.storedGold=Math.min(goldLimit,
          house.storedGold+dragonIncomePerMinute(d,house)*step/60000);
        if((house.storedGems||0)<gemLimit){
          const progress=(d.gemProgress||0)+step/3600000*DATA.gemPerDragonPerHour;
          const earned=Math.floor(progress+1e-9);
          d.gemProgress=Math.max(0,progress-earned);
          house.storedGems=Math.min(gemLimit,(house.storedGems||0)+earned);
        }
      }
      d.hunger=clamp(d.hunger+minutes,0,100);
      if(d.hunger>=50) d.happiness=clamp(d.happiness-minutes*(d.hunger>=90?1:.35),0,100);
    });
    remaining-=step;
  }
  state.lastTick=now;
  const endGold=state.buildings.reduce(function(sum,b){return sum+(b.storedGold||0);},0);
  return {gold:endGold-startGold,finished:finished,elapsed:delta};
}
function gainPlayerXP(value){
  state.player.xp+=value;
  let leveled=false;
  while(state.player.level<60&&state.player.xp>=playerXPNeeded(state.player.level)){
    state.player.xp-=playerXPNeeded(state.player.level);
    state.player.level++;
    leveled=true;
  }
  if(leveled){
    toast("Reached level "+state.player.level+"!");
    const home=state.buildings.find(function(b){return !b.stored;});
    if(home){const center=buildingCenter(home);burst(center.x,center.y,"#ffe68d",30);}
  }
}
function recordDragonFeeding(dragon){
  if(dragon.level>=dragonLevelCap())return;
  dragon.feedProgress=dragonFeedProgress(dragon)+1;
  if(dragon.feedProgress===4){
    dragon.feedProgress=0;dragon.level++;
    toast(dragon.nickname+" ("+DATA.species[dragon.species].name+") reached level "+dragon.level+"!");
  }else toast(dragon.nickname+" has been fed "+dragon.feedProgress+"/4 times at level "+dragon.level+".");
}
function spendGold(cost){if(state.gold<cost){toast("Not enough gold.");return false;}state.gold-=cost;return true;}
/* LOGIC: Gói thử nghiệm nạp đến mức tối thiểu, không cộng dồn vô hạn khi chạm nhiều lần. */
function topUpTestResources(showNotice){
  const amounts=DATA.testResources;
  state.gold=Math.max(state.gold,amounts.gold);
  state.food=Math.max(state.food,amounts.food);
  state.gems=Math.max(state.gems,amounts.gems);
  if(showNotice){
    toast("Test resources granted: 10 million gold, 100,000 food and 10,000 gems.");
    updateUI();saveGame();
  }
}
function getBuildValid(x,y,mode){
  return !!mode&&footprintValid(x,y,placementFootprint(mode),mode.kind==="move"?mode.id:null);
}
const ELEMENT_UNLOCK={fire:1,water:1,earth:3,wind:5,ice:7,thunder:9,nature:11,dark:14,light:17,metal:20};
function buildLockReason(type,element){
  if(!DATA.buildings[type])return "This building does not exist.";
  if(type==="hatchery")return "The fixed Hatchery is already on the island and cannot be bought.";
  if(type==="habitat"&&state.player.level<(ELEMENT_UNLOCK[element]||99))
    return "Habitat "+(DATA.elements[element]?.name||"element")+" unlocks at level "+ELEMENT_UNLOCK[element]+".";
  if((type==="cave"||type==="arena"||type==="academy")&&state.buildings.some(b=>b.type===type))
    return "Only one "+DATA.buildings[type].name+" is allowed per island.";
  return "";
}
function completePlacement(x,y){
  const mode=ui.mode;
  if(!mode||!getBuildValid(x,y,mode)){
    toast("Place this on unlocked land without overlapping another building.");return;
  }
  if(mode.kind==="move"){
    const building=buildingById(mode.id);
    if(!building){stopMode();return;}
    if(building.upgradeEnds||building.type==="hatchery"){toast("This building cannot be moved.");stopMode();return;}
    building.x=x;building.y=y;building.stored=false;
    ui.selection={type:"building",id:building.id};
    toast("Building moved.");
  }else if(mode.kind==="inventory"){
    const building=buildingById(mode.id);
    if(!building||!building.stored){stopMode();return;}
    building.x=x;building.y=y;building.stored=false;
    ui.selection={type:"building",id:building.id};
    toast("Stored building placed.");
  }else if(mode.kind==="buy"){
    const type=mode.type,price=buildingPurchaseCost(type,mode.element);
    const reason=buildLockReason(type,mode.element);
    if(reason){toast(reason);stopMode();return;}
    if(!spendGold(price))return;
    const building={id:state.nextId++,type:type,element:mode.element||null,x:x,y:y,level:1,
      stored:false,storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null};
    state.buildings.push(building);
    if(type==="hatchery")autoAssignWaitingEggs();
    ui.selection={type:"building",id:building.id};
    if(type==="habitat")gainPlayerXP(15);
    toast("Built "+buildingName(building)+".");
  }
  const f=placementFootprint(mode);
  burst((x+f.w/2)*DATA.tile,(y+f.h/2)*DATA.tile,"#fff3b8",12);
  AUDIO.play("place");
  stopMode();
  updateUI();
  saveGame();
}
function buildingName(b){return b.type==="habitat"?DATA.elements[b.element].name+" Habitat":DATA.buildings[b.type].name;}
function collect(building){
  if(!building||building.type!=="habitat"||building.stored)return;
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
function feedDragon(id){
  const d=dragonById(id);
  if(!d)return;
  if(dragonBusy(id)){toast("This dragon is breeding. Wait until it finishes.");return;}
  if(d.level>=dragonLevelCap()){toast("Dragon level cap: "+dragonLevelCap()+". Upgrade the Dragon Academy to raise it.");return;}
  const cost=dragonFeedCost(d.level);
  if(state.food<cost){toast("Requires "+money(cost)+" food to feed "+d.nickname+".");return;}
  state.food-=cost;
  d.hunger=clamp(d.hunger-8,0,100);
  d.happiness=clamp(d.happiness+5,0,100);
  recordDragonFeeding(d);
  const home=buildingById(d.habitatId);
  if(home&&!home.stored){const center=buildingCenter(home);burst(center.x,center.y,"#ffb0bd",12);}
  AUDIO.play("feed");
  updateUI();saveGame();
}
