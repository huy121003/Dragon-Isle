/* PvP: máy chủ giữ đội hình, thời gian chờ và tung kết quả trận. */
const path=require('node:path');
const {readJson,updateJson}=require('./store.cjs');
const economy=require('../data/economy.js');
const arenaConfig=require('../js/config/arena.js');
const progressionConfig=require('../js/config/progression.js');
const {createEligibility}=require('./arena/eligibility.cjs');
const {createBattleEngine}=require('./arena/battle-engine.cjs');
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
  /** Load the current player's Arena setup plus valid opponents. */
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
  /** Persist validated attack/defense teams for one player. */
  async function team(user,body){
    const p=await readJson(profile(user.id),null);
    if(!unlocked(p)||!body||!owned(p,body.attack)||!owned(p,body.defense))
      throw Object.assign(new Error('Each team needs exactly '+arenaConfig.teamSize+
        ' dragons at level '+arenaConfig.minBattleLevel+' or above that are not breeding.'),{status:400});
    await updateJson(file(user.id),current=>({...current,attack:body.attack,defense:body.defense}));
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
  /** Start an Arena battle against another player's saved defense team. */
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
      const rewardRules=economy.rewards;
      const rewardLevel=Math.min(economy.progression.contentLevelCap,
        Math.max(1,Math.floor(defenderProfile.player?.level||1)));
      battle={opponent:defender.username,opponentId:defender.id,turn:1,attack,defense,activeAttack:0,activeDefense:0,
        events:[],reward:{gold:rewardRules.arenaGoldBase+rewardRules.arenaGoldPerOpponentLevel*rewardLevel,
          food:rewardRules.arenaFoodBase+rewardRules.arenaFoodPerOpponentLevel*rewardLevel,
          gems:rewardRules.arenaGemBase+Math.floor(rewardLevel/20)*rewardRules.arenaGemPer20Levels}};
      return {...setup,cooldownUntil:0,battle};
    });
    return {battle:publicBattle(battle)};
  }
  /** Resolve one Arena player turn, AI response and optional battle completion. */
  async function turn(user,body){
    let response,award=null,defenderResult=null;
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
        defenderResult=b.opponentId?{id:b.opponentId,won:!result.won}:null;
        response={result};
        return {...setup,battle:null,cooldownUntil:result.won?0:Date.now()+arenaConfig.cooldownMs,
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
  return {list,team,challenge,turn,fight,liveTurn,makeFighter:fighter,publicBattle,
    eligible,summary};
}
module.exports={createArena};
