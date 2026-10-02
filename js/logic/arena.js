"use strict";
/* Team hình và trận đánh đi qua API; chỉ hiệu ứng được tính trên trình duyệt. */
ui.arena={data:null,draft:{attack:[],defense:[]},phase:"teams",busy:false,result:null,error:null,
  presentation:null,animating:false,pendingSkill:null};
let arenaAnimationTimer=0;
/** Clear client-only battle animation state after the authoritative turn events finish rendering. */
function finishArenaPresentation(){
  clearTimeout(arenaAnimationTimer);
  ui.arena.presentation=null;ui.arena.animating=false;
  window.dispatchEvent(new Event('dragon-ui-update'));
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
/** Refresh Arena roster, saved teams, opponents and cooldown state from the server. */
async function loadArena(){
  if(ui.arena.busy)return;
  finishArenaPresentation();
  ui.arena.phase="teams";
  ui.arena.busy=true;ui.arena.error=null;ui.arena.result=null;renderArena();
  try{
    await saveGame();
    ui.arena.data=await arenaRequest('list');
    ui.arena.draft={attack:ui.arena.data.attack.slice(),defense:ui.arena.data.defense.slice()};
  }catch(error){ui.arena.error=error.message;}
  ui.arena.busy=false;if(ui.modal?.name==='arena')renderArena();
  window.dispatchEvent(new Event('dragon-ui-update'));
}
/** Toggle one eligible dragon in the local attack/defense draft without mutating server state. */
function arenaToggle(side,id){
  if(!['attack','defense'].includes(side))return;
  const dragon=ui.arena.data?.dragons.find(d=>d.id===id);
  if(!dragon)return;
  const teamSize=window.DragonConfig.arena.teamSize;
  const team=ui.arena.draft[side],at=team.indexOf(id);
  if(at>=0)team.splice(at,1);
  else if(!dragon.canBattle){toast(dragon.battleReason||'This dragon cannot battle.');return;}
  else if(team.length<teamSize)team.push(id);
  else {toast('Each team can have at most '+teamSize+' dragons.');return;}
  renderArena();window.dispatchEvent(new Event('dragon-ui-update'));
}
/** Validate and persist both Arena teams through the authoritative server. */
async function arenaSaveTeam(){
  const {attack,defense}=ui.arena.draft,teamSize=window.DragonConfig.arena.teamSize;
  if(attack.length!==teamSize||defense.length!==teamSize){
    toast('Each team must have exactly '+teamSize+' dragons.');return;
  }
  try{
    ui.arena.busy=true;renderArena();await saveGame();
    await arenaRequest('team','PUT',{attack,defense});
    ui.arena.data=await arenaRequest('list');ui.arena.phase="opponents";toast('Teams saved. Choose an opponent.');
  }catch(error){ui.arena.error=error.message;}
  ui.arena.busy=false;renderArena();window.dispatchEvent(new Event('dragon-ui-update'));
}
/** Start an Arena match against a selected opponent after forcing a safe save. */
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
  ui.arena.busy=false;renderArena();window.dispatchEvent(new Event('dragon-ui-update'));
}
/** Submit one player turn and stage returned authoritative events for client animation. */
async function arenaTurn(action,number){
  const battle=ui.arena.data?.battle;
  if(ui.arena.busy||ui.arena.animating||!battle)return;
  ui.arena.busy=true;ui.arena.error=null;
  ui.arena.pendingSkill=action==='skill'?battle.attack[battle.activeAttack]?.skills[number]?.name:null;
  renderArena();window.dispatchEvent(new Event('dragon-ui-update'));
  try{
    const payload={action,expectedTurn:battle.turn};
    if(action==='skill')payload.skillIndex=number;
    if(action==='switch')payload.dragonId=number;
    const response=await arenaRequest('turn','POST',payload);
    const events=(response.result?response.result.events:response.battle.events)
      .filter(function(event){return event.turn===battle.turn;});
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
      state=migrateSave(profile);
      ui.arena.result=response.result;
      ui.arena.data=await arenaRequest('list');
      updateUI();
    }else ui.arena.data.battle=response.battle;
  }catch(error){
    ui.arena.error=error.message;
    try{ui.arena.data=await arenaRequest('list');}catch(ignore){}
  }
  ui.arena.pendingSkill=null;ui.arena.busy=false;renderArena();window.dispatchEvent(new Event('dragon-ui-update'));
}
/** Reload the server profile after Arena rewards are committed server-side. */
async function arenaRequestSave(){
  const response=await fetch('/api/save',{headers:{'X-Dragon-Account':currentAccount.id},cache:'no-store'});
  if(!response.ok)throw new Error('Cannot load the reward. Reload the page.');
  return response.json();
}
