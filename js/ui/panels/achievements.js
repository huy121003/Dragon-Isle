"use strict";

function renderAchievements(){
  dom.title.textContent="🏆 Thành tựu Apex";
  const completed=ensureAchievementState().apexEggs;
  const discovered=new Set(state.discovered||[]);
  const rows=Object.keys(DATA.elements).map(function(element){
    const dragons=DRAGON_DB.species.filter(species=>species.doHiem==="transcendent"&&
      species.elements[0]===element);
    const count=dragons.filter(species=>discovered.has(species.id)).length;
    const apex=DRAGON_DB.species.find(species=>species.doHiem==="apex"&&species.apexPrimary===element);
    const done=!!completed[element];
    return '<article class="achievement-card '+(done?'complete':'')+'"><span class="achievement-element">'+
      elementFlag(element,false,'sm')+'</span><div class="achievement-copy"><b>'+esc(DATA.elements[element].name)+
      ' Double Collection</b><small>'+count+'/'+dragons.length+' Double dragons discovered · Reward: '+
      esc(apex?.tenTrung||'Apex Egg')+'</small></div><span class="achievement-reward">'+
      (done?'✓ Egg received':'🔒 '+count+'/'+dragons.length)+'</span></article>';
  });
  dom.body.innerHTML='<p class="note">Khám phá đủ 3 rồng Double có cùng hệ chủ đạo để nhận một trứng Apex tương ứng. Thành tựu đã hoàn tất sẽ được lưu vĩnh viễn.</p>'+
    '<div class="achievement-list">'+rows.join('')+'</div>';
}
