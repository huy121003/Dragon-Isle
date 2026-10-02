"use strict";

/* Khởi động: nạp tiến trình, tính thời gian vắng mặt, gắn sự kiện và vòng lặp khung hình. */
async function startGame(){
const runtime=window.DragonConfig.system.runtime;
if(!await authenticate())return;
try{state=await loadGameFromServer();}
catch(error){showAuthMessage(error.message);return;}
/* SAVE: Bản localStorage cũ bị xóa và không bao giờ tự ghép into accounts. */
try{window.localStorage.removeItem(SAVE_KEY);}catch(error){}
try{ui.fixedDay=window.localStorage.getItem('dragon-isle-fixed-day')==='1';}catch(error){}
const offline=advanceWorld(Date.now());
// Apply the current XP curve to progress saved under earlier balance values.
gainPlayerXP(0);
if(!await saveGame()){showAuthMessage("Unable to save profile. Check the server and reload.");return;}
authScreen.hidden=true;document.getElementById("game").hidden=false;
resizeCanvas();
const home=DATA.islands[0],homeCenter=gridToScreen(home.x+home.size/2,home.y+home.size/2);
ui.camera.zoom=clamp(Math.min(viewW/(home.size*DATA.tileW*1.15),
  viewH/(home.size*DATA.tileH*1.15)),.1,.75);
ui.camera.x=homeCenter.x;ui.camera.y=homeCenter.y;
updateUI();
if(offline.elapsed>=runtime.offlineWelcomeMs)openModal("welcome",offline);
dom.canvas.addEventListener("pointerdown",pointerDown);
dom.canvas.addEventListener("pointermove",pointerMove);
dom.canvas.addEventListener("pointerup",pointerUp);
dom.canvas.addEventListener("pointercancel",pointerCancel);
dom.canvas.addEventListener("wheel",wheelZoom,{passive:false});
document.addEventListener("click",function(event){
  const button=event.target.closest("[data-action]");
  if(button)handleAction(button);
});
document.addEventListener("keydown",function(event){
  if(event.key==="Escape"){
    if(ui.modal)closeModal();else if(ui.mode)stopMode();
    else if(ui.selection){ui.selection=null;updateInspector();}
    return;
  }
  if((event.key==="Enter"||event.key===" ")&&event.target.matches('[role="button"][data-action]')){
    event.preventDefault();handleAction(event.target);
  }
});
document.addEventListener("change",function(event){
  if(event.target.id==="saveImport"&&event.target.files&&event.target.files[0]){
    importSaveJson(event.target.files[0]);return;
  }
  const slot=event.target.dataset.breedSlot;
  if((slot==="father"||slot==="mother")&&ui.modal&&ui.modal.name==="breeding"){
    ui.breedDraft[slot]=Number(event.target.value);
    renderBreeding(ui.modal.extra);
  }
});
dom.overlay.addEventListener("click",function(event){if(event.target===dom.overlay)closeModal();});
window.addEventListener("resize",resizeCanvas);
window.addEventListener("beforeunload",function(){advanceWorld(Date.now());saveGame();});
window.addEventListener("pagehide",function(){advanceWorld(Date.now());saveGame();});
window.addEventListener("online",function(){
  if(state&&!saveReadOnly){advanceWorld(Date.now());saveGame();}
});
document.addEventListener("visibilitychange",function(){
  if(document.hidden){advanceWorld(Date.now());saveGame();}
  else{
    const report=advanceWorld(Date.now());
    updateUI();
    if(report.elapsed>=runtime.offlineWelcomeMs)openModal("welcome",report);
  }
});
let lastHabitatRefresh=0;
setInterval(function(){
  const now=Date.now(),progress=advanceWorld(now);
  if(progress.finished){
    updateUI();
  }else{
    updateHeader();updateInspector();refreshCountdowns();updateTimerBar();
    if(ui.modal?.name==="habitat"&&now-lastHabitatRefresh>=runtime.habitatRefreshMs){
      lastHabitatRefresh=now;
      renderHabitat(ui.modal.extra);
    }
  }
},runtime.worldTickMs);
setInterval(function(){advanceWorld(Date.now());saveGame();},runtime.autosaveMs);
let lastFrame=performance.now();
function frame(time){
  const dt=clamp((time-lastFrame)/1000,0,.05);lastFrame=time;
  drawScene(time,dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

}
/* BRIDGE: React đọc snapshot và gửi thao tác; Canvas/logic vẫn do module game đảm nhiệm. */
window.DragonGame={
  get state(){return state;},get ui(){return ui;},get account(){return currentAccount;},
  data:DATA,speciesIds:BOOK_SPECIES_IDS,
  skillMatchup(element,targetSpecies){
    const target=DATA.species[targetSpecies];
    return target?window.DragonCombat.matchup(element,target.elements,DRAGON_DB.typeChart):1;
  },
  xpNeeded:playerXPNeeded,
  save:saveGame,
  action(dataset){handleAction({dataset:{...dataset}});window.DragonRuntime?.emit();},
  importSave(file){return importSaveJson(file);},
  paint(canvas,speciesId,level,options={}){
    const context=canvas.getContext('2d');
    context.clearRect(0,0,canvas.width,canvas.height);
    drawDragon(context,{dragon:{id:0,species:speciesId,level},
      ...dragonPortraitPlacement(canvas.width,canvas.height,level),
      time:options.time??900,facing:options.facing||1,locomotion:options.locomotion!==false,
    });
  },
  advanceDay(minutes){ui.dayOffset+=Number(minutes||0)*60000;return daylightAt(Date.now());}
};
window.gameBootPromise=startGame();
