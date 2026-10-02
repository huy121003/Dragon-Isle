"use strict";

/* SAVE: Chỉ đặt lại hồ sơ tài khoản hiện tại. */
function factoryReset(){
  if(!window.confirm("Start over? All dragons, buildings, unlocked land and resources will be replaced."))return;
  state=newGame();
  saveReadOnly=false;
  ui.selection=null;ui.bookTab="all";ui.bookPage=0;ui.shopTab="buildings";
  stopMode();closeModal();
  const home=DATA.islands[0],center=gridToScreen(home.x+home.size/2,home.y+home.size/2);
  ui.camera.x=center.x;ui.camera.y=center.y;
  updateUI();saveGame();
  toast("The island has been reset. Enjoy!");
}
/* SAVE: Tải và nhập bản JSON thủ công khi mở game trực tiếp trên điện thoại. */
function exportSaveJson(){
  advanceWorld(Date.now());saveGame();
  const blob=new Blob([JSON.stringify(state,null,2)+'\n'],{type:'application/json'});
  const address=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=address;link.download='dragon-isle-progress.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(function(){URL.revokeObjectURL(address);},1000);
  toast('Downloaded the save JSON.');
}
async function importSaveJson(file){
  try{
    const maxBytes=window.DragonConfig.system.save.maxBytes;
    if(file.size>maxBytes)throw new Error('The save exceeds '+Math.round(maxBytes/1_000_000)+' MB.');
    const parsed=JSON.parse(await file.text());
    const restored=migrateSave(parsed);
    state=restored;
    advanceWorld(Date.now());
    ui.selection=null;updateUI();saveGame();
    toast('Imported progress from JSON.');
  }catch(error){toast('Could not import JSON: '+error.message);}
}


