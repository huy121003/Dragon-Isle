"use strict";

/**
 * Start periodic world/save work plus the animation frame loop.
 * Timings are supplied by system config so runtime cadence has one owner.
 */
function startGameRuntimeLoops(runtime){
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
      // Publish timer/resource changes to React views once per world tick.
      window.DragonRuntime?.emit("tick");
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
