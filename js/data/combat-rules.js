/**
 * Pure combat formulas shared by browser previews and the authoritative Arena server.
 *
 * IMPORTANT:
 * - Editable numbers live in js/config/combat.js.
 * - Functions here are deterministic for the same inputs.
 * - Do not add toast(), state mutation, fetch(), Date.now() or Math.random() here.
 */
(function(root,factory){
  const config=typeof module!=="undefined"&&module.exports?
    require("../config/combat.js"):root.DragonConfig.combat;
  const api=factory(config);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.DragonCombat=api;
})(typeof window!=="undefined"?window:globalThis,function(config){
  "use strict";

  /**
   * Calculate HP/Attack/Defense at a dragon level.
   * @param {string[]} parts - Ordered element slots; slot 0 is primary.
   * @param {string} rarity - Catalog rarity id.
   * @param {number} level - Dragon level, clamped to 1..100 for battle stats.
   * @param {object} elements - Element catalog containing base chiSo values.
   * @param {object} rarities - Rarity catalog containing heSoChiSo.
   * @param {number} stars - Star rank, clamped by config.star.max.
   */
  function stats(parts,rarity,level,elements,rarities,stars=0){
    const l=Math.max(1,Math.min(100,Number(level)||1));
    const weights=rarity==="transcendent"?config.transcendentWeights:config.elementWeights[parts.length];
    const factor=rarities[rarity].heSoChiSo;
    const base=key=>parts.reduce((sum,id,index)=>sum+elements[id].chiSo[key]*weights[index],0)*factor;
    const g=config.statGrowth,steps=l-1;
    const growth=1+g.linear*steps+g.quadratic*steps**2;
    const hpGrowth=1+g.hpLinear*steps+g.hpQuadratic*steps**2;
    const starLevel=Number.isFinite(Number(stars))?
      Math.max(0,Math.min(config.star.max,Math.floor(Number(stars)))):0;
    const starMultiplier=1+starLevel*config.star.statBonusPerStar;
    return {
      hp:Math.round(Math.round(base("hp")*g.hpBaseMultiplier*hpGrowth)*starMultiplier),
      attack:Math.round(Math.round(base("tanCong")*growth)*starMultiplier),
      defense:Math.round(Math.round(base("phongThu")*growth*config.defenseScale)*starMultiplier)
    };
  }

  /**
   * Convert combat stats to the single Combat Power value used for ranking.
   * @param {{hp:number,attack:number,defense:number}} value - Stats after element, rarity, level and star bonuses.
   * @returns {number} Stable integer power score for sorting and rival scaling.
   */
  function power(value){
    const weights=config.powerWeights;
    return Math.max(0,Math.round(value.hp*weights.hp+value.attack*weights.attack+
      value.defense*weights.defense));
  }

  /**
   * Element multiplier for a skill against the defender's PRIMARY element.
   */
  function matchup(skillElement,defenderParts,chart){
    return skillElement?chart[skillElement][defenderParts[0]]:1;
  }

  /**
   * Raw skill power before matchup, armor, variance and critical multipliers.
   */
  function skillPower(attack,skill){
    if(skill.special)return attack*(skill.power+skill.bonus);
    return skill.element?attack*(1+skill.bonus):attack*skill.power;
  }

  /**
   * Deterministic damage formula.
   * @param {number} variance - Caller-supplied roll, clamped to config.variance.
   * @param {boolean} critical - Whether the caller already rolled a critical hit.
   */
  function damage(actor,target,skill,chart,variance=1,critical=false){
    const power=skillPower(actor.attack,skill);
    if(power<=0)return 0;
    const armor=100/(100+target.defense*config.armorCoefficient);
    const roll=Math.max(config.variance.min,Math.min(config.variance.max,variance));
    return Math.max(1,Math.round(power*matchup(skill.element,target.parts,chart)*armor*roll*
      (critical?config.critical.multiplier:1)));
  }

  /** Return the active value of a named status, or zero when absent. */
  function statusValue(fighter,kind){
    return fighter.statuses?.find(status=>status.kind===kind)?.value||0;
  }

  /** Max HP after vitality-style statuses. */
  function effectiveMaxHp(fighter){
    return Math.round(fighter.maxHp*(1+statusValue(fighter,"vitality")));
  }

  /** Damage formula with attack/defense/status modifiers applied. */
  function battleDamage(actor,target,skill,chart,variance=1,critical=false){
    const boosted={...actor,attack:actor.attack*(1+statusValue(actor,"damage_up"))*
      (1-statusValue(actor,"damage_down"))};
    const armored={...target,defense:Math.max(0,target.defense*
      (1+statusValue(target,"armor_up"))*(1-statusValue(target,"armor_down")))};
    return Math.max(0,Math.round(damage(boosted,armored,skill,chart,variance,critical)*
      (1-statusValue(target,"damage_reduction"))));
  }

  return {stats,power,matchup,skillPower,damage,battleDamage,effectiveMaxHp,statusValue};
});
