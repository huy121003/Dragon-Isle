/**
 * Pure progression rules.
 *
 * These functions never mutate game state and never call UI/audio/save APIs.
 * Pass explicit data in, receive a deterministic value back.
 */
(function(root,factory){
  const config=typeof module!=="undefined"&&module.exports?
    require("../config/progression.js"):root.DragonConfig.progression;
  const api=factory(config);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root){root.DragonRules=root.DragonRules||{};root.DragonRules.progression=api;}
})(typeof window!=="undefined"?window:globalThis,function(config){
  "use strict";

  /** Clamp a content gate while keeping player level itself unlimited. */
  function contentRequirementLevel(level){
    return Math.min(config.contentLevelCap,Math.max(1,Math.floor(Number(level)||1)));
  }

  /** XP needed to advance from the supplied player level to the next level. */
  function playerXPNeeded(level){
    const n=Math.max(1,Math.floor(Number(level)||1)),x=config.xp;
    return Math.round(x.base+x.linear*n+x.power*Math.pow(n,x.exponent));
  }

  /** Food spent by one feed action at the supplied dragon level. */
  function dragonFeedCost(level,maxLevel){
    const n=Math.max(1,Math.min(Math.floor(Number(maxLevel)||100),Math.floor(Number(level)||1)));
    const c=config.feedingCost;
    const multiplier=n<=c.earlyEnd?1+(c.earlyMultiplier-1)*(n-1)/(c.earlyEnd-1):
      n<=c.midEnd?c.earlyMultiplier+(c.midMultiplier-c.earlyMultiplier)*
        (n-c.earlyEnd)/(c.midEnd-c.earlyEnd):
        c.midMultiplier+(c.lateMultiplier-c.midMultiplier)*
          Math.pow((n-c.midEnd)/(config.dragonMaxLevel-c.midEnd),c.lateExponent);
    return Math.ceil((c.base+c.linear*n+c.quadratic*n*n)*multiplier);
  }

  /** Maximum number of Farms available at a player level. */
  function farmLimit(level){
    return Math.min(config.farms.maxFarms,
      1+Math.floor(Math.max(1,Math.floor(Number(level)||1))/config.farms.everyLevels));
  }

  /**
   * Reward for reaching one specific new player level.
   * @param {number} newLevel - Level after the level-up.
   */
  function levelReward(newLevel){
    const level=Math.max(1,Math.floor(Number(newLevel)||1)),r=config.rewards;
    return {
      gold:r.goldBase+r.goldStep*level,
      food:r.foodBase+r.foodStep*level,
      gems:r.gems+(level%r.milestoneEvery===0?r.milestoneGemBonus:0)
    };
  }

  return {contentRequirementLevel,playerXPNeeded,dragonFeedCost,farmLimit,levelReward};
});
