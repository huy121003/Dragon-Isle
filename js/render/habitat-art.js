"use strict";

/* RENDER: Element-specific Habitat biome and Habitat renderer. */
function paintHabitatBiome(element,theme,time,night){
  const pulse=.78+.22*Math.sin(time*.005);
  switch(element){
    case 'fire':{
      structurePlinth('#463d3c','#443846','#302e39','#e0733c');
      structurePoly([[-.42,.02],[-.25,-.06],[-.12,.03],[.03,-.08],[.27,-.025],[.43,.04],[0,.19]],
        '#665249','#cf6741',.016);
      structurePoly([[-.42,-.01],[-.37,-.32],[-.23,-.53],[-.12,-.25],[-.04,.025]],
        '#382f37','#fa8d4a',.018);
      structurePoly([[.12,-.02],[.25,-.38],[.39,-.51],[.43,-.03]],'#48343a','#f3a55f',.015);
      structureLine([[-.31,-.02],[-.17,.03],[-.09,-.01],[.06,.1],[.22,.085],[.33,.13]],
        '#ff8c3f',.035);
      structureLine([[-.1,.015],[.07,.11],[.2,.09]],'#ffd18a',.012);
      for(const [x,y] of [[-.25,-.43],[.31,-.47]]){
        structurePoly([[x-.07,y+.17],[x-.05,y+.04],[x,y-.1-pulse*.035],
          [x+.04,y+.05],[x+.065,y+.16]],'#ff763c');
        structureGlow(x,y+.02,.15,'#ff8b4277');
      }
      break;
    }
    case 'water':{
      structurePlinth('#6ac0c9','#3e8ca7','#286987','#d3f6e7');
      structureEllipse(0,.035,.42,.165,'#237ba1','#d8ffff',.025);
      structureEllipse(0,.02,.34,.105,'#64c9d5');
      for(const s of [-1,1]){
        structurePoly([[s*.32,.05],[s*.32,-.3],[s*.43,-.45],[s*.39,-.06]],
          '#3687af','#9aebeb',.014);
        structureLine([[s*.27,-.24],[s*.42,-.24],[s*.37,-.32]],'#cdfdff',.017);
        structurePoly([[s*.3,.075],[s*.31,-.07],[s*.22,-.22],[s*.25,-.02]],'#ef9d83');
        structurePoly([[s*.29,-.03],[s*.38,-.19],[s*.32,-.08]],'#f5bd96');
      }
      for(let i=0;i<3;i++){
        const x=-.15+i*.15,drift=Math.sin(time*.003+i)*.01;
        structureEllipse(x+drift,.07+i*.015,.025,.01,'#ddfdffb5');
      }
      structureLine([[-.18,.15],[0,.19],[.18,.14]],'#e8ffff',.015);
      break;
    }
    case 'earth':{
      structurePlinth('#b69c73','#796851','#5c5146','#efcf90');
      structurePoly([[-.38,.07],[-.27,-.04],[.12,-.04],[.34,.07],[.08,.16],[-.26,.13]],
        '#8d7755','#e0c48d',.015);
      structurePoly([[-.42,-.04],[-.41,-.28],[-.32,-.5],[-.21,-.48],[-.16,-.03]],
        '#706049','#e1c18d',.018);
      structurePoly([[.17,-.02],[.27,-.49],[.39,-.41],[.43,.06]],'#74634d','#d8bb86',.019);
      structurePoly([[-.43,-.28],[-.33,-.5],[-.21,-.48],[-.28,-.35]],'#bf9f70');
      structureLine([[-.37,-.25],[-.25,-.22],[-.29,-.12]],'#ddc29a',.015);
      structureLine([[.28,-.3],[.37,-.28],[.3,-.17]],'#dfc698',.015);
      for(const x of [-.26,.27])structureEllipse(x,.12,.07,.035,'#c5a46b');
      break;
    }
    case 'wind':{
      structurePlinth('#d7ecd1','#9ccbbb','#6ea6a9','#f7fff3');
      structureEllipse(-.18,.05,.28,.12,'#f6fff2');
      structureEllipse(.19,.06,.27,.125,'#edfff7');
      structurePoly([[-.12,-.03],[-.03,-.44],[.02,-.51],[.1,-.03]],'#d7ece0','#ffffff',.015);
      const turn=time*.0014;
      ctx.save();ctx.translate(0,-.45);ctx.rotate(turn);
      for(let i=0;i<4;i++){
        ctx.rotate(Math.PI/2);
        structurePoly([[0,0],[.045,-.04],[.12,-.22],[-.015,-.17]],'#f5fff1','#a4d6cd',.013);
      }
      structureEllipse(0,0,.035,.035,'#e7d49a');ctx.restore();
      for(let i=0;i<2;i++){
        const y=-.17+i*.17;
        ctx.beginPath();ctx.moveTo(-.39,y);
        ctx.bezierCurveTo(-.18,y-.09,.08,y+.08,.35,y-.07);
        ctx.strokeStyle='#ffffffd9';ctx.lineWidth=.024;ctx.stroke();
      }
      break;
    }
    case 'ice':{
      structurePlinth('#a7e6f1','#679ebf','#4278a7','#f2ffff');
      structurePoly([[-.42,.03],[-.17,-.1],[.1,-.11],[.4,.035],[0,.17]],'#a9d9ed','#f7ffff',.018);
      structurePoly([[-.39,-.05],[-.34,-.42],[-.2,-.63],[-.11,-.31],[-.16,-.03]],
        '#71bee0','#f9ffff',.018);
      structurePoly([[-.06,-.06],[.05,-.52],[.14,-.69],[.24,-.3],[.18,-.05]],
        '#bdeefa','#ffffff',.02);
      structurePoly([[.24,-.01],[.32,-.36],[.43,-.44],[.43,.04]],'#7bb9d6','#eaffff',.015);
      for(const x of [-.3,-.06,.22])structureLine([[x,-.15],[x+.05,-.34]],'#ffffffc9',.014);
      for(const x of [-.3,0,.29])structurePoly([[x,.18],[x+.045,.19],[x+.01,.31]],'#d8f8ff');
      break;
    }
    case 'thunder':{
      structurePlinth('#796699','#514d86','#393964','#edceff');
      structureEllipse(0,.045,.38,.145,'#4d4d82','#ad8ed0',.019);
      for(const s of [-1,1]){
        structurePoly([[s*.28,.03],[s*.27,-.28],[s*.35,-.42],[s*.4,.045]],
          '#494d70','#d4b8e8',.014);
        structureEllipse(s*.34,-.43,.05,.052,'#ffe982','#fff7ca',.01);
      }
      structureEllipse(-.16,-.48,.18,.09,'#62617f');
      structureEllipse(.08,-.5,.21,.11,'#73718e');
      structureEllipse(.25,-.46,.12,.075,'#656584');
      structurePoly([[-.03,-.39],[.05,-.39],[-.025,-.18],[.08,-.2],[-.12,.04],[-.055,-.22]],
        '#ffe879','#fffbd0',.014);
      structureGlow(0,-.18,.26,'#eee77b77');
      break;
    }
    case 'nature':{
      structurePlinth('#85bd71','#54855a','#366957','#c7e89a');
      structureEllipse(0,.08,.39,.15,'#66a365','#acd587',.016);
      structurePoly([[-.29,.03],[-.34,-.28],[-.28,-.48],[-.19,-.47],[-.2,.005]],'#704e3a');
      structurePoly([[.19,.01],[.17,-.3],[.25,-.41],[.31,-.32],[.28,.03]],'#71533d');
      structureEllipse(-.25,-.48,.22,.16,'#3d8f55','#b9e689',.013);
      structureEllipse(.22,-.43,.23,.18,'#5da65a','#d5ed9d',.013);
      structureEllipse(0,-.56,.19,.12,'#76b95e');
      structureLine([[-.24,-.01],[-.14,.09],[0,.11],[.2,.03]],'#916d49',.025);
      for(const [x,y] of [[-.36,.04],[.35,.03],[.19,-.14]]){
        structureEllipse(x,y,.034,.037,'#e9b5bc');
        structureEllipse(x,y,.013,.015,'#ffe897');
      }
      break;
    }
    case 'dark':{
      structurePlinth('#655772','#493c61','#312d4d','#a58bc8');
      structureEllipse(0,.06,.38,.135,'#352e52','#716095',.017);
      for(const s of [-1,1]){
        structurePoly([[s*.24,.035],[s*.23,-.37],[s*.33,-.49],[s*.39,.045]],
          '#41364e','#a994b0',.015);
        structurePoly([[s*.24,-.37],[s*.33,-.49],[s*.39,-.36]],'#856e93');
      }
      ctx.beginPath();ctx.arc(0,-.46,.16,0,Math.PI*2);
      ctx.fillStyle='#d5b6e8';ctx.fill();
      ctx.beginPath();ctx.arc(.075,-.51,.15,0,Math.PI*2);
      ctx.fillStyle='#5b506e';ctx.fill();
      structureGlow(0,-.42,.29,'#bca4e344');
      for(const x of [-.28,.1])structureEllipse(x,.12,.12,.023,'#c8b3d74d');
      break;
    }
    case 'light':{
      structurePlinth('#ffefbe','#c8ac79','#a88b60','#fffbe4');
      structurePoly([[-.39,.09],[-.25,-.08],[.25,-.08],[.39,.09],[0,.22]],
        '#f2dfaa','#fff9df',.018);
      for(const s of [-1,1]){
        structurePoly([[s*.28,.03],[s*.26,-.37],[s*.35,-.37],[s*.39,.03]],
          '#f9edcb','#c8a966',.013);
        structurePoly([[s*.24,-.36],[s*.4,-.36],[s*.39,-.42],[s*.25,-.42]],'#fff9e6');
      }
      structureEllipse(0,-.43,.13,.13,'#ffec9e','#ffffff',.02);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        structureLine([[Math.cos(a)*.18,Math.sin(a)*.18-.43],
          [Math.cos(a)*.27,Math.sin(a)*.27-.43]],'#fff3be',.018);
      }
      structureGlow(0,-.43,.36,'#fff2ae88');
      structureLine([[-.32,.13],[0,.22],[.32,.13]],'#fff9df',.015);
      break;
    }
    case 'war':{
      // Roman legion helmet-shaped shelter: brow, nose guard, cheek plates and horsehair crest.
      structurePlinth('#a77955','#76513f','#563b35','#e4b477');
      structurePoly([[-.38,.04],[-.35,-.24],[-.27,-.43],[-.13,-.53],[.12,-.53],[.28,-.41],[.36,-.19],[.34,.04]],
        '#9a5945','#edbc7c',.02);
      structurePoly([[-.27,-.23],[-.2,-.4],[-.08,-.47],[.1,-.47],[.23,-.36],[.28,-.2],[.18,-.12],[-.18,-.12]],
        '#c77a50','#f4d19a',.016);
      structurePoly([[-.31,-.16],[.31,-.16],[.36,-.07],[-.36,-.07]],'#e1ad70','#ffe0a9',.018);
      structurePoly([[-.035,-.14],[.035,-.14],[.02,.02],[-.02,.02]],'#f4d5a3');
      structureLine([[-.22,-.1],[-.28,.015],[-.34,.025]],'#f6d59a',.02);
      structureLine([[.22,-.1],[.28,.015],[.34,.025]],'#f6d59a',.02);
      // The waving crest is animated below; its fixed base reads clearly as a Roman galea.
      structurePoly([[-.12,-.49],[-.2,-.64],[-.12,-.75],[-.04,-.66],[.08,-.73],[.18,-.59],[.12,-.47]],
        '#a8423d','#f0c17c',.016);
      structureGlow(0,-.23,.24,'#f5944544');break;
    }
    case 'pure':{
      // Three petal towers meet around a small central light, matching the Pure triskelion.
      structurePlinth('#b18fbd','#7c608f','#594669','#f8e6f5');
      structureEllipse(0,.07,.4,.14,'#af88b5','#f6dff1',.02);
      for(let i=0;i<3;i++){
        const a=-Math.PI/2+i*Math.PI*2/3,x=Math.cos(a)*.22,y=-.27+Math.sin(a)*.17;
        ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);
        structurePoly([[-.105,.14],[-.11,-.05],[0,-.29],[.11,-.05],[.105,.14]],
          '#eed8ef','#fff8ff',.016);
        structureLine([[-.05,.08],[0,-.19],[.05,.08]],'#bf91c7',.012);
        ctx.restore();structureGlow(x,y-.07,.15,'#fbdcff55');
      }
      structureEllipse(0,-.27,.075,.075,'#fff8ff','#d5b2dc',.014);
      structureGlow(0,-.25,.3,'#fbd4ff44');break;
    }
    case 'legend':{
      // Paired loop arches echo the Legend flag's interlocking, mirrored strokes.
      structurePlinth('#68518c','#433867','#302846','#c8b2eb');
      structureEllipse(0,.07,.4,.14,'#4d3c70','#c5a8ee',.02);
      for(const s of [-1,1]){
        structurePoly([[s*.34,.06],[s*.32,-.38],[s*.23,-.52],[s*.14,-.39],[s*.15,.02]],
          '#7960a7','#decaff',.018);
        structurePoly([[s*.15,.02],[s*.14,-.2],[s*.06,-.31],[0,-.25],[s*.07,-.1],[s*.08,.05]],
          '#b29ad9','#f1dcff',.014);
      }
      ctx.beginPath();ctx.moveTo(-.2,-.23);
      ctx.bezierCurveTo(-.36,-.51,-.08,-.59,0,-.28);
      ctx.bezierCurveTo(.08,-.59,.36,-.51,.2,-.23);
      ctx.strokeStyle='#f1dcff';ctx.lineWidth=.04;ctx.stroke();
      break;
    }
    case 'primal':{
      // Primitive rock shelter with three deep claw grooves spiralling around a core.
      structurePlinth('#777458','#595944','#424339','#d6d1aa');
      structurePoly([[-.42,.1],[-.38,-.25],[-.3,-.48],[-.16,-.53],[0,-.43],[.16,-.53],[.3,-.48],[.39,-.22],[.42,.1]],
        '#66664e','#dfd6a7',.022);
      structurePoly([[-.3,-.27],[-.24,-.45],[-.12,-.51],[0,-.42],[.12,-.51],[.24,-.45],[.3,-.27],[.22,-.09],[-.22,-.09]],
        '#403f39','#c8be91',.016);
      structureEllipse(0,-.31,.12,.12,'#d3c996','#6c654a',.02);
      for(let i=0;i<3;i++){
        const a=-Math.PI/2+i*Math.PI*2/3;
        const x=Math.cos(a)*.15,y=-.31+Math.sin(a)*.15;
        structureLine([[x-.045,y-.1],[x-.02,y-.035],[x+.04,y+.005],[x+.075,y+.085]],'#eee4b8',.027);
        structureLine([[x-.02,y-.065],[x+.015,y-.015],[x+.055,y+.035]],'#a19870',.012);
      }
      break;
    }
    case 'time':{
      // Ancient observatory with orbiting ring and a visible hourglass inside its arch.
      structurePlinth('#89808a','#635b6e','#484453','#f0dfc8');
      structurePoly([[-.36,.07],[-.36,-.37],[-.24,-.47],[.24,-.47],[.36,-.37],[.36,.07]],
        '#746b78','#ead7bb',.018);
      structurePoly([[-.25,-.37],[-.18,-.58],[0,-.71],[.18,-.58],[.25,-.37],[.15,-.31],[0,-.5],[-.15,-.31]],
        '#b5a29e','#f5e8cb',.018);
      structureEllipse(0,-.28,.21,.21,'#504b5c','#e8d5b4',.025);
      structureEllipse(0,-.28,.15,.15,'#b5a29e','#f8e9c8',.014);
      structureLine([[-.09,-.37],[.09,-.37],[0,-.29],[-.09,-.2],[.09,-.2]],'#514b5c',.022);
      ctx.beginPath();ctx.ellipse(0,-.28,.31,.1,-.48,0,Math.PI*2);
      ctx.strokeStyle='#f5e0b9';ctx.lineWidth=.026;ctx.stroke();
      structureGlow(0,-.28,.3,'#e8d5b544');break;
    }
    case 'metal':{
      structurePlinth('#9baeb1','#627884','#455a68','#e0ece9');
      structureEllipse(0,.045,.39,.15,'#536c78','#c8d8d4',.027);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        structureLine([[Math.cos(a)*.28,Math.sin(a)*.095+.045],
          [Math.cos(a)*.38,Math.sin(a)*.13+.045]],'#dce6dd',.029);
      }
      structureEllipse(0,.045,.12,.052,'#c4d0cb','#405767',.025);
      for(const s of [-1,1]){
        structurePoly([[s*.29,.025],[s*.28,-.44],[s*.39,-.44],[s*.4,.025]],
          '#5c7580','#dae3dd',.014);
        structurePoly([[s*.26,-.43],[s*.41,-.43],[s*.38,-.53],[s*.29,-.53]],'#96afb2');
        structureGlow(s*.32,-.28,.11,'#ffb97876');
      }
      structureLine([[-.25,-.02],[.25,-.02]],'#f4d19b',.022);
      break;
    }
  }
  paintHabitatMotion(element,time);
}

/** Per-element accents animate inside the habitat silhouette and never affect its footprint. */
function paintHabitatMotion(element,time){
  const wave=Math.sin(time*.003);
  switch(element){
    case 'fire':
      for(const [x,y] of [[-.25,-.43],[.31,-.47]])
        structurePoly([[x-.035,y+.055],[x-.04,y-.005],[x,y-.045-Math.max(0,wave)*.035],[x+.04,y-.005],[x+.035,y+.055]],'#ffc45c');
      break;
    case 'water':
      structureLine([[-.2,.16],[0,.18+wave*.016],[.2,.15]],'#efffff',.013);break;
    case 'earth':
      structureEllipse(-.26,.12+wave*.012,.045,.023,'#e1c48b');break;
    case 'wind': /* The four-blade windmill above already spins. */ break;
    case 'ice':
      for(const [i,x] of [[0,-.3],[1,.22]]){const a=time*.002+i*Math.PI,y=-.35-i*.08;
        structureLine([[x+Math.cos(a)*.035,y+Math.sin(a)*.035],[x-Math.cos(a)*.035,y-Math.sin(a)*.035]],'#fff',.014);}
      break;
    case 'thunder':
      if(Math.sin(time*.016)>0.7)structureGlow(.02,-.28,.18,'#fff58caa');break;
    case 'nature':
      structurePoly([[-.29,-.43],[-.34+wave*.025,-.5],[-.24,-.47]],'#bce886');break;
    case 'dark':
      structureEllipse(.29+wave*.035,-.37,.017,.017,'#dfc8f6');break;
    case 'light':
      ctx.save();ctx.translate(0,-.43);ctx.rotate(time*.0005);structureLine([[0,-.17],[0,-.25]],'#fff9d9',.018);ctx.restore();break;
    case 'metal':
      ctx.save();ctx.translate(0,.045);ctx.rotate(time*.0007);
      structureEllipse(0,0,.09,.04,'#d9e7e1','#506875',.012);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;structureLine([[Math.cos(a)*.09,Math.sin(a)*.04],[Math.cos(a)*.12,Math.sin(a)*.055]],'#e6eee6',.012);}
      ctx.restore();break;
    case 'war':
      structureLine([[-.09,-.65],[-.025+wave*.025,-.72],[.09+wave*.04,-.68]],'#ffe0a0',.024);break;
    case 'pure':
      ctx.save();ctx.translate(0,-.27);ctx.rotate(time*.0007);structureEllipse(0,-.075,.022,.06,'#fffaff','#eac2e7',.008);ctx.restore();break;
    case 'legend':
      ctx.save();ctx.translate(0,-.27);ctx.rotate(time*.0005);structureEllipse(-.09,0,.105,.045,'#c8a9f0','#f2e4ff',.012);ctx.restore();break;
    case 'primal':
      structureLine([[-.2,-.31],[0,-.26+wave*.015],[.2,-.31]],'#fff0c0',.016);break;
    case 'time':
      ctx.save();ctx.translate(0,-.28);ctx.rotate(time*.00085);structureLine([[0,-.11],[0,.045],[.06,.02]],'#fff2d8',.016);ctx.restore();break;
  }
}

function paintHabitat(b,time,night){
  const theme=DATA.habitatThemes[b.element]||DATA.habitatThemes.fire;
  const e=b.element;
  paintHabitatBiome(e,theme,time,night);
  const dragons=occupants(b),n=dragons.length,f=buildingFootprint(b);
  const walkers=dragons.map((d,i)=>{
    const phase=time*.0007+d.id*2.17;
    const lane=(i-(n-1)/2)*Math.min(.32,.65/Math.max(1,n-1));
    const motion=DATA.dragonForms[DATA.species[d.species].elements[0]].motion;
    const travel=n>2?.04:motion==='hover'||motion==='swim'?.05:.08;
    const walk=Math.sin(phase)*travel;
    const shift=lane+walk;
    const c=b.x+f.w/2+shift*f.w,
      r=b.y+f.h/2-shift*f.h+Math.sin(phase*.71)*.08;
    return {dragon:d,c,r,phase};
  }).sort((a,b)=>a.c+a.r-b.c-b.r);
  walkers.forEach(({dragon:d,c,r,phase})=>{
    const point=gridToScreen(c,r),center=buildingCenter(b);
    ctx.save();ctx.scale(1/structureUnitX,1/structureUnitY);
    drawDragon(ctx,{dragon:d,x:point.x-center.x,y:point.y-center.y-.035*structureUnitY,
      time,facing:Math.cos(phase)<0?-1:1,stepPhase:dragonTravelPhase(phase),
      scale:n>2?.86:n===2?1.08:1.35});ctx.restore();
  });
  if(!n)structureElementBadge(e,0,.11,.31);
  if(b.storedGold>=1)structureEllipse(.38,-.19,.085,.085,'#ffe298','#a86733',.015);
  if(b.storedGems>=1)structurePoly([[-.48,-.19],[-.39,-.28],[-.3,-.19],[-.39,-.1]],'#a6edff','#5c9dc0',.012);
  if(b.level>=3)for(const x of [-.35,.35])structureLantern(x,.08,theme.accent,time,night);
}
