"use strict";

/* RENDER: Element-specific Habitat biome and Habitat renderer. */
function paintHabitatBiome(element,theme,time,night){
  const pulse=.78+.22*Math.sin(time*.005);
  // The five newer structures were reading smaller and more detached than the
  // original habitats. Bring them closer to the fire habitat's visual weight
  // and settle them onto the rear half of their platforms.
  const emphasize=['war','pure','legend','primal','time'].includes(element);
  if(emphasize){ctx.save();ctx.translate(0,.1);ctx.scale(1.65,.8);}
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
      // A small sculpted Roman galea makes this read as a War habitat, not a floating flag.
      structurePlinth('#a77955','#76513f','#563b35','#e4b477');
      structurePoly([[-.2,-.31],[0,-.25],[.2,-.31],[0,-.37]],'#c98d61','#efd09a',.012);
      structurePoly([[-.25,-.38],[-.22,-.5],[-.15,-.59],[-.06,-.63],[.08,-.63],[.18,-.57],[.24,-.46],[.24,-.38]],
        '#9a5945','#edbc7c',.018);
      structurePoly([[-.18,-.45],[-.13,-.54],[-.05,-.57],[.07,-.57],[.15,-.52],[.19,-.44],[.12,-.41],[-.13,-.41]],
        '#47393a','#e8bc7a',.012);
      structurePoly([[-.25,-.41],[.25,-.41],[.28,-.36],[-.28,-.36]],'#e1ad70','#ffe0a9',.014);
      structurePoly([[-.04,-.4],[.04,-.4],[.02,-.31],[-.02,-.31]],'#f4d5a3');
      structurePoly([[-.09,-.62],[-.13,-.72],[-.07,-.75],[0,-.68],[.07,-.74],[.13,-.64],[.08,-.61]],
        '#b95246','#f0c17c',.014);
      structureGlow(0,-.5,.14,'#f5944533');break;
    }
    case 'pure':{
      // Small open shrine with three petal arches around a light; the lower tile stays clear.
      structurePlinth('#b18fbd','#7c608f','#594669','#f8e6f5');
      structurePoly([[-.23,-.32],[0,-.25],[.23,-.32],[0,-.39]],'#bb96c3','#f8e6f5',.012);
      for(const x of [-.17,.17])structurePoly([[x-.025,-.36],[x-.02,-.54],[x,-.57],[x+.02,-.54],[x+.025,-.36]],'#e4cce9','#fff8ff',.01);
      structurePoly([[-.23,-.53],[-.18,-.59],[-.08,-.56],[0,-.67],[.08,-.56],[.18,-.59],[.23,-.53],[.19,-.49],[.08,-.53],[0,-.61],[-.08,-.53],[-.19,-.49]],
        '#d6b6df','#fff8ff',.014);
      structureEllipse(0,-.51,.035,.035,'#fffaff','#d5b2dc',.008);
      structureGlow(0,-.52,.13,'#fbd4ff30');break;
    }
    case 'legend':{
      // Slim twin-scroll portal: visible supports and a small open doorway give the glyph a building form.
      structurePlinth('#68518c','#433867','#302846','#c8b2eb');
      structurePoly([[-.23,-.32],[0,-.25],[.23,-.32],[0,-.39]],'#76609a','#c8b2eb',.012);
      structurePoly([[-.19,-.36],[-.16,-.53],[-.11,-.58],[-.07,-.54],[-.08,-.36]],'#7960a7','#decaff',.012);
      structurePoly([[.19,-.36],[.16,-.53],[.11,-.58],[.07,-.54],[.08,-.36]],'#7960a7','#decaff',.012);
      structurePoly([[-.1,-.53],[-.07,-.62],[0,-.67],[.07,-.62],[.1,-.53],[.065,-.5],[0,-.57],[-.065,-.5]],'#b29ad9','#f1dcff',.012);
      structurePoly([[-.055,-.36],[-.055,-.47],[0,-.51],[.055,-.47],[.055,-.36]],'#302846','#bfa2ed',.01);
      ctx.beginPath();ctx.moveTo(-.18,-.47);
      ctx.bezierCurveTo(-.23,-.65,-.04,-.69,0,-.54);
      ctx.bezierCurveTo(.04,-.69,.23,-.65,.18,-.47);
      ctx.strokeStyle='#decaff';ctx.lineWidth=.014;ctx.stroke();
      break;
    }
    case 'primal':{
      // A light stone grotto with a real opening and three claw marks above its lintel.
      structurePlinth('#777458','#595944','#424339','#d6d1aa');
      structurePoly([[-.25,-.34],[-.23,-.48],[-.17,-.58],[-.11,-.55],[0,-.64],[.1,-.55],[.17,-.58],[.23,-.47],[.25,-.34],[.16,-.31],[0,-.35],[-.16,-.31]],
        '#77765c','#d8d0a5',.016);
      structurePoly([[-.14,-.34],[-.13,-.43],[-.08,-.49],[0,-.52],[.08,-.49],[.13,-.43],[.14,-.34]],'#403f39','#b6ae83',.012);
      for(let i=0;i<3;i++){
        const x=-.13+i*.13;
        structureLine([[x-.03,-.54],[x-.01,-.59],[x+.025,-.63]],'#eee4b8',.014);
      }
      break;
    }
    case 'time':{
      // Small clock-gate with two slim supports, a lintel and a readable moving dial.
      structurePlinth('#89808a','#635b6e','#484453','#f0dfc8');
      structurePoly([[-.22,-.32],[0,-.25],[.22,-.32],[0,-.39]],'#89808a','#f0dfc8',.012);
      for(const x of [-.16,.16])structurePoly([[x-.022,-.36],[x-.02,-.61],[x+.02,-.61],[x+.022,-.36]],'#746b78','#ead7bb',.012);
      structurePoly([[-.23,-.58],[-.18,-.66],[0,-.72],[.18,-.66],[.23,-.58],[.18,-.54],[0,-.61],[-.18,-.54]],'#b5a29e','#f5e8cb',.014);
      structureEllipse(0,-.51,.095,.095,'#504b5c','#e8d5b4',.016);
      structureEllipse(0,-.51,.064,.064,'#b5a29e','#f8e9c8',.01);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;structureLine([[Math.cos(a)*.071,-.51+Math.sin(a)*.071],[Math.cos(a)*.084,-.51+Math.sin(a)*.084]],'#fff1d9',.008);}
      structureLine([[0,-.51],[0,-.56],[.04,-.49]],'#514b5c',.012);
      structureGlow(0,-.51,.14,'#e8d5b522');break;
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
  if(emphasize)ctx.restore();
  paintHabitatGround(element);
  paintHabitatMotion(element,time);
}

/** Flat, faint ground marks give the five newer Habitats their own terrain without blocking paths. */
function paintHabitatGround(element){
  const emphasize=['war','pure','legend','primal','time'].includes(element);
  if(emphasize){ctx.save();ctx.translate(0,.1);ctx.scale(1.65,.8);}
  switch(element){
    case 'war':
      structureLine([[-.31,.035],[-.16,.105],[0,.04],[.16,.105],[.31,.035]],'#4b34364d',.012);
      structureLine([[-.2,.005],[-.2,.075]],'#f2c18755',.01);
      structureLine([[.2,.005],[.2,.075]],'#f2c18755',.01);
      break;
    case 'pure':
      structureLine([[-.22,.045],[-.1,.105],[0,.06],[.1,.105],[.22,.045]],'#fff8ff77',.012);
      structureEllipse(0,.07,.035,.017,'#fff8ff55');
      break;
    case 'legend':
      structureLine([[-.25,.035],[-.13,.095],[0,.04],[.13,.095],[.25,.035]],'#e6d4ff66',.012);
      structureLine([[-.09,.06],[-.04,.085],[0,.06],[.04,.085],[.09,.06]],'#f1dcff55',.01);
      break;
    case 'primal':
      structureEllipse(-.29,.045,.045,.018,'#373a3255');
      structureEllipse(.27,.075,.055,.02,'#373a3255');
      structureEllipse(.05,.125,.035,.014,'#eee4b866');
      structureLine([[-.19,.11],[-.08,.145],[.02,.13]],'#e8dfb866',.012);
      break;
    case 'time':
      structureEllipse(0,.075,.15,.06,'#e7d7bf33','#f0dfc855',.01);
      for(const x of [-.09,.09])structureLine([[x,.05],[x*1.35,.085]],'#f3e4cc66',.01);
      break;
  }
  if(emphasize)ctx.restore();
}

/** Per-element accents animate inside the habitat silhouette and never affect its footprint. */
function paintHabitatMotion(element,time){
  const wave=Math.sin(time*.003);
  const emphasize=['war','pure','legend','primal','time'].includes(element);
  if(emphasize){ctx.save();ctx.translate(0,.1);ctx.scale(1.65,.8);}
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
      structureLine([[-.07,-.69],[-.02+wave*.018,-.73],[.07+wave*.025,-.7]],'#ffe0a0',.016);break;
    case 'pure':
      ctx.save();ctx.translate(0,-.51);ctx.rotate(time*.0007);structureEllipse(0,-.035,.012,.032,'#fffaff','#eac2e7',.005);ctx.restore();break;
    case 'legend':
      ctx.save();ctx.translate(0,-.55);ctx.rotate(time*.0005);structureEllipse(-.055,0,.055,.024,'#c8a9f0','#f2e4ff',.007);ctx.restore();break;
    case 'primal':
      structureLine([[-.15,-.45],[0,-.43+wave*.012],[.15,-.45]],'#fff0c0',.012);break;
    case 'time':
      ctx.save();ctx.translate(0,-.52);ctx.rotate(time*.00085);structureLine([[0,-.07],[0,.035],[.04,.015]],'#fff2d8',.012);ctx.restore();break;
  }
  if(emphasize)ctx.restore();
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
  if(!n)structureElementBadge(e,0,-.08,.27);
  if(b.storedGold>=1)structureEllipse(.38,-.19,.085,.085,'#ffe298','#a86733',.015);
  if(b.storedGems>=1)structurePoly([[-.48,-.19],[-.39,-.28],[-.3,-.19],[-.39,-.1]],'#a6edff','#5c9dc0',.012);
  if(b.level>=3)for(const x of [-.35,.35])structureLantern(x,.08,theme.accent,time,night);
}
