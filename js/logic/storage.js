"use strict";

/**
 * Building storage actions.
 */
/** Move an eligible Habitat to inventory while preserving its record. */
function storeBuilding(id){
  const b=buildingById(id);
  if(!b||b.stored)return;
  if(b.type!=="habitat"||b.upgradeEnds){toast("Only Habitats can be stored.");return;}
  if(b.type==="habitat"&&occupants(b).some(function(d){return dragonBusy(d.id);})){
    toast("Wait for breeding dragons before storing this Habitat.");return;
  }
  advanceWorld(Date.now());
  b.stored=true;ui.selection=null;
  toast(buildingName(b)+" was stored. Dragons stop producing gold and gems while it is stored.");
  updateUI();saveGame();
}
