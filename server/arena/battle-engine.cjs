/**
 * Authoritative Arena/Challenge battle engine.
 *
 * This module owns status-effect mutation and turn resolution. Fighter
 * construction, AI scoring and public DTO/event snapshots are delegated to
 * sibling modules. It does not read/write player files or award resources.
 *
 * Randomness is injectable through rng so tests can replay exact battles.
 */
const combat=require('../../js/data/combat-rules.js');
const arenaConfig=require('../../js/config/arena.js');
const combatConfig=require('../../js/config/combat.js');
const progressionConfig=require('../../js/config/progression.js');
const {createFighterFactory}=require('./fighter.cjs');
const {record,publicBattle}=require('./battle-view.cjs');
const {createBattleAi}=require('./battle-ai.cjs');
const fx=require('./battle-effects.cjs');

/**
 * Create the authoritative combat engine shared by Arena and live Challenge.
 * @param {object} options.catalog - Extended dragon/type catalog.
 * @param {object} options.game - Skill metadata catalog.
 * @param {Function} options.rng - Injectable RNG for deterministic tests.
 */
function createBattleEngine({catalog,game,rng=()=>Math.random()}){
  // Use a wrapper instead of capturing Math.random itself so test/runtime overrides
  // made after service creation still affect the default RNG, matching legacy behavior.
  const {makeFighter}=createFighterFactory({catalog,game});

  /** Currently active fighter for one battle side. */
  function active(battle,side){
    return battle[side][battle[side==='attack'?'activeAttack':'activeDefense']];
  }

  const {readySkills,chooseDefenseSkill}=createBattleAi({typeChart:catalog.typeChart});
  const skillRegistry=new Map([...game.skills.neutral,
    ...Object.values(game.skills.elemental).flat()].map(item=>[item.id,item]));

  /** Resolve a skill and record each target separately for battle replay. */
  function strike(battle,side,skill,skillIndex){
    const actor=active(battle,side),other=side==='attack'?'defense':'attack';
    const target=active(battle,other);
    if(!actor||actor.hp<=0||!target||target.hp<=0)return;
    actor.statuses||=[];actor.cooldowns||=[0,0,0,0];
    let cast=skill;
    if(skill.effect?.kind==='copy_last'){
      const last=skillRegistry.get(battle.lastSkillBySide?.[other]);
      if(last&&!['copy_last','revive_first'].includes(last.effect?.kind))
        cast={...last,power:last.power*.65,bonus:(last.bonus||0)*.65,
          special:true,effect:last.effect?{...last.effect,
            value:(last.effect.value||0)*.65}:null};
      else cast={...skill,power:1,effect:null};
    }
    const effect=cast.effect||{},kind=effect.kind;
    if(kind==='revive_first'&&(battle.revives?.[side]||!battle[side].some(f=>f.hp<=0)))
      throw Object.assign(new Error('No eligible dragon to revive.'),{status:400});
    const frozen=!!fx.status(actor,'freeze');
    if(frozen){
      actor.statuses=actor.statuses.filter(s=>s.kind!=='freeze');
      actor.freezeImmunity=3;
      record(battle,{side,targetSide:side,actor:actor.nickname,target:actor.nickname,
        skill:'Frozen',effect:'freeze',skipped:true,damage:0,remaining:actor.hp});
    }else{
      const recordHit=(victim,damage,extra={})=>record(battle,{side,actor:actor.nickname,
        actorSpecies:actor.species,target:victim.nickname,
        targetSide:battle[side].includes(victim)?side:other,
        skill:skill.name,skillId:skill.id,element:skill.element||null,effect:kind||null,
        special:!!skill.special,damage,remaining:victim.hp,knockout:victim.hp===0,...extra});
      const cost=kind==='blood_crit'?effect.value:kind==='lifesteal_cost'?effect.cost:
        kind==='last_stand'?effect.cost:0;
      if(cost)actor.hp=Math.max(1,actor.hp-Math.max(1,Math.round(actor.hp*
        (kind==='blood_crit'||kind==='lifesteal_cost'?cost:0)+
        actor.maxHp*(kind==='last_stand'?cost:0))));
      const offensive=combat.skillPower(actor.attack,cast)>0||kind==='echo_last';
      const aoe=['area','spore_bloom'].includes(kind);
      const victims=aoe?fx.living(battle[other]):offensive?[target]:[];
      let totalDamage=0;
      for(const victim of victims){
        if(victim.hp<=0)continue;
        let hits=0,misses=0,critical=false,damage=0;
        const attempts=kind==='multi'||kind==='low_hp_power'?effect.hits:1;
        for(let i=0;i<attempts&&victim.hp>0;i++){
          const miss=Math.min(combatConfig.maxAccuracyPenalty,
            (kind==='multi'?effect.missChance:0)+combat.statusValue(actor,'accuracy_down'));
          if(rng()<miss){misses++;continue;}
          const crit=kind==='blood_crit'||rng()<combatConfig.critical.chance;
          const variance=combatConfig.variance.min+rng()*
            (combatConfig.variance.max-combatConfig.variance.min);
          let power=cast.power;
          if(kind==='switch_punish'&&battle.lastSwitchSide===other)power+=effect.value;
          if(kind==='curse_strike'&&fx.status(victim,'curse'))power+=effect.bonusDamage;
          if(kind==='repeat_punish'&&((victim.skillUses||{})[victim.lastSkill]||0)>=2)
            power+=effect.value;
          if(kind==='execute'&&victim.hp/victim.maxHp<effect.value)power=effect.lowPower;
          if(kind==='last_stand'&&actor.hp/actor.maxHp<effect.lowHp)power=effect.lowPower;
          if(kind==='low_hp_power'&&actor.hp/actor.maxHp<effect.threshold)power=effect.lowPower;
          const attackSkill={...cast,power,bonus:cast.bonus||0,special:!!cast.special};
          let dealt=combat.battleDamage(actor,victim,attackSkill,catalog.typeChart,variance,crit);
          if(kind==='echo_last'){
            const replay=Math.min(actor.attack*effect.cap,
              (actor.lastDirectDamage||actor.attack)*effect.value);
            dealt=combat.battleDamage(actor,victim,{...skill,power:replay/actor.attack,
              bonus:0,special:true},catalog.typeChart,variance,false);
          }
          const buff=fx.status(actor,'next_attack_up')||fx.status(actor,'carapace_strike');
          if(buff){dealt=Math.round(dealt*(1+buff.value));
            actor.statuses.splice(actor.statuses.indexOf(buff),1);}
          const actual=fx.absorb(victim,dealt);
          damage+=actual;totalDamage+=actual;hits++;critical=critical||crit;
          const reflect=fx.status(victim,'reflect');
          if(reflect&&actor.hp>0){
            const reflected=Math.min(Math.round(actual*reflect.value),
              Math.round(victim.maxHp*(reflect.cap||.12)));
            fx.absorb(actor,reflected);
          }
          if(fx.status(victim,'carapace')&&victim.hp>0)
            fx.addStatus(victim,{kind:'carapace_strike',value:effect.counterBonus||.15,duration:2},skill.element);
        }
        if(hits&&victim.hp>0){
          if(['poison','burn','curse','armor_down','damage_down'].includes(kind))
            fx.addStatus(victim,effect,skill.element);
          if(kind==='freeze_chance'&&!victim.freezeImmunity&&rng()<effect.value)
            fx.addStatus(victim,{kind:'freeze',duration:1,value:0},skill.element);
          if(kind==='lock_switch'&&!victim.switchImmunity)
            fx.addStatus(victim,effect,skill.element);
          if(kind==='detonate_burn'&&fx.status(victim,'burn')){
            const burn=fx.status(victim,'burn');
            victim.statuses.splice(victim.statuses.indexOf(burn),1);
            const burst=fx.absorb(victim,Math.round(victim.maxHp*effect.value));
            damage+=burst;totalDamage+=burst;
          }
          if(kind==='spore_bloom'&&fx.status(target,'poison')&&victim!==target)
            fx.addStatus(victim,{kind:'poison',value:effect.value,duration:effect.duration},skill.element);
          if(kind==='dispel_strike'){
            const buff=victim.statuses.find(s=>['armor_up','damage_reduction'].includes(s.kind));
            if(buff)victim.statuses.splice(victim.statuses.indexOf(buff),1);
          }
        }
        recordHit(victim,damage,{hits,misses,critical,
          matchup:combat.matchup(skill.element,victim.parts,catalog.typeChart)});
      }
      const support=(victim,amount=0)=>recordHit(victim,0,{heal:amount});
      const allies=battle[side];
      const healOne=(victim,value)=>{if(victim)support(victim,fx.heal(victim,victim.maxHp*value));};
      if(kind==='heal_lowest')healOne(fx.lowest(allies),effect.value);
      else if(kind==='heal_team')for(const f of fx.living(allies))healOne(f,effect.value);
      else if(kind==='cleanse_heal_lowest'){
        const f=fx.living(allies).sort((a,b)=>
          fx.harmful.size&&b.statuses.filter(s=>fx.harmful.has(s.kind)).length-
          a.statuses.filter(s=>fx.harmful.has(s.kind)).length)[0];
        if(f){fx.removeHarmful(f,effect.remove);healOne(f,effect.value);}
      }else if(kind==='cleanse_team_heal'){
        for(const f of fx.living(allies)){fx.removeHarmful(f,effect.remove);healOne(f,effect.value);}
      }else if(kind==='cleanse_heal_self'){
        fx.removeHarmful(actor,effect.remove);healOne(actor,effect.value);
      }else if(kind==='revive_first'){
        const f=allies.find(item=>item.hp<=0);
        f.hp=Math.max(1,Math.round(f.maxHp*effect.value));f.statuses=[];
        battle.revives={...battle.revives,[side]:true};support(f,0);
      }else if(kind==='rewind_ally'){
        const f=fx.lowest(allies);
        if(f)support(f,fx.heal(f,Math.min(f.maxHp*effect.cap,(f.damageLastTurn||0)*effect.value)));
      }else if(kind==='regen_team'){
        for(const f of fx.living(allies)){fx.addStatus(f,{kind:'regen',value:effect.value,
          duration:effect.duration+1},skill.element);support(f);}
      }else if(kind==='vitality'){
        const old=combat.effectiveMaxHp(actor);fx.addStatus(actor,{...effect,
          duration:effect.duration+1},skill.element);
        actor.hp+=combat.effectiveMaxHp(actor)-old;support(actor,actor.hp-old);
      }else if(['shield','damage_up','damage_reduction','armor_up','reflect','next_attack_up',
        'carapace'].includes(kind)){fx.addStatus(actor,{...effect,
          duration:effect.duration+1},skill.element);support(actor);}
      else if(kind==='switch_trap'){
        battle.traps??={};battle.traps[other]={turns:effect.duration,value:effect.value};
        support(actor);
      }else if(kind==='lifesteal_cost'){
        support(actor,fx.heal(actor,Math.min(totalDamage*effect.value,actor.maxHp*effect.healCap)));
      }else if(!offensive)support(actor);
      if(totalDamage>0&&kind!=='echo_last'&&!aoe)actor.lastDirectDamage=totalDamage;
      actor.skillUses??={};actor.skillUses[skill.id]=(actor.skillUses[skill.id]||0)+1;
      actor.lastSkill=skill.id;
      battle.lastSkillBySide??={};battle.lastSkillBySide[side]=skill.id;
      if(skill.cooldown)actor.cooldowns[skillIndex]=skill.cooldown;
    }
    // Cooldowns count only the fighter's own turns, including a frozen turn.
    actor.cooldowns=actor.cooldowns.map((n,i)=>i===skillIndex&&!frozen?n:Math.max(0,n-1));
    fx.tickSide(battle,side);
    for(const f of battle[side])f.damageLastTurn=0;
    for(const f of battle[side]){
      if(f.freezeImmunity>0)f.freezeImmunity--;
      if(f.switchImmunity>0)f.switchImmunity--;
    }
    if(battle.traps?.[side]?.turns>0&&--battle.traps[side].turns<=0)battle.traps[side]=null;
    fx.nextFighter(battle,side);fx.nextFighter(battle,other);
  }
  /** True when a battle side still has at least one living fighter. */
  const alive=group=>group.some(fighter=>fighter.hp>0);

  /** Resolve one player-vs-player Challenge action. */
  function liveTurn(battle,side,action){
    const forfeiting=action?.action==='forfeit';
    if(!forfeiting&&battle.nextSide!==side)
      throw Object.assign(new Error('Wait for the other player.'),{status:409});
    const actor=active(battle,side);
    if(!actor||actor.hp<=0)throw Object.assign(new Error('No active dragon.'),{status:409});
    if(action?.action==='switch'){
      const index=battle[side].findIndex(fighter=>fighter.id===action.dragonId&&fighter.hp>0);
      if(index<0||index===battle[side==='attack'?'activeAttack':'activeDefense'])
        throw Object.assign(new Error('Choose a different living dragon.'),{status:400});
      fx.switchFighter(battle,side,index);
      // The same player may choose a skill after switching; event sequence still advances.
      return null;
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

    if(side==='defense'&&!forfeiting)battle.turn++;
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

  return {makeFighter,fight,publicBattle,active,alive,chooseDefenseSkill,strike,
    liveTurn,finish,readySkills,switchFighter:fx.switchFighter};
}

module.exports={createBattleEngine};
