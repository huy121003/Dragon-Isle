"use strict";

/**
 * Island grid, land-region and building-footprint geometry.
 *
 * This module is spatial only: it may read current state but must not charge
 * resources, award XP or trigger UI/save side effects.
 */
function key(x,y){return x+","+y;}
function inside(x,y){return x>=0&&x<DATA.size&&y>=0&&y<DATA.size;}
function islandAt(x,y){return DATA.islands.findIndex(i=>x>=i.x&&y>=i.y&&x<i.x+i.size&&y<i.y+i.size);}
function regionOf(x,y){
  const index=islandAt(x,y);if(index<0)return null;
  const island=DATA.islands[index],n=DATA.islandRegionSize;
  const col=Math.floor((x-island.x)/n),row=Math.floor((y-island.y)/n);
  return {index,col,row,id:index+":"+col+":"+row,x:island.x+col*n,y:island.y+row*n};
}
function islandRegionTotal(index){const size=DATA.islands[index].size/DATA.islandRegionSize;return size*size;}
function islandRegionCount(index){
  const owned=regionSet();let count=0,side=DATA.islands[index].size/DATA.islandRegionSize;
  for(let row=0;row<side;row++)for(let col=0;col<side;col++){
    const r={index,col,row,id:index+":"+col+":"+row,x:DATA.islands[index].x+col*DATA.islandRegionSize,
      y:DATA.islands[index].y+row*DATA.islandRegionSize};
    if(owned.has(r.id)||legacyRegionFull(r))count++;
  }
  return count;
}
function legacyRegionFull(r){
  const land=landSet();
  const n=DATA.islandRegionSize;
  for(let y=r.y;y<r.y+n;y++)for(let x=r.x;x<r.x+n;x++)if(!land.has(key(x,y)))return false;
  return true;
}
function islandComplete(index){return islandRegionCount(index)===islandRegionTotal(index);}
/* STATE: Tra cứu đất bằng Set tạm, không ghi cấu trúc này into bản lưu JSON. */
const landCache={source:null,length:-1,set:new Set()};
const regionCache={source:null,length:-1,set:new Set()};
function landSet(){
  if(landCache.source!==state.land||landCache.length!==state.land.length){
    landCache.source=state.land;landCache.length=state.land.length;
    landCache.set=new Set(state.land);
  }
  return landCache.set;
}
function regionSet(){
  if(regionCache.source!==state.regions||regionCache.length!==state.regions.length){
    regionCache.source=state.regions;regionCache.length=state.regions.length;
    regionCache.set=new Set(state.regions);
  }
  return regionCache.set;
}
function unlocked(x,y){
  if(!inside(x,y))return false;
  if(landSet().has(key(x,y)))return true;
  const r=regionOf(x,y);
  return !!r&&r.index<state.unlockedIslands&&regionSet().has(r.id);
}
function adjacent(x,y){
  const index=islandAt(x,y);
  return index>=0&&index<state.unlockedIslands&&[[1,0],[-1,0],[0,1],[0,-1]].some(function(d){
    return islandAt(x+d[0],y+d[1])===index&&unlocked(x+d[0],y+d[1]);
  });
}
function regionAdjacent(r){
  if(!r||r.index>=state.unlockedIslands)return false;
  const size=DATA.islandRegionSize;
  for(let n=0;n<size;n++){
    if(adjacent(r.x+n,r.y)||adjacent(r.x+n,r.y+size-1)||
      adjacent(r.x,r.y+n)||adjacent(r.x+size-1,r.y+n))return true;
  }
  return false;
}
/* STATE: Mỗi công trình giữ toàn bộ hình chữ nhật, kể cả diện tích sẽ nở khi đang nâng cấp. */
function buildingFootprint(b,level){
  const row=DATA.footprints[b.type]||DATA.footprints.decor;
  const dimensions=row[clamp((level||b.level)-1,0,row.length-1)];
  return {w:dimensions[0],h:dimensions[1]};
}
function reservedFootprint(b){
  const current=buildingFootprint(b);
  if(!b.upgradeEnds)return current;
  const next=buildingFootprint(b,b.level+1);
  return {w:Math.max(current.w,next.w),h:Math.max(current.h,next.h)};
}
function buildingCenter(b){
  const f=buildingFootprint(b);
  return gridToScreen(b.x+f.w/2,b.y+f.h/2);
}
function buildingAt(x,y){return state.buildings.filter(function(b){
  const f=reservedFootprint(b);
  return !b.stored&&x>=b.x&&x<b.x+f.w&&y>=b.y&&y<b.y+f.h;
}).sort(function(a,b){
  const af=reservedFootprint(a),bf=reservedFootprint(b);
  return (b.x+bf.w-1+b.y+bf.h-1)-(a.x+af.w-1+a.y+af.h-1);
})[0]||null;}
function placementFootprint(mode){
  return mode.kind==="buy"?buildingFootprint({type:mode.type,level:1}):
    reservedFootprint(buildingById(mode.id));
}
function footprintValid(x,y,f,ignoreId){
  if(!f||!Number.isInteger(x)||!Number.isInteger(y))return false;
  for(let dy=0;dy<f.h;dy++)for(let dx=0;dx<f.w;dx++){
    if(!inside(x+dx,y+dy)||!unlocked(x+dx,y+dy))return false;
  }
  return !state.buildings.some(function(b){
    if(b.stored||b.id===ignoreId)return false;
    const other=reservedFootprint(b);
    return x<b.x+other.w&&x+f.w>b.x&&y<b.y+other.h&&y+f.h>b.y;
  });
}
