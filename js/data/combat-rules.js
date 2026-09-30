/* Shared battle formulas for the browser and authoritative Arena server. */
(function(root){
'use strict';
const WEIGHTS={1:[1],2:[.6,.4],3:[.5,.3,.2],4:[.4,.3,.2,.1]};
function stats(parts,rarity,level,elements,rarities){
  const l=Math.max(1,Math.min(100,Number(level)||1)),weights=WEIGHTS[parts.length];
  const factor=rarities[rarity].heSoChiSo;
  const base=key=>parts.reduce((sum,id,i)=>sum+elements[id].chiSo[key]*weights[i],0)*factor;
  const growth=1+.07*(l-1)+.0003*(l-1)**2;
  const hpGrowth=1+.08*(l-1)+.00035*(l-1)**2;
  return {hp:Math.round(base('hp')*5*hpGrowth),attack:Math.round(base('tanCong')*growth),
    defense:Math.round(base('phongThu')*growth)};
}
function matchup(skillElement,defenderParts,chart){
  return skillElement?chart[skillElement][defenderParts[0]]:1;
}
function skillPower(attack,skill){
  return skill.element?attack*(1+skill.bonus):attack*skill.power;
}
function damage(actor,target,skill,chart,variance=1,critical=false){
  const power=skillPower(actor.attack,skill);
  const armor=100/(100+target.defense*.8);
  const roll=Math.max(.9,Math.min(1.1,variance));
  return Math.max(1,Math.round(power*matchup(skill.element,target.parts,chart)*armor*roll*(critical?1.5:1)));
}
const API={stats,matchup,skillPower,damage};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.DragonCombat=API;
})(typeof window!=='undefined'?window:globalThis);
