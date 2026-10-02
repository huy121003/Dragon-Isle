"use strict";

/* UI PANEL: Shared element-filter HTML helpers used by dragon, breeding and book panels. */
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
