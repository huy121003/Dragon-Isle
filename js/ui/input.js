"use strict";

/* UI: Pointer Events used chung cho chuột và cảm ứng; hai ngón zoom, một ngón kéo nền hoặc công trình. */
function localPoint(event){
  const r=dom.canvas.getBoundingClientRect();
  return {x:event.clientX-r.left,y:event.clientY-r.top};
}
function pointerDown(event){
  event.preventDefault();AUDIO.init();
  dom.canvas.setPointerCapture(event.pointerId);
  const p=localPoint(event);
  ui.pointers.set(event.pointerId,p);
  if(ui.pointers.size===2){
    if(ui.gesture?.holdTimer)clearTimeout(ui.gesture.holdTimer);
    const points=Array.from(ui.pointers.values()),mid={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};
    ui.gesture={kind:"pinch",distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),
      zoom:ui.camera.zoom,anchor:screenToWorld(mid.x,mid.y)};
    return;
  }
  const cell=screenCell(p.x,p.y);
  if(ui.mode){
    const held=ui.mode.kind==="move"?buildingById(ui.mode.id):null;
    const offsetX=held&&cell.x>=held.x&&cell.x<held.x+reservedFootprint(held).w?cell.x-held.x:0;
    const offsetY=held&&cell.y>=held.y&&cell.y<held.y+reservedFootprint(held).h?cell.y-held.y:0;
    ui.mode.x=cell.x-offsetX;ui.mode.y=cell.y-offsetY;
    ui.gesture={kind:"placement",start:p,offsetX:offsetX,offsetY:offsetY};
    return;
  }
  const hit=inside(cell.x,cell.y)?buildingAt(cell.x,cell.y):null;
  const gesture={kind:hit?"building":"pan",start:p,last:p,hitId:hit?hit.id:null,
    offsetX:hit?cell.x-hit.x:0,offsetY:hit?cell.y-hit.y:0,moved:false};
  ui.gesture=gesture;
  if(hit&&!hit.upgradeEnds)gesture.holdTimer=setTimeout(function(){
    if(ui.gesture!==gesture||ui.pointers.size!==1||gesture.kind!=="building")return;
    ui.mode={kind:"move",id:hit.id,x:hit.x,y:hit.y};
    gesture.kind="drag-building";gesture.longPress=true;
    dom.barText.textContent="Drag and release to move the building";
    dom.bar.classList.add("visible");
  },500);
}
function pointerMove(event){
  const hover=localPoint(event);ui.pointerWorld=screenToWorld(hover.x,hover.y);
  if(!ui.pointers.has(event.pointerId))return;
  event.preventDefault();
  const p=localPoint(event);
  ui.pointers.set(event.pointerId,p);
  const g=ui.gesture;
  if(!g)return;
  if(ui.pointers.size>=2&&g.kind==="pinch"){
    const points=Array.from(ui.pointers.values()),mid={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};
    const dist=Math.max(1,Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y));
    ui.camera.zoom=clamp(g.zoom*dist/Math.max(g.distance,1),.015,2.05);
    ui.camera.x=g.anchor.x-(mid.x-viewW/2)/ui.camera.zoom;
    ui.camera.y=g.anchor.y-(mid.y-viewH/2)/ui.camera.zoom;
    clampCamera();return;
  }
  if(g.kind==="placement"){
    const c=screenCell(p.x,p.y);ui.mode.x=c.x-g.offsetX;ui.mode.y=c.y-g.offsetY;return;
  }
  const distance=Math.hypot(p.x-g.start.x,p.y-g.start.y);
  if(g.kind==="building"&&distance>9){
    if(g.holdTimer)clearTimeout(g.holdTimer);
    g.kind="pan";g.moved=true;
  }
  if(g.kind==="drag-building"){
    if(distance>5)g.moved=true;
    const c=screenCell(p.x,p.y);ui.mode.x=c.x-g.offsetX;ui.mode.y=c.y-g.offsetY;
  }else if(g.kind==="pan"){
    if(distance>5)g.moved=true;
    ui.camera.x-=(p.x-g.last.x)/ui.camera.zoom;
    ui.camera.y-=(p.y-g.last.y)/ui.camera.zoom;
    clampCamera();
  }
  g.last=p;
}
function pointerUp(event){
  if(!ui.pointers.has(event.pointerId))return;
  event.preventDefault();
  const p=localPoint(event),g=ui.gesture;
  if(g?.holdTimer)clearTimeout(g.holdTimer);
  ui.pointers.delete(event.pointerId);
  if(g&&g.kind==="pinch"){
    if(ui.pointers.size===1){
      const rest=Array.from(ui.pointers.values())[0];
      ui.gesture={kind:"pan",start:rest,last:rest,moved:true};
    }else ui.gesture=null;
    return;
  }
  if(ui.pointers.size) return;
  ui.gesture=null;
  if(!g)return;
  if(g.kind==="drag-building"&&!g.moved){
    toast("Tap an empty tile to place the building.");return;
  }
  if(g.kind==="placement"||g.kind==="drag-building"){
    const c=screenCell(p.x,p.y);
    ui.mode.x=c.x-g.offsetX;ui.mode.y=c.y-g.offsetY;
    completePlacement(ui.mode.x,ui.mode.y);
    return;
  }
  if(g.moved)return;
  const cell=screenCell(p.x,p.y);
  if(!inside(cell.x,cell.y)){ui.selection=null;updateInspector();return;}
  const b=buildingAt(cell.x,cell.y);
  if(b){
    if(b.type==="habitat"){
      ui.selection={type:"building",id:b.id};
      openModal("habitat",b.id);
      return;
    }
    ui.selection={type:"building",id:b.id};
  }else if(islandAt(cell.x,cell.y)>=0&&!unlocked(cell.x,cell.y)){
    const index=islandAt(cell.x,cell.y);
    ui.selection=index>=state.unlockedIslands?{type:"island",index}:{type:"land",x:cell.x,y:cell.y};
  }else ui.selection=null;
  updateInspector();
}
function pointerCancel(event){
  if(ui.gesture?.holdTimer)clearTimeout(ui.gesture.holdTimer);
  ui.pointers.delete(event.pointerId);
  if(ui.mode&&ui.gesture&&ui.gesture.kind==="drag-building")stopMode();
  ui.gesture=null;
}
function wheelZoom(event){
  event.preventDefault();
  const p=localPoint(event),anchor=screenToWorld(p.x,p.y);
  ui.camera.zoom=clamp(ui.camera.zoom*(event.deltaY<0?1.1:.9),.015,2.05);
  ui.camera.x=anchor.x-(p.x-viewW/2)/ui.camera.zoom;
  ui.camera.y=anchor.y-(p.y-viewH/2)/ui.camera.zoom;clampCamera();
}
function handleAction(button){
  const a=button.dataset.action,id=Number(button.dataset.id);
  AUDIO.init();
  if(a!=="feed"&&a!=="collect"&&a!=="harvest")AUDIO.play("click");
  switch(a){
    case "open-shop":openModal("shop");break;
    case "shop-egg-detail":openModal("shop-egg-detail",button.dataset.species);break;
    case "shop-egg-back":openModal("shop");break;
    case "open-dragons":openModal("dragons");break;
    case "dragon-detail":openModal("dragon-detail",id);break;
    case "back-habitat":{
      const house=buildingById(id);
      openModal(house&&house.type==="habitat"&&!house.stored?"habitat":"dragons",id);break;
    }
    case "open-book":openModal("book");break;
    case "open-inventory":openModal("inventory");break;
    case "open-islands":openModal("islands");break;
    case "open-guide":openModal("guide");break;
    case "guide-tab":
      if(GUIDE_SECTIONS.some(section=>section[0]===button.dataset.tab)){
        ui.guideTab=button.dataset.tab;renderGuide();dom.body.scrollTop=0;
        window.dispatchEvent(new Event('dragon-ui-update'));
      }
      break;
    case "show-world":showWorld();break;
    case "focus-island":focusIsland(id);break;
    case "unlock-island":unlockIsland(id);break;
    case "open-arena":openModal("arena");loadArena();break;
    case "arena-toggle":arenaToggle(button.dataset.side,id);break;
    case "arena-save":arenaSaveTeam();break;
    case "arena-fight":arenaFight(button.dataset.opponent);break;
    case "arena-skill":arenaTurn("skill",Number(button.dataset.skill));break;
    case "arena-switch":arenaTurn("switch",id);break;
    case "arena-forfeit":
      if(window.confirm("Forfeiting counts as a loss and starts a 15-minute cooldown. Continue?"))arenaTurn("forfeit");break;
    case "arena-refresh":loadArena();break;
    case "close-modal":closeModal();break;
    case "clear-selection":ui.selection=null;updateInspector();break;
    case "cancel-mode":{
      const backToShop=ui.mode?.fromShop;
      stopMode();if(backToShop)openModal("shop");break;
    }
    case "shop-tab":ui.shopTab=button.dataset.tab;renderShop();break;
    case "toggle-fixed-day":
      ui.fixedDay=!ui.fixedDay;
      try{localStorage.setItem('dragon-isle-fixed-day',ui.fixedDay?'1':'0');}catch(error){}
      renderShop();break;
    case "toggle-iso-debug":ui.debugIso=!ui.debugIso;renderShop();break;
    case "book-tab":ui.bookTab=button.dataset.tab;ui.bookPage=0;renderBook();dom.body.scrollTop=0;break;
    case "book-page":ui.bookPage=Number(button.dataset.page)||0;renderBook();dom.body.scrollTop=0;break;
    case "element-filter":{
      const target=button.dataset.target;
      if(["breed-father","breed-mother","dragon","book"].includes(target)){
        const property=target==='breed-father'?'breedFatherElements':target==='breed-mother'?'breedMotherElements':target+'Elements';
        const selected=ui[property],element=button.dataset.element;
        if(element==='all')ui[property]=[];
        else if(DATA.elements[element]){
          if(selected.includes(element))ui[property]=selected.filter(id=>id!==element);
          else if(selected.length<4)ui[property]=[...selected,element];
        }
        if(target==="book"){ui.bookPage=0;renderBook();}
        else if(target==="dragon")renderDragons();
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
    case "egg-find-home":openModal("choose-hatchery",id);break;
    case "hatchery-menu":openModal("hatchery",id);break;
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
      window.dispatchEvent(new Event("dragon-ui-update"));
      requestAnimationFrame(()=>{
        const field=document.querySelector('[data-breed-search="'+slot+'"]');
        if(field){field.focus();field.setSelectionRange(field.value.length,field.value.length);}
      });break;
    }
    case "breed-select":
      if(button.dataset.slot==="father"||button.dataset.slot==="mother"){
        if(ui.breedDraft[button.dataset.slot==="father"?"mother":"father"]===id)break;
        ui.breedDraft[button.dataset.slot]=id;
        if(ui.modal?.name==="breeding")renderBreeding(ui.modal.extra);
        window.dispatchEvent(new Event("dragon-ui-update"));
      }
      break;
    case "collect-breeding":collectBreeding(id);break;
    case "topup-test":topUpTestResources(true);break;
    case "export-save":exportSaveJson();break;
    case "factory-reset":factoryReset();break;
    case "logout":logoutAccount();break;
    case "buy-food":{
      const count=Number(button.dataset.count);
      if(![10,100,500].includes(count))break;
      const cost=count*window.DragonEconomy.progression.foodGoldPrice;
      if(spendGold(cost)){state.food+=count;toast("Bought "+money(count)+" food for "+money(cost)+" gold.");updateUI();saveGame();}
      break;
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
