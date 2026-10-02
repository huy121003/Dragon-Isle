"use strict";

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
  if(name==="islands"){renderIslands();return;}
  if(name==="book"){renderBook();return;}
  if(name==="guide"){renderGuide();return;}
  if(name==="book-detail"){renderBookDetail(ui.modal.extra);return;}
  if(name==="recipes"){renderRecipes();return;}
  if(name==="reveal"){renderReveal(ui.modal.extra);return;}
  if(name==="welcome"){renderWelcome(ui.modal.extra);return;}
}
function renderIslands(){
  dom.title.textContent="🗺️ Island World";
  let html='<div class="note">All '+DATA.islands.length+' floating islands share one continuous map. Drag the world to travel and use the mouse wheel or pinch to zoom.</div><div class="actions"><button class="btn primary" data-action="show-world">See entire world on the map</button></div><div class="island-list">';
  DATA.islands.forEach(function(island,index){
    const owned=index<state.unlockedIslands,next=index===state.unlockedIslands;
    const count=owned?islandRegionCount(index):0,total=islandRegionTotal(index);
    const issue=next?islandUnlockIssue(index):"",ready=next&&!issue;
    const element=island.element&&DATA.elements[island.element];
    html+='<div class="island-item '+(owned?'owned':'locked')+'"><span class="island-symbol" style="--island-color:'+(element?element.color:'#86c981')+'">'+(element?element.mark:'🏝️')+'</span><div class="island-info"><b>'+(index+1)+'. '+esc(island.name)+'</b><small>'+(element?element.name+' element · ':'Starting island · ')+island.size+'×'+island.size+' tiles</small><small>'+esc(island.description||'')+'</small><small>'+(owned?count+'/'+total+' regions unlocked':next?'♦ '+money(islandUnlockCost(index))+' gems'+(issue?' · '+esc(issue):''):'Unlock the previous island first')+'</small>'+(owned?'<div class="island-progress"><span style="width:'+(count/total*100)+'%"></span></div>':'')+'</div><div class="island-actions">'+
      (owned?'<button class="btn primary" data-action="focus-island" data-id="'+index+'">View on map</button>':ready?'<button class="btn good" data-action="unlock-island" data-id="'+index+'">Unlock · ♦ '+money(islandUnlockCost(index))+'</button>':
      '<button class="btn" disabled>🔒 Locked</button>')+'</div></div>';
  });
  dom.body.innerHTML=html+'</div>';
}
function renderShop(){
  dom.title.textContent="🏪 Shop";
  let html='<div class="tabs">'+
    [['special','Special buildings'],['habitats','Habitats'],['decorations','Decorations'],
      ['eggs','Eggs'],['supplies','Resources'],['save','💾 Data']]
      .map(function([id,label]){return '<button class="btn '+(ui.shopTab===id?'active':'')+
        '" data-action="shop-tab" data-tab="'+id+'">'+label+'</button>';}).join('')+'</div>';
  if(ui.shopTab==="habitats"){
    html+='<div class="cards">';
    Object.keys(DATA.elements).forEach(function(element){
      const e=DATA.elements[element];
      const need=ELEMENT_UNLOCK[element]||99,locked=state.player.level<need;
      html+='<button class="shop-item" data-action="choose-build" data-type="habitat" data-element="'+element+'"'+(locked?' disabled':'')+'>'+
        '<span class="shop-icon" style="color:'+e.color+'">'+elementFlag(element,false,'lg')+'</span><span><b>Habitat '+e.name+
        '</b><small>Houses '+e.name+' · '+(locked?'Unlocks at level '+need:'6×6 tiles · up to level 4')+
        ' · Purchased '+(state.habitatPurchases[element]||0)+'×</small></span><strong>● '+money(habitatPurchaseCost(element))+'</strong></button>';
    });
    html+='</div>';
  }else if(ui.shopTab==="special"){
    html+='<div class="note">Chọn công trình để đặt trên đảo. Vàng hoặc gem chỉ bị trừ khi đặt thành công; có thể quay lại Shop trước khi đặt.</div><div class="cards special-shop-cards">';
    const farms=farmCount(),limit=farmLimit(state.player.level);
    html+='<button class="shop-item" data-action="choose-build" data-type="farm"'+(farms>=limit?' disabled':'')+'><span class="shop-icon">🌱</span>'+
      '<span><b>Farm · '+farms+'/'+limit+'</b><small>One additional Farm every 5 player levels · four crop levels · 9×6 tiles</small></span><strong>● '+money(DATA.buildings.farm.cost)+'</strong></button>'+
      '<button class="shop-item" data-action="choose-build" data-type="cave"'+(state.buildings.some(b=>b.type==="cave")?' disabled':'')+'><span class="shop-icon">💞</span>'+
      '<span><b>Breeding Cave</b><small>One cave · 12×9 tiles</small></span><strong>● '+money(DATA.buildings.cave.cost)+'</strong></button>'+
      '<button class="shop-item premium-cave-offer" data-action="choose-build" data-type="premiumCave"'+
      (state.buildings.some(b=>b.type==="premiumCave")?' disabled':'')+'><span class="shop-icon">✧</span>'+
      '<span><b>'+esc(DATA.buildings.premiumCave.name)+'</b><small>One only · 12×9 tiles · 20% faster · '+Math.round((window.DragonEconomy.breeding.premiumRareFactor-1)*100)+'% more chance for 3+ elements</small></span>'+
      '<strong>♦ '+money(DATA.buildings.premiumCave.cost)+'</strong></button>'+
      '<button class="shop-item" data-action="choose-build" data-type="academy"'+(state.buildings.some(b=>b.type==="academy")?' disabled':'')+'><span class="shop-icon">✦</span><span><b>Dragon Academy</b><small>One per island · raises the dragon level cap from 30 to 100 across five building levels</small></span><strong>● '+money(DATA.buildings.academy.cost)+'</strong></button>'+
      '<button class="shop-item" data-action="choose-build" data-type="arena"'+(state.buildings.some(b=>b.type==="arena")?' disabled':'')+'><span class="shop-icon">⚔️</span><span><b>Arena</b><small>One arena · 12×12 tiles</small></span><strong>● '+money(DATA.buildings.arena.cost)+'</strong></button>'+
      '';
    html+='</div>';
  }else if(ui.shopTab==="decorations"){
    html+='<div class="cards"><button class="shop-item" data-action="choose-build" data-type="decor">'+
      '<span class="shop-icon">🚩</span><span><b>Flagpole</b><small>Island decoration · 3×3 tiles</small></span>'+
      '<strong>● '+money(DATA.buildings.decor.cost)+'</strong></button></div>';
  }else if(ui.shopTab==="eggs"){
    html+='<div class="note">The shop sells pure element eggs. Prices depend on rarity and unlock level. Purchased eggs enter an available Hatchery nest.</div>'+ 
      '<div class="cards">';
    DRAGON_DB.species.map(function(raw){return DATA.species[raw.id];}).filter(function(s){
      return s.elements.length===1&&s.detail.giaTrung;
    }).forEach(function(s){
      const price=shopEggPrice(s),cost=price.vang?price.vang:price.gem;
      const need=ELEMENT_UNLOCK[s.elements[0]]||99;
      const canBuy=state.player.level>=need&&(price.vang?state.gold>=cost:state.gems>=cost);
      html+='<div class="shop-item egg-shop-card"><span class="egg-plinth" aria-hidden="true">'+
        eggShellHtml(s.id,false)+'</span><div class="egg-offer"><b>'+esc(s.name)+'</b>'+ 
        '<span class="shop-element dragon-marks">'+elementBadges(s)+rarityGem(s.rarity,s.elements[0])+'</span><small>Incubation: '+duration(hatchingSeconds(s))+
        (state.player.level<need?' · Unlocks at level '+need:'')+'</small></div>'+ 
        '<span class="shop-dragon" aria-label="Dragon portrait: '+esc(s.name)+'">'+dragonPortrait(s.id,1,'small')+'</span>'+ 
        '<div class="actions"><button class="btn" data-action="shop-egg-detail" data-species="'+s.id+'">Details</button>'+ 
        '<button class="btn good" data-action="buy-egg" data-species="'+s.id+'"'+
        (canBuy?'':' disabled')+'>Buy '+
        (price.vang?"● "+money(price.vang):"♦ "+money(price.gem))+'</button></div></div>';
    });
    html+='</div>';
  }else if(ui.shopTab==="save"){
    html+='<div class="note">Signed in: <b>'+esc(currentAccount.username)+
      '</b>. Progress is saved separately on the server.'+
      '</div><div class="panel"><h3>Display</h3><p>Day and night change every '+(DATA.environment.cycleSeconds/60)+' minutes.</p>'+
      '<button class="btn" data-action="toggle-fixed-day" aria-pressed="'+ui.fixedDay+'">'+
      (ui.fixedDay?'☀ Fixed daytime: on':'◐ Fixed daytime: off')+'</button></div><div class="note">'+
      'Debug: DragonGame.advanceDay(minutes) advances the visual clock.'+
      '</div><div class="actions"><button class="btn primary" data-action="export-save">Download save JSON</button>'+ 
      '<label class="btn good" for="saveImport">Import save JSON</label>'+ 
      '<input id="saveImport" type="file" accept=".json,application/json" class="visually-hidden"></div>'+ 
      '<div class="panel reset-panel"><h3>Start over</h3><p>Reset progress to '+money(window.DragonEconomy.starting.gold)+' gold, '+money(window.DragonEconomy.starting.food)+' food, '+money(window.DragonEconomy.starting.gems)+' gems, a Fire Habitat, a Fire Dragon, and a level 1 Hatchery.</p>'+
      '<button class="btn danger" data-action="factory-reset">Reset game</button></div>'+
      '<details class="panel"><summary>Testing &amp; debug</summary><div class="actions"><button class="btn" data-action="topup-test">Grant test resources</button>'+
      '<button class="btn" data-action="toggle-iso-debug" aria-pressed="'+ui.debugIso+'">'+
      (ui.debugIso?'✓ Isometric debug: on':'◇ Isometric debug: off')+'</button></div>'+
      '<p>Sets a minimum of 10 million gold, 100,000 food and 10,000 gems.</p></details>';
  }else{
    const economy=window.DragonEconomy,price=economy.progression.foodGoldPrice,packs=economy.shop.resourcePacks;
    html+='<div class="note">Resource exchange · rates are intentionally asymmetric so Gold ↔ Gem cannot be looped for profit.</div>'+
      '<h3>🪙 Gold with Gems</h3><div class="cards food-shop-cards">';
    packs.goldForGems.forEach(function(pack,index){
      html+='<button class="shop-item food-offer" data-action="buy-resource-pack" data-kind="goldForGems" data-index="'+index+'"'+
        (state.gems<pack.cost?' disabled':'')+'><span class="shop-icon">🪙</span><span class="food-offer-copy"><b>'+money(pack.amount)+' gold</b>'+
        '<small>'+(state.gems<pack.cost?'Need '+money(pack.cost-state.gems)+' more gems':'Instant exchange')+'</small></span>'+
        '<strong>♦ '+money(pack.cost)+'</strong></button>';
    });
    html+='</div><h3>💎 Gems with Gold</h3><div class="cards food-shop-cards">';
    packs.gemsForGold.forEach(function(pack,index){
      html+='<button class="shop-item food-offer" data-action="buy-resource-pack" data-kind="gemsForGold" data-index="'+index+'"'+
        (state.gold<pack.cost?' disabled':'')+'><span class="shop-icon">💎</span><span class="food-offer-copy"><b>'+money(pack.amount)+' gems</b>'+
        '<small>'+(state.gold<pack.cost?'Need '+money(pack.cost-state.gold)+' more gold':'Instant exchange')+'</small></span>'+
        '<strong>● '+money(pack.cost)+'</strong></button>';
    });
    html+='</div><h3>🍎 Food</h3><div class="cards food-shop-cards">';
    packs.foodForGems.forEach(function(pack,index){
      html+='<button class="shop-item food-offer" data-action="buy-resource-pack" data-kind="foodForGems" data-index="'+index+'"'+
        (state.gems<pack.cost?' disabled':'')+'><span class="shop-icon">🍇</span><span class="food-offer-copy"><b>'+money(pack.amount)+' food</b>'+
        '<small>'+(state.gems<pack.cost?'Need '+money(pack.cost-state.gems)+' more gems':'Premium food pack')+'</small></span>'+
        '<strong>♦ '+money(pack.cost)+'</strong></button>';
    });
    [[100,'🍎'],[500,'🥕'],[2000,'🌾']].forEach(function([count,icon]){
      const cost=count*price,missing=Math.max(0,cost-state.gold);
      html+='<button class="shop-item food-offer" data-action="buy-food" data-count="'+count+'"'+(missing?' disabled':'')+'>'+
        '<span class="shop-icon">'+icon+'</span><span class="food-offer-copy"><b>'+money(count)+' food</b>'+
        '<small>'+(missing?'Need '+money(missing)+' more gold':'Standard food purchase')+'</small></span>'+
        '<strong>● '+money(cost)+'</strong></button>';
    });
    html+='</div>';
  }
  dom.body.innerHTML=html;
  if(ui.shopTab==="eggs")renderDragonPortraits();
}
/* UI: Details eggs thuần elements tại cửa hàng không phụ thuộc Dragon Book. */
function renderShopEggDetail(id){
  const s=DATA.species[id];
  if(!s||s.elements.length!==1||!s.detail.giaTrung){openModal("shop");return;}
  const price=shopEggPrice(s),cost=price.vang?price.vang:price.gem;
  const canBuy=state.player.level>=(ELEMENT_UNLOCK[s.elements[0]]||99)&&
    (price.vang?state.gold>=cost:state.gems>=cost);
  dom.title.textContent="🥚 Eggs "+s.name;
  dom.body.innerHTML='<div class="note">Pure element egg · incubates in '+
    duration(hatchingSeconds(s))+'</div>'+dragonDetailHtml(s,null)+
    '<div class="actions"><button class="btn" data-action="shop-egg-back">‹ Shop</button>'+ 
    '<button class="btn good" data-action="buy-egg" data-species="'+s.id+'"'+
    (canBuy?'':' disabled')+'>Buy '+
    (price.vang?'● '+money(price.vang):'♦ '+money(price.gem))+'</button></div>';
  renderDragonPortraits();
}
function elementFilter(target,selected){
  const chosen=Array.isArray(selected)?selected:(selected&&selected!=='all'?[selected]:[]);
  return '<div class="element-filter-wrap"><div class="element-filter" role="group" aria-label="Filter by element">'+
    [['all','All'],...Object.entries(DATA.elements).map(function([id,e]){return [id,e.name];})]
    .map(function([id,label]){const active=id==='all'?!chosen.length:chosen.includes(id);
      return '<button class="btn flag-filter '+(active?'active selected':'')+
      '" type="button" data-action="element-filter" data-target="'+target+'" data-element="'+id+
      '" title="'+esc(label)+(active&&id!=='all'?' · Selected':'')+'" aria-label="Filter: '+esc(label)+'" aria-pressed="'+active+'"'+
      (id!=='all'&&!active&&chosen.length>=4?' disabled':'')+'>'+
      (id==='all'?'All':elementFlag(id,false)+(active?'<span class="filter-check" aria-hidden="true">✓</span>':''))+'</button>';}).join('')+
    '</div><small class="filter-count">'+chosen.length+'/4 elements selected · match all selected elements</small></div>';
}
function matchesElementFilter(species,selected){return !selected.length||selected.every(id=>species.elements.includes(id));}
function renderDragons(){
  dom.title.textContent="🐲 Owned Dragons · "+state.dragons.length;
  let html='<div class="note">Tap a dragon card for its stats and skills. Feed four times to level up. Dragon level cap: '+dragonLevelCap()+'.</div>'+elementFilter('dragon',ui.dragonElements)+'<div class="cards">';
  const visible=state.dragons.filter(d=>matchesElementFilter(DATA.species[d.species],ui.dragonElements));
  if(!visible.length)html+='<div class="note">No dragons match all selected elements.</div>';
  visible.forEach(function(d){
    const s=DATA.species[d.species];
    const home=buildingById(d.habitatId),busy=dragonBusy(d.id);
    const progress=d.level>=dragonLevelCap()?100:dragonFeedProgress(d)*25;
    const feedCost=dragonFeedCost(d.level);
    html+='<div class="dragon-card" data-action="dragon-detail" data-id="'+d.id+'" role="button" tabindex="0">'+
      dragonPortrait(s.id,d.level,'small')+
      '<div class="dragon-info"><b>'+esc(d.nickname)+' · Level '+d.level+'</b>'+dragonStars(d.stars)+
      '<span class="dragon-summary">'+
      elementBadges(s)+rarityGem(s.rarity,s.elements[0])+'</span><small>'+esc(s.name)+' · '+stageOf(d)+
      ' · '+(home?(home.stored?"Stored Habitat":buildingName(home)):"No Habitat")+
      (home&&!home.stored?' · '+goldPerMinute(dragonIncomePerMinute(d,home))+' gold/min':'')+
      (busy?' · 💞 Breeding':'')+' · '+(d.level>=dragonLevelCap()?'Level cap '+dragonLevelCap():'Fed '+dragonFeedProgress(d)+'/4 feedings')+'</small><div class="meter"><span style="width:'+progress+'%"></span></div>'+
      '<div class="actions"><button class="btn good" data-action="feed" data-id="'+d.id+'"'+(busy||d.level>=dragonLevelCap()||state.food<feedCost?' disabled':'')+'>Feed · '+money(feedCost)+' food</button>'+
      '<button class="btn" data-action="assign-menu" data-id="'+d.id+'"'+(busy?' disabled':'')+'>Change Habitat</button></div></div></div>';
  });
  dom.body.innerHTML=html+"</div>";
  renderDragonPortraits();
}
/* UI: Chạm Habitat mở danh sách dragons, sản lượng, tiles trống và thao tác nâng cấp. */
function renderHabitat(id){
  const b=buildingById(id);
  if(!b||b.type!=="habitat"||b.stored){closeModal();return;}
  const ds=occupants(b),rate=habitatIncomePerMinute(b);
  dom.title.textContent=DATA.elements[b.element].mark+' '+buildingName(b)+' · Level '+b.level;
  let html='<div class="panel"><h3>Habitat details</h3><div class="element-list">'+
      elementFlag(b.element,true)+'</div>'+
    '<div class="stat-grid"><div><span>📐 Footprint</span><b>'+buildingFootprint(b).w+'×'+buildingFootprint(b).h+' tiles</b></div>'+
    '<div><span>🐉 Capacity</span><b>'+ds.length+'/'+habitatCapacity(b.level)+'</b></div>'+ 
    '<div><span>🪙 Gold/min</span><b>'+goldPerMinute(rate)+'</b></div>'+ 
    '<div><span>🏦 Stored gold</span><b>'+goldDecimal(b.storedGold)+' / '+money(habitatGoldCapacity(b))+'</b></div>'+ 
    '<div><span>💎 Gems/hour</span><b>'+habitatGemRate(b)+'</b></div>'+ 
    '<div><span>💎 Stored gems</span><b>'+money(b.storedGems||0)+' / '+money(habitatGemCapacity(b))+'</b></div></div>'+ 
    '<p class="muted">Each dragon produces '+DATA.gemPerDragonPerHour+' gem per hour; progress persists when moving between Habitats.'+
    ((b.storedGems||0)>=habitatGemCapacity(b)?' Gem storage is full.':ds.length?' Next gem in about '+duration(gemNextSeconds(b))+'.':'')+
    ' Gold income is the total from dragons. Production stops at capacity. Hunger and happiness affect income.'+
    (b.level<maxBuildingLevel(b)?' Next upgrade needs '+buildingFootprint(b,b.level+1).w+'×'+
      buildingFootprint(b,b.level+1).h+' free tiles.':'')+'</p>'+
    '<div class="actions"><button class="btn primary" data-action="collect" data-id="'+b.id+'"'+
    (b.storedGold>=.005||(b.storedGems||0)>=1?'':' disabled')+'>Thu '+
    goldDecimal(b.storedGold)+' gold · '+money(b.storedGems||0)+' gem</button>';
  if(b.upgradeEnds)html+=inlineTimer(b.upgradeStartedAt,b.upgradeEnds)+
    '<button class="btn primary" data-action="skip-timer" data-kind="upgrade" data-id="'+b.id+'">♦ '+
    gemSkipCost(b.upgradeEnds,Date.now())+' Skip</button>';
  else if(b.level<maxBuildingLevel(b))html+='<button class="btn good" data-action="upgrade" data-id="'+b.id+'">Upgrade · '+
    money(upgradeCost(b))+' gold</button>';
  if(!b.upgradeEnds)html+='</div><div class="actions"><button class="btn" data-action="move" data-id="'+b.id+'">Move</button>'+
    '<button class="btn" data-action="store" data-id="'+b.id+'">Store</button>'+
    (!ds.length?'<button class="btn danger" data-action="sell" data-id="'+b.id+'">Sell Habitat</button>':'')+'</div>'+
    '</div><h3>Dragons in Habitat · '+ds.length+'</h3><div class="cards">';
  else html+='</div></div><h3>Dragons in Habitat · '+ds.length+'</h3><div class="cards">';
  if(!ds.length)html+='<p>This Habitat is empty. Assign a dragon of the matching element.</p>';
  ds.forEach(function(d){
    const s=DATA.species[d.species],stats=dragonStats(d);
    html+='<button class="shop-item" data-action="dragon-detail" data-id="'+d.id+'">'+
      dragonPortrait(s.id,d.level,'small')+'<span><b>'+esc(d.nickname)+' · Lv'+d.level+'</b>'+dragonStars(d.stars)+'<small>'+esc(s.name)+
      ' · '+elementBadges(s)+rarityGem(s.rarity,s.elements[0])+(dragonBusy(d.id)?' · 💞 Breeding':'')+'</small><small>🪙 '+goldPerMinute(dragonIncomePerMinute(d,b))+
      '/min · ❤️ '+stats.hp+' · ⚔️ '+stats.attack+' · 🛡️ '+stats.defense+'</small></span></button>';
  });
  dom.body.innerHTML=html+'</div>';
  renderDragonPortraits();
}
function renderDragonDetail(id){
  const d=dragonById(id);
  if(!d){closeModal();return;}
  dom.title.textContent='🐉 Dragon details';
  dom.body.innerHTML=dragonDetailHtml(DATA.species[d.species],d)+
    '<div class="actions"><button class="btn" data-action="dragon-back">‹ Back to '+
    (ui.dragonReturn?.name==="habitat"?'Habitat':'Dragons')+'</button></div>';
  renderDragonPortraits();
}
function renderInventory(){
  const stored=state.buildings.filter(function(b){return b.stored;});
  const waiting=state.eggs.filter(function(egg){return egg.hatcheryId===null;});
  dom.title.textContent="🎒 Inventory · "+waiting.length+" eggs";
  let html='<div class="note">Eggs wait for an available Hatchery. Stored buildings keep their levels.</div>'+
    '<h3>🥚 Waiting eggs · '+waiting.length+'</h3>';
  if(!waiting.length)html+='<p>No waiting eggs. Buy one from the Shop or breed dragons.</p>';
  const room=!!freeHatchery();
  waiting.forEach(function(egg){
    html+='<div class="egg-card inventory-egg-card">'+eggShellHtml(egg,false)+
      '<div><b>Mystery Egg</b><small>Waiting for a free nest</small></div>'+
      '<button class="btn good" data-action="egg-find-home" data-id="'+egg.id+'"'+
      (room?'':' disabled')+'>'+(room?'Incubate':'Hatchery full')+'</button></div>';
  });
  html+='<h3>🏠 Stored buildings · '+stored.length+'</h3><div class="cards">';
  if(!stored.length)html+='<p>Select a building on the island and choose Store.</p>';
  stored.forEach(function(b){
    html+='<button class="shop-item" data-action="place-inventory" data-id="'+b.id+'"><span class="shop-icon">'+
      (b.type==="habitat"?DATA.elements[b.element].mark:b.type==="farm"?"🌱":b.type==="hatchery"?"🥚":isBreedingCave(b)?"💞":b.type==="arena"?"⚔️":"🚩")+
      '</span><span><b>'+buildingName(b)+'</b><small>Level '+b.level+' · '+
      reservedFootprint(b).w+'×'+reservedFootprint(b).h+' tiles · tap to place on the island</small></span></button>';
  });
  dom.body.innerHTML=html+"</div>";
}
function renderCrops(id){
  const b=buildingById(id);
  if(!b||b.type!=="farm"){closeModal();return;}
  dom.title.textContent="🌱 Plant crop · Farm level "+b.level;
  if(b.crop){
    dom.body.innerHTML='<div class="panel crop-progress"><b>'+esc(cropById(b.crop.id).name)+' is growing</b><p>'+
      inlineTimer(b.crop.startedAt,b.crop.readyAt)+'</p>'+
      (b.crop.readyAt<=Date.now()?'<button class="btn good" data-action="harvest" data-id="'+id+'">Harvest</button>':'')+'</div>';
    return;
  }
  let html='<div class="cards crop-shop-cards">';
  DATA.crops.forEach(function(c,index){
    const yieldAmount=Math.round(c.yield*(1+(b.level-1)*.2));
    const locked=index>=b.level;
    html+='<button class="shop-item" data-action="plant" data-id="'+id+'" data-crop="'+c.id+'"'+
      (locked?' disabled':'')+'>'+
      '<span class="shop-icon">🌿</span><span><b>'+c.name+'</b><small>'+duration(c.duration)+' → '+
      money(yieldAmount)+' food</small></span><strong>'+
      (locked?'Unlocks at level '+(index+1):state.gold<c.cost?'Need '+money(c.cost-state.gold)+' gold':'● '+money(c.cost))+'</strong></button>';
  });
  dom.body.innerHTML=html+'</div>';
}
function renderAssign(dragonId){
  const d=dragonById(dragonId);
  if(!d){closeModal();return;}
  if(dragonBusy(d.id)){toast("Breeding dragons cannot change Habitats.");closeModal();return;}
  const s=DATA.species[d.species];
  dom.title.textContent="Choose a Habitat for "+d.nickname;
  const homes=state.buildings.filter(function(b){return habitatHasRoom(b)&&s.elements.includes(b.element);});
  let html='<div class="cards">';
  if(!homes.length)html+='<div class="note">No matching Habitat has room. Build or upgrade one.</div>';
  homes.forEach(function(b){
    html+='<button class="shop-item" data-action="assign" data-dragon="'+dragonId+'" data-building="'+b.id+'">'+
      '<span class="shop-icon" style="color:'+DATA.elements[b.element].color+'">'+DATA.elements[b.element].mark+
      '</span><span><b>'+buildingName(b)+'</b><small>Level '+b.level+' · '+occupants(b).length+'/'+
      habitatCapacity(b.level)+' dragons</small></span></button>';
  });
  dom.body.innerHTML=html+"</div>";
}
/* UI: Hatchery hiển thị tiles ấp, eggs chờ, đồng hồ và phí ấp nhanh. */
function renderHatchery(id){
  const b=buildingById(id);
  if(!b||b.type!=="hatchery"||b.stored){closeModal();return;}
  const incubating=eggsInHatchery(id),waiting=state.eggs.filter(function(egg){return egg.hatcheryId===null;});
  dom.title.textContent="🥚 Hatchery · "+incubating.length+"/"+hatcheryCapacity(b.level);
  let html='<div class="note">Hatchery level '+b.level+' has '+hatcheryCapacity(b.level)+
    ' incubation '+(hatcheryCapacity(b.level)===1?'nest':'nests')+'. Ready eggs occupy their nests until hatched or sold. Speed up cost scales with remaining time using the current Gem timer rate.</div>';
  if(!incubating.length)html+='<p>No eggs in this Hatchery.</p>';
  incubating.forEach(function(egg){
    const ready=egg.readyAt<=Date.now();
    const fresh=ready&&!state.discovered.includes(egg.species);
    html+='<div class="egg-card hatchery-egg-card">'+eggShellHtml(egg,ready)+
      '<div><b>'+(ready?'Egg ready':'Mystery Egg')+
      (fresh?' <span class="new-badge">NEW</span>':'')+'</b><small>'+ 
      (ready?'View details and choose a Habitat':'Remaining: '+countdown(egg.readyAt))+'</small>'+ 
      inlineTimer(egg.startedAt,egg.readyAt)+'</div>'+ 
      (ready?'<button class="btn good" data-action="view-ready-egg" data-id="'+egg.id+'">View dragon</button>':
      '<button class="btn primary" data-action="speed-hatch" data-id="'+egg.id+'">♦ '+
      gemSkipCost(egg.readyAt,Date.now())+' Skip</button>')+'</div>';
  });
  html+='<h3>Stored eggs · '+waiting.length+'</h3>';
  if(incubating.length>=hatcheryCapacity(b.level))html+='<p>All nests are occupied. Hatch or sell a ready egg to free a nest.</p>';
  else if(!waiting.length)html+='<p>Buy an egg in the Shop or collect one from the Breeding Cave.</p>';
  else waiting.forEach(function(egg){
    html+='<div class="egg-card hatchery-egg-card">'+eggShellHtml(egg,false)+
      '<div><b>Mystery Egg</b><small>Waiting for a nest</small></div>'+
      '<button class="btn good" data-action="start-incubation" data-id="'+egg.id+
      '" data-building="'+b.id+'">Incubate</button></div>';
  });
  if(b.level<5){
    const required=hatcheryUpgradePlayerLevel(b.level);
    html+='<div class="actions">'+(b.upgradeEnds?inlineTimer(b.upgradeStartedAt,b.upgradeEnds):
      state.player.level<required?'<span class="pill">Upgrade Hatchery to level '+(b.level+1)+' at player level '+required+'</span>':
      '<button class="btn good" data-action="upgrade" data-id="'+b.id+'">Upgrade · '+
      money(upgradeCost(b))+' gold</button>')+'</div>';
  }
  dom.body.innerHTML=html;
}
/* UI: Chỉ khi ấp xong mới tiết lộ dragons, sau đó chọn Habitat hoặc bán eggs trùng. */
function renderReadyEgg(id){
  const egg=eggById(id);
  if(!egg||!egg.hatcheryId||egg.readyAt>Date.now()){
    toast("This egg is still incubating or no longer in the Hatchery.");openModal("inventory");return;
  }
  const s=DATA.species[egg.species],fresh=!state.discovered.includes(s.id);
  const homes=state.buildings.filter(function(b){
    return habitatHasRoom(b)&&s.elements.includes(b.element);
  });
  dom.title.textContent="🥚 Egg ready to hatch";
  let html='<div class="note ready-egg-note">'+(fresh?'<span class="new-badge">NEW</span> New dragon for your Dragon Book.':
    '✓ You have collected this species before.')+' Choose a matching Habitat to hatch.'+
    '</div>'+dragonDetailHtml(s,null)+'<h3>🏡 Place in Habitat</h3><div class="cards">';
  if(!homes.length)html+='<div class="note">No matching Habitat has room. The egg stays safely in the Hatchery until you build or upgrade one.</div>';
  homes.forEach(function(b){
    html+='<button class="shop-item" data-action="place-ready-egg" data-id="'+egg.id+
      '" data-building="'+b.id+'"><span class="shop-icon" style="color:'+DATA.elements[b.element].color+'">'+
      DATA.elements[b.element].mark+'</span><span><b>'+buildingName(b)+'</b><small>Level '+b.level+
      ' · '+occupants(b).length+'/'+habitatCapacity(b.level)+' dragons</small></span><strong>Place in ›</strong></button>';
  });
  html+='</div><div class="actions"><button class="btn" data-action="hatchery-menu" data-id="'+
    egg.hatcheryId+'">‹ Hatchery</button>';
  if(!fresh)html+='<button class="btn danger" data-action="sell-ready-egg" data-id="'+egg.id+
    '">Sell egg · 🪙 '+money(s.detail.giaBan)+'</button>';
  dom.body.innerHTML=html+'</div>';
  renderDragonPortraits();
}
function renderChooseHatchery(eggId){
  if(!eggById(eggId)){closeModal();return;}
  dom.title.textContent="Choose a Hatchery";
  const rooms=state.buildings.filter(function(b){
    return b.type==="hatchery"&&!b.stored&&eggsInHatchery(b.id).length<hatcheryCapacity(b.level);
  });
  let html='<div class="cards">';
  if(!rooms.length)html+='<div class="note">No Hatchery has an empty nest. Take or sell the current egg first.</div>';
  rooms.forEach(function(b){
    html+='<button class="shop-item" data-action="start-incubation" data-id="'+eggId+'" data-building="'+b.id+'">'+
      '<span class="shop-icon">🥚</span><span><b>Hatchery level '+b.level+'</b><small>'+
      eggsInHatchery(b.id).length+'/'+hatcheryCapacity(b.level)+' tiles occupied</small></span></button>';
  });
  dom.body.innerHTML=html+"</div>";
}
/* Preserve tiny per-species probabilities instead of rounding them to 0.00%. */
function breedingChanceLabel(chance){
  const percent=chance*100;
  if(percent===0)return '0%';
  if(percent>=1)return percent.toFixed(2)+'%';
  if(percent>=.1)return percent.toFixed(3)+'%';
  if(percent>=.01)return percent.toFixed(4)+'%';
  if(percent>=.001)return percent.toFixed(5)+'%';
  return percent.toPrecision(3)+'%';
}
/* UI: Tier totals add to 100%; individual dragon odds keep their precision. */
function renderBreeding(id){
  const cave=buildingById(id);
  if(!isBreedingCave(cave)||cave.stored){closeModal();return;}
  const premium=cave.type==='premiumCave';
  dom.title.textContent=(premium?'✧ ':'💞 ')+buildingName(cave);
  if(cave.breeding){
    const ready=cave.breeding.readyAt<=Date.now();
    const father=dragonById(cave.breeding.fatherId),mother=dragonById(cave.breeding.motherId);
    const parents=[father,mother].map(function(d,i){
      const id=d?d.species:(i?cave.breeding.motherSpecies:cave.breeding.fatherSpecies);
      const s=DATA.species[id];
      return '<div class="breed-parent">'+dragonPortrait(id,d?.level||1,'large')+
        '<b>'+esc(d?.nickname||s.name)+'</b><small>'+esc(s.name)+' · Lv'+(d?.level||1)+'</small>'+
        '<span class="element-list">'+elementBadges(s)+rarityGem(s.rarity,s.elements[0])+'</span></div>';
    }).join('<strong class="breed-heart">♥</strong>');
    dom.body.innerHTML='<div class="note">'+(premium?'Celestial Sanctuary · 20% faster · '+Math.round((window.DragonEconomy.breeding.premiumRareFactor-1)*100)+'% higher relative chance for 3+ elements. ':'')+
      'The bred egg enters an available Hatchery nest.</div>'+
      '<div class="panel '+(premium?'premium-breeding':'')+'"><div class="breed-parents">'+parents+'</div>'+
      (ready?'<div class="breed-ready-egg" aria-label="Bred egg ready"><span class="breed-egg-art">'+
        eggShellHtml({species:cave.breeding.result},true)+'</span></div>':'')+'<p>'+
      (ready?"Breeding finished. The egg is ready.":"Breeding.")+'</p>'+
      inlineTimer(cave.breeding.startedAt,cave.breeding.readyAt)+
      (ready?'<button class="btn good" data-action="collect-breeding" data-id="'+id+'">Collect bred egg</button>':
      '<button class="btn primary" data-action="skip-timer" data-kind="breed" data-id="'+id+'">♦ '+
        gemSkipCost(cave.breeding.readyAt,Date.now())+' Skip</button>')+'</div>';
    renderDragonPortraits();
    return;
  }
  const pendingEgg=state.eggs.find(function(egg){return egg.source==="breed"&&(egg.caveId===cave.id||!egg.caveId);});
  if(pendingEgg){
    dom.body.innerHTML='<div class="note">The previous bred egg is still waiting. Hatch or sell it before starting another breeding turn.</div>'+
      '<div class="actions"><button class="btn primary" data-action="'+(pendingEgg.hatcheryId?'hatchery-menu':'open-inventory')+'"'+
      (pendingEgg.hatcheryId?' data-id="'+pendingEgg.hatcheryId+'"':'')+'>'+(
        pendingEgg.hatcheryId?'Open Hatchery':'View egg in Inventory')+'</button></div>';
    return;
  }
  const available=state.dragons.filter(function(d){
    return d.level>=DATA.progression.breedLevel&&!dragonBusy(d.id);
  });
  if(available.length<2){
    dom.body.innerHTML='<div class="note">Requires two dragons at level '+DATA.progression.breedLevel+
      ' or above that are not breeding elsewhere. Feed dragons four times per level.</div>';
    return;
  }
  if(!available.some(function(d){return d.id===ui.breedDraft.father;}))ui.breedDraft.father=available[0].id;
  if(!available.some(function(d){return d.id===ui.breedDraft.mother&&d.id!==ui.breedDraft.father;}))
    ui.breedDraft.mother=available.find(function(d){return d.id!==ui.breedDraft.father;}).id;
  let html=(premium?'<div class="premium-breeding-banner"><span class="premium-seal">✧</span><div><b>Celestial Breeding Sanctuary</b>'+
    '<small>20% faster · '+window.DragonEconomy.breeding.premiumRareFactor.toFixed(2)+'× chance for dragons with 3 or more elements</small></div></div>':'')+
    '<div class="note">Choose two dragons at level 5 or above. Each parent has its own element filter and name search.</div>'+
    '<div class="breed-selection">';
  [["father","Father"],["mother","Mother"]].forEach(function(slot){
    const filter=ui['breed'+(slot[0]==='father'?'Father':'Mother')+'Elements'];
    const query=ui['breed'+(slot[0]==='father'?'Father':'Mother')+'Query'];
    html+='<section class="breed-side"><h3>'+slot[1]+'</h3>'+elementFilter('breed-'+slot[0],filter)+
      '<input class="breed-search" type="search" data-breed-search="'+slot[0]+'" value="'+esc(query)+'" placeholder="Search dragon or species" aria-label="Search '+slot[1]+'">'+
      '<div class="breed-roster">';
    const visible=available.filter(d=>matchesElementFilter(DATA.species[d.species],filter)&&
      (!query||`${d.nickname} ${DATA.species[d.species].name}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
    if(!visible.length)html+='<p class="note">No dragons match all selected elements.</p>';
    visible.forEach(function(d){
      const s=DATA.species[d.species],selected=ui.breedDraft[slot[0]]===d.id;
      const other=ui.breedDraft[slot[0]==='father'?'mother':'father']===d.id;
      html+='<button class="breed-dragon '+(selected?'selected':'')+(other?' unavailable':'')+'" data-action="breed-select"'+
        ' data-slot="'+slot[0]+'" data-id="'+d.id+'" aria-pressed="'+selected+'"'+(other?' disabled':'')+'>'+ 
        dragonPortrait(s.id,d.level,'small')+
        '<span class="breed-dragon-text"><b>'+esc(d.nickname)+' · Lv'+d.level+'</b>'+
        '<small title="'+esc(s.name)+'">'+esc(s.name)+'</small><span class="element-list">'+elementBadges(s)+rarityGem(s.rarity,s.elements[0])+'</span></span>'+
        '<span class="selection-check">'+(selected?'✓':'○')+'</span></button>';
    });
    html+='</div></section>';
  });
  html+='</div>';
  const father=dragonById(ui.breedDraft.father),mother=dragonById(ui.breedDraft.mother);
  if(father.id===mother.id)html+='<div class="note">Choose two different dragons.</div>';
  else{
    const options=breedingOptions(father,mother,cave);
    const breedTimes=options.map(option=>breedingSeconds(DATA.species[option.id],cave.level,cave,[father,mother]));
    const minBreed=Math.min(...breedTimes),maxBreed=Math.max(...breedTimes);
    const tiers=[['1 element',s=>s.elements.length===1],['2 elements',s=>s.elements.length===2],
      ['3 elements',s=>s.elements.length===3],
      ['4 elements',s=>s.elements.length===4&&s.rarity!=="transcendent"],
      ['Double Element',s=>s.rarity==="transcendent"]];
    const byTier=tiers.map(function(tier){return options.filter(function(o){return tier[1](DATA.species[o.id]);})
      .sort(function(a,b){return b.chance-a.chance;});});
    const exact=byTier.map(function(group){return group.reduce(function(sum,o){return sum+o.chance;},0)*100;});
    const hundredths=exact.map(function(n){return n*100;});
    const totals=hundredths.map(Math.floor);
    let remainder=10000-totals.reduce(function(sum,n){return sum+n;},0);
    const fractional=tiers.map(function(_,i){return i;}).sort(function(a,b){return hundredths[b]%1-hundredths[a]%1;});
    for(let i=0;i<remainder;i++)totals[fractional[i]]++;
    html+='<section class="breed-probabilities"><h3>Offspring probabilities</h3>'+
      '<p class="muted">Chance for the selected parents in this '+esc(buildingName(cave))+'. Each breed makes one roll. A tier shows the combined chance of all its possible dragons.</p>'+
      '<div class="note">Estimated breeding time for this parent combination: <b>'+duration(minBreed)+
      (maxBreed!==minBreed?' – '+duration(maxBreed):'')+'</b>, depending on the offspring tier and elements.</div>'+
      '<div class="breed-chances">'+totals.map(function(n,i){return '<div class="breed-chance '+
        (n?'':'unavailable')+'"><small>'+tiers[i][0]+'</small><b>'+(n/100).toFixed(2)+
        '%</b><span>'+byTier[i].length+' possible '+(byTier[i].length===1?'dragon':'dragons')+'</span></div>';}).join('')+'</div></section>'+
      '<div class="actions breed-start-action"><button class="btn good" data-action="start-breeding" data-id="'+id+
      '" data-father="'+father.id+'" data-mother="'+mother.id+'">Start breeding</button></div>'+
      '<div class="breed-results"><h3>Possible dragons <small>('+options.length+')</small></h3>'+
      '<p class="muted">Open a tier to see each dragon’s exact chance. Names remain hidden until they hatch.</p>';
    byTier.forEach(function(group,index){
      if(!group.length)return;
      html+='<details class="breed-tier-outcomes"><summary><span>'+tiers[index][0]+
        ' · '+group.length+' possible</span><b>'+(totals[index]/100).toFixed(2)+'%</b></summary><div class="breed-result-list">';
      group.forEach(function(option){
        const s=DATA.species[option.id],known=state.discovered.includes(s.id);
        html+='<div class="egg-card">'+eggShellHtml({species:s.id},false)+
          '<div><b>'+(known?esc(s.name):'???')+'</b><small>'+
          (known?elementBadges(s)+rarityGem(s.rarity,s.elements[0]):'Revealed when the egg hatches')+'</small></div><strong>'+
          breedingChanceLabel(option.chance)+'</strong>'+
          (known?'<button class="btn" data-action="book-detail" data-species="'+s.id+'">View</button>':'')+'</div>';
      });
      html+='</div></details>';
    });
    html+='</div>';
  }
  html+='<div class="actions"><button class="btn" data-action="open-recipes">View known breeding recipes</button></div>';
  dom.body.innerHTML=premium?'<div class="premium-breeding-screen">'+html+'</div>':html;
  renderDragonPortraits();
}
function renderRecipes(){
  dom.title.textContent="📜 Discovered recipes";
  let html='<div class="note">Recipes are recorded when bred eggs hatch. Parent order is preserved.</div>';
  if(!state.recipes.length)html+='<p>No recipes discovered yet.</p>';
  state.recipes.forEach(function(recipe){
    const parts=recipe.split("|");
    const f=DATA.species[parts[0]],m=DATA.species[parts[1]],child=DATA.species[parts[2]];
    if(f&&m&&child)html+='<div class="egg-card"><div><b>'+esc(f.name)+' → '+esc(m.name)+
      '</b><small>Ra '+esc(child.name)+'</small></div></div>';
  });
  dom.body.innerHTML=html;
}
/* UI: Ô chưa khám phá vẫn cho xem tên, elements, độ hiếm và hình dạng trong danh sách. */
function renderBook(){
  dom.title.textContent="📖 Dragon Book";
  const known=new Set(state.discovered);
  const filtered=(ui.bookTab==="triple"?TRIPLE_IDS:
    ui.bookTab==="quad"?FOUR_IDS:ui.bookTab==="double"?DOUBLE_IDS:BOOK_SPECIES_IDS).filter(function(id){
    const s=DATA.species[id];
    if(!matchesElementFilter(s,ui.bookElements))return false;
    if(ui.bookTab==="pure")return s.elements.length===1;
    if(ui.bookTab==="pair")return s.elements.length===2;
    return true;
  });
  const pages=Math.max(1,Math.ceil(filtered.length/60));
  ui.bookPage=clamp(ui.bookPage,0,pages-1);
  const knownCount=filtered.filter(function(id){return known.has(id);}).length;
  const pager='<div class="book-pager"><button class="btn" data-action="book-page" data-page="'+
    (ui.bookPage-1)+'"'+(ui.bookPage===0?' disabled':'')+'>‹ Previous</button>'+ 
    '<span class="pill">Page '+(ui.bookPage+1)+'/'+pages+' · '+filtered.length+' species</span>'+ 
    '<button class="btn" data-action="book-page" data-page="'+(ui.bookPage+1)+'"'+
    (ui.bookPage>=pages-1?' disabled':'')+'>Next ›</button></div>';
  let html='<div class="book-count">Discovered <b>'+knownCount+'/'+filtered.length+'</b> species. '+
    (ui.bookTab==="triple"?TRIPLE_IDS.length+' three-element dragons. ':
      ui.bookTab==="quad"?FOUR_IDS.length+' four-element dragons. ':
      ui.bookTab==="double"?DOUBLE_IDS.length+' Double Element dragons. ':
      'Open a discovered dragon to see its appearance and four skills. ')+
    'Undiscovered entries show basic information; hatch an egg to unlock details.</div>'+ 
    '<div class="book-toolbar"><div class="tabs">';
  [["all","All"],["pure","1 element"],["pair","2 elements"],["triple","3 elements"],
    ["quad","4 elements"],["double","Double Element"]].forEach(function(tab){
    html+='<button class="btn '+(ui.bookTab===tab[0]?"active":"")+'" data-action="book-tab" data-tab="'+tab[0]+'">'+tab[1]+'</button>';
  });
  html+='</div>'+elementFilter('book',ui.bookElements)+'</div>'+pager+'<div class="cards book-grid">';
  filtered.slice(ui.bookPage*60,(ui.bookPage+1)*60).forEach(function(id){
    const s=DATA.species[id];
    const summary='<span class="dragon-marks">'+elementBadges(s)+rarityGem(s.rarity,s.elements[0])+'</span>';
    if(!known.has(id)){
      html+='<div class="shop-item book-locked">'+
        dragonPortrait(s.id,1,'small')+'<span><b>'+esc(s.name)+'</b><small>'+summary+
        '</small><small>🔒 Unknown · details locked</small></span></div>';
      return;
    }
    html+='<button class="shop-item book-unlocked" data-action="book-detail" data-species="'+s.id+'">'+
      dragonPortrait(s.id,1,'small')+'<span><b>'+esc(s.name)+'</b><small>'+summary+
      '</small><small>✓ Discovered · tap to view</small></span></button>';
  });
  html+='</div>'+pager;
  dom.body.innerHTML=html;
  renderDragonPortraits();
}
function renderBookDetail(id){
  const s=DATA.species[id];
  if(!s||!state.discovered.includes(id)){
    toast("Hatch this dragon to unlock its Dragon Book entry.");openModal("book");return;
  }
  dom.title.textContent=s.name;
  dom.body.innerHTML='<div class="note">✓ Discovered · These are sample level 1 stats. See Owned Dragons for current stats.</div>'+ 
    dragonDetailHtml(s,null)+'<div class="actions"><button class="btn" data-action="book-back">Back to Dragon Book</button></div>';
  renderDragonPortraits();
}
function renderReveal(info){
  const s=DATA.species[info.species];
  dom.title.textContent=info.fresh?"✨ New dragon!":"🥚 Egg hatched!";
  const dragon=dragonById(info.dragonId);
  dom.body.innerHTML='<div class="note">The dragon moved into a matching Habitat.</div>'+
    dragonDetailHtml(s,dragon)+'<div class="actions"><button class="btn good" data-action="open-book">View Dragon Book</button> '+
    '<button class="btn" data-action="close-modal">Continue</button></div>';
  renderDragonPortraits();
}
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
