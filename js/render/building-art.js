"use strict";

/* The art shares the projected footprint; a local unit scales with its diamond. */
let structureBase=null,structureBounds=null;
function trackStructure(points){
  if(!structureBounds)return;
  for(const [x] of points){structureBounds.min=Math.min(structureBounds.min,x);
    structureBounds.max=Math.max(structureBounds.max,x);}
}
function eggBounce(ready,time,index){return ready?-Math.abs(Math.sin(time*.007+index*.8))*8:0;}
function nestSlots(level){
  return {1:[[0,.12]],2:[[-.2,.14],[.2,.14]],
    3:[[-.23,.18],[.23,.18],[0,-.02]],
    4:[[-.23,.18],[.23,.18],[-.15,-.08],[.15,-.08]],
    5:[[-.26,.19],[0,.2],[.26,.19],[-.14,-.08],[.14,-.08]]}
    [Math.min(5,Math.max(1,level))];
}
function structurePoly(points,fill,stroke,line=0){
  trackStructure(points);
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line||.014;ctx.stroke();}
}
function structureLine(points,color,width=.014){
  trackStructure(points);
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
}
function structureEllipse(x,y,rx,ry,fill,stroke,width=.014){
  trackStructure([[x-rx,y],[x+rx,y]]);
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function structureGlow(x,y,r,color){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function structurePlinth(top,side,front,rim){
  if(structureBase){
    const [a,b,c,d]=structureBase,depth=.055;
    structurePoly([d,c,[c[0],c[1]+depth],[d[0],d[1]+depth]],side);
    structurePoly([b,c,[c[0],c[1]+depth],[b[0],b[1]+depth]],front);
    structurePoly([a,b,c,d],top,rim,.016);
    return;
  }
  structurePoly([[-.51,.04],[0,.23],[0,.285],[-.51,.095]],side);
  structurePoly([[0,.23],[.51,.04],[.51,.095],[0,.285]],front);
  structurePoly([[-.51,.04],[0,-.17],[.51,.04],[0,.23]],top,rim,.016);
  structureLine([[-.47,.045],[0,.205],[.47,.045]],'#fff9d875',.012);
}
function structureLantern(x,y,color,time,night){
  structurePoly([[x-.025,y+.05],[x+.025,y+.05],[x+.018,y-.11],[x-.018,y-.11]],'#6f6050');
  structureEllipse(x,y-.12,.035,.045,color,'#fff3c5',.01);
  if(night>.2||color==='#ff8a43'){
    ctx.globalAlpha=Math.max(.38,night)*(.82+.18*Math.sin(time*.005+x*50));
    structureGlow(x,y-.12,.19,'#ffe48c99');ctx.globalAlpha=1;
  }
}
function structureBanner(x,y,body,trim,time){
  structureLine([[x,y+.14],[x,y-.38]],'#eed9ab',.018);
  const flutter=Math.sin(time*.003+x*31)*.022;
  structurePoly([[x,y-.37],[x+.18+flutter,y-.31],[x+.12+flutter,y-.12],[x+.05,y-.16],[x,y-.12]],body,trim,.013);
  structureLine([[x+.035,y-.31],[x+.11+flutter,y-.275]],trim,.012);
}
function structureCrop(x,y,ready,time,color){
  const sway=Math.sin(time*.0016+x*19)*.02;
  structureLine([[x,y+.065],[x+sway,y-.08]],'#466e3c',.018);
  structurePoly([[x,y-.015],[x-.075,y-.085],[x-.08,y-.02]],'#55a951');
  structurePoly([[x,y-.025],[x+.075,y-.105],[x+.07,y-.035]],'#8cd56a');
  if(ready)structureEllipse(x+sway,y-.10,.027,.039,color,'#fff1c4',.006);
}
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
      time,facing:Math.cos(phase)<0?-1:1,scale:n>2?.43:.53});ctx.restore();
  });
  if(!n){ctx.fillStyle=theme.accent;ctx.textAlign='center';ctx.font='bold .28px system-ui';
    ctx.fillText(DATA.elements[e]?.mark||'✦',0,.11);}
  if(b.storedGold>=1)structureEllipse(.38,-.19,.085,.085,'#ffe298','#a86733',.015);
  if(b.storedGems>=1)structurePoly([[-.48,-.19],[-.39,-.28],[-.3,-.19],[-.39,-.1]],'#a6edff','#5c9dc0',.012);
  if(b.level>=3)for(const x of [-.35,.35])structureLantern(x,.08,theme.accent,time,night);
}
function paintFarm(b,time,night){
  structurePlinth('#a28c58','#766449','#655342','#d9c67e');
  // Terraced rows, each with curved soil grooves and actual crops.
  for(let row=0;row<3;row++){
    const y=.025+row*.075;
    structurePoly([[-.38+row*.055,y-.057],[.17+row*.05,y-.057],
      [.34+row*.025,y],[0+row*.05,y+.048]],row%2?'#674935':'#7b5335','#ab7947',.008);
    if(b.crop)for(let col=0;col<3;col++){
      const x=-.25+col*.2+row*.035;
      structureCrop(x,y-.02,b.crop.readyAt<=Date.now(),time,
        b.crop.id==='dragonfruit'?'#f270a1':b.crop.id==='pumpkin'?'#efac45':'#f8d277');
    }
  }
  // Elevated wooden granary with a pitched two-sided roof and chimney.
  structurePoly([[-.27,-.16],[.03,-.24],[.25,-.16],[.25,-.43],[-.03,-.53],[-.27,-.43]],'#986a49');
  structurePoly([[-.27,-.43],[-.03,-.61],[.25,-.43],[.04,-.37],[-.03,-.48]],'#dc9860','#ffe1a0',.014);
  structurePoly([[.04,-.37],[.25,-.43],[.25,-.16],[.04,-.12]],'#684d3e');
  structurePoly([[-.115,-.22],[-.115,-.39],[-.035,-.42],[.035,-.39],[.035,-.2]],'#513e35','#eec990',.011);
  structureLine([[-.115,-.38],[.035,-.22]],'#e5ba83',.012);
  structureLine([[-.24,-.29],[.005,-.35]],'#e5bd8a',.01);
  structurePoly([[.14,-.53],[.21,-.55],[.21,-.75],[.14,-.72]],'#887257');
  const smoke=night>.4?Math.sin(time*.002)*.025:0;
  structureEllipse(.2+smoke,-.78,.04,.023,'#f4eee688');
  if(b.level>2)structureBanner(-.34,-.14,'#79b36b','#f7e6a4',time);
}
function paintHatchery(b,time,night){
  structurePlinth('#e6c995','#9e7c64','#7d655b','#ffedbc');
  // A cracked golden shell wraps an open, lit glass incubator.
  const shell=ctx.createLinearGradient(-.4,-.65,.38,.18);
  shell.addColorStop(0,'#fff9df');shell.addColorStop(.55,'#e3bc82');shell.addColorStop(1,'#a47a61');
  ctx.beginPath();ctx.moveTo(-.4,.04);
  ctx.bezierCurveTo(-.43,-.42,-.28,-.73,0,-.77);
  ctx.bezierCurveTo(.28,-.73,.43,-.42,.4,.04);
  ctx.quadraticCurveTo(0,.23,-.4,.04);ctx.fillStyle=shell;ctx.fill();
  ctx.strokeStyle='#fff6d7';ctx.lineWidth=.025;ctx.stroke();
  const glass=ctx.createLinearGradient(-.28,-.48,.32,.18);
  glass.addColorStop(0,'#c9eff0');glass.addColorStop(1,'#6a9ca7');
  ctx.beginPath();ctx.moveTo(-.29,.025);
  ctx.bezierCurveTo(-.3,-.39,-.16,-.61,0,-.62);
  ctx.bezierCurveTo(.16,-.61,.3,-.39,.29,.025);
  ctx.quadraticCurveTo(0,.125,-.29,.025);ctx.fillStyle=glass;ctx.fill();
  structureGlow(0,-.29,.32,night>.15?'#fceaa176':'#ffffff33');
  structureLine([[-.30,.025],[-.21,-.13],[-.03,-.15],[.09,-.3],[.28,-.33]],'#fff5d4',.024);
  structureLine([[-.12,-.57],[.01,-.67],[.14,-.53]],'#fffde0',.016);
  structurePoly([[-.4,.02],[-.28,.16],[.29,.16],[.4,.02],[.3,-.04],[.18,.04],
    [.05,-.02],[-.1,.07],[-.23,-.05]],'#f9e9bc','#c59b71',.012);
  const eggs=eggsInHatchery(b.id),slots=nestSlots(b.level);
  slots.forEach((slot,i)=>{
    const [x,y]=slot,r=b.level>=4?.078:.10;
    structureEllipse(x,y+.065,r*1.2,r*.42,'#79583f','#e9ca85',.012);
    structureLine([[x-r*.8,y+.06],[x,y+.085],[x+r*.8,y+.06]],'#f9e2a1',.014);
    if(eggs[i]){ctx.save();ctx.scale(1/structureUnitX,1/structureUnitY);
      drawEgg(ctx,eggs[i],x*structureUnitX,(y-.02)*structureUnitY,time,
        Math.min(.85,structureUnit/130));ctx.restore();}
  });
  structureLantern(-.36,-.05,'#ffcf88',time,night);
}
function paintAcademy(b,time,night){
  structurePlinth('#9ab6c6','#557796','#35536b','#d8e5ee');
  // Twin annexes sit behind a six-sided tower with visible sidewalls.
  for(const s of [-1,1]){
    structurePoly([[s*.16,-.15],[s*.4,-.12],[s*.42,-.38],[s*.17,-.46]],'#7495ae');
    structurePoly([[s*.15,-.46],[s*.29,-.64],[s*.43,-.38],[s*.3,-.29]],'#4d7099','#c6e4e9',.012);
    structureEllipse(s*.31,-.29,.037,.06,'#ffdc91','#e2f4fd',.008);
  }
  const wall=ctx.createLinearGradient(-.2,-.62,.22,.12);
  wall.addColorStop(0,'#dfedf1');wall.addColorStop(1,'#7195b2');
  structurePoly([[-.21,-.47],[0,-.56],[.21,-.47],[.21,.16],[0,.25],[-.21,.16]],wall,'#486786',.017);
  structurePoly([[.21,-.47],[.3,-.51],[.3,.11],[.21,.16]],'#426487');
  structurePoly([[-.26,-.48],[0,-.87],[.26,-.48],[0,-.57]],'#42699b','#e2f6f2',.015);
  structurePoly([[0,-.87],[.26,-.48],[.0,-.57]],'#7bb3c0');
  structureLine([[0,-.86],[0,-.98]],'#f2d38a',.02);
  structureEllipse(0,-.99,.035,.035,'#fff1aa');
  structurePoly([[-.095,.19],[-.095,-.04],[0,-.14],[.095,-.04],[.095,.19]],'#355372','#debe86',.014);
  structureLine([[0,-.13],[0,.2]],'#9bc0d0',.01);
  structurePoly([[-.07,-.39],[0,-.46],[.07,-.39],[0,-.32]],'#f7e4aa','#947a71',.012);
  for(const s of [-1,1])structureBanner(s*.38,-.15,'#5679a7','#f7dea3',time);
  if(night>.1)structureGlow(0,-.39,.19,'#ffeab277');
  if(b.level>=3){ctx.font='bold .12px system-ui';ctx.textAlign='center';ctx.fillStyle='#fbecbb';
    ctx.fillText(String(dragonLevelCap()),0,.11);}
}
function paintArena(b,time,night){
  structurePlinth('#dfc089','#9b775d','#75564e','#f8dfa6');
  // Sweeping stone stands and three tiered terraces around an open sand floor.
  for(let tier=0;tier<3;tier++){
    const rx=.44-tier*.065,ry=.29-tier*.045,y=-.095+tier*.025;
    ctx.beginPath();ctx.ellipse(0,y,rx,ry,0,Math.PI*1.02,Math.PI*1.98);
    ctx.strokeStyle=tier===0?'#74596a':'#e4b781';ctx.lineWidth=.074;ctx.stroke();
    ctx.strokeStyle='#ffe4aa';ctx.lineWidth=.014;ctx.stroke();
  }
  structureEllipse(0,.045,.3,.12,'#ad684f','#f5d595',.025);
  structureEllipse(0,.045,.23,.085,'#d2aa6e');
  for(const s of [-1,1]){
    structurePoly([[s*.36,-.04],[s*.4,-.33],[s*.47,-.34],[s*.48,.08]],'#b78c72','#ffe2b0',.014);
    structurePoly([[s*.37,-.34],[s*.435,-.49],[s*.49,-.34]],'#bc7567');
    structureBanner(s*.38,-.19,s<0?'#a64f5c':'#557db0','#f4dba0',time);
  }
  structureLine([[-.1,.12],[.095,-.11]],'#f8e9bd',.024);
  structureLine([[.1,.12],[-.095,-.11]],'#f8e9bd',.024);
  structureEllipse(0,.015,.032,.035,'#ffe5a7');
  if(night>.2)structureGlow(0,.02,.29,'#ffe4a244');
}
function paintCave(b,time,night){
  structurePlinth('#9d88a0','#655a79','#493d60','#d8bdde');
  // A broken rock arch frames a purple portal; crystals mark the entrance.
  structurePoly([[-.48,.09],[-.41,-.34],[-.18,-.69],[.06,-.51],[.29,-.72],[.48,-.34],[.48,.13]],
    '#655c80','#cab4d2',.02);
  structurePoly([[-.48,.09],[-.41,-.34],[-.18,-.69],[-.15,-.24],[-.24,.07]],'#b1a1ad');
  structurePoly([[.06,-.51],[.29,-.72],[.48,-.34],[.37,.09],[.25,-.31]],'#82739b');
  const portal=ctx.createRadialGradient(0,-.04,.02,0,-.04,.3);
  portal.addColorStop(0,'#ae83d0');portal.addColorStop(.45,'#5d4b82');portal.addColorStop(1,'#292944');
  structureEllipse(0,-.035,.225,.28,portal,'#ddc6ed',.021);
  structureGlow(0,-.04,.32,'#c880eb55');
  for(const s of [-1,1]){
    structurePoly([[s*.31,.13],[s*.28,-.14],[s*.38,-.4],[s*.43,.09]],
      s<0?'#78c6d2':'#a97bd7','#eef7ee',.012);
    structureLine([[s*.31,.03],[s*.37,-.28]],'#ffffff99',.01);
  }
  if(b.breeding){
    if(b.breeding.readyAt<=Date.now()){
      ctx.save();ctx.scale(1/structureUnitX,1/structureUnitY);
      drawEgg(ctx,{id:b.id,species:b.breeding.result,readyAt:Date.now()-1},
        0,.06*structureUnitY,time,.72);ctx.restore();
    }else{
      for(const [i,id] of [b.breeding.fatherId,b.breeding.motherId].entries()){
        const d=dragonById(id);if(!d)continue;
        ctx.save();ctx.scale(1/structureUnitX,1/structureUnitY);
        drawDragon(ctx,{dragon:d,x:(i? .14:-.14)*structureUnitX,y:.11*structureUnitY,
          time,scale:.33,facing:i?-1:1});ctx.restore();
      }
      ctx.font='bold .17px system-ui';ctx.fillStyle='#ffe3ee';ctx.textAlign='center';
      ctx.fillText('♥',0,-.37+Math.sin(time*.005)*.025);
    }
  }
  if(night>.1)structureGlow(0,-.05,.3,'#b886e946');
}
function paintFlag(b,time,night){
  structurePlinth('#d5bc8a','#89775d','#675b53','#f6e5b9');
  structurePoly([[-.24,.03],[0,-.15],[.24,.03],[0,.18]],'#b1a176','#fff0b7',.014);
  structurePoly([[-.07,-.12],[.07,-.12],[.05,-.8],[-.05,-.8]],'#b69063','#f3dca6',.016);
  structureEllipse(0,-.82,.055,.055,'#ffeb9e','#8d714d',.013);
  structureBanner(.02,-.45,'#d46b62','#fff0bd',time);
  for(const s of [-1,1])structureEllipse(s*.18,.025,.04,.025,'#879d62');
}
let structureUnit=1,structureUnitX=1,structureUnitY=1;
function drawBuilding(b,time){
  const f=buildingFootprint(b),v=footprintVertices(b.x,b.y,f.w,f.h);
  const center=gridToScreen(b.x+f.w/2,b.y+f.h/2);
  const width=Math.max(...v.map(p=>p.x))-Math.min(...v.map(p=>p.x));
  const height=Math.max(...v.map(p=>p.y))-Math.min(...v.map(p=>p.y));
  const unitX=width/1.02,unitY=height/.4,unit=Math.min(unitX,unitY);
  const night=1-daylightAt(Date.now());
  const anchor=v[2];
  ctx.save();ctx.translate(anchor.x,anchor.y);ctx.scale(unitX,unitY);
  ctx.translate((center.x-anchor.x)/unitX,(center.y-anchor.y)/unitY);
  structureBase=v.map(p=>[(p.x-center.x)/unitX,(p.y-center.y)/unitY]);
  structureBounds=ui.debugIso?{min:Infinity,max:-Infinity}:null;
  // Animation code below converts back to local pixels for drawDragon/drawEgg.
  structureUnit=unit;structureUnitX=unitX;structureUnitY=unitY;
  if(b.type==='habitat')paintHabitat(b,time,night);
  else if(b.type==='farm')paintFarm(b,time,night);
  else if(b.type==='hatchery')paintHatchery(b,time,night);
  else if(b.type==='academy')paintAcademy(b,time,night);
  else if(b.type==='arena')paintArena(b,time,night);
  else if(b.type==='cave')paintCave(b,time,night);
  else paintFlag(b,time,night);
  if(b.upgradeEnds){
    structureGlow(0,-.68,.27,'#e1b7ff99');
    structurePoly([[-.08,-.64],[0,-.76],[.08,-.64]],'#efd6ff','#775e96',.012);
  }
  const bounds=structureBounds;
  if(ui.debugIso&&bounds.min<Infinity&&
    (bounds.min<-.561||bounds.max>.561)){
    ctx.fillStyle='#ff5555';ctx.font='bold .08px system-ui';ctx.textAlign='center';
    ctx.fillText('⚠ sprite exceeds base',0,-.92);
  }
  structureBase=null;structureBounds=null;
  ctx.restore();
  return bounds;
}
