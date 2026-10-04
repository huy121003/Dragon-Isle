"use strict";

/**
 * Boot the authenticated game session and hand off long-lived behavior to
 * dedicated event/runtime modules.
 */
async function startGame(){
  const runtime=window.DragonConfig.system.runtime;
  if(!await authenticate())return;
  try{state=await loadGameFromServer();}
  catch(error){showAuthMessage(error.message);return;}
  checkApexAchievements();
  ensureDailyMissions();

  /* SAVE: Bản localStorage cũ bị xóa và không bao giờ tự ghép vào hồ sơ tài khoản. */
  try{window.localStorage.removeItem(SAVE_KEY);}catch(error){}
  try{ui.fixedDay=window.localStorage.getItem('dragon-isle-fixed-day')==='1';}catch(error){}

  const offline=advanceWorld(Date.now());
  // Apply the current XP curve to progress saved under earlier balance values.
  gainPlayerXP(0);
  if(!await saveGame()){showAuthMessage("Unable to save profile. Check the server and reload.");return;}

  authScreen.hidden=true;
  document.getElementById("game").hidden=false;
  resizeCanvas();

  const home=DATA.islands[0],homeCenter=gridToScreen(home.x+home.size/2,home.y+home.size/2);
  ui.camera.zoom=clamp(Math.min(viewW/(home.size*DATA.tileW*1.15),
    viewH/(home.size*DATA.tileH*1.15)),.1,.75);
  ui.camera.x=homeCenter.x;ui.camera.y=homeCenter.y;
  updateUI();
  if(offline.elapsed>=runtime.offlineWelcomeMs)openModal("welcome",offline);

  bindGameEvents(runtime);
  startGameRuntimeLoops(runtime);
}

installGameBridge();
window.gameBootPromise=startGame();
