/* PvP: máy chủ giữ đội hình, thời gian chờ và tung kết quả trận. */
const path=require('node:path');
const {readJson,updateJson}=require('./store.cjs');
const combat=require('../js/data/combat-rules.js');
const COOLDOWN=15*60*1000;
const TEAM_SIZE=3;
const MIN_BATTLE_LEVEL=10;
function createArena({profilesDir,dataDir,auth}){
  const arenaDir=path.join(dataDir,'arena');
  const file=id=>path.join(arenaDir,id+'.json');
  const profile=id=>path.join(profilesDir,id+'.json');
  const catalog=require(path.join(dataDir,'dragons.json'));
  const game=require(path.join(dataDir,'game.json'));
  require('../scripts/extend-catalog.cjs')(catalog,game);
  const elements=catalog.elements,rarities=catalog.rarities;
  const unlocked=p=>p?.buildings?.some(b=>b.type==='arena'&&!b.stored);
  const breeding=(p,id)=>p.buildings?.some(b=>b.type==='cave'&&b.breeding&&
    b.breeding.readyAt>Date.now()&&(b.breeding.fatherId===id||b.breeding.motherId===id));
  const eligible=(p,d)=>d.level>=MIN_BATTLE_LEVEL&&d.level<=100&&!breeding(p,d.id);
  const owned=(p,ids)=>Array.isArray(ids)&&ids.length===TEAM_SIZE&&
    ids.every(Number.isInteger)&&new Set(ids).size===ids.length&&
    ids.every(id=>p?.dragons?.some(d=>d.id===id&&eligible(p,d)));
  const summary=(p,ids)=>ids.map(id=>p.dragons.find(d=>d.id===id)).filter(Boolean)
    .map(d=>({id:d.id,species:d.species,level:d.level,nickname:d.nickname,
      canBattle:eligible(p,d),battleReason:d.level<MIN_BATTLE_LEVEL?
        'Requires level '+MIN_BATTLE_LEVEL:breeding(p,d.id)?'Breeding':null}));
  const species=id=>{
    const raw=catalog.species.find(d=>d.id===id);
    const parts=raw?.elements||id.split('>');
    const doubled=raw?.doHiem==='transcendent'&&parts.length===4&&
      parts[0]===parts[1]&&new Set(parts).size===3;
    if(!parts.length||parts.length>4||parts.some(e=>!elements[e])||
      (!doubled&&new Set(parts).size!==parts.length))return null;
    const rarity=raw?.doHiem|| (parts.length===1?'common':parts.length===2?
      parts.some(e=>['light','dark','metal'].includes(e))?'epic':'rare':parts.length===3?'legendary':'mythic');
    return {parts,rarity};
  };
  function fighter(d){
    const s=species(d.species);if(!s)return null;
    const stats=combat.stats(s.parts,s.rarity,d.level,elements,rarities);
    const skills=(catalog.species.find(x=>x.id===d.species)?.skillIds||
      (s.parts.length===1?['claw','slam',s.parts[0]+'-1',s.parts[0]+'-2']:
        (s.parts.length===2?['claw','slam']:s.parts.length===3?['claw']:[]).concat(s.parts.map(e=>e+'-1'))));
    const registry=[...(game.skills.neutral||[]),...Object.entries(game.skills.elemental||{}).flatMap(([element,list])=>
      list.map(skill=>({...skill,element})))];
    return {...d,parts:s.parts,rarity:s.rarity,maxHp:stats.hp,
      hp:stats.hp,attack:stats.attack,defense:stats.defense,
      statuses:[],cooldowns:[0,0,0,0],skills:skills.map(id=>registry.find(x=>x.id===id))};
  }
  function fight(attackers,defenders){
    const left=attackers.map(fighter).filter(Boolean),right=defenders.map(fighter).filter(Boolean);
    if(!left.length||!right.length)throw Object.assign(new Error('Invalid team.'),{status:400});
    const b={attack:left,defense:right,activeAttack:0,activeDefense:0,events:[],turn:1};
    for(;b.turn<=80&&left.some(f=>f.hp>0)&&right.some(f=>f.hp>0);b.turn++){
      for(const side of ['attack','defense']){
        if(!left.some(f=>f.hp>0)||!right.some(f=>f.hp>0))break;
        const f=active(b,side),ready=readySkills(f);
        if(!ready.length)throw Object.assign(new Error('This dragon has no unlocked skills.'),{status:400});
        const chosen=ready[Math.floor(Math.random()*ready.length)];
        strike(b,side,chosen.skill,chosen.index);
      }
    }
    const remaining=group=>group.reduce((sum,f)=>sum+f.hp/f.maxHp,0);
    return {won:left.some(f=>f.hp>0)&&(right.every(f=>f.hp===0)||remaining(left)>remaining(right)),events:b.events};
  }
  async function list(user){
    const own=await readJson(profile(user.id),null),arena=await readJson(file(user.id),{});
    if(!unlocked(own))throw Object.assign(new Error('Build an Arena first.'),{status:403});
    const opponents=[];
    for(const other of auth.listUsers()){
      if(other.id===user.id||other.disabled)continue;
      const p=await readJson(profile(other.id),null),setup=await readJson(file(other.id),{});
      if(!unlocked(p)||!owned(p,setup.defense))continue;
      opponents.push({id:other.id,username:other.username,level:p.player?.level||1,
        wins:setup.wins||0,losses:setup.losses||0,
        team:summary(p,setup.defense)});
    }
    return {attack:owned(own,arena.attack)?arena.attack:[],defense:owned(own,arena.defense)?arena.defense:[],
      dragons:summary(own,own.dragons.map(d=>d.id)),opponents,wins:arena.wins||0,losses:arena.losses||0,
      cooldownUntil:(arena.cooldownUntil||0)>Date.now()?arena.cooldownUntil:0,
      battle:arena.battle?publicBattle(arena.battle):null};
  }
  async function team(user,body){
    const p=await readJson(profile(user.id),null);
    if(!unlocked(p)||!body||!owned(p,body.attack)||!owned(p,body.defense))
      throw Object.assign(new Error('Each team needs exactly three dragons at level 10 or above that are not breeding.'),{status:400});
    await updateJson(file(user.id),current=>({...current,attack:body.attack,defense:body.defense}));
    return {ok:true};
  }
  function publicBattle(b){
    const view=f=>({id:f.id,species:f.species,level:f.level,nickname:f.nickname,
      hp:f.hp,maxHp:combat.effectiveMaxHp(f),statuses:statusSnapshot(f),
      skills:f.skills.map((skill,i)=>skill?{
        index:i,name:skill.name,element:skill.element||null,power:skill.power,
        bonus:skill.bonus||0,special:!!skill.special,effect:skill.effect||null,
        description:skill.description||null,cooldown:skill.cooldown||0,
        remainingCooldown:f.cooldowns?.[i]||0,
        unlockLevel:game.progression.skillUnlockLevels[i],
        unlocked:f.level>=game.progression.skillUnlockLevels[i]}:null)});
    return {opponent:b.opponent,turn:b.turn,attack:b.attack.map(view),defense:b.defense.map(view),
      activeAttack:b.activeAttack,activeDefense:b.activeDefense,events:b.events.slice(-40)};
  }
  function active(b,side){return b[side][b[side==='attack'?'activeAttack':'activeDefense']];}
  const harmful=new Set(['poison','freeze','damage_down','armor_down','accuracy_down']);
  const statusIcons={poison:'☠',freeze:'❄',damage_up:'⚔',damage_down:'🗡',
    armor_up:'🛡',armor_down:'⚒',damage_reduction:'✦',regen:'✚',vitality:'♥',accuracy_down:'◌'};
  function statusSnapshot(f){return (f.statuses||[]).map(s=>({...s,icon:statusIcons[s.kind]||'✦'}));}
  function record(b,event){
    b.events.push({...event,turn:b.turn,state:{
      attack:b.attack.map(f=>({id:f.id,hp:f.hp,maxHp:combat.effectiveMaxHp(f),statuses:statusSnapshot(f),cooldowns:f.cooldowns||[]})),
      defense:b.defense.map(f=>({id:f.id,hp:f.hp,maxHp:combat.effectiveMaxHp(f),statuses:statusSnapshot(f),cooldowns:f.cooldowns||[]})),
      activeAttack:b.activeAttack,activeDefense:b.activeDefense}});
  }
  function nextFighter(b,side){
    const next=b[side].findIndex(f=>f.hp>0);
    if(next>=0){b[side==='attack'?'activeAttack':'activeDefense']=next;
      record(b,{side,switchTo:b[side][next].nickname,automatic:true});}
  }
  function addStatus(f,effect,element){
    const previous=f.statuses.find(s=>s.kind===effect.kind);
    if(previous){previous.turns=Math.max(previous.turns,effect.duration);
      previous.value=Math.max(previous.value||0,effect.value||0);
      previous.element=element;
    }else f.statuses.push({kind:effect.kind,turns:effect.duration,
      value:effect.value||0,element});
  }
  function readySkills(f){
    return f.skills.map((skill,index)=>({skill,index})).filter(({skill,index})=>
      skill&&f.level>=game.progression.skillUnlockLevels[index]&&!(f.cooldowns?.[index]>0));
  }
  function strike(b,side,skill,skillIndex){
    const actor=active(b,side),other=side==='attack'?'defense':'attack',target=active(b,other);
    if(!actor||actor.hp<=0||!target||target.hp<=0)return;
    actor.statuses||=[];actor.cooldowns||=[0,0,0,0];
    target.statuses||=[];target.cooldowns||=[0,0,0,0];
    const previous=actor.statuses.slice();
    for(const status of previous){
      if(status.kind!=='poison'&&status.kind!=='regen')continue;
      const max=combat.effectiveMaxHp(actor),amount=Math.max(1,Math.round(max*status.value));
      const before=actor.hp;
      actor.hp=status.kind==='poison'?Math.max(0,before-amount):Math.min(max,before+amount);
      record(b,{side,actor:actor.nickname,actorSpecies:actor.species,target:actor.nickname,
        targetSide:side,skill:status.kind==='poison'?'Poison':'Regeneration',
        element:status.element,effect:status.kind,statusTick:true,
        damage:Math.max(0,before-actor.hp),heal:Math.max(0,actor.hp-before),
        remaining:actor.hp,knockout:actor.hp===0});
    }
    const frozen=previous.some(s=>s.kind==='freeze');
    if(frozen&&actor.hp>0)record(b,{side,actor:actor.nickname,actorSpecies:actor.species,
      target:actor.nickname,targetSide:side,skill:'Frozen',element:'ice',effect:'freeze',
      skipped:true,damage:0,remaining:actor.hp});
    if(actor.hp>0&&!frozen){
      const effect=skill.effect;
      const beneficiary=effect?.target==='self'?actor:target;
      const before=beneficiary.hp;
      let damage=0,critical=false,hits=0,misses=0;
      const attempts=effect?.kind==='multi'?effect.hits:combat.skillPower(actor.attack,skill)>0?1:0;
      for(let hit=0;hit<attempts&&target.hp>0;hit++){
        const missChance=Math.min(.75,(effect?.kind==='multi'?effect.missChance:0)+
          combat.statusValue(actor,'accuracy_down'));
        if(Math.random()<missChance){misses++;continue;}
        const crit=Math.random()<.1;
        const dealt=Math.min(target.hp,combat.battleDamage(actor,target,skill,catalog.typeChart,
          .9+Math.random()*.2,crit));
        target.hp=Math.max(0,target.hp-dealt);
        damage+=dealt;hits++;critical=critical||crit;
      }
      if(effect&&(attempts===0||hits>0)){
        if(effect.kind==='heal'||effect.kind==='cleanse'){
          if(effect.kind==='cleanse')beneficiary.statuses=beneficiary.statuses.filter(s=>!harmful.has(s.kind));
          beneficiary.hp=Math.min(combat.effectiveMaxHp(beneficiary),beneficiary.hp+
            Math.round(beneficiary.maxHp*effect.value));
        }else if(effect.kind==='vitality'){
          const oldMax=combat.effectiveMaxHp(beneficiary);
          addStatus(beneficiary,effect,skill.element);
          beneficiary.hp=Math.min(combat.effectiveMaxHp(beneficiary),beneficiary.hp+
            combat.effectiveMaxHp(beneficiary)-oldMax);
        }else if(effect.duration>0&&effect.kind!=='multi'&&beneficiary.hp>0)
          addStatus(beneficiary,effect,skill.element);
      }
      if(skill.cooldown)actor.cooldowns[skillIndex]=skill.cooldown;
      record(b,{side,actor:actor.nickname,actorSpecies:actor.species,
        target:beneficiary.nickname,targetSide:beneficiary===actor?side:other,
        skill:skill.name,skillId:skill.id,element:skill.element||null,
        effect:effect?.kind||null,special:!!skill.special,damage,critical,hits,misses,
        heal:Math.max(0,beneficiary.hp-before),remaining:beneficiary.hp,
        knockout:target.hp===0});
    }
    for(const status of previous){
      if(!actor.statuses.includes(status))continue;
      status.turns--;
      if(status.turns<=0){actor.statuses.splice(actor.statuses.indexOf(status),1);
        actor.hp=Math.min(actor.hp,combat.effectiveMaxHp(actor));}
    }
    actor.cooldowns=actor.cooldowns.map((n,i)=>i===skillIndex&&actor.hp>0&&!frozen?n:Math.max(0,n-1));
    if(actor.hp===0)nextFighter(b,side);
    if(target.hp===0)nextFighter(b,other);
  }
  const alive=group=>group.some(f=>f.hp>0);
  function finish(b){
    if(alive(b.attack)&&alive(b.defense)&&b.turn<=80)return null;
    const ratio=group=>group.reduce((sum,f)=>sum+f.hp/f.maxHp,0);
    const won=alive(b.attack)&&(!alive(b.defense)||ratio(b.attack)>ratio(b.defense));
    return {won,opponent:b.opponent,events:b.events,reward:won?b.reward:
      {gold:0,food:0,gems:0}};
  }
  async function credit(user,reward){
    await updateJson(profile(user.id),current=>{
      const bank={...(current.arenaBank||{gold:0,food:0,gems:0})};
      for(const key of ['gold','food','gems'])bank[key]+=reward[key];
      return {...current,gold:(current.gold||0)+reward.gold,
        food:(current.food||0)+reward.food,gems:(current.gems||0)+reward.gems,
        arenaBank:bank,arenaClaimed:bank,savedAt:Date.now()};
    });
  }
  async function challenge(user,body){
    const defender=auth.listUsers().find(u=>u.id===body?.opponentId&&!u.disabled);
    if(!defender||defender.id===user.id)throw Object.assign(new Error('Invalid opponent.'),{status:400});
    const attackerProfile=await readJson(profile(user.id),null);
    const defenderProfile=await readJson(profile(defender.id),null);
    const defenderSetup=await readJson(file(defender.id),{});
    if(!unlocked(attackerProfile)||!unlocked(defenderProfile)||!owned(defenderProfile,defenderSetup.defense))
      throw Object.assign(new Error('The defense team is no longer valid.'),{status:409});
    let battle;
    await updateJson(file(user.id),current=>{
      const setup=current||{};
      if(setup.battle)throw Object.assign(new Error('Finish the current battle first.'),{status:409});
      if((setup.cooldownUntil||0)>Date.now()){
        const seconds=Math.ceil((setup.cooldownUntil-Date.now())/1000);
        throw Object.assign(new Error('Remaining: '+Math.floor(seconds/60)+' minutes '+(seconds%60)+' seconds until the next battle.'),{status:429});
      }
      if(!owned(attackerProfile,setup.attack))throw Object.assign(new Error('Set three eligible attack dragons.'),{status:400});
      const attack=summary(attackerProfile,setup.attack).map(fighter).filter(Boolean);
      const defense=summary(defenderProfile,defenderSetup.defense).map(fighter).filter(Boolean);
      if(!attack.length||!defense.length)throw Object.assign(new Error('Invalid team.'),{status:400});
      battle={opponent:defender.username,opponentId:defender.id,turn:1,attack,defense,activeAttack:0,activeDefense:0,
        events:[],reward:{gold:250+20*(defenderProfile.player?.level||1),
          food:20+3*(defenderProfile.player?.level||1),gems:1}};
      return {...setup,cooldownUntil:0,battle};
    });
    return {battle:publicBattle(battle)};
  }
  async function turn(user,body){
    let response,award=null,defenderResult=null;
    await updateJson(file(user.id),current=>{
      const setup=current||{},b=setup.battle;
      if(!b)throw Object.assign(new Error('No battle in progress.'),{status:409});
      if(!Number.isInteger(body?.expectedTurn)||body.expectedTurn!==b.turn)
        throw Object.assign(new Error('The turn changed. Reload the Arena.'),{status:409});
      const actor=active(b,'attack'),defender=active(b,'defense');
      if(body.action==='switch'){
        const index=b.attack.findIndex(f=>f.id===body.dragonId&&f.hp>0);
        if(index<0||index===b.activeAttack)throw Object.assign(new Error('The replacement must be alive and different from the active dragon.'),{status:400});
        b.activeAttack=index;
        b.events.push({turn:b.turn,side:'attack',switchTo:b.attack[index].nickname});
        const skills=readySkills(defender);
        if(!skills.length)throw Object.assign(new Error('The defender has no unlocked skills.'),{status:400});
        const chosen=skills[Math.floor(Math.random()*skills.length)];
        strike(b,'defense',chosen.skill,chosen.index);
      }else if(body.action==='skill'){
        const index=body.skillIndex;
        if(!Number.isInteger(index)||index<0||index>=actor.skills.length)
          throw Object.assign(new Error('Invalid skill.'),{status:400});
        if(!actor.skills[index]||actor.level<game.progression.skillUnlockLevels[index])
          throw Object.assign(new Error('This skill is locked.'),{status:400});
        if(actor.cooldowns?.[index]>0)
          throw Object.assign(new Error('This skill is cooling down.'),{status:400});
        const chosen=actor.skills[index];
        strike(b,'attack',chosen,index);
        if(alive(b.defense)&&alive(b.attack)){
          const ready=readySkills(active(b,'defense'));
          if(!ready.length)throw Object.assign(new Error('The defender has no unlocked skills.'),{status:400});
          const ai=ready[Math.floor(Math.random()*ready.length)];
          strike(b,'defense',ai.skill,ai.index);
        }
      }else if(body.action==='forfeit'){
        b.attack.forEach(f=>{f.hp=0;});
        b.events.push({turn:b.turn,side:'attack',forfeit:true});
      }else throw Object.assign(new Error('Invalid action.'),{status:400});
      b.turn++;
      const result=finish(b);
      if(result){
        award=result.won?result.reward:null;
        defenderResult=b.opponentId?{id:b.opponentId,won:!result.won}:null;
        response={result};
        return {...setup,battle:null,cooldownUntil:result.won?0:Date.now()+COOLDOWN,
          wins:(setup.wins||0)+(result.won?1:0),losses:(setup.losses||0)+(result.won?0:1)};
      }
      response={battle:publicBattle(b)};
      return {...setup,battle:b};
    });
    if(defenderResult)await updateJson(file(defenderResult.id),current=>({...(current||{}),
      wins:(current?.wins||0)+(defenderResult.won?1:0),
      losses:(current?.losses||0)+(defenderResult.won?0:1)}));
    if(award)await credit(user,award);
    return response;
  }
  return {list,team,challenge,turn,fight};
}
module.exports={createArena};
