"use strict";

/* UI PANEL: Breeding parent selection, outcome preview and recipe history panels. */
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
  const breedingConfig=window.DragonConfig.breeding,breedLevel=window.DragonConfig.progression.breedLevel;
  const feedsPerLevel=window.DragonConfig.world.feeding.feedsPerLevel;
  if(!isBreedingCave(cave)||cave.stored){closeModal();return;}
  const premium=cave.type==='premiumCave';
  dom.title.textContent=(premium?'✧ ':'💞 ')+buildingName(cave);
  if(cave.breeding){
    const ready=cave.breeding.readyAt<=Date.now();
    const hatcheryFull=ready&&!freeHatchery();
    const father=dragonById(cave.breeding.fatherId),mother=dragonById(cave.breeding.motherId);
    const parents=[father,mother].map(function(d,i){
      const id=d?d.species:(i?cave.breeding.motherSpecies:cave.breeding.fatherSpecies);
      const s=DATA.species[id];
      return '<div class="breed-parent">'+dragonPortrait(id,d?.level||1,'large')+
        '<b>'+esc(d?.nickname||s.name)+'</b><small>'+esc(s.name)+' · Lv'+(d?.level||1)+'</small>'+
        '<span class="element-list">'+elementBadges(s)+rarityGem(s.rarity,s.elements[0])+'</span></div>';
    }).join('<strong class="breed-heart">♥</strong>');
    dom.body.innerHTML='<div class="note">'+(premium?'Celestial Sanctuary · '+Math.round((1-breedingConfig.premium.timeFactor)*100)+'% faster · '+Math.round((breedingConfig.premium.rareFactor-1)*100)+'% higher relative chance for 3+ elements. ':'')+
      (hatcheryFull?'The Hatchery is full. Free a nest to collect this result; it will stay here until then.':'The bred egg enters an available Hatchery nest.')+'</div>'+
      '<div class="panel '+(premium?'premium-breeding':'')+'"><div class="breed-parents">'+parents+'</div>'+
      (ready?'<div class="breed-ready-egg" aria-label="Bred egg ready"><span class="breed-egg-art">'+
        eggShellHtml({species:cave.breeding.result},true)+'</span></div>':'')+'<p>'+
      (ready?"Breeding finished. The egg is ready.":"Breeding.")+'</p>'+
      inlineTimer(cave.breeding.startedAt,cave.breeding.readyAt)+
      (ready?'<button class="btn good" data-action="collect-breeding" data-id="'+id+'"'+
        (hatcheryFull?' disabled title="Free a Hatchery nest before collecting"':'')+'>Collect bred egg</button>':
      '<button class="btn primary" data-action="skip-timer" data-kind="breed" data-id="'+id+'">♦ '+
        gemSkipCost(cave.breeding.readyAt,Date.now())+' Skip</button>')+'</div>';
    renderDragonPortraits();
    return;
  }
  const pendingEgg=waitingBredEggForCave(cave.id);
  if(pendingEgg){
    dom.body.innerHTML='<div class="note">The previous bred egg is still waiting. Hatch or sell it before starting another breeding turn.</div>'+
      '<div class="actions"><button class="btn primary" data-action="'+(pendingEgg.hatcheryId?'hatchery-menu':'open-inventory')+'"'+
      (pendingEgg.hatcheryId?' data-id="'+pendingEgg.hatcheryId+'"':'')+'>'+(
        pendingEgg.hatcheryId?'Open Hatchery':'View egg in Inventory')+'</button></div>';
    return;
  }
  const available=state.dragons.filter(function(d){
    return d.level>=breedLevel&&!dragonBusy(d.id);
  });
  if(available.length<2){
    dom.body.innerHTML='<div class="note">Requires two dragons at level '+breedLevel+
      ' or above that are not breeding elsewhere. Feed dragons '+feedsPerLevel+' times per level.</div>';
    return;
  }
  if(!available.some(function(d){return d.id===ui.breedDraft.father;}))ui.breedDraft.father=available[0].id;
  if(!available.some(function(d){return d.id===ui.breedDraft.mother&&d.id!==ui.breedDraft.father;}))
    ui.breedDraft.mother=available.find(function(d){return d.id!==ui.breedDraft.father;}).id;
  let html=(premium?'<div class="premium-breeding-banner"><span class="premium-seal">✧</span><div><b>Celestial Breeding Sanctuary</b>'+
    '<small>'+Math.round((1-breedingConfig.premium.timeFactor)*100)+'% faster · '+breedingConfig.premium.rareFactor.toFixed(2)+'× chance for dragons with 3 or more elements</small></div></div>':'')+
    '<div class="note">Choose two dragons at level '+breedLevel+' or above. Each parent has its own element filter and name search.</div>'+
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
