/* Shared battle formulas for the browser and authoritative Arena server. */
(function(root){
'use strict';
const WEIGHTS={1:[1],2:[.6,.4],3:[.5,.3,.2],4:[.4,.3,.2,.1]};
const DEFENSE_SCALE=.6;
function stats(parts,rarity,level,elements,rarities,stars=0){
  const l=Math.max(1,Math.min(100,Number(level)||1));
  const weights=rarity==='transcendent'?[.25,.25,.3,.2]:WEIGHTS[parts.length];
  const factor=rarities[rarity].heSoChiSo;
  const base=key=>parts.reduce((sum,id,i)=>sum+elements[id].chiSo[key]*weights[i],0)*factor;
  const growth=1+.07*(l-1)+.0003*(l-1)**2;
  const hpGrowth=1+.08*(l-1)+.00035*(l-1)**2;
  const starLevel=Number.isFinite(Number(stars))?Math.max(0,Math.min(5,Math.floor(Number(stars)))):0;
  const starMultiplier=1+starLevel*.05;
  return {hp:Math.round(Math.round(base('hp')*5*hpGrowth)*starMultiplier),
    attack:Math.round(Math.round(base('tanCong')*growth)*starMultiplier),
    defense:Math.round(Math.round(base('phongThu')*growth*DEFENSE_SCALE)*starMultiplier)};
}
function matchup(skillElement,defenderParts,chart){
  return skillElement?chart[skillElement][defenderParts[0]]:1;
}
function skillPower(attack,skill){
  if(skill.special)return attack*(skill.power+skill.bonus);
  return skill.element?attack*(1+skill.bonus):attack*skill.power;
}
function damage(actor,target,skill,chart,variance=1,critical=false){
  const power=skillPower(actor.attack,skill);
  if(power<=0)return 0;
  const armor=100/(100+target.defense*.8);
  const roll=Math.max(.9,Math.min(1.1,variance));
  return Math.max(1,Math.round(power*matchup(skill.element,target.parts,chart)*armor*roll*(critical?1.5:1)));
}
function statusValue(fighter,kind){
  return fighter.statuses?.find(status=>status.kind===kind)?.value||0;
}
function effectiveMaxHp(fighter){
  return Math.round(fighter.maxHp*(1+statusValue(fighter,'vitality')));
}
function battleDamage(actor,target,skill,chart,variance=1,critical=false){
  const boosted={...actor,attack:actor.attack*(1+statusValue(actor,'damage_up'))*
    (1-statusValue(actor,'damage_down'))};
  const armored={...target,defense:Math.max(0,target.defense*
    (1+statusValue(target,'armor_up'))*(1-statusValue(target,'armor_down')))};
  return Math.max(0,Math.round(damage(boosted,armored,skill,chart,variance,critical)*
    (1-statusValue(target,'damage_reduction'))));
}
const API={stats,matchup,skillPower,damage,battleDamage,effectiveMaxHp,statusValue};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.DragonCombat=API;
})(typeof window!=='undefined'?window:globalThis);
