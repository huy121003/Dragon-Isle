"use strict";

/**
 * Modal router only. Domain-specific rendering lives in js/ui/panels/*.js.
 * Keep this file free of domain markup so adding a panel does not recreate the monolith.
 */
function renderModal(){
  if(!ui.modal)return;
  const name=ui.modal.name;
  if(name==="shop"){renderShop();return;}
  if(name==="shop-egg-detail"){renderShopEggDetail(ui.modal.extra);return;}
  if(name==="dragons"){renderDragons();return;}
  if(name==="dragon-detail"){renderDragonDetail(ui.modal.extra);return;}
  if(name==="habitat"){renderHabitat(ui.modal.extra);return;}
  if(name==="inventory"){renderInventory();return;}
  if(name==="crops"){renderCrops(ui.modal.extra);return;}
  if(name==="assign"){renderAssign(ui.modal.extra);return;}
  if(name==="hatchery"){renderHatchery(ui.modal.extra);return;}
  if(name==="ready-egg"){renderReadyEgg(ui.modal.extra);return;}
  if(name==="choose-hatchery"){renderChooseHatchery(ui.modal.extra);return;}
  if(name==="breeding"){renderBreeding(ui.modal.extra);return;}
  if(name==="arena"){renderArena();return;}
  if(name==="daily-missions"){dom.body.innerHTML=renderDailyMissions();return;}
  if(name==="achievements"){renderAchievements();return;}
  if(name==="achievements"){renderAchievements();return;}
  if(name==="islands"){renderIslands();return;}
  if(name==="book"){renderBook();return;}
  if(name==="guide"){renderGuide();return;}
  if(name==="book-detail"){renderBookDetail(ui.modal.extra);return;}
  if(name==="recipes"){renderRecipes();return;}
  if(name==="reveal"){renderReveal(ui.modal.extra);return;}
  if(name==="welcome"){renderWelcome(ui.modal.extra);return;}
}
