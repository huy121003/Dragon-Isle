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
/* Saved (x,y) values are grid cells; the camera transforms projected world pixels only. */
function gridToScreen(c,r){return {x:DATA.originX+(c-r)*DATA.tileW/2,
  y:DATA.originY+(c+r)*DATA.tileH/2};}
function worldToGrid(x,y){
  const a=(x-DATA.originX)/(DATA.tileW/2),b=(y-DATA.originY)/(DATA.tileH/2);
  return {c:(a+b)/2,r:(b-a)/2};
}
/* Animation is a visual displacement of an island, never a change to its saved grid cells. */
function islandBob(index,time=ui.renderTime??performance.now()){
  if(index<0)return 0;
  return (Math.sin(time*.00115+index*1.73)*.85+
    Math.sin(time*.00043+index*2.19)*.15)*DATA.tileH*1.35;
}
function screenToGrid(x,y,time=ui.renderTime??performance.now()){
  const p=screenToWorld(x,y);
  for(let index=0;index<DATA.islands.length;index++){
    const island=DATA.islands[index],candidate=worldToGrid(p.x,p.y-islandBob(index,time));
    if(candidate.c>=island.x&&candidate.c<island.x+island.size&&
      candidate.r>=island.y&&candidate.r<island.y+island.size)return candidate;
  }
  return worldToGrid(p.x,p.y);
}
function footprintVertices(c,r,w,h){return [gridToScreen(c,r),gridToScreen(c+w,r),
  gridToScreen(c+w,r+h),gridToScreen(c,r+h)];}
function footprintPath(c,r,w,h){
  const points=footprintVertices(c,r,w,h);
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(const p of points.slice(1))ctx.lineTo(p.x,p.y);
  ctx.closePath();return points;
}
function screenCell(x,y){const p=screenToGrid(x,y);return {x:Math.floor(p.c),y:Math.floor(p.r)};}
function clampCamera(){
  const points=DATA.islands.flatMap(i=>footprintVertices(i.x,i.y,i.size,i.size));
  ui.camera.x=clamp(ui.camera.x,Math.min(...points.map(p=>p.x))-DATA.tileW*20,
    Math.max(...points.map(p=>p.x))+DATA.tileW*20);
  ui.camera.y=clamp(ui.camera.y,Math.min(...points.map(p=>p.y))-DATA.tileH*20,
    Math.max(...points.map(p=>p.y))+DATA.tileH*20);
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
function islandHash(n,seed){return ((Math.sin(n*127.1+seed*78.233)*43758.5453)%1+1)%1;}
function islandPolygon(points,fill,stroke){
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(const [x,y] of points.slice(1))ctx.lineTo(x,y);
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.025;ctx.stroke();}
}
/* Landmarks live on the projected grid, behind buildings, with readable silhouettes at overview zoom. */
function drawIslandLandmark(island,index,time){
  const kind=island.element||'home',size=island.size,scale=size*DATA.tileW*.12;
  const positions=[[.14,.11,1],[.74,.08,.53],[.08,.74,.48]];
  positions.forEach(([dc,dr,ratio],variant)=>{
    const at=gridToScreen(island.x+size*dc,island.y+size*dr);
    ctx.save();ctx.translate(at.x,at.y);ctx.scale(scale*ratio,scale*ratio);
    const color=islandColors(island);
    ctx.globalAlpha=variant? .86:1;
    ellipse(0,.12,.48,.145,color.shadow);
    islandPolygon([[-.48,.1],[0,-.055],[.48,.1],[0,.265]],color.rim,color.accent);
    const diamond=fill=>islandPolygon([[0,-.8],[.25,-.24],[0,.02],[-.25,-.24]],fill,color.rim);
    switch(kind){
    case 'fire':
      islandPolygon([[-.45,.06],[-.29,-.82],[-.07,-.45],[.05,-1.23],[.35,.05]],'#362c35','#f06b37');
      islandPolygon([[-.06,-.4],[.05,-1.21],[.18,-.45],[.04,-.59]],'#ff8b42');
      islandPolygon([[-.16,.05],[.06,-.48],[.2,-.09],[.35,.09]],'#ff643b','#ffcb67');
      ellipse(.08,-.18,.1,.16,'#ffe084');break;
    case 'water':
      ellipse(0,.03,.43,.16,'#1b759b');ellipse(0,-.01,.32,.115,'#9bf3e9');
      islandPolygon([[-.17,.03],[-.08,-.7],[.08,-.87],[.17,.02]],'#b1f5e9','#f1ffff');
      islandPolygon([[.12,-.68],[.25,-.93],[.35,-.45],[.16,-.12]],'#6dc8dd');
      ellipse(-.02,-.64,.09,.085,'#eeffff');break;
    case 'earth':
      islandPolygon([[-.42,.08],[-.3,-.68],[-.05,-.95],[.04,-.32],[.27,-.69],[.41,.08]],'#795c4a','#e3be7d');
      islandPolygon([[-.29,-.66],[-.05,-.95],[.04,-.32],[-.16,-.4]],'#d4ab70');
      islandPolygon([[.18,-.65],[.3,-.96],[.41,-.55],[.31,-.15]],'#b58d5a');break;
    case 'wind':
      islandPolygon([[-.2,.08],[-.11,-.72],[0,-.98],[.11,-.72],[.2,.08]],'#d8eee1','#ffffff');
      for(let n=0;n<3;n++){
        const y=-.73+n*.2,wave=Math.sin(time*.0018+n)*.08;
        ctx.beginPath();ctx.moveTo(-.42,y);
        ctx.bezierCurveTo(-.12+wave,y-.21,.15-wave,y+.18,.41,y-.13);
        ctx.strokeStyle=n?'#eefdf0':'#92d7db';ctx.lineWidth=.07-n*.012;ctx.stroke();
      }break;
    case 'ice':
      for(const [x,y,h] of [[-.27,.05,.77],[.08,.08,1.22],[.32,.05,.86]])
        islandPolygon([[x-.11,y],[x-.07,y-h*.72],[x,y-h],[x+.105,y-h*.55],[x+.1,y]],'#87d4e9','#ecffff');
      islandPolygon([[.01,-1.12],[.08,-1.22],[.12,-.95]],'#ffffff');break;
    case 'thunder':
      ellipse(-.17,-.83,.29,.15,'#525272');ellipse(.12,-.89,.31,.19,'#686781');
      ellipse(.29,-.77,.2,.13,'#4d4d70');
      islandPolygon([[.06,-.78],[-.12,-.32],[.03,-.34],[-.13,.07],[.3,-.49],[.1,-.46],[.25,-.78]],
        '#ffe56b','#fff7bc');break;
    case 'nature':case 'home':
      islandPolygon([[-.1,.1],[-.085,-.67],[.06,-.76],[.12,.1]],'#6c4937','#a57948');
      ellipse(-.24,-.68,.3,.25,'#4f9c56');ellipse(.2,-.73,.32,.28,'#66b663');
      ellipse(0,-.99,.27,.25,kind==='home'?'#b4de7b':'#388c58');
      for(const [x,y] of [[-.35,-.3],[.36,-.25]])ellipse(x,y,.08,.09,'#f5dc88');break;
    case 'dark':
      islandPolygon([[-.33,.08],[-.21,-.87],[-.06,-.5],[.05,-1.19],[.29,-.53],[.34,.08]],
        '#372e4e','#b29bd0');
      ellipse(.08,-.75,.14,.16,'#bd9cdb');ellipse(.14,-.78,.14,.16,'#514461');break;
    case 'light':
      islandPolygon([[-.25,.07],[-.18,-.75],[0,-1.12],[.18,-.75],[.25,.07]],'#f0dc9c','#fff7d2');
      ellipse(0,-.67,.21,.21,'#ffe5a1');ellipse(0,-.67,.105,.105,'#fffbea');
      for(let n=0;n<8;n++){const a=n*Math.PI/4;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*.25,Math.sin(a)*.25-.67);
        ctx.lineTo(Math.cos(a)*.36,Math.sin(a)*.36-.67);
        ctx.strokeStyle='#ffefad';ctx.lineWidth=.04;ctx.stroke();}break;
    case 'metal':
      islandPolygon([[-.31,.07],[-.27,-.68],[-.1,-.91],[.12,-.91],[.29,-.68],[.31,.07]],
        '#536b77','#d3e4df');
      ellipse(0,-.46,.27,.27,'#b9ced0');ellipse(0,-.46,.15,.15,'#526e7d');
      for(let n=0;n<8;n++){const a=n*Math.PI/4;
        islandPolygon([[Math.cos(a)*.26,Math.sin(a)*.26-.46],
          [Math.cos(a)*.37,Math.sin(a)*.37-.46],
          [Math.cos(a+.2)*.37,Math.sin(a+.2)*.37-.46]],'#d3e5dd');}break;
    case 'war':
      islandPolygon([[-.35,.09],[-.35,-.64],[0,-.87],[.35,-.64],[.35,.09]],'#743d43','#e7a06f');
      for(const x of [-.27,.27])islandPolygon([[x-.08,-.6],[x-.08,-.88],[x+.08,-.88],[x+.08,-.6]],'#a6584d');
      islandPolygon([[0,-1.16],[.33,-1.04],[.22,-.79],[0,-.85]],'#d95a50','#ffe3a2');
      ctx.beginPath();ctx.moveTo(0,-1.18);ctx.lineTo(0,.06);ctx.strokeStyle='#f6d18d';ctx.lineWidth=.035;ctx.stroke();break;
    case 'pure':case 'legend':
      ctx.beginPath();ctx.ellipse(0,-.45,.28,.43,0,0,Math.PI*2);
      ctx.fillStyle=kind==='pure'?'#9b6cab':'#503678';ctx.fill();
      ctx.strokeStyle=kind==='pure'?'#fbdaf4':'#d4a9ff';ctx.lineWidth=.085;ctx.stroke();
      diamond(kind==='pure'?'#f8dcf0':'#9c78d5');
      ellipse(0,-.45,.095,.12,'#fff0cf');break;
    case 'primal':
      for(const x of [-.29,0,.29])islandPolygon([[x-.09,.08],[x-.08,-.57-(x===0?.3:0)],
        [x,-.73-(x===0?.3:0)],[x+.09,-.57-(x===0?.3:0)],[x+.09,.08]],'#747356','#e8dca5');
      ellipse(0,-.51,.115,.11,'#cfbd84');break;
    case 'time':
      islandPolygon([[-.27,.08],[-.24,-.92],[.24,-.92],[.27,.08]],'#6d6170','#e9d9bd');
      ctx.beginPath();ctx.ellipse(0,-.48,.25,.27,0,0,Math.PI*2);
      ctx.fillStyle='#d1bfa4';ctx.fill();ctx.strokeStyle='#fff0d2';ctx.lineWidth=.07;ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,-.48);ctx.lineTo(0,-.67);
      ctx.moveTo(0,-.48);ctx.lineTo(.13,-.4);ctx.stroke();break;
    }
    ctx.restore();
  });
}
function drawFloatingIslands(lo,hi,time){
  DATA.islands.forEach(function(island,index){
    const v=footprintVertices(island.x,island.y,island.size,island.size);
    const xs=v.map(p=>p.x),ys=v.map(p=>p.y),depth=island.size*DATA.tileH*.18;
    if(Math.max(...xs)<lo.x||Math.min(...xs)>hi.x||
      Math.max(...ys)+depth+DATA.tileH*2<lo.y||Math.min(...ys)-DATA.tileH*2>hi.y)return;
    const c=islandColors(island),opened=index<state.unlockedIslands;
    const bob=islandBob(index,time),width=Math.max(...xs)-Math.min(...xs);
    ctx.save();ctx.globalAlpha=opened?1:.75;
    ctx.save();ctx.translate(v[2].x+width*.025,v[2].y+depth*1.42);
    ctx.scale(1,depth/width*.72);
    const shadow=ctx.createRadialGradient(0,0,0,0,0,width*.48);
    shadow.addColorStop(0,'#193b5566');shadow.addColorStop(1,'#193b5500');
    ctx.fillStyle=shadow;ctx.fillRect(-width*.48,-width*.48,width*.96,width*.96);
    ctx.restore();
    ctx.translate(0,bob);
    const tip={x:v[2].x,y:v[2].y+depth*1.19};
    const right={x:v[1].x-width*.045,y:v[1].y+depth*.35};
    const left={x:v[3].x+width*.045,y:v[3].y+depth*.35};
    ctx.fillStyle=c.shadow;ctx.beginPath();ctx.moveTo(v[1].x,v[1].y);
    ctx.lineTo(v[2].x,v[2].y);ctx.lineTo(tip.x,tip.y);
    ctx.lineTo(right.x,right.y);ctx.closePath();ctx.fill();
    ctx.fillStyle=blendHex(c.shadow,'#293f55',.35);ctx.beginPath();
    ctx.moveTo(v[2].x,v[2].y);ctx.lineTo(v[3].x,v[3].y);
    ctx.lineTo(left.x,left.y);ctx.lineTo(tip.x,tip.y);ctx.closePath();ctx.fill();
    for(let n=1;n<7;n++){
      const t=n/7,a=v[n%2?1:3],end=n%2?right:left;
      ctx.strokeStyle=n%2?'#ffffff20':'#152b3755';ctx.lineWidth=DATA.tileH*.11;
      ctx.beginPath();ctx.moveTo(a.x+(v[2].x-a.x)*t,a.y+(v[2].y-a.y)*t);
      ctx.lineTo(end.x+(tip.x-end.x)*t,end.y+(tip.y-end.y)*t);ctx.stroke();
    }
    const top=ctx.createLinearGradient(v[0].x,v[0].y,v[2].x,v[2].y);
    top.addColorStop(0,c.rim);top.addColorStop(.6,c.ground);top.addColorStop(1,c.shadow);
    footprintPath(island.x,island.y,island.size,island.size);
    ctx.fillStyle=top;ctx.fill();ctx.strokeStyle=c.rim;ctx.lineWidth=DATA.tileH*.38;ctx.stroke();
    footprintPath(island.x+1.5,island.y+1.5,island.size-3,island.size-3);
    ctx.strokeStyle=c.accent+'70';ctx.lineWidth=DATA.tileH*.13;ctx.stroke();
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const r={index,col,row,x:island.x+col*DATA.islandRegionSize,
        y:island.y+row*DATA.islandRegionSize,id:index+':'+col+':'+row};
      const owned=opened&&(regionSet().has(r.id)||legacyRegionFull(r));
      footprintPath(r.x,r.y,DATA.islandRegionSize,DATA.islandRegionSize);
      ctx.fillStyle=owned?'#c4ffd012':'#172b492e';ctx.fill();
      ctx.strokeStyle=owned?c.accent+'42':'#d6e3e53f';ctx.lineWidth=DATA.tileH*.1;ctx.stroke();
      if(!owned&&ui.camera.zoom>=.16){
        const center=gridToScreen(r.x+DATA.islandRegionSize/2,r.y+DATA.islandRegionSize/2);
        ctx.fillStyle='#e8eff9';ctx.font='bold 35px system-ui';ctx.textAlign='center';
        ctx.fillText('🔒',center.x,center.y-9);
        if(opened&&regionAdjacent(r)){
          ctx.font='bold 25px system-ui';ctx.fillText('● '+money(expansionCost(r.x,r.y)),center.x,center.y+29);
        }
      }
    }
    drawIslandLandmark(island,index,time);
    if(ui.camera.zoom<.25){
      ctx.fillStyle='#f4fbef';ctx.strokeStyle='#243946';ctx.lineWidth=4;
      ctx.textAlign='center';ctx.font='bold '+Math.min(400,Math.max(45,14/ui.camera.zoom))+'px system-ui';
      const label=(opened?'':'🔒 ')+island.name;
      ctx.strokeText(label,v[2].x,v[2].y+depth*.53);
      ctx.fillText(label,v[2].x,v[2].y+depth*.53);
    }
    ctx.restore();
  });
}
function drawIslandWeather(lo,hi,time){
  const count=DATA.environment?.particlesPerIsland||10;
  DATA.islands.forEach((island,index)=>{
    if(index>=state.unlockedIslands)return;
    const v=footprintVertices(island.x,island.y,island.size,island.size);
    if(Math.max(...v.map(p=>p.x))<lo.x||Math.min(...v.map(p=>p.x))>hi.x||
      Math.max(...v.map(p=>p.y))<lo.y||Math.min(...v.map(p=>p.y))>hi.y)return;
    ctx.save();ctx.translate(0,islandBob(index,time));
    footprintPath(island.x,island.y,island.size,island.size);ctx.clip();
    for(let n=0;n<count;n++){
      const speed=4+islandHash(n+40,index)*7;
      const c=island.x+((islandHash(n,index+90)*island.size+time*speed*.0004)%island.size);
      const r=island.y+((islandHash(n+70,index)*island.size+time*speed*.00025)%island.size);
      const p=gridToScreen(c,r),kind=island.element;
      ctx.globalAlpha=.25+.25*Math.sin(time*.002+n)**2;
      if(kind==='water'){
        ctx.strokeStyle='#d9ffff';ctx.lineWidth=2;ctx.beginPath();
        ctx.ellipse(p.x,p.y,10,4,0,0,Math.PI*2);ctx.stroke();
      }else ellipse(p.x,p.y,3,2,kind==='fire'?'#ffd36b':kind==='ice'?'#fff':
        kind==='dark'?'#b5a9ff':'#dfffa0');
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
    const p=gridToScreen(island.x+island.size/2,island.y+island.size/2);
    p.y+=islandBob(index,time);
    const radius=island.size*DATA.tileW*.5;
    if(p.x<lo.x-radius||p.x>hi.x+radius||p.y<lo.y-radius||p.y>hi.y+radius)return;
    const glow=island.element==='fire'?'#fc6b30':island.element==='dark'?'#806dc1':
      island.element==='ice'||island.element==='water'?'#86cdeb':'#e3de8a';
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
    g.addColorStop(0,glow+'55');g.addColorStop(1,glow+'00');
    ctx.globalAlpha=night;ctx.fillStyle=g;
    ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
  });ctx.restore();
}
function drawTile(c,r){
  if(!unlocked(c,r))return;
  const island=DATA.islands[islandAt(c,r)]||DATA.islands[0];
  footprintPath(c,r,1,1);
  ctx.fillStyle=islandColors(island).accent+'22';ctx.fill();
  ctx.strokeStyle=islandColors(island).rim+'55';ctx.lineWidth=.7;ctx.stroke();
}
