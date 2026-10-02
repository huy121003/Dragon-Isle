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
      structurePlinth('#864347','#6a303e','#462c37','#f4a36e');
      structurePoly([[-.35,.1],[-.35,-.42],[0,-.58],[.35,-.42],[.35,.1]],
        '#773642','#f9b66a',.02);
      structurePoly([[-.2,-.19],[0,-.46],[.2,-.19],[.16,-.03],[0,-.1],[-.16,-.03]],
        '#c65b42','#f8d599',.018);
      for(const x of [-.35,.35]){
        structureLine([[x,.06],[x,-.68]],'#fbd494',.024);
        structurePoly([[x,-.7],[x-.06,-.58],[x+.06,-.58]],'#f6bb70');
      }
      structureGlow(0,-.23,.25,'#f5944566');break;
    }
    case 'pure':{
      structurePlinth('#a87faa','#785482','#553c70','#fff0fa');
      structureEllipse(0,.08,.4,.14,'#bc8cbb','#f7d6ed',.02);
      for(const x of [-.3,.3]){
        structurePoly([[x-.06,.03],[x-.07,-.43],[x,-.56],[x+.07,-.43],[x+.06,.03]],
          '#f5d9f0','#ffffff',.016);
        structureGlow(x,-.43,.13,'#ffb8f174');
      }
      structurePoly([[-.19,-.1],[0,-.63],[.19,-.1]],'#e9bee4','#fff4ff',.022);
      structurePoly([[-.13,-.15],[0,-.53],[.13,-.15]],'#f9e9f8');
      structureGlow(0,-.29,.31,'#fbd4ff66');break;
    }
    case 'legend':{
      structurePlinth('#60458e','#3b315f','#2b284c','#bfa2ed');
      structureEllipse(0,.06,.4,.16,'#402c64','#d3b7ff',.02);
      for(const x of [-.23,.23]){
        structurePoly([[x-.11,.04],[x-.065,-.43],[x,-.62],[x+.065,-.43],[x+.11,.04]],
          '#7457a2','#d8c2fb',.018);
        structureGlow(x,-.44,.2,'#b597ff70');
      }
      ctx.beginPath();
      for(let i=0;i<65;i++){
        const t=i/64*Math.PI*2,x=.2*Math.sin(t),y=-.35+.11*Math.sin(t)*Math.cos(t);
        if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.strokeStyle='#f3d8ff';ctx.lineWidth=.03;ctx.stroke();break;
    }
    case 'primal':{
      structurePlinth('#777458','#595944','#424339','#d6d1aa');
      structurePoly([[-.38,.1],[-.31,-.24],[-.16,-.44],[.16,-.44],[.34,-.21],[.38,.1]],
        '#62614b','#d8d0a5',.021);
      for(const x of [-.27,0,.27]){
        structurePoly([[x-.085,-.21],[x,-.58-(x===0?.09:0)],[x+.085,-.21]],
          '#b4a87f','#e8ddac',.015);
      }
      structureEllipse(0,-.2,.15,.16,'#d0c496','#625c48',.018);
      structureLine([[-.09,-.2],[0,-.34],[.09,-.2],[0,-.07],[-.09,-.2]],
        '#eee2b9',.016);break;
    }
    case 'time':{
      structurePlinth('#908085','#625c6d','#494456','#f0e4d2');
      structureEllipse(0,.05,.39,.16,'#61576c','#e4c7a8',.025);
      for(const x of [-.3,.3]){
        structurePoly([[x-.04,.05],[x-.04,-.48],[x+.04,-.48],[x+.04,.05]],
          '#b5a6a0','#f3e0bf',.012);
      }
      structureEllipse(0,-.4,.2,.2,'#d7c9b8','#f9eaca',.03);
      structureEllipse(0,-.4,.14,.14,'#766d79','#f9eaca',.014);
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        structureLine([[Math.sin(a)*.14,-.4-Math.cos(a)*.14],
          [Math.sin(a)*.18,-.4-Math.cos(a)*.18]],'#fff1d9',.014);
      }
      structureLine([[0,-.4],[0,-.51],[.085,-.34]],'#fff1d9',.019);
      structureGlow(0,-.4,.3,'#e8d5b563');break;
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
  if(!n){ctx.fillStyle=theme.accent;ctx.textAlign='center';ctx.font='bold .28px system-ui';
    ctx.fillText(DATA.elements[e]?.mark||'✦',0,.11);}
  if(b.storedGold>=1)structureEllipse(.38,-.19,.085,.085,'#ffe298','#a86733',.015);
  if(b.storedGems>=1)structurePoly([[-.48,-.19],[-.39,-.28],[-.3,-.19],[-.39,-.1]],'#a6edff','#5c9dc0',.012);
  if(b.level>=3)for(const x of [-.35,.35])structureLantern(x,.08,theme.accent,time,night);
}
