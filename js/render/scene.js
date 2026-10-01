"use strict";

function drawParticles(dt){
  for(const p of ui.particles){
    if(p.life<=0)continue;
    p.life-=dt;
    if(p.life<=0)continue;
    p.c+=p.vc*dt;p.r+=p.vr*dt;
    const gravity=worldToGrid(DATA.originX,DATA.originY+45*dt);
    p.vc+=gravity.c;p.vr+=gravity.r;
    ctx.globalAlpha=clamp(p.life/p.max,0,1);
    const point=gridToScreen(p.c,p.r);
    ellipse(point.x,point.y,p.size,p.size,p.color);
  }
  ctx.globalAlpha=1;
}
function drawScene(time,dt){
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  drawBackground(time);
  ctx.translate(viewW/2,viewH/2);ctx.scale(ui.camera.zoom,ui.camera.zoom);
  ctx.translate(-ui.camera.x,-ui.camera.y);
  const margin=DATA.tileW*2,lo=screenToWorld(-margin,-margin),
    hi=screenToWorld(viewW+margin,viewH+margin);
  drawFloatingIslands(lo,hi,time);
  drawIslandWeather(lo,hi,time);
  const visible=state.buildings.filter(b=>!b.stored).sort((a,b)=>{
    const af=buildingFootprint(a),bf=buildingFootprint(b);
    return (a.x+af.w-1+a.y+af.h-1)-(b.x+bf.w-1+b.y+bf.h-1)||a.id-b.id;
  });
  visible.forEach(function(b){
    const f=buildingFootprint(b),v=footprintVertices(b.x,b.y,f.w,f.h);
    if(Math.max(...v.map(p=>p.x))<lo.x-margin||Math.min(...v.map(p=>p.x))>hi.x+margin||
      Math.max(...v.map(p=>p.y))<lo.y-margin||Math.min(...v.map(p=>p.y))>hi.y+margin)return;
    drawBuilding(b,time);
    if(ui.debugIso)drawDebugFootprint(b.x,b.y,f.w,f.h,'#a8efff',true);
  });
  if(ui.mode&&ui.mode.x!==null){
    const x=ui.mode.x,y=ui.mode.y;
    if(inside(x,y)){
      const f=placementFootprint(ui.mode),valid=getBuildValid(x,y,ui.mode);
      footprintPath(x,y,f.w,f.h);
      ctx.fillStyle=valid?'#86f6a888':'#ff687d99';ctx.fill();
      ctx.lineWidth=3;ctx.strokeStyle=valid?'#d9ffe3':'#ffd3d5';ctx.stroke();
      const p=gridToScreen(x+f.w/2,y+f.h/2);
      ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold 25px system-ui';
      ctx.fillText(f.w+'×'+f.h+' ô',p.x,p.y+7);
      if(ui.debugIso)drawDebugFootprint(x,y,f.w,f.h,valid?'#7bffc4':'#ff687d',true);
    }
  }
  if(ui.debugIso){
    for(const island of DATA.islands.slice(0,state.unlockedIslands)){
      // Draw a bounded local grid around the cursor to keep overview rendering responsive.
      const pointer=ui.pointerWorld||gridToScreen(island.x+island.size/2,island.y+island.size/2);
      const grid=worldToGrid(pointer.x,pointer.y);
      for(let c=Math.max(island.x,Math.floor(grid.c)-12);c<Math.min(island.x+island.size,Math.floor(grid.c)+12);c++)
        for(let r=Math.max(island.y,Math.floor(grid.r)-12);r<Math.min(island.y+island.size,Math.floor(grid.r)+12);r++){
          footprintPath(c,r,1,1);ctx.strokeStyle='#ffffff55';ctx.lineWidth=.7;ctx.stroke();
        }
    }
  }
  drawParticles(dt);
  drawNightLighting(lo,hi,time);
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
}
function drawDebugFootprint(c,r,w,h,color,anchor){
  const points=footprintPath(c,r,w,h);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  if(anchor){const p=points[2];ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);
    ctx.fillStyle='#ffe88f';ctx.fill();}
}
function burst(x,y,color,count){
  const cell=worldToGrid(x,y);
  for(let i=0;i<count;i++){
    let p=ui.particles.find(function(item){return item.life<=0;});
    if(!p){p=ui.particles[ui.particleCursor++%ui.particles.length];}
    const a=Math.random()*Math.PI*2,speed=20+Math.random()*75;
    const velocity=worldToGrid(DATA.originX+Math.cos(a)*speed,
      DATA.originY+Math.sin(a)*speed-35);
    Object.assign(p,{c:cell.c,r:cell.r,vc:velocity.c,vr:velocity.r,
      life:.45+Math.random()*.5,max:1,color:color,size:1.8+Math.random()*2.8});
  }
}
function floating(message,x,y){
  const pos=worldToScreen(x,y),item=document.createElement("div");
  item.className="float-number";item.textContent=message;
  item.style.left=pos.x+"px";item.style.top=pos.y+"px";
  dom.stage.appendChild(item);setTimeout(function(){item.remove();},1100);
}
