"use strict";

/* UI PANEL: Dragon Book, species detail and discovery reveal panels. */
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
  [['all','All','All tiers'],['pure','Ⅰ','1 element'],['pair','Ⅱ','2 elements'],['triple','Ⅲ','3 elements'],
    ['quad','Ⅳ','4 elements'],['double','∞','Double Element']].forEach(function(tab){
    const label=tab[0]==='all'?tab[1]:'<span class="tier-glyph" aria-hidden="true">'+tab[1]+'</span>';
    html+='<button class="btn book-tier-filter '+(ui.bookTab===tab[0]?"active":"")+'" data-action="book-tab" data-tab="'+tab[0]+'" title="'+tab[2]+'" aria-label="Filter: '+tab[2]+'">'+label+'</button>';
  });
  html+='</div><div class="book-filters">'+elementFilter('book',ui.bookElements)+'</div></div>'+pager+'<div class="cards book-grid">';
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
