"use strict";

/**
 * Breeding orchestration.
 *
 * Candidate discovery uses the catalog; probabilities/durations are delegated
 * to js/rules/breeding.js. This file owns only gameplay state mutation/UI side effects.
 */
/**
 * Build normalized offspring candidates for two owned dragons.
 * Returns catalog species IDs with decimal probabilities; does not mutate save state.
 */
function breedingOptions(father,mother,cave){
  if(!father||!mother||father.id===mother.id)return [];
  const fatherSpecies=DATA.species[father.species],motherSpecies=DATA.species[mother.species];
  if(!fatherSpecies||!motherSpecies)return [];
  return window.DragonRules.breeding.offspringOptions({
    fatherSpecies,motherSpecies,fatherLevel:father.level,motherLevel:mother.level,
    speciesById:DATA.species,elementOrder:Object.keys(DATA.elements),
    fourIds:FOUR_IDS,doubleIds:DOUBLE_IDS,quads:DRAGON_DB.quads,
    premium:cave?.type==="premiumCave"
  });
}

/**
 * Breeding duration in seconds. The unused level parameter is retained for
 * compatibility with existing callers until the legacy signature is removed.
 */
function breedingSeconds(species,level,cave,parents){
  const s=typeof species==="string"?DATA.species[species]:species;
  if(!s)return window.DragonConfig.breeding.fallbackSeconds;
  const parentSpecies=(parents||[]).map(function(parent){
    if(typeof parent==="string")return DATA.species[parent];
    if(parent?.species)return DATA.species[parent.species];
    return parent;
  }).filter(Boolean);
  return window.DragonRules.breeding.seconds(
    s,dragonTimeTier(s),ELEMENT_UNLOCK,parentSpecies,cave?.type==="premiumCave");
}
/** Return whether a building is either standard or premium Breeding Cave. */
function isBreedingCave(building){return building?.type==='cave'||building?.type==='premiumCave';}
/** Find this cave's bred egg only while it remains in Inventory without a Hatchery nest. */
function waitingBredEggForCave(caveId){
  return state.eggs.find(function(egg){return egg.source==="breed"&&!egg.hatcheryId&&
    (egg.caveId===caveId||!egg.caveId);});
}
/** Return whether a dragon is locked by an unfinished breeding timer. */
function dragonBusy(id){
  return state.buildings.some(function(b){
    return isBreedingCave(b)&&b.breeding&&b.breeding.readyAt>Date.now()&&
      (b.breeding.fatherId===id||b.breeding.motherId===id);
  });
}
/**
 * Validate parents/cave, roll one offspring, lock parents and start the breeding timer.
 * This action mutates save state and persists immediately.
 */
function startBreeding(caveId,fatherId,motherId){
  const cave=buildingById(caveId),father=dragonById(fatherId),mother=dragonById(motherId);
  if(!isBreedingCave(cave)||cave.stored||cave.breeding||waitingBredEggForCave(cave.id)||
    !father||!mother||
    father.id===mother.id||dragonBusy(father.id)||dragonBusy(mother.id)){
    toast("Choose two different dragons and an available Breeding Cave.");return;
  }
  const breedLevel=window.DragonConfig.progression.breedLevel;
  if(father.level<breedLevel||mother.level<breedLevel){
    toast("Both dragons must reach level "+breedLevel+" to breed.");return;
  }
  const options=breedingOptions(father,mother,cave),roll=Math.random();
  if(!options.length){toast("No possible offspring for these dragons.");return;}
  let total=0,result=options[options.length-1];
  for(const option of options){total+=option.chance;if(roll<total){result=option;break;}}
  const species=DATA.species[result.id];
  cave.breeding={fatherId:father.id,motherId:mother.id,
    fatherSpecies:father.species,motherSpecies:mother.species,
    result:result.id,startedAt:Date.now(),readyAt:0};
  cave.breeding.readyAt=cave.breeding.startedAt+breedingSeconds(species,cave.level,cave,[father,mother])*1000;
  toast("Breeding has started.");
  AUDIO.play("place");openModal("breeding",cave.id);saveGame();
}
/** Convert a completed breeding result into an egg and release both parents. */
function collectBreeding(caveId){
  const cave=buildingById(caveId);
  if(!isBreedingCave(cave)||!cave.breeding||cave.breeding.readyAt>Date.now()){
    toast("Breeding is not finished.");return;
  }
  const breeding=cave.breeding;
  const egg=addEgg(breeding.result,"breed",[breeding.fatherSpecies,breeding.motherSpecies],cave.id);
  cave.breeding=null;
  gainPlayerXP(window.DragonConfig.progression.xpSources.breed);
  toast(egg.hatcheryId?"The bred egg entered the Hatchery.":"The Hatchery is full; the bred egg is waiting in Inventory.");
  const center=buildingCenter(cave);burst(center.x,center.y,"#efbdff",20);
  AUDIO.play("egg");openModal(egg.hatcheryId?"hatchery":"inventory",egg.hatcheryId||null);saveGame();
}
