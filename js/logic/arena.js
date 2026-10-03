"use strict";
/* Team hình và trận đánh đi qua API; chỉ hiệu ứng được tính trên trình duyệt. */
ui.arena={data:null,draft:{attack:[]},phase:"teams",busy:false,result:null,error:null,
  presentation:null,animating:false,pendingSkill:null};
let arenaAnimationTimer=0;
/** Publish Arena UI changes through the React runtime, with a legacy event fallback. */
function notifyArenaRuntime(){
  if(window.DragonRuntime?.emit){window.DragonRuntime.emit('ui');return;}
  window.dispatchEvent(new Event('dragon-ui-update'));
}
/** Clear client-only battle animation state after the authoritative turn events finish rendering. */
function finishArenaPresentation(){
  clearTimeout(arenaAnimationTimer);
  ui.arena.presentation=null;ui.arena.animating=false;
  notifyArenaRuntime();
}
/**
 * Call one Arena API endpoint.
 * @param {string} path - Arena endpoint suffix.
 * @param {string} [method="GET"] - HTTP method.
 * @param {object} [body] - Optional JSON payload.
 * @returns {Promise<object>} Parsed authoritative server response.
 */
async function arenaRequest(path,method,body){
  const response=await fetch('/api/arena/'+path,{method:method||'GET',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const value=await response.json();
  if(!response.ok)throw new Error(value.error||'Cannot connect to the Arena.');
  return value;
}
/** Refresh Arena roster, saved attack team, AI rivals and attempt window from server. */
async function loadArena(){
  if(ui.arena.busy)return;
  finishArenaPresentation();
  ui.arena.phase="teams";
  ui.arena.busy=true;ui.arena.error=null;ui.arena.result=null;renderArena();
  try{
    await saveGame();
    ui.arena.data=await arenaRequest('list');
    ui.arena.draft={attack:ui.arena.data.attack.slice()};
  }catch(error){ui.arena.error=error.message;}
  ui.arena.busy=false;if(ui.modal?.name==='arena')renderArena();
  notifyArenaRuntime();
}
/** Toggle one eligible dragon in the local attack draft without mutating server state. */
function arenaToggle(side,id){
  if(side!=='attack')return;
  const dragon=ui.arena.data?.dragons.find(d=>d.id===id);
  if(!dragon)return;
  const teamSize=window.DragonConfig.arena.teamSize;
  const team=ui.arena.draft.attack,at=team.indexOf(id);
  if(at>=0)team.splice(at,1);
  else if(!dragon.canBattle){toast(dragon.battleReason||'This dragon cannot battle.');return;}
  else if(team.length<teamSize)team.push(id);
  else {toast('Each team can have at most '+teamSize+' dragons.');return;}
  renderArena();notifyArenaRuntime();
}
/** Validate and persist the Arena attack team through the authoritative server. */
async function arenaSaveTeam(){
  const {attack}=ui.arena.draft,teamSize=window.DragonConfig.arena.teamSize;
  if(attack.length!==teamSize){
    toast('Choose exactly '+teamSize+' attack dragons.');return;
  }
  try{
    ui.arena.busy=true;renderArena();await saveGame();
    await arenaRequest('team','PUT',{attack});
    ui.arena.data=await arenaRequest('list');ui.arena.phase="opponents";toast('Attack team saved. Choose an Arena rival.');
  }catch(error){ui.arena.error=error.message;}
  ui.arena.busy=false;renderArena();notifyArenaRuntime();
}
/** Start an Arena match against a selected AI rival after forcing a safe save. */
async function arenaFight(opponentId){
  const teamSize=window.DragonConfig.arena.teamSize;
  if(ui.arena.busy||ui.arena.data?.attack.length!==teamSize)return;
  ui.arena.busy=true;ui.arena.error=null;renderArena();
  try{
    if(!await saveGame())throw new Error('Progress could not be saved. Try again.');
    const started=await arenaRequest('fight','POST',{opponentId});
    ui.arena.data.battle=started.battle;
    ui.arena.result=null;
  }catch(error){ui.arena.error=error.message;}
  ui.arena.busy=false;renderArena();notifyArenaRuntime();
}
/** Restore all Arena attempts by spending gems through the server. */
async function arenaRefill(){
  if(ui.arena.busy)return;
  ui.arena.busy=true;ui.arena.error=null;renderArena();
  try{
    const response=await arenaRequest('refill','POST',{});
    const profile=await arenaRequestSave();state=profile;saveGame();
    ui.arena.data=await arenaRequest('list');
    toast(`All Arena attempts restored for ${window.DragonConfig.arena.attemptRefillGemCost} gems.`);
  }catch(error){ui.arena.error=error.message;}
  ui.arena.busy=false;renderArena();notifyArenaRuntime();
}
/** Submit one player turn and stage returned authoritative events for client animation. */
async function arenaTurn(action,number){
  const battle=ui.arena.data?.battle;
  if(ui.arena.busy||ui.arena.animating||!battle)return;
  ui.arena.busy=true;ui.arena.error=null;
  ui.arena.pendingSkill=action==='skill'?battle.attack[battle.activeAttack]?.skills[number]?.name:null;
  renderArena();notifyArenaRuntime();
  try{
    const payload={action,expectedTurn:battle.turn,expectedEvents:battle.eventSeq};
    if(action==='skill')payload.skillIndex=number;
    if(action==='switch')payload.dragonId=number;
    const response=await arenaRequest('turn','POST',payload);
    const incoming=response.result?response.result.events:response.battle.events;
    const eventSeq=response.result?incoming.length:response.battle.eventSeq;
    const newEventCount=Math.max(0,eventSeq-battle.eventSeq);
    const events=newEventCount?incoming.slice(-newEventCount):[];
    ui.arena.presentation={id:Date.now()+Math.random(),before:battle,events:events,
      result:response.result||null};
    ui.arena.animating=true;
    ui.arena.pendingSkill=null;
    clearTimeout(arenaAnimationTimer);
    const timing=window.DragonConfig.system.presentation;
    arenaAnimationTimer=setTimeout(finishArenaPresentation,
      Math.max(timing.battleFinishMinMs,events.length*timing.battleEventMs+timing.battleFinishPaddingMs));
    if(response.result){
      const profile=await arenaRequestSave();
      state=profile;
      saveGame();
      ui.arena.result=response.result;
      ui.arena.data=await arenaRequest('list');
      updateUI();
    }else ui.arena.data.battle=response.battle;
  }catch(error){
    ui.arena.error=error.message;
    try{ui.arena.data=await arenaRequest('list');}catch(ignore){}
  }
  ui.arena.pendingSkill=null;ui.arena.busy=false;renderArena();notifyArenaRuntime();
}
/** Reload the server profile after Arena rewards are committed server-side. */
async function arenaRequestSave(){
  // Reload through the save client so its optimistic-concurrency revision stays current.
  return loadGameFromServer();
}
