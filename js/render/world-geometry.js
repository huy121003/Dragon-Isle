"use strict";

/**
 * Canvas viewport, camera transforms, grid projection and island hit-testing.
 *
 * Saved positions remain grid coordinates; visual island bobbing is applied
 * only while projecting/hit-testing and never mutates persisted state.
 */
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
