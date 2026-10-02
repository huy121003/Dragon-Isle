"use strict";

/* UI PANEL: Cross-domain welcome summary and Arena hand-off panels. */
function renderWelcome(report){
  dom.title.textContent="☀️ Welcome back!";
  const readyEggs=state.eggs.filter(function(egg){return egg.hatcheryId&&egg.readyAt<=Date.now();}).length;
  const readyCaves=state.buildings.filter(function(b){return isBreedingCave(b)&&b.breeding&&b.breeding.readyAt<=Date.now();}).length;
  dom.body.innerHTML='<div class="note">The island kept running while you were away, for up to 12 hours. Tap a Habitat to collect its gold.</div>'+
    '<div class="panel"><h3>Over '+duration(report.elapsed/1000)+'</h3><p>Habitats produced <b>'+
    goldDecimal(report.gold)+' gold</b> to collect.'+(report.finished?'<br>'+report.finished+' buildings finished upgrading.':'')+
    (readyEggs?'<br>'+readyEggs+' eggs are ready to hatch.':'')+
    (readyCaves?'<br>'+readyCaves+' Breeding Caves finished.':'')+
    '</p><button class="btn good" data-action="close-modal">Continue playing</button></div>';
}
/* Arena is rendered by ArenaView.jsx; keep only the modal title for the shared shell. */

function renderArena(){dom.title.textContent='⚔️ Arena';}
