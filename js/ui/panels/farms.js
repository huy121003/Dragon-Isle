"use strict";

/* UI PANEL: Farm crop selection and harvest presentation. */
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
    html+='<button class="shop-item resource-offer" data-action="plant" data-id="'+id+'" data-crop="'+c.id+'"'+
      (locked?' disabled':'')+'>'+
      '<span class="shop-icon">🌿</span><span><b>'+c.name+'</b><small>'+duration(c.duration)+' → '+
      resourceAmount('food',yieldAmount)+'</small></span><strong>'+
      (locked?'Unlocks at level '+(index+1):state.gold<c.cost?'Need '+resourceAmount('gold',c.cost-state.gold):resourceAmount('gold',c.cost))+'</strong></button>';
  });
  dom.body.innerHTML=html+'</div>';
}
