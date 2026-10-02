"use strict";

/**
 * Register browser/DOM event bindings after game state and canvas are ready.
 * @param {object} runtime - Shared runtime timing config.
 */
function bindGameEvents(runtime){
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
      else if(ui.selection){ui.selection=null;updateInspector();window.DragonRuntime?.emit();}
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
}
