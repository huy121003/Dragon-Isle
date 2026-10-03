/**
 * Deterministic Arena defensive-AI scoring.
 *
 * Chooses among currently unlocked/off-cooldown skills using configured weights.
 * It never mutates battle state; strike/turn resolution remains in battle-engine.cjs.
 */
const combat=require('../../js/data/combat-rules.js');
const arenaConfig=require('../../js/config/arena.js');
const combatConfig=require('../../js/config/combat.js');
const progressionConfig=require('../../js/config/progression.js');

/** Create AI helpers bound to one immutable element matchup table. */
function createBattleAi({typeChart}){
  /** Skills that are unlocked and not cooling down for a fighter. */
  function readySkills(fighter){
    return fighter.skills.map((skill,index)=>({skill,index})).filter(({skill,index})=>
      skill&&fighter.level>=progressionConfig.skillUnlockLevels[index]&&!(fighter.cooldowns?.[index]>0));
  }

  /** Server-side defensive AI. Higher score means more useful in current state. */
  function chooseDefenseSkill(battle){
    const actor=battle.defense[battle.activeDefense],target=battle.attack[battle.activeAttack];
    const ready=readySkills(actor).filter(({skill})=>
      (skill.effect?.kind!=='revive_first'||battle.defense.some(f=>f.hp<=0)&&
      !battle.revives?.defense)&&
      (skill.effect?.kind!=='echo_last'||actor.lastDirectDamage>0));
    if(!ready.length)throw Object.assign(new Error('The defender has no unlocked skills.'),{status:400});
    const incoming=Math.max(1,...readySkills(target).map(({skill})=>
      combat.battleDamage(target,actor,skill,typeChart)));
    const ai=arenaConfig.ai;
    const score=({skill})=>{
      const effect=skill.effect,kind=effect?.kind;
      const hitDamage=combat.battleDamage(actor,target,skill,typeChart);
      const hits=kind==='multi'?effect.hits:1;
      const accuracy=1-Math.min(combatConfig.maxAccuracyPenalty,
        (kind==='multi'?effect.missChance:0)+combat.statusValue(actor,'accuracy_down'));
      let value=Math.min(target.hp,hitDamage*hits*accuracy);
      const already=kind&&actor.statuses.some(status=>status.kind===kind);
      const enemyHas=kind&&target.statuses.some(status=>status.kind===kind);
      const missing=Math.max(0,combat.effectiveMaxHp(actor)-actor.hp);
      const allies=battle.defense.filter(f=>f.hp>0);
      const teamMissing=allies.reduce((sum,f)=>sum+Math.max(0,f.maxHp-f.hp),0);
      if(kind==='revive_first'&&battle.defense.some(f=>f.hp<=0)&&!battle.revives?.defense)
        return Math.max(value,incoming*2);
      if(['heal_lowest','cleanse_heal_lowest','rewind_ally'].includes(kind))
        value+=Math.min(teamMissing,Math.max(...allies.map(f=>f.maxHp),0)*
          (effect.value||.2))*ai.healWeight;
      if(['heal_team','cleanse_team_heal','regen_team'].includes(kind))
        value+=Math.min(teamMissing,allies.reduce((sum,f)=>sum+f.maxHp,0)*
          effect.value)*ai.healWeight;
      if(kind==='shield'&&!already)value+=actor.maxHp*effect.value*ai.defenseWeight;
      if(kind==='area')value=battle.attack.filter(f=>f.hp>0).reduce((sum,f)=>
        sum+Math.min(f.hp,combat.battleDamage(actor,f,skill,typeChart)),0);
      if(kind==='freeze_chance'&&!enemyHas)value+=incoming*ai.freezeWeight*effect.value;
      if(kind==='burn'&&!enemyHas)value+=target.maxHp*effect.value*effect.duration*.5;
      if(kind==='heal'||kind==='cleanse')value+=Math.min(missing,actor.maxHp*effect.value)*ai.healWeight;
      else if(kind==='regen'&&!already)
        value+=Math.min(missing,actor.maxHp*effect.value*effect.duration)*ai.regenWeight;
      else if(kind==='vitality'&&!already)value+=actor.maxHp*effect.value*ai.vitalityWeight;
      else if(kind==='freeze'&&!enemyHas)value+=incoming*ai.freezeWeight*accuracy;
      else if(kind==='poison'&&!enemyHas)
        value+=Math.min(target.hp,target.maxHp*effect.value*effect.duration)*ai.poisonWeight*accuracy;
      else if(kind==='damage_up'&&!already)
        value+=hitDamage*ai.damageBuffHitWeight+incoming*effect.value*ai.damageBuffIncomingWeight;
      else if(['armor_up','damage_reduction'].includes(kind)&&!already)
        value+=incoming*effect.value*ai.defenseWeight;
      else if(['armor_down','damage_down','accuracy_down'].includes(kind)&&!enemyHas)
        value+=incoming*(effect.value||ai.defaultDebuffValue)*ai.debuffWeight*accuracy;
      return value;
    };
    return ready.reduce((best,item)=>score(item)>score(best)?item:best);
  }

  return {readySkills,chooseDefenseSkill};
}

module.exports={createBattleAi};
