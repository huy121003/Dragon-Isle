"use strict";

/* LOGIC: Mọi tiến trình chờ được biểu diễn bằng cùng cấu trúc để hiển thị và used gem. */
function activeTimers(){
  const tasks=[];
  state.buildings.forEach(function(b){
    if(b.upgradeEnds)tasks.push({kind:"upgrade",id:b.id,label:"⬆️ "+buildingName(b),
      startedAt:b.upgradeStartedAt,end:b.upgradeEnds});
    if(b.type==="farm"&&b.crop)tasks.push({kind:"crop",id:b.id,
      label:"🌱 "+cropById(b.crop.id).name,startedAt:b.crop.startedAt,end:b.crop.readyAt});
    if(isBreedingCave(b)&&b.breeding)tasks.push({kind:"breed",id:b.id,
      label:"💞 "+buildingName(b),startedAt:b.breeding.startedAt,end:b.breeding.readyAt});
  });
  state.eggs.forEach(function(egg){
    if(egg.hatcheryId!==null)tasks.push({kind:"egg",id:egg.id,
      label:"🥚 Mystery Egg",startedAt:egg.startedAt,end:egg.readyAt});
  });
  return tasks.sort(function(a,b){return a.end-b.end;});
}
function gemSkipCost(end,now){
  const rules=window.DragonEconomy.timers;
  return Math.min(rules.maxSkipGems,Math.ceil(Math.max(0,end-now)/(rules.secondsPerGem*1000)));
}
function timerProgress(task,now){
  const span=Math.max(1,task.end-task.startedAt);
  return clamp((now-task.startedAt)/span*100,0,100);
}
function skipTimer(kind,id){
  const task=activeTimers().find(function(t){return t.kind===kind&&t.id===id;});
  if(!task){toast("This activity is no longer pending.");return;}
  const now=Date.now(),cost=gemSkipCost(task.end,now);
  if(cost===0){toast("This activity has finished.");updateUI();return;}
  if(state.gems<cost){toast("Requires "+cost+" gems to finish instantly.");return;}
  state.gems-=cost;
  if(kind==="upgrade"){
    const b=buildingById(id);
    b.upgradeEnds=now;finishUpgrades(now);
    if(b.type==="hatchery")autoAssignWaitingEggs();
  }else if(kind==="crop")buildingById(id).crop.readyAt=now;
  else if(kind==="breed")buildingById(id).breeding.readyAt=now;
  else if(kind==="egg")eggById(id).readyAt=now;
  toast("Spent "+cost+" gems to finish instantly.");
  AUDIO.play("egg");updateUI();saveGame();
}
