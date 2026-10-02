"use strict";

/* UI: Pointer Events used chung cho chuột và cảm ứng; hai ngón zoom, một ngón kéo nền hoặc công trình. */
/** Convert a pointer/wheel event into canvas-local CSS-pixel coordinates. */
function localPoint(event){
  const r=dom.canvas.getBoundingClientRect();
  return {x:event.clientX-r.left,y:event.clientY-r.top};
}
/** Start placement, drag, pan or multi-pointer gesture state from one pointer press. */
function pointerDown(event){
  event.preventDefault();AUDIO.init();
  dom.canvas.setPointerCapture(event.pointerId);
  const p=localPoint(event);
  ui.pointers.set(event.pointerId,p);
  if(ui.pointers.size===2){
    if(ui.gesture?.holdTimer)clearTimeout(ui.gesture.holdTimer);
    const points=Array.from(ui.pointers.values()),mid={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};
    ui.gesture={kind:"pinch",distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),
      zoom:ui.camera.zoom,anchor:screenToWorld(mid.x,mid.y)};
    return;
  }
  const cell=screenCell(p.x,p.y);
  if(ui.mode){
    const held=ui.mode.kind==="move"?buildingById(ui.mode.id):null;
    const offsetX=held&&cell.x>=held.x&&cell.x<held.x+reservedFootprint(held).w?cell.x-held.x:0;
    const offsetY=held&&cell.y>=held.y&&cell.y<held.y+reservedFootprint(held).h?cell.y-held.y:0;
    ui.mode.x=cell.x-offsetX;ui.mode.y=cell.y-offsetY;
    ui.gesture={kind:"placement",start:p,offsetX:offsetX,offsetY:offsetY};
    return;
  }
  const hit=inside(cell.x,cell.y)?buildingAt(cell.x,cell.y):null;
  const gesture={kind:hit?"building":"pan",start:p,last:p,hitId:hit?hit.id:null,
    offsetX:hit?cell.x-hit.x:0,offsetY:hit?cell.y-hit.y:0,moved:false};
  ui.gesture=gesture;
  if(hit&&!hit.upgradeEnds)gesture.holdTimer=setTimeout(function(){
    if(ui.gesture!==gesture||ui.pointers.size!==1||gesture.kind!=="building")return;
    ui.mode={kind:"move",id:hit.id,x:hit.x,y:hit.y};
    gesture.kind="drag-building";gesture.longPress=true;
    dom.barText.textContent="Drag and release to move the building";
    dom.bar.classList.add("visible");
  },500);
}
/** Update active drag/pan/pinch state without committing gameplay mutations. */
function pointerMove(event){
  const hover=localPoint(event);ui.pointerWorld=screenToWorld(hover.x,hover.y);
  if(!ui.pointers.has(event.pointerId))return;
  event.preventDefault();
  const p=localPoint(event);
  ui.pointers.set(event.pointerId,p);
  const g=ui.gesture;
  if(!g)return;
  if(ui.pointers.size>=2&&g.kind==="pinch"){
    const points=Array.from(ui.pointers.values()),mid={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};
    const dist=Math.max(1,Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y));
    ui.camera.zoom=clamp(g.zoom*dist/Math.max(g.distance,1),.015,2.05);
    ui.camera.x=g.anchor.x-(mid.x-viewW/2)/ui.camera.zoom;
    ui.camera.y=g.anchor.y-(mid.y-viewH/2)/ui.camera.zoom;
    clampCamera();return;
  }
  if(g.kind==="placement"){
    const c=screenCell(p.x,p.y);ui.mode.x=c.x-g.offsetX;ui.mode.y=c.y-g.offsetY;return;
  }
  const distance=Math.hypot(p.x-g.start.x,p.y-g.start.y);
  if(g.kind==="building"&&distance>9){
    if(g.holdTimer)clearTimeout(g.holdTimer);
    g.kind="pan";g.moved=true;
  }
  if(g.kind==="drag-building"){
    if(distance>5)g.moved=true;
    const c=screenCell(p.x,p.y);ui.mode.x=c.x-g.offsetX;ui.mode.y=c.y-g.offsetY;
  }else if(g.kind==="pan"){
    if(distance>5)g.moved=true;
    ui.camera.x-=(p.x-g.last.x)/ui.camera.zoom;
    ui.camera.y-=(p.y-g.last.y)/ui.camera.zoom;
    clampCamera();
  }
  g.last=p;
}
/** Commit the pending tap/drag action, then release pointer gesture state. */
function pointerUp(event){
  if(!ui.pointers.has(event.pointerId))return;
  event.preventDefault();
  const p=localPoint(event),g=ui.gesture;
  if(g?.holdTimer)clearTimeout(g.holdTimer);
  ui.pointers.delete(event.pointerId);
  if(g&&g.kind==="pinch"){
    if(ui.pointers.size===1){
      const rest=Array.from(ui.pointers.values())[0];
      ui.gesture={kind:"pan",start:rest,last:rest,moved:true};
    }else ui.gesture=null;
    return;
  }
  if(ui.pointers.size) return;
  ui.gesture=null;
  if(!g)return;
  if(g.kind==="drag-building"&&!g.moved){
    toast("Tap an empty tile to place the building.");return;
  }
  if(g.kind==="placement"||g.kind==="drag-building"){
    const c=screenCell(p.x,p.y);
    ui.mode.x=c.x-g.offsetX;ui.mode.y=c.y-g.offsetY;
    completePlacement(ui.mode.x,ui.mode.y);
    return;
  }
  if(g.moved)return;
  const cell=screenCell(p.x,p.y);
  if(!inside(cell.x,cell.y)){
    ui.selection=null;updateInspector();window.DragonRuntime?.emit();return;
  }
  const b=buildingAt(cell.x,cell.y);
  if(b){
    ui.selection={type:"building",id:b.id};
  }else if(islandAt(cell.x,cell.y)>=0&&!unlocked(cell.x,cell.y)){
    const index=islandAt(cell.x,cell.y);
    ui.selection=index>=state.unlockedIslands?{type:"island",index}:{type:"land",x:cell.x,y:cell.y};
  }else ui.selection=null;
  updateInspector();
  window.DragonRuntime?.emit();
}
/** Abort one pointer from the active gesture without committing a placement/move. */
function pointerCancel(event){
  if(ui.gesture?.holdTimer)clearTimeout(ui.gesture.holdTimer);
  ui.pointers.delete(event.pointerId);
  if(ui.mode&&ui.gesture&&ui.gesture.kind==="drag-building")stopMode();
  ui.gesture=null;
}
/** Zoom the world around the cursor while preserving the pointed world position. */
function wheelZoom(event){
  event.preventDefault();
  const p=localPoint(event),anchor=screenToWorld(p.x,p.y);
  ui.camera.zoom=clamp(ui.camera.zoom*(event.deltaY<0?1.1:.9),.015,2.05);
  ui.camera.x=anchor.x-(p.x-viewW/2)/ui.camera.zoom;
  ui.camera.y=anchor.y-(p.y-viewH/2)/ui.camera.zoom;clampCamera();
}
