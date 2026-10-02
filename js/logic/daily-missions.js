"use strict";

/** Return the last mission snapshot supplied by the server. */
function ensureDailyMissions(){
  if(!state)return null;
  if(!state.dailyMissions)state.dailyMissions={progress:{},claimed:[],nextResetAt:0};
  return state.dailyMissions;
}
/** Refresh the server-owned daily state, including its authoritative reset boundary. */
async function refreshDailyMissions(){
  try{
    const response=await fetch('/api/daily-missions',{cache:'no-store'}),body=await response.json();
    if(!response.ok)throw new Error(body.error||'Could not load Daily Missions.');
    state.dailyMissions=body;
    if(ui.modal?.name==='daily-missions')updateUI();
  }catch(error){toast(error.message);}
}
/** Claim a completed mission. The server validates progress and calculates/grants the reward. */
async function claimDailyMission(id){
  if(!await saveGame())return;
  try{
    const response=await fetch('/api/daily-missions/claim',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id}),cache:'no-store'});
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||'Could not claim this reward.');
    serverSaveRevision=Math.max(0,Math.floor(Number(body.serverRevision)||serverSaveRevision));
    state=migrateSave(body.profile);
    updateUI();
    toast('Daily reward claimed: +'+body.reward.xp+' XP, '+money(body.reward.gold)+
      ' gold and '+money(body.reward.food)+' food.');
  }catch(error){toast(error.message);await refreshDailyMissions();}
}
/** Arena mission is available only when the Arena and a full eligible team exist. */
function dailyArenaMissionAvailable(){
  const levels=state.dragons.filter(function(dragon){
    return dragon.level>=window.DragonConfig.arena.minBattleLevel&&!dragonBusy(dragon.id);
  }).length;
  return state.buildings.some(function(building){return building.type==="arena"&&!building.stored;})&&
    levels>=window.DragonConfig.arena.teamSize;
}
