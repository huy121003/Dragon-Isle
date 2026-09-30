"use strict";

/* Khởi động: nạp tiến trình, tính thời gian vắng mặt, gắn sự kiện và vòng lặp khung hình. */
async function startGame(){
if(!await authenticate())return;
try{state=await loadGameFromServer();}
catch(error){showAuthMessage(error.message);return;}
/* SAVE: Bản localStorage cũ bị xóa và không bao giờ tự ghép into accounts. */
try{window.localStorage.removeItem(SAVE_KEY);}catch(error){}
try{ui.fixedDay=window.localStorage.getItem('dragon-isle-fixed-day')==='1';}catch(error){}
const offline=advanceWorld(Date.now());
if(!await saveGame()){showAuthMessage("Unable to save profile. Check the server and reload.");return;}
authScreen.hidden=true;document.getElementById("game").hidden=false;
resizeCanvas();
ui.camera.zoom=clamp(Math.min(viewW/(100*DATA.tile),viewH/(120*DATA.tile)),.23,.42);
ui.camera.x=(DATA.islands[0].x+DATA.islands[0].size/2)*DATA.tile;
ui.camera.y=(DATA.islands[0].y+DATA.islands[0].size/2)*DATA.tile;
updateUI();
if(offline.elapsed>=60000)openModal("welcome",offline);
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
document.addEventListener("visibilitychange",function(){
  if(document.hidden){advanceWorld(Date.now());saveGame();}
  else{
    const report=advanceWorld(Date.now());
    updateUI();
    if(report.elapsed>=60000)openModal("welcome",report);
  }
});
setInterval(function(){
  advanceWorld(Date.now());
  updateHeader();updateInspector();refreshCountdowns();updateTimerBar();
  if(ui.modal&&ui.modal.name==="habitat")renderHabitat(ui.modal.extra);
},1000);
setInterval(function(){advanceWorld(Date.now());saveGame();},10000);
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
  action(dataset){handleAction({dataset:{...dataset}});window.dispatchEvent(new Event('dragon-ui-update'));},
  importSave(file){return importSaveJson(file);},
  paint(canvas,speciesId,level,options={}){
    const context=canvas.getContext('2d'),stage=level<10?.74:level<30?1:1.22;
    context.clearRect(0,0,canvas.width,canvas.height);
    drawDragon(context,{dragon:{id:0,species:speciesId,level},x:canvas.width*.54,y:canvas.height*.74,
      time:options.time??900,facing:options.facing||1,activity:{id:"walk"},
      scale:Math.min(canvas.width/142,canvas.height/114)/stage});
  },
  advanceDay(minutes){ui.dayOffset+=Number(minutes||0)*60000;return daylightAt(Date.now());}
};
window.gameBootPromise=startGame();
