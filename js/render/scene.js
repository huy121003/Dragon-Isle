"use strict";

function drawParticles(dt){
  for(const p of ui.particles){
    if(p.life<=0)continue;
    p.life-=dt;
    if(p.life<=0)continue;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=45*dt;
    ctx.globalAlpha=clamp(p.life/p.max,0,1);
    ellipse(p.x,p.y,p.size,p.size,p.color);
  }
  ctx.globalAlpha=1;
}
function drawScene(time,dt){
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  drawBackground(time);
  ctx.translate(viewW/2,viewH/2);ctx.scale(ui.camera.zoom,ui.camera.zoom);
  ctx.translate(-ui.camera.x,-ui.camera.y);
  const lo=screenToWorld(-DATA.tile,-DATA.tile),hi=screenToWorld(viewW+DATA.tile,viewH+DATA.tile);
  drawFloatingIslands(lo,hi,time);
  drawIslandWeather(lo,hi,time);
  // Region overlays draw the ownership grid; avoid thousands of per-tile paths each frame.
  state.buildings.forEach(function(b){
    if(b.stored||ui.camera.zoom<.13)return;
    const f=buildingFootprint(b);
    const index=islandAt(b.x,b.y),bob=index>=0?islandBob(index,time):0;
    if(b.x*DATA.tile>hi.x||(b.y*DATA.tile+bob)>hi.y||
      (b.x+f.w)*DATA.tile<lo.x||(b.y+f.h)*DATA.tile+bob<lo.y)return;
    ctx.save();ctx.translate(0,bob);drawBuilding(b,time);ctx.restore();
  });
  if(ui.mode&&ui.mode.x!==null){
    const x=ui.mode.x,y=ui.mode.y,T=DATA.tile;
    if(inside(x,y)){
      const f=placementFootprint(ui.mode),valid=getBuildValid(x,y,ui.mode);
      const index=islandAt(x,y);
      ctx.save();if(index>=0)ctx.translate(0,islandBob(index,time));
      ctx.fillStyle=valid?"#86f6a888":"#ff687d99";
      rounded(x*T+2,y*T+2,f.w*T-4,f.h*T-4,9);ctx.fill();
      ctx.lineWidth=3;ctx.strokeStyle=valid?"#d9ffe3":"#ffd3d5";ctx.stroke();
      ctx.fillStyle="#ffffff";ctx.textAlign="center";ctx.font="bold 13px system-ui";
      ctx.fillText(f.w+"×"+f.h,(x+f.w/2)*T,(y+f.h/2)*T+4);
      ctx.restore();
    }
  }
  drawParticles(dt);
  drawNightLighting(lo,hi,time);
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
}
function burst(x,y,color,count){
  const index=islandAt(Math.floor(x/DATA.tile),Math.floor(y/DATA.tile));
  const floatingY=y+(index>=0?islandBob(index,performance.now()):0);
  for(let i=0;i<count;i++){
    let p=ui.particles.find(function(item){return item.life<=0;});
    if(!p){p=ui.particles[ui.particleCursor++%ui.particles.length];}
    const a=Math.random()*Math.PI*2,speed=20+Math.random()*75;
    Object.assign(p,{x:x,y:floatingY,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-35,
      life:.45+Math.random()*.5,max:1,color:color,size:1.8+Math.random()*2.8});
  }
}
function floating(message,x,y){
  const index=islandAt(Math.floor(x/DATA.tile),Math.floor(y/DATA.tile));
  const pos=worldToScreen(x,y+(index>=0?islandBob(index,performance.now()):0)),item=document.createElement("div");
  item.className="float-number";item.textContent=message;
  item.style.left=pos.x+"px";item.style.top=pos.y+"px";
  dom.stage.appendChild(item);setTimeout(function(){item.remove();},1100);
}
