"use strict";

/* UI PANEL: Server-owned daily objectives, progress, rewards and reset time. */
function renderDailyMissions(){
  dom.title.textContent="📅 Daily Missions";
  const daily=ensureDailyMissions(),objectives=window.DragonConfig.dailyMissions.objectives;
  const resetAt=Number(daily.nextResetAt)||Date.now(),resetLabel="05:00";
  let html='<div class="daily-mission-header"><p>Complete objectives to earn XP, gold and food.</p>'+ 
    '<span>Resets at '+esc(resetLabel)+' · <span data-end="'+resetAt+'">'+duration(Math.ceil((resetAt-Date.now())/1000))+'</span></span></div>'+
    '<div class="daily-mission-list">';
  Object.entries(objectives).forEach(function([id,mission]){
    const progress=daily.progress[id]||0,complete=progress>=mission.goal,claimed=daily.claimed.includes(id);
    const available=id!=="arena"||dailyArenaMissionAvailable(),percent=Math.min(100,progress/mission.goal*100);
    const progressLabel=id==="collectGold"||id==="collectFood"?
      money(progress)+" / "+money(mission.goal):Math.floor(progress)+" / "+mission.goal;
    const buttonLabel=claimed?"Claimed":!available?"Locked":complete?"Claim reward":"In progress";
    html+='<article class="daily-mission-card'+(claimed?' claimed':'')+(!available?' locked':'')+'">'+
      '<span class="daily-mission-icon">'+mission.icon+'</span><div class="daily-mission-copy">'+
      '<b>'+esc(mission.title)+'</b><small>'+progressLabel+'</small><div class="daily-mission-track"><span style="width:'+percent+'%"></span></div>'+ 
      '<small class="daily-mission-reward">Reward: '+mission.reward.xp+' XP · '+resourceAmount('gold',mission.reward.gold)+
      resourceAmount('food',mission.reward.food)+'</small>'+(!available?'<small>Unlock the Arena and prepare 3 eligible dragons.</small>':'')+
      '</div><button class="btn '+(complete&&!claimed&&available?'good':'')+'" data-action="claim-daily-mission" data-id="'+id+'"'+
      (complete&&!claimed&&available?'':' disabled')+'>'+buttonLabel+'</button></article>';
  });
  return html+'</div>';
}
