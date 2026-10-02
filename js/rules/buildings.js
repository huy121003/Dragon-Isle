/**
 * Pure building/economy rules.
 *
 * The caller supplies base data from game.json plus editable config values.
 * No rule in this file reads global state.
 */
(function(root,factory){
  const cfg=typeof module!=="undefined"&&module.exports?{
    economy:require("../config/economy.js"),buildings:require("../config/buildings.js")
  }:{economy:root.DragonConfig.economy,buildings:root.DragonConfig.buildings};
  const api=factory(cfg);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root){root.DragonRules=root.DragonRules||{};root.DragonRules.buildings=api;}
})(typeof window!=="undefined"?window:globalThis,function(cfg){
  "use strict";

  /** Read a level-indexed capacity array safely. */
  function capacityAt(level,row){
    const index=Math.max(0,Math.min(row.length-1,Math.floor(Number(level)||1)-1));
    return row[index];
  }

  /** First/nth Habitat purchase price for an element unlock tier. */
  function habitatPurchaseCost(baseCost,unlockLevel,purchased){
    const step=Math.max(0,(Number(unlockLevel)||1)-1),count=Math.max(0,Math.floor(Number(purchased)||0));
    const s=cfg.economy.shop;
    const unlockScale=1+s.habitatUnlockLinear*step+s.habitatUnlockQuadratic*step*step;
    const repeatScale=1+s.habitatRepeatLinear*count+s.habitatRepeatQuadratic*count*count;
    return Math.ceil(Number(baseCost)*unlockScale*repeatScale/10)*10;
  }

  /** Gold capacity of a Habitat. */
  function habitatGoldCapacity(level,unlockLevel){
    const h=cfg.buildings.habitat;
    return Math.round((h.goldBase+h.goldPerUnlockLevel*(Math.max(1,unlockLevel)-1))*
      Math.pow(h.goldLevelFactor,Math.max(0,level-1)));
  }

  /** Gem capacity of a Habitat. */
  function habitatGemCapacity(level,unlockLevel){
    const h=cfg.buildings.habitat;
    return (h.gemCapacityBase+Math.floor((Math.max(1,unlockLevel)-1)/10))*Math.max(1,level);
  }

  /** Gold needed for the next standard building level. */
  function upgradeGoldCost(basePurchaseCost,currentLevel){
    return Math.round(basePurchaseCost*Math.pow(cfg.buildings.upgrade.goldFactor,currentLevel));
  }

  /** Gold+Gem cost for Habitat/Farm/Hatchery upgrades. */
  function standardUpgradeCost(type,currentLevel,basePurchaseCost,unlockLevel){
    const u=cfg.buildings.upgrade,gold=upgradeGoldCost(basePurchaseCost,currentLevel);
    const baseGem=u.gemBase[type]||0;
    let gems=Math.ceil(baseGem*Math.pow(u.gemLevelFactor,Math.max(0,currentLevel-1)));
    if(type==="habitat")gems=Math.ceil(gems*(1+u.habitatGemUnlockLinear*Math.max(0,unlockLevel-1)));
    return {gold,gems};
  }

  /** Habitat upgrade duration after scaling by element unlock tier. */
  function habitatUpgradeSeconds(baseSeconds,unlockLevel){
    const h=cfg.buildings.habitat,step=Math.max(0,unlockLevel-1);
    return Math.round(baseSeconds*(1+h.upgradeTimeUnlockLinear*step+h.upgradeTimeUnlockQuadratic*step*step));
  }

  /** Gem cost for unlocking an island index. */
  function islandUnlockCost(index){
    return index<=0?0:index*cfg.economy.island.gemPerIsland;
  }

  /** Gold cost for one region after island tier and prior expansions. */
  function landRegionCost(index,opened){
    const p=cfg.economy.land,tier=Math.max(0,Math.floor(Number(index)||0));
    let amount=p.homeFirstRegionGold*(1+p.islandTierLinear*tier+p.islandTierQuadratic*tier*tier);
    for(let region=1;region<Math.max(1,opened);region++)amount=Math.round(amount*p.expansionMultiplier);
    return Math.round(amount);
  }

  /** Convert a Gold land price to the instant Gem alternative. */
  function goldToGemCost(gold){
    return Math.max(1,Math.ceil(Math.max(0,gold)/cfg.economy.land.goldPerGem));
  }

  /** Shop price for a pure-element egg. */
  function eggPrice(basePrice,rarity,unlockLevel){
    const s=cfg.economy.shop,step=Math.max(0,unlockLevel-1);
    const rarityMultiplier=s.eggRarityMultiplier[rarity]||1;
    const scale=rarityMultiplier*s.eggBaseMultiplier*(1+s.eggUnlockLinear*step+s.eggUnlockQuadratic*step*step);
    return basePrice.vang?{vang:Math.ceil(basePrice.vang*scale/10)*10}:{gem:Math.ceil(basePrice.gem*scale)};
  }

  /** Academy resource cost for an upgrade from currentLevel to currentLevel+1. */
  function academyUpgradeCost(currentLevel,step,requiredDragonLevelFallback,contentLevel){
    if(!step)return null;
    const a=cfg.buildings.academy;
    return {playerLevel:contentLevel(step.playerLevel),requiredDragons:step.requiredDragons||0,
      requiredDragonLevel:step.requiredDragonLevel||requiredDragonLevelFallback,
      gold:Math.round(a.baseGold*Math.pow(a.costFactor,currentLevel)),
      food:Math.round(a.baseFood*Math.pow(a.costFactor,currentLevel)),
      gems:Math.round(a.baseGems*Math.pow(a.costFactor,currentLevel))};
  }

  return {capacityAt,habitatPurchaseCost,habitatGoldCapacity,habitatGemCapacity,
    upgradeGoldCost,standardUpgradeCost,habitatUpgradeSeconds,islandUnlockCost,
    landRegionCost,goldToGemCost,eggPrice,academyUpgradeCost};
});
