"use strict";

global.window={};
require("../data/economy.js");
const economy=global.window.DragonEconomy;
const game=require("../data/game.json");

function feedCost(level){
  const r=economy.progression;
  return Math.ceil(r.feedBase+r.feedLinear*level+r.feedQuadratic*level*level);
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
function row(level){
  return {
    level,
    feedOne:feedCost(level),
    feedLevel:feedCost(level)*4,
    farms:Math.min(economy.progression.maxFarms,
      1+Math.floor(Math.max(1,level)/economy.progression.farmEveryLevels))
  };
}
const levels=[1,10,20,40,60,80,100];
console.table(levels.map(row));
console.log("\nAcademy upgrades");
console.table([1,2,3,4].map(level=>({level,...academyCost(level)})));
console.log("\nLand tiers (first / eighth region)");
console.table(game.islands.map((island,index)=>({
  island:index+1,
  id:island.id,
  first:landCost(index,1),
  eighth:landCost(index,8),
  gemFirst:Math.max(1,Math.ceil(landCost(index,1)/economy.land.goldPerGem)),
  gemEighth:Math.max(1,Math.ceil(landCost(index,8)/economy.land.goldPerGem))
})));
console.log("\nResource exchange");
console.table([
  ...economy.shop.resourcePacks.goldForGems.map(p=>({type:"Gem → Gold",cost:p.cost,reward:p.amount})),
  ...economy.shop.resourcePacks.gemsForGold.map(p=>({type:"Gold → Gem",cost:p.cost,reward:p.amount})),
  ...economy.shop.resourcePacks.foodForGems.map(p=>({type:"Gem → Food",cost:p.cost,reward:p.amount}))
]);
