"use strict";

/* UI: Mọi nút hiển thị đều được xử lý qua bộ điều phối sự kiện dùng chung. */
function toast(message){
  dom.toast.textContent=message;dom.toast.classList.add("show");
  clearTimeout(ui.toastTimer);
  ui.toastTimer=setTimeout(function(){dom.toast.classList.remove("show");},2400);
}
function secondsLeft(end){return Math.max(0,Math.ceil((end-Date.now())/1000));}
function duration(seconds){
  seconds=Math.max(0,Math.floor(seconds));
  if(seconds>=3600)return Math.floor(seconds/3600)+"h "+Math.floor(seconds%3600/60)+"m";
  if(seconds>=60)return Math.floor(seconds/60)+"m "+seconds%60+"s";
  return seconds+"s";
}
function countdown(end){return '<span data-end="'+end+'">'+duration(secondsLeft(end))+'</span>';}
function esc(value){return String(value).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
});}
function refreshCountdowns(){
  let finishedInSheet=false;
  document.querySelectorAll("[data-end]").forEach(function(el){
    const left=secondsLeft(Number(el.dataset.end));
    el.textContent=duration(left);
    if(left>0)el.dataset.countdownPending="1";
    else if(el.dataset.countdownPending==="1"&&el.closest("#sheet")){
      delete el.dataset.countdownPending;
      finishedInSheet=true;
    }
  });
  if(finishedInSheet&&ui.modal&&["hatchery","breeding","crops","daily-missions"].includes(ui.modal.name)){
    const scroll=dom.body.scrollTop;renderModal();dom.body.scrollTop=scroll;
  }
}
function updateHeader(){
  document.getElementById('game').classList.toggle('night',daylightAt(Date.now())<.48);
  const goldElement=document.getElementById("goldAmount");
  goldElement.textContent=headerGold(state.gold);
  goldElement.title=goldDecimal(state.gold)+" gold";
  const rate=state.buildings.filter(function(b){return b.type==="habitat"&&!b.stored;})
    .reduce(function(sum,b){return sum+habitatIncomePerMinute(b);},0);
  document.getElementById("incomeRate").textContent="+"+goldPerMinute(rate)+"/min";
  document.getElementById("foodAmount").textContent=money(state.food);
  document.getElementById("gemAmount").textContent=money(state.gems);
  const collected=new Set(state.discovered);
  document.getElementById("collectionProgress").textContent=BOOK_SPECIES_IDS.filter(function(id){
    return collected.has(id);
  }).length+"/"+BOOK_SPECIES_IDS.length;
  document.getElementById("playerLevel").textContent="Level "+state.player.level;
  const needed=playerXPNeeded(state.player.level);
  const shown=Math.max(0,Math.floor(state.player.xp));
  const track=document.getElementById("xpTrack");
  document.getElementById("xpFill").style.width=clamp(shown/needed*100,0,100)+"%";
  document.getElementById("xpText").textContent=money(shown)+" / "+money(needed)+" XP";
  track.setAttribute("aria-valuenow",shown);
  track.setAttribute("aria-valuemax",needed);
}
function stopMode(){ui.mode=null;dom.bar.classList.remove("visible");}
function beginMode(mode){
  if(mode.kind!=="buy"&&!buildingById(mode.id))return;
  if(mode.kind==="buy"){
    const reason=buildLockReason(mode.type,mode.element);
    if(reason){toast(reason);return;}
  }else if(mode.kind==="move"&&buildingById(mode.id).upgradeEnds){
    toast("This building cannot be moved during an upgrade.");return;
  }
  ui.mode=Object.assign({x:null,y:null},mode);
  ui.selection=null;dom.inspector.innerHTML="";
  dom.bar.classList.add("visible");
  const f=placementFootprint(mode);
  dom.barText.textContent=mode.kind==="buy"?"Tap a free plot to place "+(mode.type==="habitat"?"Habitat "+DATA.elements[mode.element].name:DATA.buildings[mode.type].name)+" · "+f.w+"×"+f.h+" tiles · "+
    (mode.type==="premiumCave"?"♦ ":"● ")+money(buildingPurchaseCost(mode.type,mode.element))+" on placement":
    mode.kind==="inventory"?"Drag or tap a tile to place a stored building":"Drag or tap a tile to move this building";
  closeModal();
}
function updateUI(){
  if(typeof ensureDailyMissions==="function")ensureDailyMissions();
  updateHeader();updateInspector();updateTimerBar();
  if(ui.modal){
    const scroll=dom.body.scrollTop;
    renderModal();dom.body.scrollTop=scroll;
  }
  window.DragonRuntime?.emit();
}
/* UI: Đồng bộ mục được chọn ở thanh điều hướng để biết người chơi đang ở đâu. */
function syncDock(){
  const section={shop:"open-shop",dragons:"open-dragons",book:"open-book",inventory:"open-inventory",islands:"open-islands",guide:"open-guide",arena:"open-arena","daily-missions":"open-daily-missions"};
  const arenaButton=document.getElementById("arenaDockButton");
  if(arenaButton)arenaButton.hidden=!state?.buildings.some(b=>b.type==="arena"&&!b.stored);
  const name=ui.modal&&ui.modal.name;
  const origin=name==="book-detail"&&ui.returnModal?ui.returnModal.name:
    name==="shop-egg-detail"?"shop":name;
  document.querySelectorAll("#dock .dock-btn").forEach(function(button){
    button.classList.toggle("active",section[origin]===button.dataset.action);
  });
}
function closeModal(){
  ui.modal=null;ui.returnModal=null;ui.dragonReturn=null;
  dom.overlay.classList.remove("open");dom.body.innerHTML="";syncDock();
  if(ui.lastFocus&&ui.lastFocus.isConnected&&ui.lastFocus.focus)ui.lastFocus.focus();
  ui.lastFocus=null;
  window.DragonRuntime?.emit();
}
function openModal(name,extra){
  if(!ui.modal)ui.lastFocus=document.activeElement;
  ui.modal={name:name,extra:extra||null};
  dom.overlay.classList.add("open");
  renderModal();
  dom.body.scrollTop=0;syncDock();
  if(dom.title.focus)dom.title.focus({preventScroll:true});
  window.DragonRuntime?.emit();
}
