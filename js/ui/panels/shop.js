"use strict";

/* UI PANEL: Shop and egg-product detail presentation. */
function renderShop(){
  dom.title.textContent="🏪 Shop";
  const isAdmin=currentAccount?.role==="admin";
  // The Data tab contains account data and must not be exposed to regular players.
  if(!isAdmin&&ui.shopTab==="save")ui.shopTab="special";
  const economy=window.DragonConfig.economy,progression=window.DragonConfig.progression;
  const buildings=window.DragonConfig.buildings,breeding=window.DragonConfig.breeding;
  let html='<div class="tabs">'+
    [['special','Special buildings'],['habitats','Habitats'],['decorations','Decorations'],
      ['eggs','Eggs'],['supplies','Resources'],['save','💾 Data']]
      .filter(([id])=>id!=="save"||isAdmin)
      .map(function([id,label]){return '<button class="btn '+(ui.shopTab===id?'active':'')+
        '" data-action="shop-tab" data-tab="'+id+'">'+label+'</button>';}).join('')+'</div>';
  if(ui.shopTab==="habitats"){
    html+='<div class="cards">';
    Object.keys(DATA.elements).forEach(function(element){
      const e=DATA.elements[element];
      const need=contentRequirementLevel(ELEMENT_UNLOCK[element]||99),locked=state.player.level<need;
      html+='<button class="shop-item resource-offer" data-action="choose-build" data-type="habitat" data-element="'+element+'"'+(locked?' disabled':'')+'>'+
        '<span class="shop-icon" style="color:'+e.color+'">'+elementFlag(element,false,'lg')+'</span><span><b>Habitat '+e.name+
        '</b><small>Houses '+e.name+' · '+(locked?'Unlocks at level '+need:'6×6 tiles · up to level '+buildings.definitions.habitat.maxLevel)+
        ' · Purchased '+(state.habitatPurchases[element]||0)+'×</small></span><strong>'+resourceAmount('gold',habitatPurchaseCost(element))+'</strong></button>';
    });
    html+='</div>';
  }else if(ui.shopTab==="special"){
    html+='<div class="note">Chọn công trình để đặt trên đảo. Vàng hoặc gem chỉ bị trừ khi đặt thành công; có thể quay lại Shop trước khi đặt.</div><div class="cards special-shop-cards">';
    const farms=farmCount(),limit=farmLimit(state.player.level);
    html+='<button class="shop-item resource-offer" data-action="choose-build" data-type="farm"'+(farms>=limit?' disabled':'')+'><span class="shop-icon">🌱</span>'+
      '<span><b>Farm · '+farms+'/'+limit+'</b><small>More farms every '+progression.farms.everyLevels+' levels · 9×6</small></span><strong>'+resourceAmount('gold',buildings.definitions.farm.cost)+'</strong></button>'+
      '<button class="shop-item resource-offer" data-action="choose-build" data-type="cave"'+(state.buildings.some(b=>b.type==="cave")?' disabled':'')+'><span class="shop-icon">💞</span>'+
      '<span><b>Breeding Cave</b><small>One cave · 12×9 tiles</small></span><strong>'+resourceAmount('gold',buildings.definitions.cave.cost)+'</strong></button>'+
      '<button class="shop-item resource-offer premium-cave-offer" data-action="choose-build" data-type="premiumCave"'+
      (state.buildings.some(b=>b.type==="premiumCave")?' disabled':'')+'><span class="shop-icon">✧</span>'+
      '<span><b>'+esc(DATA.buildings.premiumCave.name)+'</b><small>'+Math.round((1-breeding.premium.timeFactor)*100)+'% faster · +'+Math.round((breeding.premium.rareFactor-1)*100)+'% chance for rare results</small></span>'+
      '<strong>'+resourceAmount('gems',buildings.definitions.premiumCave.cost)+'</strong></button>'+
      '<button class="shop-item resource-offer" data-action="choose-build" data-type="academy"'+(state.buildings.some(b=>b.type==="academy")?' disabled':'')+'><span class="shop-icon">✦</span><span><b>Dragon Academy</b><small>Raise dragon level cap · '+buildings.definitions.academy.maxLevel+' upgrades</small></span><strong>'+resourceAmount('gold',buildings.definitions.academy.cost)+'</strong></button>'+
      '<button class="shop-item resource-offer" data-action="choose-build" data-type="arena"'+(state.buildings.some(b=>b.type==="arena")?' disabled':'')+'><span class="shop-icon">⚔️</span><span><b>Arena</b><small>3 vs 3 dragon battles · 12×12</small></span><strong>'+resourceAmount('gold',buildings.definitions.arena.cost)+'</strong></button>'+
      '';
    html+='</div>';
  }else if(ui.shopTab==="decorations"){
    html+='<div class="cards"><button class="shop-item resource-offer" data-action="choose-build" data-type="decor">'+
      '<span class="shop-icon">🚩</span><span><b>Flagpole</b><small>Island decoration · 3×3 tiles</small></span>'+
      '<strong>'+resourceAmount('gold',buildings.definitions.decor.cost)+'</strong></button></div>';
  }else if(ui.shopTab==="eggs"){
    html+='<div class="note">'+(isAdmin?'Admin shop: all dragon eggs are available. Prices depend on rarity and unlock level.':'The shop sells pure element eggs. Prices depend on rarity and unlock level.')+' Purchased eggs enter an available Hatchery nest.</div>'+ 
      '<div class="cards">';
    DRAGON_DB.species.map(function(raw){return DATA.species[raw.id];}).filter(function(s){
      return (isAdmin||s.elements.length===1)&&s.detail.giaTrung;
    }).forEach(function(s){
      const price=shopEggPrice(s),cost=price.vang?price.vang:price.gem;
      const need=contentRequirementLevel(ELEMENT_UNLOCK[s.elements[0]]||99);
      const canBuy=state.player.level>=need&&(price.vang?state.gold>=cost:state.gems>=cost);
      html+='<div class="shop-item egg-shop-card"><span class="egg-plinth" aria-hidden="true">'+
        eggShellHtml(s.id,false)+'</span><div class="egg-offer"><b>'+esc(s.name)+'</b>'+ 
        '<span class="shop-element dragon-marks">'+elementBadges(s)+rarityGem(s.rarity,s.elements[0])+'</span><small>Incubation: '+duration(hatchingSeconds(s))+
        (state.player.level<need?' · Unlocks at level '+need:'')+'</small></div>'+ 
        '<span class="shop-dragon" aria-label="Dragon portrait: '+esc(s.name)+'">'+dragonPortrait(s.id,1,'small')+'</span>'+ 
        '<div class="actions"><button class="btn" data-action="shop-egg-detail" data-species="'+s.id+'">Details</button>'+ 
        '<button class="btn resource-action" data-action="buy-egg" data-species="'+s.id+'"'+
        (canBuy?'':' disabled')+'>Buy '+
        (price.vang?resourceAmount('gold',price.vang):resourceAmount('gems',price.gem))+'</button></div></div>';
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
      '<div class="panel reset-panel"><h3>Start over</h3><p>Reset progress to '+resourceAmount('gold',economy.starting.gold)+resourceAmount('food',economy.starting.food)+resourceAmount('gems',economy.starting.gems)+', a Fire Habitat, a Fire Dragon, and a level 1 Hatchery.</p>'+
      '<button class="btn danger" data-action="factory-reset">Reset game</button></div>'+
      '<details class="panel"><summary>Testing &amp; debug</summary><div class="actions"><button class="btn" data-action="topup-test">Grant test resources</button>'+
      '<button class="btn" data-action="toggle-iso-debug" aria-pressed="'+ui.debugIso+'">'+
      (ui.debugIso?'✓ Isometric debug: on':'◇ Isometric debug: off')+'</button></div>'+
      '<p>Sets a minimum of '+resourceAmount('gold',economy.testResources.gold)+resourceAmount('food',economy.testResources.food)+resourceAmount('gems',economy.testResources.gems)+'.</p></details>';
  }else{
    const price=progression.foodGoldPrice,packs=economy.shop.resourcePacks;
    html+='<div class="note">Resource exchange · rates are intentionally asymmetric so Gold ↔ Gem cannot be looped for profit.</div>'+
      '<h3>🪙 Gold with Gems</h3><div class="cards food-shop-cards">';
    packs.goldForGems.forEach(function(pack,index){
      html+='<button class="shop-item resource-offer food-offer" data-action="buy-resource-pack" data-kind="goldForGems" data-index="'+index+'"'+
        (state.gems<pack.cost?' disabled':'')+'><span class="shop-icon">🪙</span><span class="food-offer-copy"><b>'+resourceAmount('gold',pack.amount)+'</b>'+
        '<small>'+(state.gems<pack.cost?'Need '+resourceAmount('gems',pack.cost-state.gems)+' more':'Instant exchange')+'</small></span>'+
        '<strong>'+resourceAmount('gems',pack.cost)+'</strong></button>';
    });
    html+='</div><h3>💎 Gems with Gold</h3><div class="cards food-shop-cards">';
    packs.gemsForGold.forEach(function(pack,index){
      html+='<button class="shop-item resource-offer food-offer" data-action="buy-resource-pack" data-kind="gemsForGold" data-index="'+index+'"'+
        (state.gold<pack.cost?' disabled':'')+'><span class="shop-icon">💎</span><span class="food-offer-copy"><b>'+resourceAmount('gems',pack.amount)+'</b>'+
        '<small>'+(state.gold<pack.cost?'Need '+resourceAmount('gold',pack.cost-state.gold)+' more':'Instant exchange')+'</small></span>'+
        '<strong>'+resourceAmount('gold',pack.cost)+'</strong></button>';
    });
    html+='</div><h3>🍎 Food</h3><div class="cards food-shop-cards">';
    packs.foodForGems.forEach(function(pack,index){
      html+='<button class="shop-item resource-offer food-offer" data-action="buy-resource-pack" data-kind="foodForGems" data-index="'+index+'"'+
        (state.gems<pack.cost?' disabled':'')+'><span class="shop-icon">🍎</span><span class="food-offer-copy"><b>'+resourceAmount('food',pack.amount)+'</b>'+
        '<small>'+(state.gems<pack.cost?'Need '+resourceAmount('gems',pack.cost-state.gems)+' more':'Premium food pack')+'</small></span>'+
        '<strong>'+resourceAmount('gems',pack.cost)+'</strong></button>';
    });
    economy.shop.standardFoodAmounts.forEach(function(count,index){
      const icon=['🍎','🥕','🌾'][index]||'🍲';
      const cost=count*price,missing=Math.max(0,cost-state.gold);
      html+='<button class="shop-item resource-offer food-offer" data-action="buy-food" data-count="'+count+'"'+(missing?' disabled':'')+'>'+
        '<span class="shop-icon">'+icon+'</span><span class="food-offer-copy"><b>'+resourceAmount('food',count)+'</b>'+
        '<small>'+(missing?'Need '+resourceAmount('gold',missing)+' more':'Standard food purchase')+'</small></span>'+
        '<strong>'+resourceAmount('gold',cost)+'</strong></button>';
    });
    html+='</div>';
  }
  dom.body.innerHTML=html;
  if(ui.shopTab==="eggs")renderDragonPortraits();
}
/* UI: Egg detail availability follows the signed-in account role. */

function renderShopEggDetail(id){
  const s=DATA.species[id];
  if(!s||(!currentAccount||currentAccount.role!=="admin")&&s.elements.length!==1||!s.detail.giaTrung){openModal("shop");return;}
  const price=shopEggPrice(s),cost=price.vang?price.vang:price.gem;
  const canBuy=state.player.level>=contentRequirementLevel(ELEMENT_UNLOCK[s.elements[0]]||99)&&
    (price.vang?state.gold>=cost:state.gems>=cost);
  dom.title.textContent="🥚 Eggs "+s.name;
  dom.body.innerHTML='<div class="note">Pure element egg · incubates in '+
    duration(hatchingSeconds(s))+'</div>'+dragonDetailHtml(s,null)+
    '<div class="actions"><button class="btn" data-action="shop-egg-back">‹ Shop</button>'+ 
    '<button class="btn resource-action" data-action="buy-egg" data-species="'+s.id+'"'+
    (canBuy?'':' disabled')+'>Buy '+
    (price.vang?resourceAmount('gold',price.vang):resourceAmount('gems',price.gem))+'</button></div>';
  renderDragonPortraits();
}
