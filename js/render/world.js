"use strict";

/* RENDER: Camera, nền đảo, công trình và rồng dùng chung canvas 2D. */
let pixelRatio=1,viewW=0,viewH=0;
function resizeCanvas(){
  const rect=dom.stage.getBoundingClientRect();
  viewW=Math.max(1,rect.width);viewH=Math.max(1,rect.height);
  const limit=viewW>900?(DATA.environment?.maxDesktopPixelRatio||1.5):
    (DATA.environment?.maxDevicePixelRatio||2);
  pixelRatio=Math.min(limit,window.devicePixelRatio||1);
  dom.canvas.width=Math.round(viewW*pixelRatio);
  dom.canvas.height=Math.round(viewH*pixelRatio);
}
function worldToScreen(x,y){return {x:(x-ui.camera.x)*ui.camera.zoom+viewW/2,y:(y-ui.camera.y)*ui.camera.zoom+viewH/2};}
function screenToWorld(x,y){return {x:(x-viewW/2)/ui.camera.zoom+ui.camera.x,y:(y-viewH/2)/ui.camera.zoom+ui.camera.y};}
/* The island artwork floats, while saved tile and building coordinates remain fixed. */
function islandBob(index,time){
  return Math.sin(time*(.00085+index%4*.000065)+index*1.83)*18+
    Math.sin(time*.00037+index*2.41)*4;
}
function screenToIslandWorld(x,y,time=performance.now()){
  const point=screenToWorld(x,y),T=DATA.tile;
  for(let index=0;index<DATA.islands.length;index++){
    const island=DATA.islands[index],top=island.y*T+islandBob(index,time);
    if(point.x>=island.x*T&&point.x<(island.x+island.size)*T&&
      point.y>=top&&point.y<top+island.size*T)return {x:point.x,y:point.y-islandBob(index,time)};
  }
  return point;
}
function screenCell(x,y){const w=screenToIslandWorld(x,y);return {x:Math.floor(w.x/DATA.tile),y:Math.floor(w.y/DATA.tile)};}
const cameraLandBounds={source:null,length:-1,minX:0,maxX:0,minY:0,maxY:0};
function clampCamera(){
  const xs=DATA.islands.map(i=>i.x),ys=DATA.islands.map(i=>i.y);
  ui.camera.x=clamp(ui.camera.x,(Math.min(...xs)-55)*DATA.tile,(Math.max(...xs)+127)*DATA.tile);
  ui.camera.y=clamp(ui.camera.y,(Math.min(...ys)-55)*DATA.tile,(Math.max(...ys)+127)*DATA.tile);
}
function rounded(x,y,w,h,r){
  const k=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+k,y);ctx.arcTo(x+w,y,x+w,y+h,k);ctx.arcTo(x+w,y+h,x,y+h,k);
  ctx.arcTo(x,y+h,x,y,k);ctx.arcTo(x,y,x+w,y,k);ctx.closePath();
}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function daylightAt(now){
  if(ui.fixedDay)return 1;
  const period=(DATA.environment?.cycleSeconds||480)*1000;
  return .5+.5*Math.cos((now+ui.dayOffset)/period*Math.PI*2);
}
function blendHex(a,b,t){
  return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+
    parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
}
function drawBackground(time){
  const day=daylightAt(Date.now());
  const grad=ctx.createLinearGradient(0,0,0,viewH);
  grad.addColorStop(0,blendHex('#152940','#a3e5ee',day));
  grad.addColorStop(1,blendHex('#253e60','#53b8db',day));
  ctx.fillStyle=grad;ctx.fillRect(0,0,viewW,viewH);
  if(day<.7){ctx.fillStyle='#ffffff';for(let i=0;i<45;i++){
    const x=islandHash(i,37)*viewW,y=islandHash(i+50,39)*viewH*.65;
    ctx.globalAlpha=(.7-day)/.7*(.35+.5*Math.sin(time*.001+i)**2);
    ctx.fillRect(x,y,i%7===0?2:1,i%7===0?2:1);
  }ctx.globalAlpha=1;}
  ctx.strokeStyle=day<.45?'#bed8f42b':'#ffffff2c';ctx.lineWidth=2;
  for(let row=0;row<8;row++){
    const y=((row*93+time*.007)%(viewH+120))-60;
    ctx.beginPath();
    for(let x=-20;x<viewW+30;x+=10){
      const wave=y+Math.sin(x*.02+row*2+time*.001)*4;
      if(x===-20)ctx.moveTo(x,wave);else ctx.lineTo(x,wave);
    }
    ctx.stroke();
  }
  for(let i=0;i<4;i++){
    const x=((i*219+time*.005)%(viewW+220))-110,y=27+i*51;
    ellipse(x,y,42,11,day<.4?'#a1b7d43a':'#ffffff7a');ellipse(x+20,y-6,26,11,day<.4?'#a1b7d445':'#ffffff83');
  }
  ctx.strokeStyle="#ffffffa8";ctx.lineWidth=2;
  for(let i=0;i<3;i++){
    const x=((i*263+time*.018)%(viewW+100))-50,y=40+i*45;
    ctx.beginPath();ctx.arc(x,y,7,Math.PI*1.1,Math.PI*1.9);ctx.arc(x+14,y,7,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
  }
}
function islandColors(island){
  const palette={
    home:["#73bd67","#b9df8c","#39765b","#e3f5a0"],
    fire:["#594b4b","#b25b39","#322b40","#ff893e"],
    water:["#47a1b4","#95d6c2","#285d83","#b6f6ed"],
    earth:["#c7a06a","#e8cb8a","#795b4c","#fbe0a4"],
    wind:["#9fc7a5","#e2e7bb","#628d8e","#f4fff3"],
    ice:["#9bd9e6","#e8fbfc","#589ac3","#ffffff"],
    thunder:["#67577c","#b7978f","#403b63","#ffe76a"],
    nature:["#4ba06c","#b9d987","#2d6d54","#e9f9a0"],
    dark:["#5c5268","#958499","#342d4f","#bda8d7"],
    light:["#ddc585","#fff1bc","#9b825e","#fffbe4"],
    metal:["#8095a2","#c4ced1","#48556a","#f1d6a2"],
    war:["#863e3a","#e58a62","#4d292e","#ffc480"],
    pure:["#a275ab","#f0c4e9","#624976","#fff2fa"],
    legend:["#53387b","#aa8de0","#312554","#eddaff"],
    primal:["#686a50","#afb185","#424338","#eee6ba"],
    time:["#827478","#c8b9a7","#4d4754","#f3e9d4"]
  }[island.element||"home"];
  return {ground:palette[0],rim:palette[1],shadow:palette[2],accent:palette[3]};
}
function islandContour(cx,cy,rx,ry,seed){
  const x=cx-rx,y=cy-ry,w=rx*2,h=ry*2,r=Math.min(rx,ry)*.13;
  ctx.beginPath();ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function islandHash(n,seed){return ((Math.sin(n*127.1+seed*78.233)*43758.5453)%1+1)%1;}
/* Small themed scenery is drawn underneath placed buildings. */
function islandScenery(kind,x,y,size,time,variant){
  ctx.save();ctx.translate(x,y);ctx.scale(size/20,size/20);
  const wobble=Math.sin(time*.001+variant*2)*.8;
  if(!kind||kind==='nature'){
    ctx.fillStyle='#644d37';ctx.fillRect(-2,-1,4,13);
    ctx.fillStyle=kind?'#286e4d':'#39865a';ellipse(-5,-3,7,5,ctx.fillStyle);
    ellipse(4,-5,8,6,kind?'#4eaa64':'#69b86e');ellipse(-1,-9,7,6,'#87cf78');
    ellipse(1,12,11,2,'#3b765044');
  }else if(kind==='fire'){
    ellipse(0,9,11,4,'#332b37');
    ctx.fillStyle='#2d2632';ctx.beginPath();ctx.moveTo(-8,8);ctx.lineTo(-3,-5);ctx.lineTo(2,8);ctx.fill();
    ctx.fillStyle='#ff6a29';ctx.beginPath();ctx.moveTo(-2,9);ctx.quadraticCurveTo(-10,0,0,-13-wobble);
    ctx.quadraticCurveTo(1,-2,6,-6);ctx.quadraticCurveTo(11,8,-2,9);ctx.fill();
    ellipse(0,4,2,4,'#ffd467');
  }else if(kind==='water'){
    ellipse(0,5,12,6,'#2c83af');ellipse(-1,3,8,4,'#78d5e5');
    ctx.strokeStyle='#e5ffff';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(0,4,7+wobble,2.5,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#348d6e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(8,6);ctx.lineTo(10,-6);ctx.stroke();
  }else if(kind==='earth'){
    ellipse(0,9,12,3,'#81654755');
    ctx.fillStyle=variant%3===0?'#759a56':'#9d7351';ctx.beginPath();ctx.moveTo(-9,7);
    ctx.lineTo(-5,-4);ctx.lineTo(3,-8);ctx.lineTo(9,2);ctx.lineTo(8,8);ctx.fill();
    ctx.strokeStyle='#ead3a0';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-6,2);ctx.lineTo(4,2);ctx.stroke();
  }else if(kind==='wind'){
    ctx.strokeStyle='#f2ffef';ctx.lineWidth=2;ctx.lineCap='round';
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-11,-5+i*5);
      ctx.bezierCurveTo(-3,-13+i*5,4,5+i*5,11,-6+i*5+wobble);ctx.stroke();}
    ellipse(-5,9,6,2,'#effff380');
  }else if(kind==='ice'){
    for(let i=0;i<3;i++){
      const offset=(i-1)*6;
      ctx.fillStyle=i===1?'#eaffff':'#78c7ed';ctx.beginPath();ctx.moveTo(offset-4,8);
      ctx.lineTo(offset-2,-2);ctx.lineTo(offset,-12+(i%2)*5);ctx.lineTo(offset+4,7);ctx.fill();
    }
    ellipse(0,9,12,2,'#e9ffffaa');
  }else if(kind==='thunder'){
    ctx.fillStyle='#414367';ctx.fillRect(-5,-7,10,17);ctx.fillStyle='#dec487';ctx.fillRect(-4,-6,8,2);
    ctx.fillStyle='#ffe05f';ctx.beginPath();ctx.moveTo(2,-11);ctx.lineTo(-5,0);ctx.lineTo(0,0);
    ctx.lineTo(-2,11);ctx.lineTo(8,-3);ctx.lineTo(2,-3);ctx.fill();
  }else if(kind==='dark'){
    ellipse(0,11,11,2,'#362e4b88');
    ctx.fillStyle='#776b85';rounded(-6,-7,12,18,5);ctx.fill();
    ctx.fillStyle='#3a334f';ctx.fillRect(-1,-3,2,9);ctx.fillRect(-4,0,8,2);
    ctx.strokeStyle='#af9ac5';ctx.lineWidth=1;ctx.stroke();
  }else if(kind==='light'){
    ctx.fillStyle='#f8ecc1';ctx.fillRect(-5,-1,10,12);ctx.fillStyle='#fff8d6';
    ctx.beginPath();ctx.arc(0,-6,6,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff7c8';ctx.lineWidth=2;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*8,Math.sin(a)*8-6);
      ctx.lineTo(Math.cos(a)*11,Math.sin(a)*11-6);ctx.stroke();}
  }else if(['war','pure','legend','primal','time'].includes(kind)){
    const theme=DATA.habitatThemes[kind],color=theme.accent;
    ellipse(0,10,11,3,theme.ground);
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
    if(kind==='war'){ctx.moveTo(-7,7);ctx.lineTo(0,-11);ctx.lineTo(7,7);}
    else if(kind==='pure'){ctx.moveTo(-9,6);ctx.lineTo(0,-11);ctx.lineTo(9,6);ctx.closePath();}
    else if(kind==='legend'){
      for(let i=0;i<25;i++){const t=i/24*Math.PI*2;
        const x=9*Math.sin(t),y=7*Math.sin(t)*Math.cos(t)-2;
        if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    }else if(kind==='primal'){
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3,c=Math.cos(a),n=Math.sin(a);
        const point=(x,y)=>[x*c-y*n,x*n+y*c-1];
        ctx.moveTo(...point(-1,-1));
        ctx.quadraticCurveTo(...point(-9,-3),...point(-4,-10));
        ctx.lineTo(...point(-1,-7));
      }
    }else{ctx.arc(0,-2,8,0,Math.PI*2);ctx.moveTo(0,-2);ctx.lineTo(0,-8);ctx.moveTo(0,-2);ctx.lineTo(5,1);}
    ctx.stroke();ellipse(0,-2,2,2,theme.rim);
  }else if(kind==='metal'){
    ctx.fillStyle='#526474';ctx.fillRect(-9,2,18,9);ctx.fillStyle='#c8d6d8';ctx.fillRect(-8,3,16,2);
    ctx.fillStyle='#708593';ctx.beginPath();ctx.arc(0,-4,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d8e4e5';ctx.beginPath();ctx.arc(0,-4,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3e5366';ctx.beginPath();ctx.arc(0,-4,2,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function islandFeatures(kind,cx,cy,s,time){
  ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);ctx.lineCap='round';
  const river=function(dark,bright,highlight){
    const path=function(){ctx.beginPath();ctx.moveTo(-.49,-.27);
      ctx.bezierCurveTo(-.28,-.20,-.32,.13,-.07,.07);
      ctx.bezierCurveTo(.15,.02,.13,.33,.46,.38);};
    ctx.strokeStyle=dark;ctx.lineWidth=.085;path();ctx.stroke();
    ctx.strokeStyle=bright;ctx.lineWidth=.052;path();ctx.stroke();
    ctx.strokeStyle=highlight;ctx.lineWidth=.012;path();ctx.stroke();
  };
  if(!kind){
    ellipse(-.29,-.22,.16,.09,'#397a87');ellipse(-.30,-.24,.12,.06,'#71c2c7');
    ellipse(.24,.18,.13,.06,'#5da65d');
    ctx.strokeStyle='#d6e8a3';ctx.lineWidth=.015;ctx.beginPath();
    ctx.moveTo(-.5,.22);ctx.bezierCurveTo(-.16,.34,.08,-.35,.5,-.12);ctx.stroke();
  }else if(kind==='fire'){
    river('#342532','#e65b27','#ffd26a');
    ctx.fillStyle='#2a2531';ctx.beginPath();ctx.moveTo(-.39,-.38);ctx.lineTo(-.23,-.56);
    ctx.lineTo(-.08,-.38);ctx.fill();
    ellipse(.27,-.29,.11,.045,'#f5803477');
  }else if(kind==='water'){
    ellipse(.16,.12,.25,.17,'#2e80a6');ellipse(.15,.10,.21,.13,'#5cc1d5');
    river('#397e9e','#63bed5','#ccf9ed');
    ctx.strokeStyle='#e3ffffaa';ctx.lineWidth=.008;
    for(let n=0;n<3;n++){ctx.beginPath();ctx.ellipse(.17,.09,.09+n*.035,.035+n*.025,0,0,Math.PI*2);ctx.stroke();}
  }else if(kind==='earth'){
    ctx.fillStyle='#b8895e';ctx.beginPath();ctx.moveTo(-.61,-.18);
    ctx.bezierCurveTo(-.29,-.48,-.1,-.09,.15,-.33);ctx.bezierCurveTo(.3,-.47,.5,-.3,.65,-.11);
    ctx.lineTo(.65,.03);ctx.bezierCurveTo(.23,-.12,-.19,.10,-.61,.01);ctx.fill();
    ctx.strokeStyle='#f5dda0';ctx.lineWidth=.018;ctx.beginPath();ctx.moveTo(-.43,.25);
    ctx.bezierCurveTo(-.12,.03,.18,.29,.49,.12);ctx.stroke();
  }else if(kind==='wind'){
    ctx.strokeStyle='#edfff0bb';ctx.lineWidth=.026;
    for(let n=0;n<5;n++){const offset=n*.17-.34;ctx.beginPath();ctx.moveTo(-.62,offset);
      ctx.bezierCurveTo(-.2,offset-.22,.17,offset+.23,.62,offset-.07+Math.sin(time*.001+n)*.012);ctx.stroke();}
    ellipse(.22,-.3,.19,.05,'#f6fff17a');
  }else if(kind==='ice'){
    ellipse(-.14,.11,.43,.29,'#d5f5facc');
    ctx.fillStyle='#80c5e1';ctx.beginPath();ctx.moveTo(-.28,.03);ctx.lineTo(-.12,-.33);
    ctx.lineTo(-.01,.08);ctx.lineTo(.13,-.2);ctx.lineTo(.27,.2);ctx.fill();
    ctx.strokeStyle='#ffffffd0';ctx.lineWidth=.011;ctx.beginPath();ctx.moveTo(-.49,.37);
    ctx.lineTo(-.12,.17);ctx.lineTo(.09,.30);ctx.lineTo(.39,.09);ctx.stroke();
  }else if(kind==='thunder'){
    ctx.strokeStyle='#453d61';ctx.lineWidth=.055;ctx.beginPath();ctx.moveTo(-.43,-.4);
    ctx.lineTo(-.08,-.12);ctx.lineTo(.19,-.19);ctx.lineTo(.41,.3);ctx.stroke();
    ctx.strokeStyle='#f9db5d';ctx.lineWidth=.018;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-.08,-.12);ctx.lineTo(-.19,.26);ctx.lineTo(-.02,.49);ctx.stroke();
  }else if(kind==='nature'){
    for(let n=0;n<6;n++){const a=n*Math.PI/3;
      ellipse(Math.cos(a)*.35,Math.sin(a)*.27,.15,.10,n%2?'#2c875b':'#6ebb6e');}
    ctx.strokeStyle='#a4dc82';ctx.lineWidth=.02;ctx.beginPath();ctx.arc(0,0,.31,0,Math.PI*2);ctx.stroke();
  }else if(kind==='dark'){
    ellipse(-.22,.13,.30,.11,'#a19aaa66');ellipse(.26,-.24,.28,.12,'#b1a4bd55');
    ctx.fillStyle='#41394f';ctx.beginPath();ctx.moveTo(-.40,-.34);ctx.lineTo(-.23,-.46);
    ctx.lineTo(-.11,-.30);ctx.fill();
    ctx.strokeStyle='#bca9c280';ctx.lineWidth=.015;ctx.beginPath();ctx.arc(.22,.22,.22,0,Math.PI*2);ctx.stroke();
  }else if(kind==='light'){
    ellipse(0,0,.39,.31,'#ffefd399');ctx.strokeStyle='#fff9ce';ctx.lineWidth=.024;
    for(let n=0;n<3;n++){ctx.beginPath();ctx.arc(0,0,.12+n*.09,0,Math.PI*2);ctx.stroke();}
    for(let n=0;n<8;n++){const a=n*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*.38,Math.sin(a)*.33);
      ctx.lineTo(Math.cos(a)*.52,Math.sin(a)*.47);ctx.stroke();}
  }else if(['war','pure','legend','primal','time'].includes(kind)){
    const theme=DATA.habitatThemes[kind];
    ellipse(0,0,.36,.27,theme.ground);
    ctx.strokeStyle=theme.accent;ctx.lineWidth=.025;ctx.beginPath();
    if(kind==='war'){
      for(let i=-2;i<=2;i++){ctx.moveTo(i*.16,.35);ctx.lineTo(i*.12,-.42);}
    }else if(kind==='pure'){
      ctx.moveTo(0,-.43);ctx.lineTo(.39,.28);ctx.lineTo(-.39,.28);ctx.closePath();
    }else if(kind==='legend'){
      for(let i=0;i<65;i++){const t=i/64*Math.PI*2;
        const x=.46*Math.sin(t),y=.27*Math.sin(t)*Math.cos(t);
        if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    }else if(kind==='primal'){
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3,c=Math.cos(a),n=Math.sin(a);
        const point=(x,y)=>[x*c-y*n,x*n+y*c];
        ctx.moveTo(...point(-.04,-.03));
        ctx.quadraticCurveTo(...point(-.34,-.11),...point(-.17,-.43));
        ctx.lineTo(...point(-.06,-.26));
      }
    }else{
      ctx.arc(0,0,.37,0,Math.PI*2);
      for(let i=0;i<12;i++){const t=i*Math.PI/6;
        ctx.moveTo(Math.cos(t)*.32,Math.sin(t)*.32);
        ctx.lineTo(Math.cos(t)*.37,Math.sin(t)*.37);}
      ctx.moveTo(0,0);ctx.lineTo(0,-.25);ctx.lineTo(.18,.08);
    }
    ctx.stroke();
  }else if(kind==='metal'){
    ellipse(0,0,.39,.32,'#647c8c');ctx.strokeStyle='#d0dee0';ctx.lineWidth=.045;
    ctx.beginPath();ctx.arc(0,0,.29,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#486174';ctx.lineWidth=.036;
    for(let n=0;n<8;n++){const a=n*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*.29,Math.sin(a)*.29);
      ctx.lineTo(Math.cos(a)*.39,Math.sin(a)*.39);ctx.stroke();}
    ellipse(0,0,.08,.08,'#c9d9d8');
  }
  ctx.restore();
}
function islandCascade(kind,cx,cy,ry,depth,s,time){
  if(kind!=='fire'&&kind!=='water'&&kind!=='ice')return;
  const color=kind==='fire'?'#ff7b30':kind==='water'?'#76dbf1':'#d3faff';
  const originX=cx+s*.16,originY=cy+ry*.83;
  ctx.save();ctx.strokeStyle='#29425588';ctx.lineWidth=s*.056;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(originX,originY);ctx.bezierCurveTo(originX+s*.03,originY+depth*.2,
    originX-s*.01,originY+depth*.55,originX+s*.02,originY+depth*.70);ctx.stroke();
  ctx.strokeStyle=color;ctx.lineWidth=s*.038;ctx.stroke();
  ctx.strokeStyle=kind==='fire'?'#ffd266':'#e5ffff';ctx.lineWidth=s*.009;ctx.stroke();
  ctx.restore();
}
function drawFloatingIslands(lo,hi,time){
  const T=DATA.tile;
  DATA.islands.forEach(function(island,index){
    const x=island.x*T,y=island.y*T,s=island.size*T,cx=x+s/2,cy=y+s/2;
    const rx=s*.55,ry=s*.55,depth=s*.20,bob=islandBob(index,time);
    if(cx-rx>hi.x+40||cy-ry+bob>hi.y+40||cx+rx<lo.x-40||cy+ry+depth+bob<lo.y-40)return;
    const c=islandColors(island),opened=index<state.unlockedIslands;
    ctx.save();ctx.globalAlpha=opened?1:.78;
    const shadowWidth=1-bob*.0015;
    ellipse(cx+24,cy+ry+depth*1.12,rx*.92*shadowWidth,depth*.22*shadowWidth,'#1d425452');
    ctx.translate(0,bob);
    ctx.fillStyle='#273c4b';islandContour(cx,cy+depth,rx*.75,ry*.72,index+1);ctx.fill();
    const cliff=ctx.createLinearGradient(cx,cy+ry*.25,cx,cy+ry+depth);
    cliff.addColorStop(0,c.shadow);cliff.addColorStop(.55,'#52616b');cliff.addColorStop(1,'#263b4d');
    ctx.fillStyle=cliff;islandContour(cx,cy+depth*.42,rx*.94,ry*.88,index+1);ctx.fill();
    ctx.strokeStyle='#273c4b99';ctx.lineWidth=Math.max(3,s*.009);ctx.stroke();
    const face=ctx.createLinearGradient(cx,cy+ry*.65,cx,cy+ry+depth);
    face.addColorStop(0,c.shadow);face.addColorStop(.55,'#566673');face.addColorStop(1,'#263b4c');
    ctx.fillStyle=face;ctx.beginPath();ctx.moveTo(cx-rx,cy+ry*.9);
    ctx.lineTo(cx+rx,cy+ry*.9);ctx.lineTo(cx+rx*.77,cy+ry+depth*.8);
    ctx.lineTo(cx+rx*.15,cy+ry+depth);ctx.lineTo(cx-rx*.22,cy+ry+depth*.91);
    ctx.lineTo(cx-rx*.75,cy+ry+depth*.72);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#a9b5ad4d';ctx.lineWidth=Math.max(2,s*.006);
    for(let n=0;n<7;n++){
      const t=(n+1)/8,px=cx-rx*.72+t*rx*1.44;
      ctx.beginPath();ctx.moveTo(px,cy+ry*.98);
      ctx.lineTo(cx+(px-cx)*.68,cy+ry+depth*(.62+.24*islandHash(n,index)));ctx.stroke();
    }
    for(let n=0;n<9;n++){
      const t=(n+1)/10,px=cx-rx+t*rx*2,py=cy+ry+depth*.38;
      ctx.fillStyle=n%2?'#334857':'#607076';ctx.beginPath();ctx.moveTo(px-22,py);
      ctx.lineTo(px+22,py);ctx.lineTo(px+4,py+depth*(.22+.18*islandHash(n,index)));ctx.fill();
    }
    const top=ctx.createRadialGradient(cx-s*.2,cy-s*.25,s*.05,cx,cy,s*.95);
    top.addColorStop(0,c.rim);top.addColorStop(.66,c.ground);top.addColorStop(1,c.shadow);
    ctx.fillStyle=top;islandContour(cx,cy,rx,ry,index+1);ctx.fill();
    ctx.strokeStyle=c.rim;ctx.lineWidth=Math.max(8,s*.018);ctx.stroke();
    ctx.save();islandContour(cx,cy,rx*.975,ry*.975,index+1);ctx.clip();
    // Broad painted patches and a rim of element-specific scenery make every island recognizable.
    islandFeatures(island.element,cx,cy,s,time);
    for(let n=0;n<(ui.camera.zoom<.32?7:18);n++){
      const a=islandHash(n,index+20)*Math.PI*2,r=.13+islandHash(n+30,index)*.75;
      const px=cx+Math.cos(a)*rx*r,py=cy+Math.sin(a)*ry*r;
      if(px<lo.x-140||px>hi.x+140||py<lo.y-140||py>hi.y+140)continue;
      ctx.fillStyle=n%3===0?c.accent+'4d':c.rim+'46';
      ctx.beginPath();ctx.ellipse(px,py,s*(.025+islandHash(n+42,index)*.04),s*.02,a,0,Math.PI*2);ctx.fill();
    }
    for(let n=0;n<(ui.camera.zoom<.32?16:42);n++){
      const edge=n%4,t=islandHash(n,index+6)*.95-.475;
      const px=cx+(edge<2?t*2*rx:(edge===2?-.92:.92)*rx);
      const py=cy+(edge>=2?t*2*ry:(edge===0?-.92:.92)*ry);
      if(px<lo.x-95||px>hi.x+95||py<lo.y-95||py>hi.y+95)continue;
      islandScenery(island.element,px,py,T*3.7,time,n);
    }
    // The larger edge landmark stays clear of the buildable square.
    const landmarkY=cy-ry*.83;
    if(cx>=lo.x-180&&cx<=hi.x+180&&landmarkY>=lo.y-180&&landmarkY<=hi.y+180)
      islandScenery(island.element,cx,landmarkY,T*9,time,index);
    ctx.restore();
    islandCascade(island.element,cx,cy,ry,depth,s,time);
    const regionSize=DATA.islandRegionSize*T,side=3;
    for(let row=0;row<side;row++)for(let col=0;col<side;col++){
      const r={index,col,row,x:island.x+col*DATA.islandRegionSize,y:island.y+row*DATA.islandRegionSize,
        id:index+':'+col+':'+row};
      const owned=opened&&(regionSet().has(r.id)||legacyRegionFull(r));
      ctx.fillStyle=owned?'#c4ffd015':'#172b4969';
      ctx.fillRect(x+col*regionSize+2,y+row*regionSize+2,regionSize-4,regionSize-4);
      ctx.strokeStyle=owned?'#d7ffca66':'#d6e3e5af';ctx.lineWidth=Math.max(2,T*.22);
      ctx.strokeRect(x+col*regionSize+2,y+row*regionSize+2,regionSize-4,regionSize-4);
      if(!owned&&ui.camera.zoom>=.16){
        ctx.fillStyle='#e8eff9';ctx.font='bold 35px system-ui';ctx.textAlign='center';
        const centerX=(r.x+DATA.islandRegionSize/2)*T,centerY=(r.y+DATA.islandRegionSize/2)*T;
        ctx.fillText('🔒',centerX,centerY-9);
        if(opened&&regionAdjacent(r)){
          ctx.font='bold 25px system-ui';ctx.fillText('● '+money(expansionCost(r.x,r.y)),centerX,centerY+29);
        }
      }
    }
    if(ui.camera.zoom<.25){
      // Zoomed-out overview paints owned regions without iterating millions of tiles.
      ctx.fillStyle=opened?c.accent+"46":"#ffffff18";
      // The nine region overlays above also render when zoomed out.
      ctx.fillStyle='#f4fbef';ctx.strokeStyle='#243946';ctx.lineWidth=Math.max(3,2.4/ui.camera.zoom);
      ctx.textAlign='center';
      ctx.font='bold '+Math.min(750,Math.max(45,13/ui.camera.zoom))+'px system-ui';
      const shortLabel=ui.camera.zoom<.09?(island.element?DATA.elements[island.element].mark:"🏝️"):island.name;
      const label=(opened?"":"🔒 ")+shortLabel,labelY=cy+ry+depth*.72;
      ctx.strokeText(label,cx,labelY);ctx.fillText(label,cx,labelY);
    }
    ctx.restore();
  });
}
/* Fixed seeds keep weather stable from frame to frame; paths stay behind buildings. */
function drawIslandWeather(lo,hi,time){
  const T=DATA.tile,count=DATA.environment?.particlesPerIsland||10;
  DATA.islands.forEach((island,index)=>{
    if(index>=state.unlockedIslands)return;
    const x=island.x*T,y=island.y*T,s=island.size*T;
    const bob=islandBob(index,time);
    if(x>hi.x||x+s<lo.x||y+bob>hi.y||y+s+bob<lo.y)return;
    ctx.save();ctx.translate(0,bob);ctx.beginPath();ctx.rect(x,y,s,s);ctx.clip();
    for(let n=0;n<count;n++){
      const seed=islandHash(n,index+90),speed=4+islandHash(n+40,index)*7;
      const px=x+((seed*s+time*speed*.03)%s),py=y+((islandHash(n+70,index)*s+time*speed*.025)%s);
      const kind=island.element;
      ctx.globalAlpha=.25+.25*Math.sin(time*.002+n)**2;
      if(kind==='water'){
        ctx.strokeStyle='#d9ffff';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(px,py,8+time%150/30,3,0,0,Math.PI*2);ctx.stroke();
      }else if(kind==='fire'){
        ellipse(px,py,2.5+Math.sin(time*.004+n)*1.5,3,'#ffd36b');
      }else if(kind==='ice'){
        ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px-3,py);ctx.lineTo(px+3,py);ctx.moveTo(px,py-3);ctx.lineTo(px,py+3);ctx.stroke();
      }else if(kind==='wind'||kind==='earth'){
        ctx.strokeStyle=kind==='wind'?'#f6fff1':'#f4d9a2';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(px-8,py);ctx.quadraticCurveTo(px,py-5,px+9,py);ctx.stroke();
      }else if(kind==='nature'||!kind){ellipse(px,py,2.3,1.3,kind?'#dfffa0':'#f1f7a4');}
      else if(kind==='dark'||kind==='light'||kind==='thunder'||kind==='metal'){
        ellipse(px,py,2,2,kind==='dark'?'#b5a9ff':kind==='thunder'?'#fff098':'#f4f4d7');
      }
    }
    ctx.restore();
  });ctx.globalAlpha=1;
}
function drawNightLighting(lo,hi,time){
  const night=1-daylightAt(Date.now());
  if(night<.01)return;
  ctx.save();ctx.fillStyle='rgba(17,30,63,'+(night*.54)+')';
  ctx.fillRect(lo.x,lo.y,hi.x-lo.x,hi.y-lo.y);
  ctx.globalCompositeOperation='screen';
  DATA.islands.forEach((island,index)=>{
    if(index>=state.unlockedIslands)return;
    const x=(island.x+island.size*.5)*DATA.tile,
      y=(island.y+island.size*.5)*DATA.tile+islandBob(index,time);
    if(x<lo.x-300||x>hi.x+300||y<lo.y-300||y>hi.y+300)return;
    const glow=island.element==='fire'?'#fc6b30':island.element==='dark'?'#806dc1':
      island.element==='ice'||island.element==='water'?'#86cdeb':'#e3de8a';
    const radius=island.size*DATA.tile*.53;
    const g=ctx.createRadialGradient(x,y,0,x,y,radius);
    g.addColorStop(0,glow+'55');g.addColorStop(1,glow+'00');
    ctx.globalAlpha=night*(.65+.08*Math.sin(time*.002+index));ctx.fillStyle=g;
    ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  });ctx.restore();
}
function drawTile(x,y,time){
  const T=DATA.tile,px=x*T,py=y*T,owned=unlocked(x,y);
  if(owned){
    const noise=(x*17+y*29)%7;
    const island=DATA.islands[islandAt(x,y)]||DATA.islands[0],colors=islandColors(island);
    ctx.globalAlpha=noise<2?.13:noise<5?.09:.11;
    ctx.fillStyle=colors.accent;
    ctx.fillRect(px,py,T+.55,T+.55);
    ctx.globalAlpha=1;ctx.fillStyle=colors.accent;
    if(!unlocked(x,y-1))ctx.fillRect(px,py,T,1.5);
    if(!unlocked(x-1,y))ctx.fillRect(px,py,1.5,T);
    if(!unlocked(x+1,y))ctx.fillRect(px+T-1.5,py,1.5,T);
    if(!unlocked(x,y+1))ctx.fillRect(px,py+T-1.5,T,1.5);
    if((x*17+y*11)%43===0)ellipse(px+T*.45,py+T*.6,1.2,1.8,colors.rim);
  }else if(adjacent(x,y)&&(x+y)%3===0){
    ctx.fillStyle="#d9f3d785";ctx.fillRect(px+T*.43,py+T*.43,2,2);
  }
}
