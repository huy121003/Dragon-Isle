"use strict";

global.window={};
require("../data/economy.js");
const economy=global.window.DragonEconomy;
const game=require("../data/catalog-loader.cjs").loadGameCatalog();
const progressionConfig=require("../js/config/progression.js");
const buildingConfig=require("../js/config/buildings.js");
const farmingConfig=require("../js/config/farming.js");
const catalog=require("../data/catalog-loader.cjs").loadDragonCatalog();
globalThis.DragonDatabase=catalog;
global.window.DragonDatabase=catalog;
require("./extend-catalog.cjs")(catalog,game);
const species=catalog.species.map(raw=>({
  id:raw.id,
  rarity:raw.doHiem,
  elements:raw.elements||raw.he||String(raw.id).split(">")
}));

function xpNeeded(level){
  const r=economy.progression,n=Math.max(1,Math.floor(level));
  return Math.round(r.xpBase+r.xpLinear*n+r.xpPower*Math.pow(n,r.xpExponent));
}
function feedCost(level){
  const r=economy.progression;
  return Math.ceil(r.feedBase+r.feedLinear*level+r.feedQuadratic*level*level);
}
function standardUpgrade(type,level,element="fire"){
  const base=type==="habitat"
    ? buildingConfig.definitions.habitat.cost*(1+economy.shop.habitatUnlockLinear*((progressionConfig.elementUnlocks[element]||1)-1)+
      economy.shop.habitatUnlockQuadratic*((progressionConfig.elementUnlocks[element]||1)-1)**2)
    : buildingConfig.definitions[type].cost;
  const gold=Math.round(base*Math.pow(economy.buildings.upgradeFactor,level));
  const baseGem=economy.buildings.upgradeGemBase[type]||0;
  let gems=Math.ceil(baseGem*Math.pow(economy.buildings.upgradeGemLevelFactor,Math.max(0,level-1)));
  if(type==="habitat")gems=Math.ceil(gems*(1+economy.buildings.habitatGemUnlockLinear*((progressionConfig.elementUnlocks[element]||1)-1)));
  return {gold,gems};
}
function academyCost(level){
  const a=economy.academy;
  return {
    gold:Math.round(a.baseGold*Math.pow(a.costFactor,level)),
    food:Math.round(a.baseFood*Math.pow(a.costFactor,level)),
    gems:Math.round(a.baseGems*Math.pow(a.costFactor,level))
  };
}
function landCost(islandIndex,opened){
  const p=economy.land;
  let amount=p.homeFirstRegionGold*
    (1+p.islandTierLinear*islandIndex+p.islandTierQuadratic*islandIndex*islandIndex);
  for(let region=1;region<Math.max(1,opened);region++)amount=Math.round(amount*p.expansionMultiplier);
  return Math.round(amount);
}
function habitatGold(element,level){
  const unlock=progressionConfig.elementUnlocks[element]||1,r=economy.habitat;
  return Math.round((r.goldBase+r.goldPerUnlockLevel*(unlock-1))*Math.pow(r.goldLevelFactor,level-1));
}
function timeTier(species){
  if(species.rarity==="transcendent")return "double";
  return Math.max(1,Math.min(4,species.elements.length));
}
function hatchSeconds(species){
  const r=economy.hatching,t=timeTier(species);
  if(t===1)return r.pureElementSeconds[species.elements[0]]||60;
  const base=species.elements.reduce((sum,e)=>sum+(r.pureElementSeconds[e]||60),0);
  return Math.min(r.maxTierSeconds[t]||r.maxTierSeconds[4],
    base*(r.tierMultipliers[t]||r.tierMultipliers[4]));
}
function breedCombinationSeconds(species,parents=[],premium=false){
  const r=economy.breeding,t=timeTier(species);
  let base=species.elements.reduce((sum,e)=>sum+(r.elementSeconds[e]||r.fallbackSeconds),0);
  base*=t===1?1:(r.tierMultipliers[t]||r.tierMultipliers[4]);
  let scale=1;
  if(parents.length===2){
    const union=new Set(parents.flatMap(parent=>parent.elements));
    scale+=Math.max(0,union.size-2)*r.parentUnionPercent;
    if(parents[0].elements.length!==parents[1].elements.length)scale+=r.mixedParentPercent;
  }
  const duration=Math.round(base*scale*(premium?r.premiumTimeFactor:1));
  return t===1?duration:Math.min(duration,r.maxTierSeconds[t]||r.maxTierSeconds[4]);
}
function breedSeconds(species,premium=false){
  return breedCombinationSeconds(species,[],premium);
}

console.log("\nPlayer XP curve");
let cumulative=0;
console.table([1,2,4,6,8,11,14,18,22,27,32,37,42,48,55,60,75,100,150,200].map(level=>{
  if(level===1)return {level,xpToNext:xpNeeded(level),cumulativeToReach:0};
  cumulative=0;for(let l=1;l<level;l++)cumulative+=xpNeeded(l);
  return {level,xpToNext:xpNeeded(level),cumulativeToReach:cumulative};
}));

console.log("\nXP sources");
console.table(Object.entries(economy.progression.xpSources).flatMap(([key,value])=>{
  if(Array.isArray(value))return value.map((xp,index)=>({source:key+"["+(index+1)+"]",xp}));
  if(value&&typeof value==="object")return Object.entries(value).map(([sub,xp])=>({source:key+"."+sub,xp}));
  return [{source:key,xp:value}];
}));

console.log("\nElement unlocks and pure-egg hatch times");
console.table(Object.entries(progressionConfig.elementUnlocks).map(([element,level])=>({
  element,playerLevel:level,hatchSeconds:economy.hatching.pureElementSeconds[element]
})));

console.log("\nHybrid breeding and incubation ranges (seconds; composition-based)");
console.table([1,2,3,4,"double"].map(tier=>{
  const rows=species.filter(s=>timeTier(s)===tier);
  const hatch=rows.map(hatchSeconds),breed=rows.map(s=>breedSeconds(s,false));
  return {tier:String(tier),breedMin:Math.min(...breed),breedMax:Math.max(...breed),
    hatchMin:Math.min(...hatch),hatchMax:Math.max(...hatch)};
}));

console.log("\nDragon feed progression");
console.table([1,10,20,40,60,80,100].map(level=>({
  level,feedOne:feedCost(level),feedFullLevel:feedCost(level)*4
})));

console.log("\nAcademy upgrades");
console.table([1,2,3,4,5,6].map(level=>({
  fromLevel:level,toLevel:level+1,...academyCost(level),
  playerGate:progressionConfig.academyUpgrades[level-1]?.playerLevel,
  requiredDragons:progressionConfig.academyUpgrades[level-1]?.requiredDragons,
  requiredDragonLevel:progressionConfig.academyUpgrades[level-1]?.requiredDragonLevel,
  seconds:buildingConfig.upgradeTimes.academy[level-1]
})));

console.log("\nStandard building upgrade resource costs");
console.table([
  ...[1,2,3].flatMap(level=>["fire","time"].map(element=>({type:"habitat",element,toLevel:level+1,...standardUpgrade("habitat",level,element)}))),
  ...[1,2,3].map(level=>({type:"farm",element:"—",toLevel:level+1,...standardUpgrade("farm",level)})),
  ...[1,2,3,4].map(level=>({type:"hatchery",element:"—",toLevel:level+1,...standardUpgrade("hatchery",level)}))
]);

console.log("\nBuilding upgrade times");
console.table(Object.entries(buildingConfig.upgradeTimes).flatMap(([type,times])=>
  times.map((seconds,index)=>({type,toLevel:index+2,seconds}))));

console.log("\nFarm crops");
console.table(farmingConfig.crops.map((crop,index)=>({
  farmLevel:index+1,id:crop.id,cost:crop.cost,yield:crop.yield,seconds:crop.duration
})));

console.log("\nHabitat capacities");
console.table([1,2,3,4].flatMap(level=>[
  {level,element:"fire",dragons:economy.habitat.dragonCapacity[level-1],gold:habitatGold("fire",level)},
  {level,element:"time",dragons:economy.habitat.dragonCapacity[level-1],gold:habitatGold("time",level)}
]));

console.log("\nLand tiers (first / eighth region)");
console.table(game.islands.map((island,index)=>({
  island:index+1,id:island.id,
  first:landCost(index,1),eighth:landCost(index,8),
  gemFirst:Math.max(1,Math.ceil(landCost(index,1)/economy.land.goldPerGem)),
  gemEighth:Math.max(1,Math.ceil(landCost(index,8)/economy.land.goldPerGem))
})));

console.log("\nResource exchange");
console.table([
  ...economy.shop.resourcePacks.goldForGems.map(p=>({type:"Gem → Gold",cost:p.cost,reward:p.amount})),
  ...economy.shop.resourcePacks.gemsForGold.map(p=>({type:"Gold → Gem",cost:p.cost,reward:p.amount})),
  ...economy.shop.resourcePacks.foodForGems.map(p=>({type:"Gem → Food",cost:p.cost,reward:p.amount}))
]);

console.log("\nActual species time ranges by tier");
console.table([1,2,3,4,"double"].map(tier=>{
  const rows=species.filter(s=>timeTier(s)===tier);
  const hatch=rows.map(hatchSeconds),breed=rows.map(s=>breedSeconds(s,false));
  return {
    tier:String(tier),species:rows.length,
    hatchMin:Math.min(...hatch),hatchMax:Math.max(...hatch),
    breedMin:Math.min(...breed),breedMax:Math.max(...breed)
  };
}));

console.log("\nRepresentative breeding combinations");
const byId=id=>species.find(s=>s.id===id);
const examples=[
  ["starter 1+1",byId("fire"),byId("water"),byId("fire>water")],
  ["2+2 four-element pool",byId("fire>water"),byId("earth>wind"),species.find(s=>s.elements.length===4&&s.elements.includes("fire")&&s.elements.includes("earth"))],
  ["3+3",species.find(s=>s.elements.length===3&&s.elements.includes("fire")),species.find(s=>s.elements.length===3&&s.elements.includes("water")),species.find(s=>s.elements.length===4)],
  ["late mixed 3+4",species.find(s=>s.elements.length===3&&s.elements.includes("legend")),species.find(s=>s.elements.length===4&&s.elements.includes("time")),species.find(s=>s.elements.length===4&&s.elements.includes("time"))]
].filter(row=>row.slice(1).every(Boolean));
console.table(examples.map(([label,father,mother,result])=>({
  label,
  parents:father.elements.length+"+"+mother.elements.length,
  union:new Set([...father.elements,...mother.elements]).size,
  resultTier:String(timeTier(result)),
  normalSeconds:breedCombinationSeconds(result,[father,mother],false),
  premiumSeconds:breedCombinationSeconds(result,[father,mother],true),
  hatchSeconds:hatchSeconds(result)
})));
