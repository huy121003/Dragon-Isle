/* PvP: máy chủ giữ đội hình, thời gian chờ và tung kết quả trận. */
const path=require('node:path');
const {readJson,updateJson}=require('./store.cjs');
const arenaConfig=require('../js/config/arena.js');
const progressionConfig=require('../js/config/progression.js');
const {createEligibility}=require('./arena/eligibility.cjs');
const {createBattleEngine}=require('./arena/battle-engine.cjs');
const dailyMissions=require('./daily-missions.cjs');
/** Reset Arena attempts at 00:00, 08:00 and 16:00 Vietnam time. */
function arenaWindow(now=Date.now()){
  const shifted=new Date(now+7*60*60*1000),hour=shifted.getUTCHours();
  const startHour=Math.floor(hour/8)*8;
  const start=Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate(),startHour)-7*60*60*1000;
  return {key:String(start),resetAt:start+arenaConfig.attemptWindowMs};
}
/** Create stable AI rivals from the chosen attack team with varied strength. */
function createRivals(team,playerLevel,windowKey){
  const levels=[-15,0,15],stars=[-1,0,1];
  return levels.map((offset,index)=>({id:`bot-${windowKey}-${index+1}`,username:['Rookie Warden','Balanced Keeper','Rival Champion'][index],
    level:Math.max(1,Math.min(progressionConfig.contentLevelCap,playerLevel+offset)),
    strength:['Weaker','Balanced','Stronger'][index],team:team.map((dragon,slot)=>({...dragon,
      id:-(index*100+slot+1),level:Math.max(arenaConfig.minBattleLevel,
        Math.min(arenaConfig.maxBattleLevel,dragon.level+offset)),
      stars:Math.max(0,Math.min(5,(dragon.stars||0)+stars[index])),nickname:['Rookie','Keeper','Champion'][index]+' '+(slot+1)}))}));
}
/**
 * Create the authoritative Arena service.
 * @param {object} options
 * @param {string} options.profilesDir - Player profile directory.
 * @param {string} options.dataDir - Runtime Arena persistence directory.
 * @param {string} options.catalogDir - Static game catalog directory.
 * @param {object} options.auth - Authentication/session service.
 */
function createArena({profilesDir,dataDir,catalogDir=dataDir,auth}){
  const arenaDir=path.join(dataDir,'arena');
  const file=id=>path.join(arenaDir,id+'.json');
  const profile=id=>path.join(profilesDir,id+'.json');
  const catalog=require(path.join(catalogDir,'dragons.json'));
  const game=require(path.join(catalogDir,'game.json'));
  require('../scripts/extend-catalog.cjs')(catalog,game);
  const unlocked=profile=>profile?.buildings?.some(building=>building.type==='arena'&&!building.stored);
  const eligibility=createEligibility();
  const eligible=eligibility.eligible;
  const owned=eligibility.ownedTeam;
  const summary=eligibility.summary;
  const battleEngine=createBattleEngine({catalog,game});
  const {makeFighter:fighter,fight,publicBattle,active,alive,chooseDefenseSkill,strike,
    liveTurn,finish}=battleEngine;
/** Load this player's saved attack team and current three AI opponents. */
  async function list(user){
    const own=await readJson(profile(user.id),null),arena=await readJson(file(user.id),{});
    if(!unlocked(own))throw Object.assign(new Error('Build an Arena first.'),{status:403});
    const window=arenaWindow(),attack=owned(own,arena.attack)?arena.attack:[];
    let setup=arena;
    await updateJson(file(user.id),current=>{
      const next={...(current||{})};
      if(next.windowKey!==window.key){next.windowKey=window.key;next.attemptsRemaining=arenaConfig.attemptsPerWindow;next.rivals=[];}
      if(!Array.isArray(next.rivals)||next.rivalTeam!==JSON.stringify(attack)){
        next.rivals=attack.length===arenaConfig.teamSize?createRivals(summary(own,attack),Math.floor(own.player?.level||1),window.key):[];
        next.rivalTeam=JSON.stringify(attack);
      }
      setup=next;return next;
    });
    const opponents=(setup.rivals||[]).map(({id})=>({id}));
    return {attack,dragons:summary(own,own.dragons.map(d=>d.id)),opponents,wins:setup.wins||0,losses:setup.losses||0,
      attemptsRemaining:setup.attemptsRemaining??3,resetAt:window.resetAt,
      battle:setup.battle?publicBattle(setup.battle):null};
  }
  /** Persist the validated attack team used to generate AI rivals. */
  async function team(user,body){
    const p=await readJson(profile(user.id),null);
    if(!unlocked(p)||!body||!owned(p,body.attack))
      throw Object.assign(new Error('Each team needs exactly '+arenaConfig.teamSize+
        ' eligible attack dragons.'),{status:400});
    await updateJson(file(user.id),current=>({...current,attack:body.attack,rivals:[],rivalTeam:null}));
    return {ok:true};
  }
  /** Credit Arena rewards to profile resources and reconciliation bank. */
  async function credit(user,reward){
    await updateJson(profile(user.id),current=>{
      const bank={...(current.arenaBank||{gold:0,food:0,gems:0})};
      for(const key of ['gold','food','gems'])bank[key]+=reward[key];
      return {...current,gold:(current.gold||0)+reward.gold,
        food:(current.food||0)+reward.food,gems:(current.gems||0)+reward.gems,
        arenaBank:bank,arenaClaimed:bank};
    });
  }
  /** Start a battle against one of the server-generated AI rivals. */
  async function challenge(user,body){
    const attackerProfile=await readJson(profile(user.id),null);
    if(!unlocked(attackerProfile))throw Object.assign(new Error('Build an Arena first.'),{status:403});
    const window=arenaWindow();
    let battle;
    await updateJson(file(user.id),current=>{
      const setup=current||{};
      if(setup.battle)throw Object.assign(new Error('Finish the current battle first.'),{status:409});
      if(setup.windowKey!==window.key){setup.windowKey=window.key;setup.attemptsRemaining=arenaConfig.attemptsPerWindow;setup.rivals=[];}
      if(!owned(attackerProfile,setup.attack))throw Object.assign(new Error('Set '+arenaConfig.teamSize+' eligible attack dragons.'),{status:400});
      if(!Array.isArray(setup.rivals)||setup.rivalTeam!==JSON.stringify(setup.attack)){
        setup.rivals=createRivals(summary(attackerProfile,setup.attack),Math.floor(attackerProfile.player?.level||1),window.key);
        setup.rivalTeam=JSON.stringify(setup.attack);
      }
      const rival=setup.rivals.find(item=>item.id===body?.opponentId);
      if(!rival)throw Object.assign(new Error('Invalid Arena rival. Refresh the Arena.'),{status:400});
      if((setup.attemptsRemaining??3)<=0)throw Object.assign(new Error('No Arena attempts left. They reset at 00:00, 08:00 and 16:00.'),{status:429});
      const attack=summary(attackerProfile,setup.attack).map(fighter).filter(Boolean);
      const defense=rival.team.map(fighter).filter(Boolean);
      if(!attack.length||!defense.length)throw Object.assign(new Error('Invalid team.'),{status:400});
      const rewardRules=arenaConfig.rewards;
      const rewardLevel=Math.min(progressionConfig.contentLevelCap,Math.max(1,rival.level));
      battle={opponent:rival.username,opponentId:null,turn:1,attack,defense,activeAttack:0,activeDefense:0,
        events:[],reward:{gold:rewardRules.goldBase+rewardRules.goldPerOpponentLevel*rewardLevel,
          food:rewardRules.foodBase+rewardRules.foodPerOpponentLevel*rewardLevel,
          gems:rewardRules.gemBase+Math.floor(rewardLevel/rewardRules.gemLevelStep)*rewardRules.gemPerLevelStep}};
      return {...setup,attemptsRemaining:(setup.attemptsRemaining??3)-1,battle};
    });
    return {battle:publicBattle(battle)};
  }
  /** Resolve one Arena player turn, AI response and optional battle completion. */
  async function turn(user,body){
    let response,award=null;
    await updateJson(file(user.id),current=>{
      const setup=current||{},b=setup.battle;
      if(!b)throw Object.assign(new Error('No battle in progress.'),{status:409});
      if(!Number.isInteger(body?.expectedTurn)||body.expectedTurn!==b.turn)
        throw Object.assign(new Error('The turn changed. Reload the Arena.'),{status:409});
      const actor=active(b,'attack');
      if(body.action==='switch'){
        const index=b.attack.findIndex(f=>f.id===body.dragonId&&f.hp>0);
        if(index<0||index===b.activeAttack)throw Object.assign(new Error('The replacement must be alive and different from the active dragon.'),{status:400});
        b.activeAttack=index;
        b.events.push({turn:b.turn,side:'attack',switchTo:b.attack[index].nickname});
        const chosen=chooseDefenseSkill(b);
        strike(b,'defense',chosen.skill,chosen.index);
      }else if(body.action==='skill'){
        const index=body.skillIndex;
        if(!Number.isInteger(index)||index<0||index>=actor.skills.length)
          throw Object.assign(new Error('Invalid skill.'),{status:400});
        if(!actor.skills[index]||actor.level<progressionConfig.skillUnlockLevels[index])
          throw Object.assign(new Error('This skill is locked.'),{status:400});
        if(actor.cooldowns?.[index]>0)
          throw Object.assign(new Error('This skill is cooling down.'),{status:400});
        const chosen=actor.skills[index];
        strike(b,'attack',chosen,index);
        if(alive(b.defense)&&alive(b.attack)){
          const ai=chooseDefenseSkill(b);
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
        response={result};
        return {...setup,battle:null,
          wins:(setup.wins||0)+(result.won?1:0),losses:(setup.losses||0)+(result.won?0:1)};
      }
      response={battle:publicBattle(b)};
      return {...setup,battle:b};
    });
    if(response.result)await updateJson(profile(user.id),current=>({...current,
      dailyMissions:dailyMissions.addProgress(current.dailyMissions,'arena',1)}));
    if(award)await credit(user,award);
    return response;
  }
  return {list,team,challenge,turn,fight,liveTurn,makeFighter:fighter,publicBattle,
    eligible,summary};
}
module.exports={createArena,arenaWindow,createRivals};
