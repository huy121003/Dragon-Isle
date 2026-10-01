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
/* Back-to-front order in the projected view: lower islands, then right islands, cover earlier ones. */
function islandDrawOrder(){
  return DATA.islands.map((island,index)=>({index,
    center:gridToScreen(island.x+island.size/2,island.y+island.size/2)}))
    .sort((a,b)=>a.center.y-b.center.y||a.center.x-b.center.x||a.index-b.index)
    .map(item=>item.index);
}
function screenToGrid(x,y,time=ui.renderTime??performance.now()){
  const p=screenToWorld(x,y);
  for(const index of islandDrawOrder().reverse()){
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
/* One low landmark at the upper corner identifies each island without covering its land. */
function drawIslandFeature(island,index,time){
  const kind=island.element||'home',c=islandColors(island);
  const at=gridToScreen(island.x+island.size*.1,island.y+island.size*.1);
  const unit=island.size*DATA.tileW/460;
  const poly=(points,fill,edge=c.shadow)=>{
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(const [x,y] of points.slice(1))ctx.lineTo(x,y);
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    if(edge){ctx.strokeStyle=edge;ctx.lineWidth=1.1;ctx.lineJoin='round';ctx.stroke();}
  };
  const line=(points,color,width=1.5)=>{
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(const [x,y] of points.slice(1))ctx.lineTo(x,y);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
  };
  ctx.save();ctx.translate(at.x,at.y);ctx.scale(unit,unit);
  ellipse(0,15,43,9,c.shadow);
  switch(kind){
  case 'fire':
    poly([[-43,14],[-27,-9],[-15,-32],[-11,-44],[12,-44],[18,-29],[43,14]],
      '#633d36');
    poly([[-43,14],[-27,-9],[-15,-32],[-11,-44],[0,-36],[2,14]],'#a4583c');
    ellipse(0,-43,13,4,'#392d35');ellipse(0,-43,8,2.5,'#ff9a42');
    line([[2,-40],[9,-19],[4,-7],[16,8]],'#ef7141',2.7);
    for(let n=0;n<3;n++)ellipse(-6+n*6+Math.sin(time*.001+n)*2,
      -53-n*7,3+n*.6,2.5,'#796d70');break;
  case 'water':
    poly([[-40,12],[-33,-25],[-13,-37],[15,-36],[37,-20],[40,12]],'#4b8791');
    poly([[-13,-37],[15,-36],[25,-19],[-17,-18]],'#9cd2c4');
    poly([[-12,-19],[12,-20],[18,11],[-17,11]],'#45acc7');
    for(const x of [-6,2,9])line([[x,-18],[x-2,3],[x+2,10]],'#ccf5ed',1.7);
    ellipse(0,12,27,5,'#78d6df');break;
  case 'earth':
    poly([[-45,14],[-37,-6],[-23,-14],[-21,-34],[19,-35],[22,-15],[38,-8],[44,14]],
      '#8d694f');
    poly([[-22,-35],[20,-35],[26,-27],[-25,-26]],'#dfbc81');
    line([[-35,0],[-22,-5],[7,-3],[19,4],[38,2]],'#be996e',2);
    poly([[-31,9],[-26,-2],[-13,-2],[-10,9]],'#b29167');break;
  case 'wind':
    poly([[-21,14],[-9,-30],[9,-30],[21,14]],'#d0d7c1');
    poly([[-9,-30],[9,-30],[14,-23],[-13,-23]],'#edf3dc');
    poly([[-13,-32],[0,-40],[13,-32]],'#7d9b94');
    ctx.save();ctx.translate(0,-28);ctx.rotate(time*.00045);
    for(let n=0;n<4;n++){
      ctx.save();ctx.rotate(n*Math.PI/2);
      poly([[-3,-3],[-5,-24],[4,-26],[4,-4]],'#f2f4d9','#8eb5a3');
      ctx.restore();
    }
    ctx.restore();ellipse(0,-28,4,4,'#f6e7ac');break;
  case 'ice':
    for(const [x,w,h] of [[-28,14,43],[3,17,59],[28,12,38]]){
      poly([[x-w,13],[x-w*.55,-h*.62],[x,-h],[x+w,13]],'#8ec9e1');
      poly([[x-w*.55,-h*.62],[x,-h],[x+2,6]],'#e5f8fb');
    }break;
  case 'thunder':
    poly([[-33,14],[-21,-17],[-8,-35],[2,-18],[15,-51],[32,14]],'#5a546f');
    poly([[15,-51],[32,14],[3,10]],'#8c7d91');
    poly([[1,-50],[-9,-18],[2,-19],[-8,8],[20,-27],[7,-25],[17,-50]],
      '#ffdf75','#8f7664');break;
  case 'nature':case 'home':
    poly([[-11,14],[-9,-25],[-2,-41],[8,-40],[12,14]],'#74563d');
    line([[0,-8],[-15,-29]],'#8c6b48',4);
    line([[2,-18],[17,-37]],'#8c6b48',3);
    for(const [x,y,rx,ry] of [[-20,-36,20,16],[0,-46,25,19],[22,-33,20,17]])
      ellipse(x,y,rx,ry,kind==='home'?'#a6ce78':'#4a9c67');
    ellipse(3,-55,17,11,kind==='home'?'#d7e69b':'#8dc782');break;
  case 'dark':
    poly([[-44,14],[-31,-21],[-8,-40],[17,-32],[42,14]],'#574a68');
    poly([[-25,12],[-19,-13],[-5,-25],[12,-18],[25,12]],'#261f36');
    line([[-36,3],[-25,-15],[-9,-31]],'#9885a7',2);
    ellipse(2,1,7,3,'#67527d');break;
  case 'light':
    poly([[-39,14],[-24,-21],[-5,-33],[17,-25],[40,14]],'#d4b983');
    poly([[-5,-33],[17,-25],[31,14],[0,13]],'#f3dfac');
    ellipse(3,-44,13,13,'#fff1b8');ellipse(3,-44,6,6,'#fffbe2');
    line([[-16,1],[-4,-12],[13,-11]],'#fff4d5',2);break;
  case 'metal':
    poly([[-42,14],[-31,-15],[-10,-29],[14,-35],[39,14]],'#657985');
    poly([[-10,-29],[14,-35],[39,14],[3,9]],'#aabcc2');
    for(const path of [[[-31,3],[-12,-7],[9,0]],[[1,-17],[16,-25],[26,-5]]])
      line(path,'#e2d2a3',3);
    for(const [x,y] of [[-18,-3],[15,-16],[26,5]])ellipse(x,y,3,2,'#f4e7ba');break;
  case 'war':
    poly([[-35,14],[-29,-17],[-19,-17],[-19,-29],[19,-29],[19,-17],[29,-17],[35,14]],
      '#86544e');
    poly([[-19,-29],[19,-29],[22,-21],[-22,-21]],'#c48668');
    for(const x of [-15,0,15])poly([[x-4,-29],[x-4,-36],[x+4,-36],[x+4,-29]],'#995a50');
    poly([[-7,14],[-7,-5],[7,-5],[7,14]],'#493a40');break;
  case 'pure':
    for(const [x,w,h] of [[-24,12,37],[0,17,57],[25,12,42]]){
      poly([[x-w,14],[x-w*.65,-h*.5],[x,-h],[x+w,14]],'#ba94bf');
      poly([[x-w*.65,-h*.5],[x,-h],[x+1,10]],'#f7def0');
    }break;
  case 'legend':
    for(const [x,h] of [[-27,31],[-2,49],[24,37]]){
      poly([[x-8,14],[x-7,-h],[x+6,-h+3],[x+9,14]],'#6b598c');
      line([[x-4,-h+8],[x+3,-h+12]],'#b9a4d6',2);
    }break;
  case 'primal':
    poly([[-42,14],[-28,-12],[-6,-19],[18,-13],[41,14]],'#74745c');
    for(let n=0;n<5;n++){
      const x=-25+n*12,h=16+(2-Math.abs(2-n))*6;
      line([[x,5],[x-4,-h],[x+3,-h-5]],'#ddd2aa',3.7);
    }
    line([[-34,6],[32,8]],'#cfbd92',3);break;
  case 'time':
    poly([[-35,14],[-24,-11],[-17,-11],[-10,-29],[17,-29],[23,-10],[36,14]],'#9a8b84');
    ellipse(0,-28,20,7,'#d5c5ad');
    line([[0,-28],[6,-54]],'#e7d7bc',3);
    line([[0,-28],[15,-25]],'#645862',2);break;
  }
  ctx.restore();
}
function islandOutline(island,index){
  const corners=footprintVertices(island.x,island.y,island.size,island.size),points=[];
  for(let edge=0;edge<4;edge++){
    const a=corners[edge],b=corners[(edge+1)%4],dx=b.x-a.x,dy=b.y-a.y;
    const length=Math.hypot(dx,dy),nx=dy/length,ny=-dx/length;
    for(let step=0;step<8;step++){
      const t=step/8,rough=step?Math.sin(Math.PI*t)*
        DATA.tileH*(1.1+1.25*islandHash(edge*11+step,index+90)):0;
      points.push({x:a.x+dx*t+nx*rough,y:a.y+dy*t+ny*rough});
    }
  }
  return points;
}
function islandOutlinePath(points){
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(const p of points.slice(1))ctx.lineTo(p.x,p.y);
  ctx.closePath();
}
function drawIslandGround(island,index,time,colors){
  ctx.save();
  const kind=island.element||'home';
  const accents={fire:'#ff9a52',water:'#bcfff0',earth:'#e9d19a',wind:'#f1fff5',
    ice:'#f4ffff',thunder:'#ffe994',nature:'#d3f1a4',dark:'#c8a7eb',
    light:'#fff4c6',metal:'#d1e6e7',war:'#f9a879',pure:'#f6d2f7',
    legend:'#d7b6ff',primal:'#ebe4b2',time:'#f0ddbc',home:'#d3ed9e'}[kind];
  for(let n=0;n<24;n++){
    const c=island.x+4+islandHash(n+10,index+210)*(island.size-8);
    const r=island.y+4+islandHash(n+81,index+310)*(island.size-8);
    const p=gridToScreen(c,r),radius=DATA.tileW*(1.5+islandHash(n+40,index)*2.5);
    ctx.globalAlpha=.13+islandHash(n+70,index)*.12;
    ellipse(p.x,p.y,radius,radius*.24,n%3?accents:colors.rim);
  }
  ctx.globalAlpha=1;
  for(let n=0;n<9;n++){
    const c=island.x+7+islandHash(n,index+350)*(island.size-14);
    const r=island.y+7+islandHash(n+36,index+350)*(island.size-14);
    const start=gridToScreen(c,r),turn=islandHash(n+74,index)*Math.PI*2;
    ctx.beginPath();ctx.moveTo(start.x,start.y);
    for(let step=1;step<4;step++){
      const p=gridToScreen(c+Math.cos(turn)*step*1.7,
        r+Math.sin(turn)*step*1.7+Math.sin(time*.0007+n)*.06);
      ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle=accents+'79';ctx.lineWidth=DATA.tileH*(kind==='water'||kind==='fire'?.85:.35);
    ctx.lineCap='round';ctx.stroke();
  }
  // Small, flat details fill the open land without hiding buildings or touch targets.
  for(let n=0;n<64;n++){
    const c=island.x+3+islandHash(n+171,index+530)*(island.size-6);
    const r=island.y+3+islandHash(n+281,index+630)*(island.size-6);
    const p=gridToScreen(c,r),s=DATA.tileW*(.35+islandHash(n+45,index+720)*.4);
    if(kind==='water'||kind==='ice'){
      ctx.beginPath();ctx.ellipse(p.x,p.y,s,s*.3,0,0,Math.PI*2);
      ctx.strokeStyle=accents+'a0';ctx.lineWidth=DATA.tileH*.07;ctx.stroke();
    }else if(kind==='fire'||kind==='thunder'||kind==='dark'){
      ctx.beginPath();ctx.moveTo(p.x-s,p.y+s*.1);ctx.lineTo(p.x,p.y-s*.24);
      ctx.lineTo(p.x+s*.7,p.y+s*.17);
      ctx.strokeStyle=accents+'a0';ctx.lineWidth=DATA.tileH*.1;ctx.stroke();
    }else if(n%3===0){
      ellipse(p.x,p.y,s*.8,s*.23,colors.rim+'a0');
      ellipse(p.x-s*.12,p.y-s*.07,s*.53,s*.14,accents+'a0');
    }else{
      ctx.beginPath();ctx.moveTo(p.x,p.y+s*.1);
      ctx.lineTo(p.x-s*.3,p.y-s*.38);ctx.moveTo(p.x,p.y+s*.1);
      ctx.lineTo(p.x+s*.3,p.y-s*.42);
      ctx.strokeStyle=accents+'a0';ctx.lineWidth=DATA.tileH*.075;ctx.stroke();
    }
  }
  ctx.restore();
}
function drawFloatingIslands(lo,hi,time,drawContents){
  islandDrawOrder().forEach(function(index){
    const island=DATA.islands[index];
    const v=footprintVertices(island.x,island.y,island.size,island.size);
    const xs=v.map(p=>p.x),ys=v.map(p=>p.y),depth=island.size*DATA.tileH*.22;
    const edgeMargin=island.size*DATA.tileW*.18;
    if(Math.max(...xs)+edgeMargin<lo.x||Math.min(...xs)-edgeMargin>hi.x||
      Math.max(...ys)+depth+edgeMargin<lo.y||Math.min(...ys)-edgeMargin>hi.y)return;
    const c=islandColors(island),opened=index<state.unlockedIslands;
    const bob=islandBob(index,time),width=Math.max(...xs)-Math.min(...xs);
    const rim=islandOutline(island,index);
    const bottom=rim.map((p,n)=>({x:p.x+(v[2].x-p.x)*.025,
      y:p.y+depth*(.69+.18*islandHash(n+37,index+440))}));
    ctx.save();
    ctx.save();ctx.translate(v[2].x+width*.025,v[2].y+depth*1.42);
    ctx.scale(1,depth/width*.72);
    const shadow=ctx.createRadialGradient(0,0,0,0,0,width*.48);
    shadow.addColorStop(0,'#193b5566');shadow.addColorStop(1,'#193b5500');
    ctx.fillStyle=shadow;ctx.fillRect(-width*.48,-width*.48,width*.96,width*.96);
    ctx.restore();
    ctx.translate(0,bob);
    for(const [from,to,fill] of [[8,16,c.shadow],[16,24,blendHex(c.shadow,'#293f55',.34)]]){
      ctx.beginPath();ctx.moveTo(rim[from].x,rim[from].y);
      for(let n=from+1;n<=to;n++)ctx.lineTo(rim[n].x,rim[n].y);
      for(let n=to;n>=from;n--)ctx.lineTo(bottom[n].x,bottom[n].y);
      ctx.closePath();ctx.fillStyle=fill;ctx.fill();
      for(let n=from+1;n<to;n+=2){
        islandPolygon([[rim[n].x,rim[n].y],[rim[n+1].x,rim[n+1].y],
          [bottom[n+1].x,bottom[n+1].y],[bottom[n].x,bottom[n].y]],
          n%4?'#ffffff10':'#0d293521');
      }
    }
    for(const n of [11,14,18,21]){
      const a=bottom[n],b=bottom[n+1];
      islandPolygon([[a.x,a.y],[b.x,b.y],[(a.x+b.x)/2,(a.y+b.y)/2+depth*.13]],
        n%2?c.shadow:'#334b57');
    }
    const top=ctx.createLinearGradient(v[0].x,v[0].y,v[2].x,v[2].y);
    top.addColorStop(0,c.rim);top.addColorStop(.6,c.ground);top.addColorStop(1,c.shadow);
    islandOutlinePath(rim);
    ctx.fillStyle=top;ctx.fill();ctx.strokeStyle=c.rim;ctx.lineWidth=DATA.tileH*.38;ctx.stroke();
    drawIslandGround(island,index,time,c);
    if(!opened){
      islandOutlinePath(rim);ctx.fillStyle='#1b283a45';ctx.fill();
    }
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const r={index,col,row,x:island.x+col*DATA.islandRegionSize,
        y:island.y+row*DATA.islandRegionSize,id:index+':'+col+':'+row};
      const owned=opened&&(regionSet().has(r.id)||legacyRegionFull(r));
      footprintPath(r.x,r.y,DATA.islandRegionSize,DATA.islandRegionSize);
      ctx.fillStyle=owned?'#c4ffd012':'#172b492e';ctx.fill();
      ctx.strokeStyle=ui.camera.zoom<.19?c.accent+'20':
        (owned?c.accent+'38':'#d6e3e538');ctx.lineWidth=DATA.tileH*.085;ctx.stroke();
      if(!owned&&ui.camera.zoom>=.16){
        const center=gridToScreen(r.x+DATA.islandRegionSize/2,r.y+DATA.islandRegionSize/2);
        ctx.fillStyle='#e8eff9';ctx.font='bold 35px system-ui';ctx.textAlign='center';
        ctx.fillText('🔒',center.x,center.y-9);
        if(opened&&regionAdjacent(r)){
          ctx.font='bold 25px system-ui';ctx.fillText('● '+money(expansionCost(r.x,r.y)),center.x,center.y+29);
        }
      }
    }
    drawIslandFeature(island,index,time);
    if(ui.camera.zoom<.25){
      ctx.fillStyle='#f4fbef';ctx.strokeStyle='#243946';ctx.lineWidth=4;
      ctx.textAlign='center';ctx.font='bold '+Math.min(400,Math.max(45,14/ui.camera.zoom))+'px system-ui';
      const label=(opened?'':'🔒 ')+island.name;
      ctx.strokeText(label,v[2].x,v[2].y+depth*.53);
      ctx.fillText(label,v[2].x,v[2].y+depth*.53);
    }
    ctx.restore();
    if(drawContents)drawContents(index);
  });
}
function drawIslandWeather(index,time){
  const count=DATA.environment?.particlesPerIsland||10;
  if(index>=state.unlockedIslands)return;
  const island=DATA.islands[index];
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
