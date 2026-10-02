"use strict";

/* RENDER: Background, island terrain/cloud/weather/light and tile artwork. */
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
/* Purchased islands reveal their terrain; unreached islands remain under dense cloud. */
function islandCloudOpacity(index,time){
  if(index>=state.unlockedIslands)return 1;
  const reveal=ui.cloudReveal;
  if(!reveal||reveal.index!==index)return 0;
  return Math.max(0,Math.min(1,1-(time-reveal.startedAt)/1800));
}
function drawIslandClouds(island,index,time,rim,bottom,opacity){
  const center=gridToScreen(island.x+island.size/2,island.y+island.size/2);
  const side=island.size*DATA.tileW*.08,down=island.size*DATA.tileH*.09;
  const disperse=(1-opacity)*DATA.tileW*3;
  ctx.save();ctx.globalAlpha=opacity;
  // Opaque coverage follows the same rocky outline, including both visible cliff faces.
  ctx.beginPath();ctx.moveTo(rim[8].x,rim[8].y);
  for(let n=9;n<=24;n++)ctx.lineTo(rim[n].x,rim[n].y);
  for(let n=24;n>=8;n--)ctx.lineTo(bottom[n].x,bottom[n].y);
  ctx.closePath();ctx.fillStyle='#eaf5fc';ctx.fill();
  islandOutlinePath(rim);ctx.fillStyle='#f8fcff';ctx.fill();
  ctx.save();islandOutlinePath(rim);ctx.clip();
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const p=gridToScreen(island.x+(col+.5)*island.size/4,
      island.y+(row+.5)*island.size/4);
    const drift=Math.sin(time*.00035+index+row*2+col)*DATA.tileW*.2;
    ellipse(p.x+drift+(p.x<center.x?-disperse:disperse),p.y-down*.35,
      side*1.7,down*(1.4+islandHash(col+row*4,index)*.45),
      (row+col)%3?'#ffffff':'#eaf6fd');
  }
  ctx.restore();
  // Rounded wisps soften the diamond rim without spilling across neighboring islands.
  ctx.globalAlpha=opacity*.85;
  for(let n=0;n<rim.length;n+=2){
    const p=rim[n],outward=p.x<center.x?-disperse:disperse;
    ellipse(p.x+outward,p.y-down*.2,side*.65,down*.56,
      n%4?'#f9fdff':'#e8f5fb');
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
    const cloudOpacity=islandCloudOpacity(index,time);
    if(cloudOpacity>0)drawIslandClouds(island,index,time,rim,bottom,cloudOpacity);
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
