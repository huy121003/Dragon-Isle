"use strict";

const config=require('../js/config/daily-missions.js');
const progression=require('../js/rules/progression.js');
const farmConfig=require('../js/config/farming.js');
const worldConfig=require('../js/config/world.js');

const timeZone='Asia/Ho_Chi_Minh';
function dayParts(timestamp){
  const shifted=timestamp-config.resetHour*60*60*1000;
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'})
    .formatToParts(shifted);
  return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
}
function dayKey(timestamp=Date.now()){
  const p=dayParts(timestamp);return `${p.year}-${p.month}-${p.day}`;
}
function nextResetAt(timestamp=Date.now()){
  const p=dayParts(timestamp),date=`${p.year}-${p.month}-${p.day}`;
  const boundary=Date.parse(`${date}T${String(config.resetHour).padStart(2,'0')}:00:00+07:00`);
  return timestamp<boundary?boundary:boundary+24*60*60*1000;
}
function emptyState(now=Date.now()){
  return {dayKey:dayKey(now),progress:Object.fromEntries(Object.entries(config.objectives).map(([id])=>[id,0])),claimed:[]};
}
function ensureState(saved,now=Date.now()){
  if(!saved||saved.dayKey!==dayKey(now)||!saved.progress||typeof saved.progress!=='object'||!Array.isArray(saved.claimed))
    return emptyState(now);
  const progress={};
  for(const [id,objective] of Object.entries(config.objectives))
    progress[id]=Math.min(objective.goal,Math.max(0,Number(saved.progress[id])||0));
  return {dayKey:dayKey(now),progress,claimed:[...new Set(saved.claimed.filter(id=>config.objectives[id]))]};
}
function addProgress(saved,id,amount=1,now=Date.now()){
  const mission=ensureState(saved,now),objective=config.objectives[id];
  if(!objective)return mission;
  mission.progress[id]=Math.min(objective.goal,mission.progress[id]+Math.max(0,Number(amount)||0));
  return mission;
}
function delta(previous,next,now=Date.now()){
  if(!previous||!next)return {};
  const beforeDragons=new Set((previous.dragons||[]).map(d=>d.id));
  const addedDragons=(next.dragons||[]).filter(d=>!beforeDragons.has(d.id)).length;
  const afterEggs=new Set((next.eggs||[]).map(e=>e.id));
  const hatched=Math.min(addedDragons,(previous.eggs||[]).filter(e=>!afterEggs.has(e.id)&&e.hatcheryId&&e.readyAt<=now).length);
  const beforeEggs=new Set((previous.eggs||[]).map(e=>e.id));
  const beforeCaves=new Map((previous.buildings||[]).filter(b=>b.type==='cave'||b.type==='premiumCave').map(b=>[b.id,b]));
  const afterBuildings=new Map((next.buildings||[]).map(b=>[b.id,b]));
  const bred=(next.eggs||[]).filter(e=>!beforeEggs.has(e.id)&&e.source==='breed'&&
    beforeCaves.get(e.caveId)?.breeding?.readyAt<=now&&!afterBuildings.get(e.caveId)?.breeding).length;
  const beforeById=new Map((previous.dragons||[]).map(d=>[d.id,d]));
  const fed=(next.dragons||[]).reduce((sum,d)=>{
    const old=beforeById.get(d.id);if(!old)return sum;
    const levels=Math.max(0,(Number(d.level)||0)-(Number(old.level)||0));
    const progress=(Number(d.feedProgress)||0)-(Number(old.feedProgress)||0);
    return sum+Math.max(0,levels*worldConfig.feeding.feedsPerLevel+progress);
  },0);
  const oldFarms=new Map((previous.buildings||[]).filter(b=>b.type==='farm').map(b=>[b.id,b]));
  const planted=next.gold<(Number(previous.gold)||0)?(next.buildings||[]).filter(b=>b.type==='farm'&&
    !oldFarms.get(b.id)?.crop&&b.crop&&farmConfig.crops.some(c=>c.id===b.crop.id)).length:0;
  const oldHabitats=new Map((previous.buildings||[]).filter(b=>b.type==='habitat').map(b=>[b.id,b]));
  const collectedGold=(next.buildings||[]).filter(b=>b.type==='habitat').reduce((sum,b)=>{
    const old=oldHabitats.get(b.id);if(!old)return sum;
    return sum+(!b.stored?Math.max(0,(Number(old.storedGold)||0)-(Number(b.storedGold)||0)):0);
  },0);
  const cleared=(previous.buildings||[]).filter(b=>b.type==='farm'&&b.crop&&
    !(next.buildings||[]).find(n=>n.id===b.id)?.crop).map(b=>{
      const crop=farmConfig.crops.find(c=>c.id===b.crop.id),bonus=require('../js/config/buildings.js').farm.yieldBonusPerExtraLevel;
      return crop?Math.round(crop.yield*(1+((Number(b.level)||1)-1)*bonus)):0;
    });
  const foodGained=Math.max(0,(Number(next.food)||0)-(Number(previous.food)||0));
  const collectedFood=cleared.length?Math.min(foodGained,cleared.reduce((a,b)=>a+b,0)):0;
  return {hatch:hatched,breed:bred,feed:fed,plant:planted,collectGold:collectedGold,collectFood:collectedFood};
}
function trackSave(saved,previous,next,now=Date.now()){
  let mission=ensureState(saved,now);
  for(const [id,amount] of Object.entries(delta(previous,next,now)))if(amount>0)mission=addProgress(mission,id,amount,now);
  return mission;
}
function grantPlayerXp(profile,amount){
  const player={...(profile.player||{level:1,xp:0})};
  player.level=Math.max(1,Math.floor(Number(player.level)||1));player.xp=Math.max(0,Number(player.xp)||0)+amount;
  let gold=0,food=0,gems=0;
  while(player.xp>=progression.playerXPNeeded(player.level)){
    player.xp-=progression.playerXPNeeded(player.level);player.level++;
    const reward=progression.levelReward(player.level);gold+=reward.gold;food+=reward.food;gems+=reward.gems;
  }
  return {...profile,player,gold:(Number(profile.gold)||0)+gold,food:(Number(profile.food)||0)+food,gems:(Number(profile.gems)||0)+gems};
}
function claim(profile,id,now=Date.now()){
  const mission=ensureState(profile.dailyMissions,now),objective=config.objectives[id];
  if(!objective)throw Object.assign(new Error('Daily mission not found.'),{status:404});
  if(mission.progress[id]<objective.goal)throw Object.assign(new Error('Complete this mission before claiming its reward.'),{status:409});
  if(mission.claimed.includes(id))throw Object.assign(new Error('This reward was already claimed.'),{status:409});
  mission.claimed.push(id);
  const awarded={...profile,dailyMissions:mission,
    gold:(Number(profile.gold)||0)+objective.reward.gold,
    food:(Number(profile.food)||0)+objective.reward.food};
  return {profile:grantPlayerXp(awarded,objective.reward.xp),reward:objective.reward};
}
module.exports={dayKey,nextResetAt,emptyState,ensureState,addProgress,delta,trackSave,claim};
