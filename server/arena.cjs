/* PvP: máy chủ giữ đội hình, thời gian chờ và tung kết quả trận. */
const path=require('node:path');
const {readJson,updateJson}=require('./store.cjs');
const COOLDOWN=15*60*1000;
const TEAM_SIZE=3;
const MIN_BATTLE_LEVEL=10;
function createArena({profilesDir,dataDir,auth}){
  const arenaDir=path.join(dataDir,'arena');
  const file=id=>path.join(arenaDir,id+'.json');
  const profile=id=>path.join(profilesDir,id+'.json');
  const catalog=require(path.join(dataDir,'dragons.json'));
  const game=require(path.join(dataDir,'game.json'));
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
    if(!parts.length||parts.length>4||parts.some(e=>!elements[e])||new Set(parts).size!==parts.length)return null;
    const rarity=raw?.doHiem|| (parts.length===1?'common':parts.length===2?
      parts.some(e=>['light','dark','metal'].includes(e))?'epic':'rare':parts.length===3?'legendary':'mythic');
    const weight={1:[1],2:[.6,.4],3:[.5,.3,.2],4:[.4,.3,.2,.1]}[parts.length];
    const base={};for(const key of ['hp','tanCong','phongThu','tocDo'])
      base[key]=parts.reduce((total,e,i)=>total+elements[e].chiSo[key]*weight[i],0)*rarities[rarity].heSoChiSo;
    return {parts,rarity,base};
  };
  function fighter(d){
    const s=species(d.species);if(!s)return null;
    const l=Math.max(1,Math.min(100,d.level)),base=s.base;
    const skills=(catalog.species.find(x=>x.id===d.species)?.skillIds||
      (s.parts.length===1?['claw','slam',s.parts[0]+'-1',s.parts[0]+'-2']:
        (s.parts.length===2?['claw','slam']:s.parts.length===3?['claw']:[]).concat(s.parts.map(e=>e+'-1'))));
    const registry=[...(game.skills.neutral||[]),...Object.entries(game.skills.elemental||{}).flatMap(([element,list])=>
      list.map(skill=>({...skill,element})))];
    return {...d,parts:s.parts,rarity:s.rarity,maxHp:Math.round(base.hp*5*(1+.09*(l-1))),
      hp:Math.round(base.hp*5*(1+.09*(l-1))),attack:Math.round(base.tanCong*(1+.075*(l-1))),
      defense:Math.round(base.phongThu*(1+.075*(l-1))),speed:Math.round(base.tocDo*(1+.025*(l-1))),
      skills:skills.map(id=>registry.find(x=>x.id===id))};
  }
  function fight(attackers,defenders){
    const left=attackers.map(fighter).filter(Boolean),right=defenders.map(fighter).filter(Boolean),events=[];
    if(!left.length||!right.length)throw Object.assign(new Error('Invalid team.'),{status:400});
    for(let turn=1;turn<=80&&left.some(f=>f.hp>0)&&right.some(f=>f.hp>0);turn++){
      const order=left.filter(f=>f.hp>0).map(f=>({f,side:'attack'})).concat(
        right.filter(f=>f.hp>0).map(f=>({f,side:'defense'})))
        .sort((a,b)=>b.f.speed-a.f.speed||Math.random()-.5);
      for(const {f,side} of order){
        if(f.hp<=0)continue;
        const targets=side==='attack'?right:left,target=targets.find(v=>v.hp>0);
        if(!target)break;
        const ready=f.skills.filter((s,i)=>s&&f.level>=game.progression.skillUnlockLevels[i]);
        if(!ready.length)throw Object.assign(new Error('This dragon has no unlocked skills.'),{status:400});
        const skill=ready[Math.floor(Math.random()*ready.length)];
        const type=skill.element?(catalog.typeChart?.[skill.element]?.[target.parts[0]]||1):1;
        const bonus=skill.element?skill.bonus*(1+.1*(f.level-1))*rarities[f.rarity].heSoChiSo:0;
        const critical=Math.random()<.1;
        const damage=Math.max(1,Math.round(((f.attack*skill.power+bonus)*type-target.defense*.5)*
          (.9+Math.random()*.2)*(critical?1.5:1)));
        target.hp=Math.max(0,target.hp-damage);
        events.push({turn,side,actor:f.nickname,actorSpecies:f.species,target:target.nickname,
          skill:skill.name,element:skill.element||null,damage,critical,remaining:target.hp,knockout:target.hp===0});
      }
    }
    const remaining=group=>group.reduce((sum,f)=>sum+f.hp/f.maxHp,0);
    return {won:left.some(f=>f.hp>0)&&(right.every(f=>f.hp===0)||remaining(left)>remaining(right)),events};
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
      hp:f.hp,maxHp:f.maxHp,speed:f.speed,skills:f.skills.map((skill,i)=>skill?{
        index:i,name:skill.name,element:skill.element||null,power:skill.power,
        unlockLevel:game.progression.skillUnlockLevels[i],
        unlocked:f.level>=game.progression.skillUnlockLevels[i]}:null)});
    return {opponent:b.opponent,turn:b.turn,attack:b.attack.map(view),defense:b.defense.map(view),
      activeAttack:b.activeAttack,activeDefense:b.activeDefense,events:b.events.slice(-40)};
  }
  function active(b,side){return b[side][b[side==='attack'?'activeAttack':'activeDefense']];}
  function strike(b,side,skill){
    const actor=active(b,side),other=side==='attack'?'defense':'attack',target=active(b,other);
    if(!actor||actor.hp<=0||!target||target.hp<=0)return;
    const type=skill.element?(catalog.typeChart?.[skill.element]?.[target.parts[0]]||1):1;
    const bonus=skill.element?(skill.bonus||0)*(1+.1*(actor.level-1))*rarities[actor.rarity].heSoChiSo:0;
    const critical=Math.random()<.1;
    const damage=Math.max(1,Math.round(((actor.attack*skill.power+bonus)*type-target.defense*.5)*
      (.9+Math.random()*.2)*(critical?1.5:1)));
    target.hp=Math.max(0,target.hp-damage);
    b.events.push({turn:b.turn,side,actor:actor.nickname,actorSpecies:actor.species,
      target:target.nickname,skill:skill.name,element:skill.element||null,damage,critical,
      remaining:target.hp,knockout:target.hp===0});
    if(target.hp===0){
      const next=b[other].findIndex(f=>f.hp>0);
      if(next>=0){b[other==='attack'?'activeAttack':'activeDefense']=next;
        b.events.push({turn:b.turn,side:other,switchTo:b[other][next].nickname,automatic:true});}
    }
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
        const skills=defender.skills.filter((s,i)=>s&&defender.level>=game.progression.skillUnlockLevels[i]);
        if(!skills.length)throw Object.assign(new Error('The defender has no unlocked skills.'),{status:400});
        strike(b,'defense',skills[Math.floor(Math.random()*skills.length)]);
      }else if(body.action==='skill'){
        const index=body.skillIndex;
        if(!Number.isInteger(index)||index<0||index>=actor.skills.length)
          throw Object.assign(new Error('Invalid skill.'),{status:400});
        if(!actor.skills[index]||actor.level<game.progression.skillUnlockLevels[index])
          throw Object.assign(new Error('This skill is locked.'),{status:400});
        const chosen=actor.skills[index];
        const ready=defender.skills.filter((s,i)=>s&&defender.level>=game.progression.skillUnlockLevels[i]);
        if(!ready.length)throw Object.assign(new Error('The defender has no unlocked skills.'),{status:400});
        const ai=ready[Math.floor(Math.random()*ready.length)];
        strike(b,'attack',chosen);
        if(defender.hp>0)strike(b,'defense',ai);
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
