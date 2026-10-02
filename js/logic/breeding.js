"use strict";

/* Four-element offspring need two triple parents; Double offspring need two four-slot parents. */
const BREED_TIER_WEIGHTS={
  "1+1":[25,75],"1+2":[20,80],"1+3":[18,82],"1+4":[16,84],
  "2+2":[20,80],"2+3":[18,82],"2+4":[16,84],
  "3+3":[16,84],"3+4":[15,85],"4+4":[14,86]
};
function breedingOptions(father,mother,cave){
  if(!father||!mother||father.id===mother.id)return [];
  const F=DATA.species[father.species],M=DATA.species[mother.species];
  if(!F||!M)return [];
  const pool=[...new Set(F.elements.concat(M.elements))];
  const order=Object.keys(DATA.elements);
  const canInherit=parts=>parts.some(e=>F.elements.includes(e))&&
    parts.some(e=>M.elements.includes(e));
  const groups=[pool.map(e=>e),[],[],[],[]];
  for(const first of pool)for(const second of pool){
    if(first===second)continue;
    const parts=[first,second];
    if(canInherit(parts))groups[1].push(parts.join(">"));
  }
  if(pool.length>=3)for(const first of pool){
    const rest=order.filter(e=>e!==first&&pool.includes(e));
    for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++){
      const parts=[first,rest[i],rest[j]],id=parts.join(">");
      if(canInherit(parts)&&DATA.species[id])groups[2].push(id);
    }
  }
  groups[3]=pool.length<4?[]:FOUR_IDS.filter(function(id){
    const parts=DATA.species[id].elements;
    return parts.every(e=>pool.includes(e))&&canInherit(parts)&&
      DRAGON_DB.quads[parts.slice().sort().join('|')]===id;
  });
  const readyForDouble=F.elements.length===4&&M.elements.length===4&&
    F.elements[0]===M.elements[0]&&
    father.level>=window.DragonEconomy.breeding.doubleMinParentLevel&&
    mother.level>=window.DragonEconomy.breeding.doubleMinParentLevel&&
    new Set(F.elements).size>=3&&new Set(M.elements).size>=3;
  groups[4]=!readyForDouble?[]:DOUBLE_IDS.filter(function(id){
    return DATA.species[id].elements[0]===F.elements[0];
  });
  const tierKey=[F.elements.length,M.elements.length].sort(function(a,b){return a-b;}).join("+");
  const rules=window.DragonEconomy.breeding,avg=(father.level+mother.level)/2;
  const three=groups[2].length?Math.min(rules.threeCap,
    rules.threeBase+Math.floor(avg/10)*rules.threePerTenLevels):0;
  const four=groups[3].length&&F.elements.length===3&&M.elements.length===3&&pool.length>=4?
    Math.min(rules.fourCap,rules.fourBase+
      Math.floor(Math.max(0,avg-rules.fourGrowthStartLevel)/10)*rules.fourPerTenLevels):0;
  const double=groups[4].length?Math.min(rules.doubleCap,
    rules.doubleBase+Math.floor((avg-rules.doubleMinParentLevel)/10)*rules.doublePerTenLevels):0;
  const rareFactor=cave?.type==='premiumCave'?rules.premiumRareFactor:1;
  const boostedThree=three*rareFactor,boostedFour=four*rareFactor,boostedDouble=double*rareFactor;
  const low=1-boostedThree-boostedFour-boostedDouble,base=BREED_TIER_WEIGHTS[tierKey];
  const two=groups[1].length?low*base[1]/(base[0]+base[1]):0;
  const weights=[low-two,two,boostedThree,boostedFour,boostedDouble];
  return groups.flatMap(function(ids,index){
    if(!ids.length||!weights[index])return [];
    const bias=ids.map(function(id){
      const parts=DATA.species[id].elements;
      return 1+.3*parts.filter(e=>F.elements.includes(e)&&M.elements.includes(e)).length+
        .1*(F.elements.includes(parts[0])?1:0)+.1*(M.elements.includes(parts[0])?1:0);
    });
    const groupTotal=bias.reduce(function(sum,n){return sum+n;},0);
    return ids.map(function(id,i){return {id:id,chance:weights[index]*bias[i]/groupTotal};});
  });
}
function breedingSeconds(species,level,cave){
  const s=typeof species==="string"?DATA.species[species]:species;
  if(!s)return 60;
  const rules=window.DragonEconomy.breeding,tier=dragonTimeTier(s);
  const levelPressure=s.elements.reduce(function(sum,element){
    return sum+(ELEMENT_UNLOCK[element]||1);
  },0)/s.elements.length;
  const base=(rules.timeByTier[tier]||rules.timeByTier[4])+
    Math.min(rules.maxElementBonusSeconds,levelPressure*rules.elementLevelSeconds);
  return Math.round(base*(cave?.type==='premiumCave'?rules.premiumTimeFactor:1));
}
function isBreedingCave(building){return building?.type==='cave'||building?.type==='premiumCave';}
function dragonBusy(id){
  return state.buildings.some(function(b){
    return isBreedingCave(b)&&b.breeding&&b.breeding.readyAt>Date.now()&&
      (b.breeding.fatherId===id||b.breeding.motherId===id);
  });
}
function startBreeding(caveId,fatherId,motherId){
  const cave=buildingById(caveId),father=dragonById(fatherId),mother=dragonById(motherId);
  if(!isBreedingCave(cave)||cave.stored||cave.breeding||
    state.eggs.some(function(egg){return egg.source==="breed"&&(egg.caveId===cave.id||!egg.caveId);})||
    !father||!mother||
    father.id===mother.id||dragonBusy(father.id)||dragonBusy(mother.id)){
    toast("Choose two different dragons and an available Breeding Cave.");return;
  }
  if(father.level<DATA.progression.breedLevel||mother.level<DATA.progression.breedLevel){
    toast("Both dragons must reach level "+DATA.progression.breedLevel+" to breed.");return;
  }
  const options=breedingOptions(father,mother,cave),roll=Math.random();
  if(!options.length){toast("No possible offspring for these dragons.");return;}
  let total=0,result=options[options.length-1];
  for(const option of options){total+=option.chance;if(roll<total){result=option;break;}}
  const species=DATA.species[result.id];
  cave.breeding={fatherId:father.id,motherId:mother.id,
    fatherSpecies:father.species,motherSpecies:mother.species,
    result:result.id,startedAt:Date.now(),readyAt:0};
  cave.breeding.readyAt=cave.breeding.startedAt+breedingSeconds(species,cave.level,cave)*1000;
  toast("Breeding has started.");
  AUDIO.play("place");openModal("breeding",cave.id);saveGame();
}
function collectBreeding(caveId){
  const cave=buildingById(caveId);
  if(!isBreedingCave(cave)||!cave.breeding||cave.breeding.readyAt>Date.now()){
    toast("Breeding is not finished.");return;
  }
  const breeding=cave.breeding;
  const egg=addEgg(breeding.result,"breed",[breeding.fatherSpecies,breeding.motherSpecies],cave.id);
  cave.breeding=null;
  gainPlayerXP(window.DragonEconomy.progression.xpSources.breed);
  toast(egg.hatcheryId?"The bred egg entered the Hatchery.":"The Hatchery is full; the bred egg is waiting in Inventory.");
  const center=buildingCenter(cave);burst(center.x,center.y,"#efbdff",20);
  AUDIO.play("egg");openModal(egg.hatcheryId?"hatchery":"inventory",egg.hatcheryId||null);saveGame();
}
