"use strict";

/**
 * UI action router.
 *
 * Converts data-action payloads into domain logic/navigation calls. Canvas
 * pointer/camera/drag behavior remains in js/ui/input.js.
 */
/**
 * Route one declarative data-action payload to navigation or domain logic.
 * Connection-blocked state is checked before any gameplay action is allowed.
 */
function handleAction(button){
  if(window.DragonConnectionState?.blocked){
    toast(window.DragonConnectionState.status==="session-expired"?
      "Session expired. Returning to sign in…":"Reconnecting to server. Please wait.");
    return;
  }
  const a=button.dataset.action,id=Number(button.dataset.id);
  AUDIO.init();
  if(a!=="feed"&&a!=="collect"&&a!=="harvest")AUDIO.play("click");
  switch(a){
    case "open-shop":openModal("shop");break;
    case "shop-egg-detail":openModal("shop-egg-detail",button.dataset.species);break;
    case "shop-egg-back":openModal("shop");break;
    case "open-dragons":openModal("dragons");break;
    case "dragon-sort":
      if(["power","level","stars"].includes(button.dataset.sort)){ui.dragonSort=button.dataset.sort;renderDragons();}
      break;
    case "dragon-detail":
      ui.dragonReturn=ui.modal?.name==="habitat"?{name:"habitat",extra:ui.modal.extra}:{name:"dragons"};
      openModal("dragon-detail",id);break;
    case "dragon-back":{
      const back=ui.dragonReturn||{name:"dragons"};ui.dragonReturn=null;
      const house=back.name==="habitat"?buildingById(back.extra):null;
      openModal(house&&!house.stored?"habitat":"dragons",house?.id);break;
    }
    case "open-book":openModal("book");break;
    case "open-inventory":openModal("inventory");break;
    case "open-islands":openModal("islands");break;
    case "open-guide":openModal("guide");break;
    case "guide-tab":
      if(GUIDE_SECTIONS.some(section=>section[0]===button.dataset.tab)){
        ui.guideTab=button.dataset.tab;renderGuide();dom.body.scrollTop=0;
        notifyReactRuntime();
      }
      break;
    case "show-world":showWorld();break;
    case "focus-island":focusIsland(id);break;
    case "unlock-island":unlockIsland(id);break;
    case "open-arena":openModal("arena");loadArena();break;
    case "open-daily-missions":openModal("daily-missions");refreshDailyMissions();break;
    case "claim-daily-mission":claimDailyMission(button.dataset.id);break;
    case "arena-toggle":arenaToggle(button.dataset.side,id);break;
    case "arena-save":arenaSaveTeam();break;
    case "arena-fight":arenaFight(button.dataset.opponent);break;
    case "arena-refill":arenaRefill();break;
    case "arena-skill":arenaTurn("skill",Number(button.dataset.skill));break;
    case "arena-switch":arenaTurn("switch",id);break;
    case "arena-forfeit":
      if(window.confirm("Forfeiting ends the match and uses one Arena attempt. Continue?"))arenaTurn("forfeit");break;
    case "arena-refresh":loadArena();break;
    case "close-modal":closeModal();break;
    case "clear-selection":ui.selection=null;updateInspector();break;
    case "cancel-mode":{
      const backToShop=ui.mode?.fromShop;
      stopMode();if(backToShop)openModal("shop");break;
    }
    case "shop-tab":ui.shopTab=button.dataset.tab;if(ui.shopTab==="eggs")ui.shopEggPage=0;renderShop();break;
    case "shop-eggs-page":
      if(currentAccount?.role==="admin"){
        ui.shopEggPage=Math.max(0,Number(button.dataset.page)||0);renderShop();dom.body.scrollTop=0;
      }
      break;
    case "toggle-fixed-day":
      ui.fixedDay=!ui.fixedDay;
      try{localStorage.setItem('dragon-isle-fixed-day',ui.fixedDay?'1':'0');}catch(error){}
      renderShop();break;
    case "toggle-iso-debug":ui.debugIso=!ui.debugIso;renderShop();break;
    case "book-tab":ui.bookTab=button.dataset.tab;ui.bookPage=0;renderBook();dom.body.scrollTop=0;break;
    case "book-page":ui.bookPage=Number(button.dataset.page)||0;renderBook();dom.body.scrollTop=0;break;
    case "rarity-filter":{
      const target=button.dataset.target,rarity=button.dataset.rarity;
      if(["breed-father","breed-mother","dragon","book","admin-eggs"].includes(target)){
        const property=target==="breed-father"?"breedFatherRarities":
          target==="breed-mother"?"breedMotherRarities":target==="admin-eggs"?"shopEggRarities":target+"Rarities";
        const selected=ui[property];
        if(rarity==="all")ui[property]=[];
        else if(DATA.rarities[rarity])ui[property]=selected.includes(rarity)?
          selected.filter(id=>id!==rarity):[...selected,rarity];
        if(target==="book"){ui.bookPage=0;renderBook();}
        else if(target==="dragon")renderDragons();
        else if(target==="admin-eggs"){ui.shopEggPage=0;renderShop();}
        else renderBreeding(ui.modal.extra);
      }
      break;
    }
    case "element-filter":{
      const target=button.dataset.target;
      if(["breed-father","breed-mother","dragon","book","admin-eggs"].includes(target)){
        const property=target==='breed-father'?'breedFatherElements':target==='breed-mother'?'breedMotherElements':target==='admin-eggs'?'shopEggElements':target+'Elements';
        const selected=ui[property],element=button.dataset.element;
        if(element==='all')ui[property]=[];
        else if(DATA.elements[element]){
          if(selected.includes(element))ui[property]=selected.filter(id=>id!==element);
          else if(selected.length<window.DragonConfig.dragons.maxElementsPerDragon)ui[property]=[...selected,element];
        }
        if(target==="book"){ui.bookPage=0;renderBook();}
        else if(target==="dragon")renderDragons();
        else if(target==="admin-eggs"){ui.shopEggPage=0;renderShop();}
        else renderBreeding(ui.modal.extra);
      }
      break;
    }
    case "book-detail":
      if(!state.discovered.includes(button.dataset.species)){
        toast("Hatch this dragon to unlock its details.");break;
      }
      ui.returnModal=ui.modal?{name:ui.modal.name,extra:ui.modal.extra}:{name:"book",extra:null};
      openModal("book-detail",button.dataset.species);break;
    case "book-back":{
      const back=ui.returnModal||{name:"book",extra:null};ui.returnModal=null;
      openModal(back.name,back.extra);break;
    }
    case "open-recipes":openModal("recipes");break;
    case "choose-build":beginMode({kind:"buy",type:button.dataset.type,element:button.dataset.element||null,fromShop:true});break;
    case "place-inventory":beginMode({kind:"inventory",id:id});break;
    case "buy-egg":buyEgg(button.dataset.species);break;
    case "egg-find-home":{
      const rooms=state.buildings.filter(b=>b.type==="hatchery"&&!b.stored&&
        eggsInHatchery(b.id).length<hatcheryCapacity(b.level));
      if(rooms.length===1)startIncubation(id,rooms[0].id);
      else if(rooms.length>1)openModal("choose-hatchery",id);
      else toast("The Hatchery is full. Hatch or sell a ready egg to free a nest.");
      break;
    }
    case "hatchery-menu":openModal("hatchery",id);break;
    case "habitat-menu":openModal("habitat",id);break;
    case "start-incubation":startIncubation(id,Number(button.dataset.building));break;
    case "speed-hatch":speedHatch(id);break;
    case "skip-timer":skipTimer(button.dataset.kind,id);break;
    case "view-ready-egg":openModal("ready-egg",id);break;
    case "place-ready-egg":hatchEgg(id,Number(button.dataset.building));break;
    case "sell-ready-egg":sellReadyEgg(id);break;
    case "hatch-egg":hatchEgg(id);break;
    case "breeding-menu":openModal("breeding",id);break;
    case "start-breeding":startBreeding(id,Number(button.dataset.father),Number(button.dataset.mother));break;
    case "breed-search":{
      const slot=button.dataset.slot;
      if(slot!=="father"&&slot!=="mother")break;
      ui[slot==="father"?"breedFatherQuery":"breedMotherQuery"]=String(button.dataset.query||"");
      if(ui.modal?.name==="breeding")renderBreeding(ui.modal.extra);
      notifyReactRuntime();
      requestAnimationFrame(()=>{
        const field=document.querySelector('.game-modal [data-breed-search="'+slot+'"]')||
          document.querySelector('[data-breed-search="'+slot+'"]');
        if(field){field.focus();field.setSelectionRange(field.value.length,field.value.length);}
      });break;
    }
    case "breed-select":
      if(button.dataset.slot==="father"||button.dataset.slot==="mother"){
        if(ui.breedDraft[button.dataset.slot==="father"?"mother":"father"]===id)break;
        ui.breedDraft[button.dataset.slot]=id;
        if(ui.modal?.name==="breeding")renderBreeding(ui.modal.extra);
        notifyReactRuntime();
      }
      break;
    case "collect-breeding":collectBreeding(id);break;
    case "topup-test":topUpTestResources(true);break;
    case "export-save":exportSaveJson();break;
    case "factory-reset":factoryReset();break;
    case "logout":logoutAccount();break;
    case "buy-food":{
      const count=Number(button.dataset.count);
      const amounts=window.DragonConfig.economy.shop.standardFoodAmounts;
      if(!amounts.includes(count))break;
      const cost=count*window.DragonConfig.progression.foodGoldPrice;
      if(spendGold(cost)){state.food+=count;toast("Bought "+money(count)+" food for "+money(cost)+" gold.");updateUI();saveGame();}
      break;
    }
    case "buy-resource-pack":{
      const kind=button.dataset.kind,index=Number(button.dataset.index);
      const packs=window.DragonConfig.economy.shop.resourcePacks;
      const list=packs?.[kind],pack=Array.isArray(list)?list[index]:null;
      if(!pack||!Number.isFinite(pack.cost)||!Number.isFinite(pack.amount)||pack.cost<=0||pack.amount<=0)break;
      if(kind==="goldForGems"){
        if(state.gems<pack.cost){toast("Not enough gems.");break;}
        state.gems-=pack.cost;state.gold+=pack.amount;
        toast("Exchanged "+money(pack.cost)+" gems for "+money(pack.amount)+" gold.");
      }else if(kind==="gemsForGold"){
        if(state.gold<pack.cost){toast("Not enough gold.");break;}
        state.gold-=pack.cost;state.gems+=pack.amount;
        toast("Exchanged "+money(pack.cost)+" gold for "+money(pack.amount)+" gems.");
      }else if(kind==="foodForGems"){
        if(state.gems<pack.cost){toast("Not enough gems.");break;}
        state.gems-=pack.cost;state.food+=pack.amount;
        toast("Bought "+money(pack.amount)+" food for "+money(pack.cost)+" gems.");
      }else break;
      updateUI();saveGame();break;
    }
    case "unlock-land":unlockLand(Number(button.dataset.x),Number(button.dataset.y));break;
    case "unlock-land-gem":unlockLand(Number(button.dataset.x),Number(button.dataset.y),"gem");break;
    case "collect":collect(buildingById(id));break;
    case "feed":feedDragon(id);break;
    case "upgrade-star":upgradeDragonStar(id);break;
    case "sell-dragon":sellDragon(id);break;
    case "inspect-dragon":ui.selection={type:"dragon",id:id};updateInspector();break;
    case "assign-menu":if(dragonBusy(id))toast("Breeding dragons cannot change Habitats.");
      else openModal("assign",id);break;
    case "assign":assignDragon(Number(button.dataset.dragon),Number(button.dataset.building));break;
    case "crop-menu":openModal("crops",id);break;
    case "plant":plantCrop(id,button.dataset.crop);break;
    case "harvest":harvest(buildingById(id));break;
    case "upgrade":upgradeBuilding(id);break;
    case "move":beginMode({kind:"move",id:id});break;
    case "store":storeBuilding(id);break;
    case "sell":sellBuilding(id);break;
  }
}

/** Publish imperative legacy UI changes to React, keeping event fallback for standalone scripts. */
function notifyReactRuntime(){
  if(window.DragonRuntime?.emit){window.DragonRuntime.emit('ui');return;}
  window.dispatchEvent(new Event('dragon-ui-update'));
}
