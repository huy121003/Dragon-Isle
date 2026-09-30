"use strict";

/* 3/4-element offspring stay rare; a four-element parent cannot bypass the 3+3 rule. */
const BREED_TIER_WEIGHTS={
  "1+1":[25,75],"1+2":[20,80],"1+3":[18,82],"1+4":[16,84],
  "2+2":[20,80],"2+3":[18,82],"2+4":[16,84],
  "3+3":[16,84],"3+4":[15,85],"4+4":[14,86]
};
function breedingOptions(father,mother){
  if(!father||!mother||father.id===mother.id)return [];
  const F=DATA.species[father.species],M=DATA.species[mother.species];
  if(!F||!M)return [];
  const pool=[...new Set(F.elements.concat(M.elements))];
  const order=Object.keys(DATA.elements);
  const canInherit=parts=>parts.some(e=>F.elements.includes(e))&&
    parts.some(e=>M.elements.includes(e));
  const groups=[pool.map(e=>e),[],[],[]];
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
    return parts.every(e=>pool.includes(e))&&canInherit(parts);
  });
  const tierKey=[F.elements.length,M.elements.length].sort(function(a,b){return a-b;}).join("+");
  const rules=window.DragonEconomy.breeding,avg=(father.level+mother.level)/2;
  const three=groups[2].length?Math.min(rules.threeCap,
    rules.threeBase+Math.floor(avg/10)*rules.threePerTenLevels):0;
  const disjoint=F.elements.every(e=>!M.elements.includes(e));
  const four=groups[3].length&&F.elements.length===3&&M.elements.length===3&&disjoint&&
    father.level>=rules.fourMinParentLevel&&mother.level>=rules.fourMinParentLevel?
    Math.min(rules.fourCap,rules.fourBase+Math.floor((avg-30)/10)*rules.fourPerTenLevels):0;
  const low=1-three-four,base=BREED_TIER_WEIGHTS[tierKey];
  const two=groups[1].length?low*base[1]/(base[0]+base[1]):0;
  const weights=[low-two,two,three,four];
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
function breedingSeconds(rarity,level){
  return DATA.breedingTimes[rarity];
}
function dragonBusy(id){
  return state.buildings.some(function(b){
    return b.type==="cave"&&b.breeding&&b.breeding.readyAt>Date.now()&&
      (b.breeding.fatherId===id||b.breeding.motherId===id);
  });
}
function startBreeding(caveId,fatherId,motherId){
  const cave=buildingById(caveId),father=dragonById(fatherId),mother=dragonById(motherId);
  if(!cave||cave.type!=="cave"||cave.stored||cave.breeding||!father||!mother||
    father.id===mother.id||dragonBusy(father.id)||dragonBusy(mother.id)){
    toast("Choose two different dragons and an available Breeding Cave.");return;
  }
  if(father.level<DATA.progression.breedLevel||mother.level<DATA.progression.breedLevel){
    toast("Both dragons must reach level "+DATA.progression.breedLevel+" to breed.");return;
  }
  const options=breedingOptions(father,mother),roll=Math.random();
  let total=0,result=options[options.length-1];
  for(const option of options){total+=option.chance;if(roll<total){result=option;break;}}
  const species=DATA.species[result.id];
  cave.breeding={fatherId:father.id,motherId:mother.id,
    fatherSpecies:father.species,motherSpecies:mother.species,
    result:result.id,startedAt:Date.now(),readyAt:0};
  cave.breeding.readyAt=cave.breeding.startedAt+breedingSeconds(species.rarity,cave.level)*1000;
  toast("Breeding has started.");
  AUDIO.play("place");openModal("breeding",cave.id);saveGame();
}
function collectBreeding(caveId){
  const cave=buildingById(caveId);
  if(!cave||!cave.breeding||cave.breeding.readyAt>Date.now()){
    toast("Breeding is not finished.");return;
  }
  const breeding=cave.breeding;
  const egg=addEgg(breeding.result,"breed",[breeding.fatherSpecies,breeding.motherSpecies]);
  cave.breeding=null;
  gainPlayerXP(20);
  toast(egg.hatcheryId?"The bred egg entered the Hatchery.":"The Hatchery is full; the bred egg is waiting in Inventory.");
  const center=buildingCenter(cave);burst(center.x,center.y,"#efbdff",20);
  AUDIO.play("egg");openModal(egg.hatcheryId?"hatchery":"inventory",egg.hatcheryId||null);saveGame();
}
