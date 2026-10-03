"use strict";

function drawParticles(dt,time){
  // Gravity is shared by active particles, so project it only when needed.
  let gravity=null;
  for(const p of ui.particles){
    if(p.life<=0)continue;
    p.life-=dt;
    if(p.life<=0)continue;
    p.c+=p.vc*dt;p.r+=p.vr*dt;
    if(!gravity)gravity=worldToGrid(DATA.originX,DATA.originY+45*dt);
    p.vc+=gravity.c;p.vr+=gravity.r;
    ctx.globalAlpha=clamp(p.life/p.max,0,1);
    const point=gridToScreen(p.c,p.r);
    ellipse(point.x,point.y+renderIslandBob(p.islandIndex,time),p.size,p.size,p.color);
  }
  ctx.globalAlpha=1;
}
function drawScene(time,dt){
  ui.renderTime=time;
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  drawBackground(time);
  ctx.translate(viewW/2,viewH/2);ctx.scale(ui.camera.zoom,ui.camera.zoom);
  ctx.translate(-ui.camera.x,-ui.camera.y);
  const margin=DATA.tileW*2,lo=screenToWorld(-margin,-margin),
    hi=screenToWorld(viewW+margin,viewH+margin);
  // Index occupants and visible buildings once. The old loop scanned every
  // building again for every island, then filtered all dragons per habitat.
  const occupantsByHabitat=new Map();
  for(const dragon of state.dragons){
    if(dragon.habitatId==null)continue;
    let occupants=occupantsByHabitat.get(dragon.habitatId);
    if(!occupants){occupants=[];occupantsByHabitat.set(dragon.habitatId,occupants);}
    occupants.push(dragon);
  }
  const buildings=state.buildings.filter(b=>!b.stored).map(b=>{
    const footprint=buildingFootprint(b);
    return {building:b,footprint,
      depth:b.x+footprint.w-1+b.y+footprint.h-1};
  }).sort((a,b)=>a.depth-b.depth||a.building.id-b.building.id);
  const buildingsByIsland=Array.from({length:DATA.islands.length},()=>[]);
  for(const entry of buildings){
    const {building:b,footprint:f}=entry,index=islandAt(b.x,b.y);
    if(index<0)continue;
    const v=footprintVertices(b.x,b.y,f.w,f.h);
    if(Math.max(...v.map(p=>p.x))<lo.x-margin||Math.min(...v.map(p=>p.x))>hi.x+margin||
      Math.max(...v.map(p=>p.y))<lo.y-margin||Math.min(...v.map(p=>p.y))>hi.y+margin)continue;
    buildingsByIsland[index].push({building:b,footprint:f});
  }
  drawFloatingIslands(lo,hi,time,function(index){
    drawIslandWeather(index,time);
    for(const {building:b,footprint:f} of buildingsByIsland[index]){
      ctx.save();ctx.translate(0,renderIslandBob(index,time));drawBuilding(b,time,occupantsByHabitat);
      if(ui.debugIso)drawDebugFootprint(b.x,b.y,f.w,f.h,'#a8efff',true);
      ctx.restore();
    }
    if(!ui.mode||ui.mode.x===null||islandAt(ui.mode.x,ui.mode.y)!==index)return;
    const x=ui.mode.x,y=ui.mode.y;
    if(inside(x,y)){
      const f=placementFootprint(ui.mode),valid=getBuildValid(x,y,ui.mode);
      ctx.save();ctx.translate(0,renderIslandBob(islandAt(x,y),time));
      footprintPath(x,y,f.w,f.h);
      ctx.fillStyle=valid?'#86f6a888':'#ff687d99';ctx.fill();
      ctx.lineWidth=3;ctx.strokeStyle=valid?'#d9ffe3':'#ffd3d5';ctx.stroke();
      const p=gridToScreen(x+f.w/2,y+f.h/2);
      ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold 25px system-ui';
      ctx.fillText(f.w+'×'+f.h+' ô',p.x,p.y+7);
      if(ui.debugIso)drawDebugFootprint(x,y,f.w,f.h,valid?'#7bffc4':'#ff687d',true);
      ctx.restore();
    }
  });
  if(ui.debugIso){
    for(const [index,island] of DATA.islands.slice(0,state.unlockedIslands).entries()){
      ctx.save();ctx.translate(0,renderIslandBob(index,time));
      // Draw a bounded local grid around the cursor to keep overview rendering responsive.
      const pointer=ui.pointerWorld||gridToScreen(island.x+island.size/2,island.y+island.size/2);
      const grid=worldToGrid(pointer.x,pointer.y-renderIslandBob(index,time));
      for(let c=Math.max(island.x,Math.floor(grid.c)-12);c<Math.min(island.x+island.size,Math.floor(grid.c)+12);c++)
        for(let r=Math.max(island.y,Math.floor(grid.r)-12);r<Math.min(island.y+island.size,Math.floor(grid.r)+12);r++){
          footprintPath(c,r,1,1);ctx.strokeStyle='#ffffff55';ctx.lineWidth=.7;ctx.stroke();
        }
      ctx.restore();
    }
  }
  drawParticles(dt,time);
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
    Object.assign(p,{c:cell.c,r:cell.r,islandIndex:islandAt(cell.c,cell.r),
      vc:velocity.c,vr:velocity.r,
      life:.45+Math.random()*.5,max:1,color:color,size:1.8+Math.random()*2.8});
  }
}
function floating(message,x,y){
  const cell=worldToGrid(x,y);
  const pos=worldToScreen(x,y+islandBob(islandAt(cell.c,cell.r))),item=document.createElement("div");
  item.className="float-number";item.textContent=message;
  item.style.left=pos.x+"px";item.style.top=pos.y+"px";
  dom.stage.appendChild(item);setTimeout(function(){item.remove();},1100);
}
