/**
 * Public battle DTO and event-snapshot helpers.
 *
 * Keeps client/replay serialization out of turn-resolution code. This module
 * does not decide damage, AI choices or match outcomes.
 */
const combat=require('../../js/data/combat-rules.js');
const progressionConfig=require('../../js/config/progression.js');
const arenaConfig=require('../../js/config/arena.js');

const statusIcons={poison:'☠',burn:'♨',curse:'☾',freeze:'❄',damage_up:'⚔',damage_down:'↘',
  armor_up:'⬟',armor_down:'⬡',damage_reduction:'◈',regen:'✚',vitality:'♥',
  accuracy_down:'◎',anti_heal:'⊘',shield:'⬢',reflect:'↶',lock_switch:'⛓',next_attack_up:'⚡',
  carapace:'◆',carapace_strike:'✦'};

/** Stable public status payload for React clients. */
function statusSnapshot(fighter){
  return (fighter.statuses||[]).map(status=>({...status,icon:statusIcons[status.kind]||'✦'}));
}

/** Add one battle event with a state snapshot used for animation/replay. */
function record(battle,event){
  const eventSeq=(Number.isSafeInteger(battle.eventSeq)?battle.eventSeq:battle.events.length)+1;
  battle.eventSeq=eventSeq;
  battle.events.push({...event,eventSeq,turn:battle.turn,state:{
    attack:battle.attack.map(fighter=>({id:fighter.id,hp:fighter.hp,
      maxHp:combat.effectiveMaxHp(fighter),statuses:statusSnapshot(fighter),cooldowns:fighter.cooldowns||[]})),
    defense:battle.defense.map(fighter=>({id:fighter.id,hp:fighter.hp,
      maxHp:combat.effectiveMaxHp(fighter),statuses:statusSnapshot(fighter),cooldowns:fighter.cooldowns||[]})),
    activeAttack:battle.activeAttack,activeDefense:battle.activeDefense}});
}

/** Public DTO used by Arena/Challenge React views. */
function publicBattle(battle){
  const view=(fighter,side)=>({id:fighter.id,species:fighter.species,level:fighter.level,
    stars:fighter.stars||0,nickname:fighter.nickname,hp:fighter.hp,
    maxHp:combat.effectiveMaxHp(fighter),statuses:statusSnapshot(fighter),
    skills:fighter.skills.map((skill,index)=>skill?{
      index,id:skill.id,name:skill.name,element:skill.element||null,power:skill.power,bonus:skill.bonus||0,
      special:!!skill.special,apex:!!skill.apex,glyph:skill.glyph||null,effect:skill.effect||null,description:skill.descriptionVi||skill.description||null,
      cooldown:skill.cooldown||0,remainingCooldown:fighter.cooldowns?.[index]||0,
      unlockLevel:progressionConfig.skillUnlockLevels[index],
      available:skill.effect?.kind==='echo_last'?fighter.lastDirectDamage>0:
        skill.effect?.kind==='revive_first'?
          !battle.revives?.[side]&&battle[side].some(ally=>ally.hp<=0):true,
      unavailableReason:skill.effect?.kind==='revive_first'?
        battle.revives?.[side]?'Đội đã dùng lượt hồi sinh trong trận này.':
          !battle[side].some(ally=>ally.hp<=0)?'Cần ít nhất một đồng đội đã gục.':null:
        skill.effect?.kind==='echo_last'&&!fighter.lastDirectDamage?
          'Cần gây sát thương trực tiếp trước đó.':null,
      unlocked:fighter.level>=progressionConfig.skillUnlockLevels[index]}:null)});
  return {opponent:battle.opponent,turn:battle.turn,attack:battle.attack.map(f=>view(f,'attack')),
    defense:battle.defense.map(f=>view(f,'defense')),activeAttack:battle.activeAttack,
    activeDefense:battle.activeDefense,eventSeq:Number.isSafeInteger(battle.eventSeq)?battle.eventSeq:battle.events.length,
    events:battle.events.slice(-arenaConfig.eventHistory)};
}

module.exports={statusSnapshot,record,publicBattle};
