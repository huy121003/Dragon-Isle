"use strict";

/**
 * Building placement/purchase orchestration.
 *
 * Validation and prices are delegated to shared state/rule helpers; this module
 * owns the state mutation plus UI/audio/save side effects of placing a building.
 */
function getBuildValid(x,y,mode){
  return !!mode&&footprintValid(x,y,placementFootprint(mode),mode.kind==="move"?mode.id:null);
}
function buildLockReason(type,element){
  if(!DATA.buildings[type])return "This building does not exist.";
  if(type==="hatchery")return "The fixed Hatchery is already on the island and cannot be bought.";
  if(type==="farm"&&farmCount()>=farmLimit(state.player.level)){
    const farmConfig=window.DragonConfig.progression.farms;
    const next=(Math.floor(state.player.level/farmConfig.everyLevels)+1)*farmConfig.everyLevels;
    return "Farm limit reached ("+farmCount()+"/"+farmLimit(state.player.level)+"). "+
      (farmLimit(state.player.level)<farmConfig.maxFarms?
        "Unlock another at player level "+next+".":"Maximum reached.");
  }
  if(type==="habitat"&&!DATA.elements[element])return "Unknown Habitat element.";
  if(type==="habitat"){
    const need=contentRequirementLevel(ELEMENT_UNLOCK[element]||99);
    if(state.player.level<need)
      return "Habitat "+(DATA.elements[element]?.name||"element")+" unlocks at level "+need+".";
  }
  if((type==="cave"||type==="premiumCave"||type==="arena"||type==="academy")&&
    state.buildings.some(b=>b.type===type))
    return "Only one "+DATA.buildings[type].name+" can be owned.";
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
    if(building.upgradeEnds){toast("This building cannot be moved during an upgrade.");stopMode();return;}
    building.x=x;building.y=y;building.stored=false;
    ui.selection={type:"building",id:building.id};
    toast("Building moved.");
  }else if(mode.kind==="inventory"){
    const building=buildingById(mode.id);
    if(!building||!building.stored){stopMode();return;}
    advanceWorld(Date.now());
    building.x=x;building.y=y;building.stored=false;
    ui.selection={type:"building",id:building.id};
    toast("Stored building placed.");
  }else if(mode.kind==="buy"){
    const type=mode.type,price=buildingPurchaseCost(type,mode.element);
    const reason=buildLockReason(type,mode.element);
    if(reason){toast(reason);stopMode();return;}
    if(type==='premiumCave'){
      if(state.gems<price){toast("Not enough gems.");return;}
      state.gems-=price;
    }else if(!spendGold(price))return;
    const building={id:state.nextId++,type:type,element:mode.element||null,x:x,y:y,level:1,
      stored:false,storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null};
    if(type==='habitat'){
      building.purchaseCost=price;
      state.habitatPurchases[mode.element]=(state.habitatPurchases[mode.element]||0)+1;
    }
    state.buildings.push(building);
    if(type==="hatchery")autoAssignWaitingEggs();
    ui.selection={type:"building",id:building.id};
    gainPlayerXP(window.DragonConfig.progression.xpSources.buildingBuild[type]||0);
    toast("Built "+buildingName(building)+".");
  }
  const f=placementFootprint(mode);
  const effect=gridToScreen(x+f.w/2,y+f.h/2);
  burst(effect.x,effect.y,"#fff3b8",12);
  AUDIO.play("place");
  stopMode();
  updateUI();
  saveGame();
}
function buildingName(b){return b.type==="habitat"?DATA.elements[b.element].name+" Habitat":DATA.buildings[b.type].name;}
