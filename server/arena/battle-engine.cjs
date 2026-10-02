/**
 * Authoritative Arena/Challenge battle engine.
 *
 * This module owns fighter construction, status effects, AI skill scoring and
 * turn resolution. It does not read/write player files or award resources.
 *
 * Randomness is injectable through rng so tests can replay exact battles.
 */
const combat=require('../../js/data/combat-rules.js');
const arenaConfig=require('../../js/config/arena.js');
const combatConfig=require('../../js/config/combat.js');
const progressionConfig=require('../../js/config/progression.js');

function createBattleEngine({catalog,game,rng=Math.random}){
  const elements=catalog.elements,rarities=catalog.rarities;

  /** Resolve element slots/rarity for a catalog or legacy species id. */
  function species(id){
    const raw=catalog.species.find(dragon=>dragon.id===id);
    const parts=raw?.elements||id.split('>');
    const doubled=raw?.doHiem==='transcendent'&&parts.length===4&&
      parts[0]===parts[1]&&new Set(parts).size===3;
    if(!parts.length||parts.length>4||parts.some(element=>!elements[element])||
      (!doubled&&new Set(parts).size!==parts.length))return null;
    const rarity=raw?.doHiem||(parts.length===1?'common':parts.length===2?
      parts.some(element=>['light','dark','metal'].includes(element))?'epic':'rare':
      parts.length===3?'legendary':'mythic');
    return {parts,rarity};
  }

  /**
   * Convert an owned dragon into a mutable battle fighter.
   * @param {object} dragon - Saved owned-dragon record.
   */
  function makeFighter(dragon){
    const resolved=species(dragon.species);if(!resolved)return null;
    const stats=combat.stats(resolved.parts,resolved.rarity,dragon.level,elements,rarities,dragon.stars);
    const skillIds=(catalog.species.find(item=>item.id===dragon.species)?.skillIds||
      (resolved.parts.length===1?['claw','slam',resolved.parts[0]+'-1',resolved.parts[0]+'-2']:
        (resolved.parts.length===2?['claw','slam']:resolved.parts.length===3?['claw']:[])
          .concat(resolved.parts.map(element=>element+'-1'))));
    const registry=[...(game.skills.neutral||[]),
      ...Object.entries(game.skills.elemental||{}).flatMap(([element,list])=>
        list.map(skill=>({...skill,element})))];
    return {...dragon,parts:resolved.parts,rarity:resolved.rarity,maxHp:stats.hp,
      hp:stats.hp,attack:stats.attack,defense:stats.defense,
      statuses:[],cooldowns:[0,0,0,0],skills:skillIds.map(id=>registry.find(skill=>skill.id===id))};
  }

  /** Currently active fighter for one battle side. */
  function active(battle,side){
    return battle[side][battle[side==='attack'?'activeAttack':'activeDefense']];
  }

  const harmful=new Set(['poison','freeze','damage_down','armor_down','accuracy_down']);
  const statusIcons={poison:'☠',freeze:'❄',damage_up:'⚔',damage_down:'🗡',
    armor_up:'🛡',armor_down:'⚒',damage_reduction:'✦',regen:'✚',vitality:'♥',accuracy_down:'◌'};

  /** Stable public status payload for React clients. */
  function statusSnapshot(fighter){
    return (fighter.statuses||[]).map(status=>({...status,icon:statusIcons[status.kind]||'✦'}));
  }

  /** Add one battle event with a state snapshot used for animation/replay. */
  function record(battle,event){
    battle.events.push({...event,turn:battle.turn,state:{
      attack:battle.attack.map(fighter=>({id:fighter.id,hp:fighter.hp,
        maxHp:combat.effectiveMaxHp(fighter),statuses:statusSnapshot(fighter),cooldowns:fighter.cooldowns||[]})),
      defense:battle.defense.map(fighter=>({id:fighter.id,hp:fighter.hp,
        maxHp:combat.effectiveMaxHp(fighter),statuses:statusSnapshot(fighter),cooldowns:fighter.cooldowns||[]})),
      activeAttack:battle.activeAttack,activeDefense:battle.activeDefense}});
  }

  /** Automatically select the first living fighter after a knockout. */
  function nextFighter(battle,side){
    const next=battle[side].findIndex(fighter=>fighter.hp>0);
    if(next>=0){
      battle[side==='attack'?'activeAttack':'activeDefense']=next;
      record(battle,{side,switchTo:battle[side][next].nickname,automatic:true});
    }
  }

  /** Add or refresh a timed status effect. */
  function addStatus(fighter,effect,element){
    const previous=fighter.statuses.find(status=>status.kind===effect.kind);
    if(previous){
      previous.turns=Math.max(previous.turns,effect.duration);
      previous.value=Math.max(previous.value||0,effect.value||0);
      previous.element=element;
    }else fighter.statuses.push({kind:effect.kind,turns:effect.duration,value:effect.value||0,element});
  }

  /** Skills that are unlocked and not cooling down for a fighter. */
  function readySkills(fighter){
    return fighter.skills.map((skill,index)=>({skill,index})).filter(({skill,index})=>
      skill&&fighter.level>=progressionConfig.skillUnlockLevels[index]&&!(fighter.cooldowns?.[index]>0));
  }

  /** Server-side defensive AI. Higher score means more useful in current state. */
  function chooseDefenseSkill(battle){
    const actor=active(battle,'defense'),target=active(battle,'attack'),ready=readySkills(actor);
    if(!ready.length)throw Object.assign(new Error('The defender has no unlocked skills.'),{status:400});
    const incoming=Math.max(1,...readySkills(target).map(({skill})=>
      combat.battleDamage(target,actor,skill,catalog.typeChart)));
    const ai=arenaConfig.ai;
    const score=({skill})=>{
      const effect=skill.effect,kind=effect?.kind;
      const hitDamage=combat.battleDamage(actor,target,skill,catalog.typeChart);
      const hits=kind==='multi'?effect.hits:1;
      const accuracy=1-Math.min(combatConfig.maxAccuracyPenalty,
        (kind==='multi'?effect.missChance:0)+combat.statusValue(actor,'accuracy_down'));
      let value=Math.min(target.hp,hitDamage*hits*accuracy);
      const already=kind&&actor.statuses.some(status=>status.kind===kind);
      const enemyHas=kind&&target.statuses.some(status=>status.kind===kind);
      const missing=Math.max(0,combat.effectiveMaxHp(actor)-actor.hp);
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

  /**
   * Resolve one skill, including status ticks, misses, crits, cooldowns and knockout switching.
   */
  function strike(battle,side,skill,skillIndex){
    const actor=active(battle,side),other=side==='attack'?'defense':'attack',target=active(battle,other);
    if(!actor||actor.hp<=0||!target||target.hp<=0)return;
    actor.statuses||=[];actor.cooldowns||=[0,0,0,0];
    target.statuses||=[];target.cooldowns||=[0,0,0,0];
    const previous=actor.statuses.slice();

    for(const status of previous){
      if(status.kind!=='poison'&&status.kind!=='regen')continue;
      const max=combat.effectiveMaxHp(actor),amount=Math.max(1,Math.round(max*status.value)),before=actor.hp;
      actor.hp=status.kind==='poison'?Math.max(0,before-amount):Math.min(max,before+amount);
      record(battle,{side,actor:actor.nickname,actorSpecies:actor.species,target:actor.nickname,
        targetSide:side,skill:status.kind==='poison'?'Poison':'Regeneration',
        element:status.element,effect:status.kind,statusTick:true,
        damage:Math.max(0,before-actor.hp),heal:Math.max(0,actor.hp-before),
        remaining:actor.hp,knockout:actor.hp===0});
    }

    const frozen=previous.some(status=>status.kind==='freeze');
    if(frozen&&actor.hp>0)record(battle,{side,actor:actor.nickname,actorSpecies:actor.species,
      target:actor.nickname,targetSide:side,skill:'Frozen',element:'ice',effect:'freeze',
      skipped:true,damage:0,remaining:actor.hp});

    if(actor.hp>0&&!frozen){
      const effect=skill.effect,beneficiary=effect?.target==='self'?actor:target,before=beneficiary.hp;
      let damage=0,critical=false,hits=0,misses=0;
      const attempts=effect?.kind==='multi'?effect.hits:combat.skillPower(actor.attack,skill)>0?1:0;
      for(let hit=0;hit<attempts&&target.hp>0;hit++){
        const missChance=Math.min(combatConfig.maxAccuracyPenalty,
          (effect?.kind==='multi'?effect.missChance:0)+combat.statusValue(actor,'accuracy_down'));
        if(rng()<missChance){misses++;continue;}
        const crit=rng()<combatConfig.critical.chance;
        const variance=combatConfig.variance.min+rng()*
          (combatConfig.variance.max-combatConfig.variance.min);
        const dealt=Math.min(target.hp,
          combat.battleDamage(actor,target,skill,catalog.typeChart,variance,crit));
        target.hp=Math.max(0,target.hp-dealt);damage+=dealt;hits++;critical=critical||crit;
      }

      if(effect&&(attempts===0||hits>0)){
        if(effect.kind==='heal'||effect.kind==='cleanse'){
          if(effect.kind==='cleanse')beneficiary.statuses=beneficiary.statuses.filter(status=>!harmful.has(status.kind));
          beneficiary.hp=Math.min(combat.effectiveMaxHp(beneficiary),
            beneficiary.hp+Math.round(beneficiary.maxHp*effect.value));
        }else if(effect.kind==='vitality'){
          const oldMax=combat.effectiveMaxHp(beneficiary);
          addStatus(beneficiary,effect,skill.element);
          beneficiary.hp=Math.min(combat.effectiveMaxHp(beneficiary),
            beneficiary.hp+combat.effectiveMaxHp(beneficiary)-oldMax);
        }else if(effect.duration>0&&effect.kind!=='multi'&&beneficiary.hp>0)
          addStatus(beneficiary,effect,skill.element);
      }

      if(skill.cooldown)actor.cooldowns[skillIndex]=skill.cooldown;
      record(battle,{side,actor:actor.nickname,actorSpecies:actor.species,
        target:beneficiary.nickname,targetSide:beneficiary===actor?side:other,
        skill:skill.name,skillId:skill.id,element:skill.element||null,effect:effect?.kind||null,
        special:!!skill.special,damage,critical,hits,misses,
        matchup:attempts?combat.matchup(skill.element,target.parts,catalog.typeChart):null,
        heal:Math.max(0,beneficiary.hp-before),remaining:beneficiary.hp,knockout:target.hp===0});
    }

    for(const status of previous){
      if(!actor.statuses.includes(status))continue;
      status.turns--;
      if(status.turns<=0){
        actor.statuses.splice(actor.statuses.indexOf(status),1);
        actor.hp=Math.min(actor.hp,combat.effectiveMaxHp(actor));
      }
    }
    actor.cooldowns=actor.cooldowns.map((value,index)=>
      index===skillIndex&&actor.hp>0&&!frozen?value:Math.max(0,value-1));
    if(actor.hp===0)nextFighter(battle,side);
    if(target.hp===0)nextFighter(battle,other);
  }

  const alive=group=>group.some(fighter=>fighter.hp>0);

  /** Resolve one player-vs-player Challenge action. */
  function liveTurn(battle,side,action){
    if(battle.nextSide!==side)throw Object.assign(new Error('Wait for the other player.'),{status:409});
    const actor=active(battle,side);
    if(!actor||actor.hp<=0)throw Object.assign(new Error('No active dragon.'),{status:409});
    if(action?.action==='switch'){
      const index=battle[side].findIndex(fighter=>fighter.id===action.dragonId&&fighter.hp>0);
      if(index<0||index===battle[side==='attack'?'activeAttack':'activeDefense'])
        throw Object.assign(new Error('Choose a different living dragon.'),{status:400});
      battle[side==='attack'?'activeAttack':'activeDefense']=index;
      record(battle,{side,switchTo:battle[side][index].nickname});
    }else if(action?.action==='skill'){
      const index=action.skillIndex;
      if(!Number.isInteger(index)||index<0||index>=actor.skills.length||
        !actor.skills[index]||actor.level<progressionConfig.skillUnlockLevels[index]||
        actor.cooldowns?.[index]>0)
        throw Object.assign(new Error('This skill is unavailable.'),{status:400});
      strike(battle,side,actor.skills[index],index);
    }else if(action?.action==='forfeit'){
      battle[side].forEach(fighter=>{fighter.hp=0;});
      record(battle,{side,forfeit:true});
    }else throw Object.assign(new Error('Invalid action.'),{status:400});

    if(side==='defense')battle.turn++;
    battle.nextSide=side==='attack'?'defense':'attack';
    if(!alive(battle.attack)||!alive(battle.defense)||battle.turn>arenaConfig.maxTurns){
      const ratio=group=>group.reduce((sum,fighter)=>sum+fighter.hp/fighter.maxHp,0);
      return {winner:alive(battle.attack)&&
        (!alive(battle.defense)||ratio(battle.attack)>ratio(battle.defense))?'attack':'defense'};
    }
    return null;
  }

  /** Determine the final result for a normal Arena battle. */
  function finish(battle){
    if(alive(battle.attack)&&alive(battle.defense)&&battle.turn<=arenaConfig.maxTurns)return null;
    const ratio=group=>group.reduce((sum,fighter)=>sum+fighter.hp/fighter.maxHp,0);
    const won=alive(battle.attack)&&
      (!alive(battle.defense)||ratio(battle.attack)>ratio(battle.defense));
    return {won,opponent:battle.opponent,events:battle.events,reward:won?battle.reward:{gold:0,food:0,gems:0}};
  }

  /** Public DTO used by Arena/Challenge React views. */
  function publicBattle(battle){
    const view=fighter=>({id:fighter.id,species:fighter.species,level:fighter.level,
      stars:fighter.stars||0,nickname:fighter.nickname,hp:fighter.hp,
      maxHp:combat.effectiveMaxHp(fighter),statuses:statusSnapshot(fighter),
      skills:fighter.skills.map((skill,index)=>skill?{
        index,name:skill.name,element:skill.element||null,power:skill.power,bonus:skill.bonus||0,
        special:!!skill.special,effect:skill.effect||null,description:skill.description||null,
        cooldown:skill.cooldown||0,remainingCooldown:fighter.cooldowns?.[index]||0,
        unlockLevel:progressionConfig.skillUnlockLevels[index],
        unlocked:fighter.level>=progressionConfig.skillUnlockLevels[index]}:null)});
    return {opponent:battle.opponent,turn:battle.turn,attack:battle.attack.map(view),
      defense:battle.defense.map(view),activeAttack:battle.activeAttack,
      activeDefense:battle.activeDefense,events:battle.events.slice(-arenaConfig.eventHistory)};
  }

  /** Simulate an AI-vs-AI fight for smoke/debug usage. */
  function fight(attackers,defenders){
    const left=attackers.map(makeFighter).filter(Boolean),right=defenders.map(makeFighter).filter(Boolean);
    if(!left.length||!right.length)throw Object.assign(new Error('Invalid team.'),{status:400});
    const battle={attack:left,defense:right,activeAttack:0,activeDefense:0,events:[],turn:1};
    for(;battle.turn<=arenaConfig.maxTurns&&alive(left)&&alive(right);battle.turn++){
      for(const side of ['attack','defense']){
        if(!alive(left)||!alive(right))break;
        const fighter=active(battle,side),ready=readySkills(fighter);
        if(!ready.length)throw Object.assign(new Error('This dragon has no unlocked skills.'),{status:400});
        const chosen=side==='defense'?chooseDefenseSkill(battle):
          ready[Math.floor(rng()*ready.length)];
        strike(battle,side,chosen.skill,chosen.index);
      }
    }
    const remaining=group=>group.reduce((sum,fighter)=>sum+fighter.hp/fighter.maxHp,0);
    return {won:alive(left)&&(!alive(right)||remaining(left)>remaining(right)),events:battle.events};
  }

  return {makeFighter,fight,publicBattle,active,chooseDefenseSkill,strike,liveTurn,finish,readySkills};
}

module.exports={createBattleEngine};
