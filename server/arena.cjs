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
/**
 * Build five distinct virtual squads from the ten highest-power owned dragons.
 * Each squad uses a different rank band, then tunes virtual levels/stars toward
 * a configured power ratio of the player's top-three Combat Power.
 */
function createRivals(top10,playerLevel,roundKey,makeFighter){
  if(!Array.isArray(top10)||top10.length<3||typeof makeFighter!=="function")return [];
  const ranked=top10.slice().sort((a,b)=>b.power-a.power||a.id-b.id).slice(0,10);
  const topThreePower=ranked.slice(0,3).reduce((sum,dragon)=>sum+dragon.power,0);
  const last=ranked.length-3,middle=Math.max(0,Math.floor((ranked.length-3)/2));
  const rankBands=[[last,last+1,last+2],[Math.max(0,last-1),last,last+1],[middle-1,middle,middle+1],[0,1,2],[0,0,1]]
    .map(band=>band.map(rank=>Math.max(0,Math.min(last+2,rank))));
  const levelOffsets=[-4,-2,0,2,4],starOffsets=[-1,-1,0,1,1];
  const names=['Rookie Warden','Scout Keeper','Balanced Guard','Veteran Champion','Arena Legend'];
  const nicknames=['Rookie','Scout','Keeper','Veteran','Legend'];
  const ratios=arenaConfig.rivalPowerRatios;

  /** Sum actual fighter power, recalculated after each virtual stat adjustment. */
  function teamPower(team){return team.reduce((sum,dragon)=>sum+(makeFighter(dragon)?.power||0),0);}
  /** Move a virtual team toward its target without exceeding legal level/star limits. */
  function tuneTeam(team,target){
    for(let step=0;step<600;step++){
      const current=teamPower(team),currentGap=Math.abs(target-current);
      if(currentGap<=Math.max(1,target*.002))break;
      let best=null,bestGap=currentGap;
      for(let slot=0;slot<team.length;slot++)for(const field of ['level','stars'])for(const direction of [-1,1]){
        const dragon=team[slot],maximum=field==='level'?arenaConfig.maxBattleLevel:5;
        const minimum=field==='level'?arenaConfig.minBattleLevel:0;
        const value=dragon[field]||0,nextValue=value+direction;
        if(nextValue<minimum||nextValue>maximum)continue;
        const candidate=team.map((item,index)=>index===slot?{...item,[field]:nextValue}:item);
        const gap=Math.abs(target-teamPower(candidate));
        if(gap<bestGap){bestGap=gap;best={slot,field,value:nextValue};}
      }
      if(!best)break;
      team[best.slot][best.field]=best.value;
    }
    return team;
  }

  return rankBands.map((indices,index)=>{
    const team=indices.map((rank,slot)=>{
      const source=ranked[Math.min(rank,ranked.length-1)];
      return {...source,id:-(index*100+slot+1),level:Math.max(arenaConfig.minBattleLevel,
        Math.min(arenaConfig.maxBattleLevel,source.level+levelOffsets[index])),
        stars:Math.max(0,Math.min(5,(source.stars||0)+starOffsets[index])),
        nickname:nicknames[index]+' '+(slot+1)};
    });
    const target=topThreePower*ratios[index];
    tuneTeam(team,target);
    return {id:`bot-${roundKey}-${index+1}`,username:names[index],
      level:Math.max(1,Math.min(progressionConfig.contentLevelCap,playerLevel+levelOffsets[index])),
      strength:index<2?'Weaker':index===2?'Balanced':'Stronger',targetPower:target,
      team:team.map(dragon=>({...dragon,power:makeFighter(dragon)?.power||0}))};
  });
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
  /** Rank all owned dragons using the same Combat Power formula shown in the UI. */
  function topDragons(profile){
    return summary(profile,profile.dragons.map(dragon=>dragon.id)).map(dragon=>{
      const combatant=fighter(dragon);
      return combatant?{...dragon,power:combatant.power}:null;
    }).filter(Boolean).sort((a,b)=>b.power-a.power||a.id-b.id).slice(0,10);
  }
  /** Load this player's attack team and current five AI rivals without revealing their teams. */
  async function list(user){
    const own=await readJson(profile(user.id),null),arena=await readJson(file(user.id),{});
    if(!unlocked(own))throw Object.assign(new Error('Build an Arena first.'),{status:403});
    const window=arenaWindow(),attack=owned(own,arena.attack)?arena.attack:[],ranked=topDragons(own);
    let setup=arena;
    await updateJson(file(user.id),current=>{
      const next={...(current||{})};
      if(next.windowKey!==window.key){next.windowKey=window.key;next.attemptsRemaining=arenaConfig.attemptsPerWindow;}
      if(!Array.isArray(next.rivals)||next.rivals.length!==5||next.rivalVersion!==3){
        next.rivalRound=Math.max(1,next.rivalRound||1);
        next.rivals=createRivals(ranked,Math.floor(own.player?.level||1),next.rivalRound,fighter);
        next.defeatedOpponentIds=[];next.rivalVersion=3;
      }
      setup=next;return next;
    });
    const opponents=(setup.rivals||[]).map(({id})=>({id}));
    const dragons=summary(own,own.dragons.map(d=>d.id)).map(dragon=>({...dragon,power:fighter(dragon)?.power||0}))
      .sort((a,b)=>b.power-a.power||a.id-b.id);
    return {attack,dragons,opponents,defeatedOpponentIds:setup.defeatedOpponentIds||[],
      wins:setup.wins||0,losses:setup.losses||0,
      attemptsRemaining:setup.attemptsRemaining??3,resetAt:window.resetAt,
      battle:setup.battle?publicBattle(setup.battle):null};
  }
  /** Persist the validated attack team used to generate AI rivals. */
  async function team(user,body){
    const p=await readJson(profile(user.id),null);
    if(!unlocked(p)||!body||!owned(p,body.attack))
      throw Object.assign(new Error('Each team needs exactly '+arenaConfig.teamSize+
        ' eligible attack dragons.'),{status:400});
    await updateJson(file(user.id),current=>({...current,attack:body.attack}));
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
    const window=arenaWindow(),ranked=topDragons(attackerProfile);
    let battle;
    await updateJson(file(user.id),current=>{
      const setup=current||{};
      if(setup.battle)throw Object.assign(new Error('Finish the current battle first.'),{status:409});
      if(setup.windowKey!==window.key){setup.windowKey=window.key;setup.attemptsRemaining=arenaConfig.attemptsPerWindow;}
      if(!owned(attackerProfile,setup.attack))throw Object.assign(new Error('Set '+arenaConfig.teamSize+' eligible attack dragons.'),{status:400});
      if(!Array.isArray(setup.rivals)||setup.rivals.length!==5||setup.rivalVersion!==3){
        setup.rivalRound=Math.max(1,setup.rivalRound||1);
        setup.rivals=createRivals(ranked,Math.floor(attackerProfile.player?.level||1),setup.rivalRound,fighter);
        setup.defeatedOpponentIds=[];setup.rivalVersion=3;
      }
      const rival=setup.rivals.find(item=>item.id===body?.opponentId);
      if(!rival)throw Object.assign(new Error('Invalid Arena rival. Refresh the Arena.'),{status:400});
      if((setup.defeatedOpponentIds||[]).includes(rival.id))
        throw Object.assign(new Error('You have already defeated this Arena rival this round.'),{status:409});
      if((setup.attemptsRemaining??3)<=0)throw Object.assign(new Error('No Arena attempts left. They reset at 00:00, 08:00 and 16:00.'),{status:429});
      const attack=summary(attackerProfile,setup.attack).map(fighter).filter(Boolean);
      const defense=rival.team.map(fighter).filter(Boolean);
      if(!attack.length||!defense.length)throw Object.assign(new Error('Invalid team.'),{status:400});
      const rewardRules=arenaConfig.rewards;
      const rewardLevel=Math.min(progressionConfig.contentLevelCap,Math.max(1,rival.level));
      battle={opponent:rival.username,opponentId:rival.id,turn:1,attack,defense,activeAttack:0,activeDefense:0,
        events:[],reward:{gold:rewardRules.goldBase+rewardRules.goldPerOpponentLevel*rewardLevel,
          food:rewardRules.foodBase+rewardRules.foodPerOpponentLevel*rewardLevel,
          gems:rewardRules.gemBase+Math.floor(rewardLevel/rewardRules.gemLevelStep)*rewardRules.gemPerLevelStep}};
      return {...setup,attemptsRemaining:(setup.attemptsRemaining??3)-1,battle};
    });
    return {battle:publicBattle(battle)};
  }
  /** Instantly refill attempts by charging the configured gem cost server-side. */
  async function refill(user){
    const own=await readJson(profile(user.id),null);
    if(!unlocked(own))throw Object.assign(new Error('Build an Arena first.'),{status:403});
    const window=arenaWindow();let result;
    await updateJson(file(user.id),async current=>{
      const setup=current||{};
      if(setup.battle)throw Object.assign(new Error('Finish the current battle before restoring attempts.'),{status:409});
      if(setup.windowKey!==window.key){setup.windowKey=window.key;setup.attemptsRemaining=arenaConfig.attemptsPerWindow;}
      if((setup.attemptsRemaining??arenaConfig.attemptsPerWindow)>=arenaConfig.attemptsPerWindow){
        throw Object.assign(new Error('Arena attempts are already full.'),{status:409});
      }
      await updateJson(profile(user.id),currentProfile=>{
        const gems=Math.max(0,Number(currentProfile?.gems)||0);
        if(gems<arenaConfig.attemptRefillGemCost)
          throw Object.assign(new Error('Not enough gems to restore Arena attempts.'),{status:400});
        result={gems:gems-arenaConfig.attemptRefillGemCost};
        return {...currentProfile,gems:result.gems};
      });
      setup.attemptsRemaining=arenaConfig.attemptsPerWindow;
      return setup;
    });
    return {ok:true,attemptsRemaining:arenaConfig.attemptsPerWindow,gems:result.gems};
  }
  /** Resolve one Arena player turn, AI response and optional battle completion. */
  async function turn(user,body){
    let response,award=null;
    const topDragonsFromBattleProfile=await readJson(profile(user.id),null);
    await updateJson(file(user.id),current=>{
      const setup=current||{},b=setup.battle;
      if(!b)throw Object.assign(new Error('No battle in progress.'),{status:409});
      if(!Number.isInteger(body?.expectedTurn)||body.expectedTurn!==b.turn)
        throw Object.assign(new Error('The turn changed. Reload the Arena.'),{status:409});
      if(body.expectedEvents!==undefined&&body.expectedEvents!==b.events.length)
        throw Object.assign(new Error('The battle changed. Reload the Arena.'),{status:409});
      const actor=active(b,'attack');
      if(body.action==='switch'){
        const index=b.attack.findIndex(f=>f.id===body.dragonId&&f.hp>0);
        if(index<0||index===b.activeAttack)throw Object.assign(new Error('The replacement must be alive and different from the active dragon.'),{status:400});
        b.activeAttack=index;
        b.events.push({turn:b.turn,side:'attack',switchTo:b.attack[index].nickname});
        // Manual swaps are free: keep the same turn and do not trigger the AI.
        response={battle:publicBattle(b)};
        return {...setup,battle:b};
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
        let defeatedOpponentIds=result.won?[...new Set([...(setup.defeatedOpponentIds||[]),b.opponentId])]:
          (setup.defeatedOpponentIds||[]);
        let rivals=setup.rivals,attemptsRemaining=setup.attemptsRemaining;
        if(result.won&&setup.rivals.every(rival=>defeatedOpponentIds.includes(rival.id))){
          setup.rivalRound=(setup.rivalRound||1)+1;
          rivals=createRivals(topDragons(topDragonsFromBattleProfile),
            Math.floor(topDragonsFromBattleProfile?.player?.level||1),setup.rivalRound,fighter);
          defeatedOpponentIds=[];attemptsRemaining=arenaConfig.attemptsPerWindow;
        }
        return {...setup,battle:null,rivals,defeatedOpponentIds,attemptsRemaining,
          wins:(setup.wins||0)+(result.won?1:0),losses:(setup.losses||0)+(result.won?0:1)};
      }
      response={battle:publicBattle(b)};
      return {...setup,battle:b};
    });
    // Entering and immediately forfeiting is not an Arena fight for the daily mission.
    if(response.result?.events.some(event=>event.side==='attack'&&event.skill))
      await updateJson(profile(user.id),current=>({...current,
        dailyMissions:dailyMissions.addProgress(current.dailyMissions,'arena',1)}));
    if(award)await credit(user,award);
    return response;
  }
  return {list,team,challenge,turn,refill,fight,liveTurn,makeFighter:fighter,publicBattle,
    eligible,summary};
}
module.exports={createArena,arenaWindow,createRivals};
