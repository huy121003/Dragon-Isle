"use strict";

/* SAVE: Mỗi phiên đăng nhập chỉ đọc/ghi bản JSON của người chơi trên máy chủ. */
let saveReadOnly=false;
let serverSaveAvailable=!!(window.location&&/^https?:$/.test(window.location.protocol));
let pendingServerSave=null;
let serverSaveBusy=false;
let serverFlushPromise=null;
let serverWarningShown=false;
const PREVIOUS_ISLANDS=[
  [600,600,300],[1200,640,200],[1080,960,220],[800,1160,240],[460,1140,260],
  [160,940,280],[40,600,300],[160,280,280],[460,100,260],[800,100,240],[1080,320,220]
];
const COMPACT_ISLANDS=[
  [680,680,140],[1060,700,100],[980,900,120],[800,1030,120],[580,1030,120],
  [400,900,120],[340,700,100],[400,480,120],[580,350,120],[800,350,120],[980,480,120]
];
/* Coordinates stored in v9. Region IDs remain stable when islands move. */
const GRID_ISLANDS=[
  [470,470,72],[600,470,72],[730,470,72],[860,470,72],
  [470,600,72],[600,600,72],[730,600,72],[860,600,72],
  [470,730,72],[600,730,72],[730,730,72]
];
/* Wide-spaced v10 positions before the islands were brought closer. */
const SCATTERED_ISLANDS=[
  [714,668,72],[529,447,72],[914,432,72],[325,661,72],
  [522,680,72],[913,675,72],[1120,650,72],[512,903,72],
  [715,910,72],[922,899,72],[717,452,72]
];
/* SAVE: Thu gọn đảo v7 trong cùng thế giới, giữ phần trăm đất mở và xếp lại công trình. */
function migrateCompactIslands(result){
  const oldAt=function(x,y){return PREVIOUS_ISLANDS.findIndex(function(p){
    return x>=p[0]&&y>=p[1]&&x<p[0]+p[2]&&y<p[1]+p[2];
  });};
  const remap=function(x,y,index){
    const old=PREVIOUS_ISLANDS[index],island=COMPACT_ISLANDS[index];
    return {x:clamp(island[0]+Math.floor((x-old[0])/old[2]*island[2]),island[0],island[0]+island[2]-1),
      y:clamp(island[1]+Math.floor((y-old[1])/old[2]*island[2]),island[1],island[1]+island[2]-1)};
  };
  const oldRegions=new Set(result.regions),newRegions=new Set();
  for(let index=0;index<result.unlockedIslands;index++){
    const oldSide=PREVIOUS_ISLANDS[index][2]/20,side=COMPACT_ISLANDS[index][2]/20;
    for(let row=0;row<side;row++)for(let col=0;col<side;col++){
      const oldCol=Math.min(oldSide-1,Math.floor((col+.5)*oldSide/side));
      const oldRow=Math.min(oldSide-1,Math.floor((row+.5)*oldSide/side));
      if(oldRegions.has(index+':'+oldCol+':'+oldRow))newRegions.add(index+':'+col+':'+row);
    }
  }
  const cells=new Set();
  result.land.forEach(function(cell){
    const [x,y]=cell.split(',').map(Number),oldIndex=oldAt(x,y),index=oldIndex>=0?oldIndex:0;
    if(index>=result.unlockedIslands)return;
    const island=COMPACT_ISLANDS[index];
    const p=x>=island[0]&&y>=island[1]&&x<island[0]+island[2]&&y<island[1]+island[2]&&oldIndex===index?
      {x,y}:remap(x,y,index);
    cells.add(key(p.x,p.y));
  });
  const placed=[];
  // Fixed Hatchery and occupied Habitats take priority if the smaller island gets crowded.
  result.buildings.slice().sort(function(a,b){
    const priority=v=>v.type==='hatchery'?0:v.type==='habitat'&&result.dragons.some(d=>d.habitatId===v.id)?1:2;
    return priority(a)-priority(b);
  }).forEach(function(b){
    if(b.stored)return;
    const f=reservedFootprint(b),oldIndex=oldAt(b.x,b.y);
    const index=oldIndex>=0&&oldIndex<result.unlockedIslands?oldIndex:0,island=COMPACT_ISLANDS[index];
    const old=PREVIOUS_ISLANDS[index];
    const mapped=remap(b.x,b.y,index);
    const proposed=b.x>=island[0]&&b.y>=island[1]&&b.x+f.w<=island[0]+island[2]&&
      b.y+f.h<=island[1]+island[2]?{x:b.x,y:b.y}:mapped;
    const valid=function(x,y){return x>=island[0]&&y>=island[1]&&
      x+f.w<=island[0]+island[2]&&y+f.h<=island[1]+island[2]&&
      !placed.some(p=>x<p.x+p.w&&x+f.w>p.x&&y<p.y+p.h&&y+f.h>p.y);};
    let target=valid(proposed.x,proposed.y)?proposed:null;
    for(let radius=0;!target&&radius<island[2];radius++){
      for(let dy=-radius;dy<=radius&&!target;dy++)for(let dx=-radius;dx<=radius;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
        const x=mapped.x+dx,y=mapped.y+dy;
        if(valid(x,y)){target={x,y};break;}
      }
    }
    if(!target){b.stored=true;return;}
    b.x=target.x;b.y=target.y;placed.push({x:b.x,y:b.y,w:f.w,h:f.h});
    const left=Math.floor((b.x-island[0])/20),right=Math.floor((b.x+f.w-1-island[0])/20);
    const top=Math.floor((b.y-island[1])/20),bottom=Math.floor((b.y+f.h-1-island[1])/20);
    for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++)
      newRegions.add(index+':'+col+':'+row);
  });
  result.land=[...cells];result.regions=[...newRegions];
}
/* v9: map old 20×20 regions to 9 small 24×24 regions on the new row/column map. */
function migrateGridIslands(result){
  const n=DATA.islandRegionSize,regions=new Set(),cells=new Set(),placed=[];
  const oldAt=(x,y)=>COMPACT_ISLANDS.findIndex(p=>x>=p[0]&&x<p[0]+p[2]&&y>=p[1]&&y<p[1]+p[2]);
  const map=(x,y,index)=>{
    const old=COMPACT_ISLANDS[index],target=GRID_ISLANDS[index];
    return {x:clamp(target[0]+Math.floor((x-old[0])/old[2]*target[2]),target[0],target[0]+target[2]-1),
      y:clamp(target[1]+Math.floor((y-old[1])/old[2]*target[2]),target[1],target[1]+target[2]-1)};
  };
  const owned=new Set(result.regions);
  for(let index=0;index<result.unlockedIslands;index++){
    const side=COMPACT_ISLANDS[index][2]/20;
    const oldCells=[];
    for(let row=0;row<side;row++)for(let col=0;col<side;col++)
      if(owned.has(index+':'+col+':'+row))oldCells.push({col,row});
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const oldCol=Math.min(side-1,Math.floor((col+.5)*side/3));
      const oldRow=Math.min(side-1,Math.floor((row+.5)*side/3));
      if(owned.has(index+':'+oldCol+':'+oldRow))regions.add(index+':'+col+':'+row);
    }
    // A small old region can fall between the nine sample points. Preserve at least
    // its proportional amount of purchased land when collapsing the island.
    const targetCount=Math.ceil(oldCells.length/(side*side)*9);
    const centroid=oldCells.length?{
      col:oldCells.reduce((sum,p)=>sum+p.col,0)/oldCells.length/side*3,
      row:oldCells.reduce((sum,p)=>sum+p.row,0)/oldCells.length/side*3}:{col:1.5,row:1.5};
    const candidates=[];
    for(let row=0;row<3;row++)for(let col=0;col<3;col++)
      candidates.push({col,row,d:(col+.5-centroid.col)**2+(row+.5-centroid.row)**2});
    candidates.sort((a,b)=>a.d-b.d);
    for(const p of candidates){
      if([...regions].filter(id=>id.startsWith(index+':')).length>=targetCount)break;
      regions.add(index+':'+p.col+':'+p.row);
    }
  }
  for(const cell of result.land){
    const [x,y]=cell.split(',').map(Number),index=oldAt(x,y);
    if(index<0||index>=result.unlockedIslands)continue;
    const p=map(x,y,index);cells.add(key(p.x,p.y));
  }
  const priority=b=>b.type==='hatchery'?0:b.type==='habitat'&&result.dragons.some(d=>d.habitatId===b.id)?1:2;
  for(const b of result.buildings.slice().sort((a,b)=>priority(a)-priority(b))){
    if(b.stored)continue;
    const index=oldAt(b.x,b.y),which=index>=0&&index<result.unlockedIslands?index:0;
    const island=GRID_ISLANDS[which],f=reservedFootprint(b),origin=map(b.x,b.y,which);
    const valid=(x,y)=>x>=island[0]&&y>=island[1]&&x+f.w<=island[0]+island[2]&&
      y+f.h<=island[1]+island[2]&&!placed.some(p=>x<p.x+p.w&&x+f.w>p.x&&y<p.y+p.h&&y+f.h>p.y);
    let target=null;
    for(let radius=0;radius<island[2]&&!target;radius++){
      for(let dy=-radius;dy<=radius&&!target;dy++)for(let dx=-radius;dx<=radius;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
        if(valid(origin.x+dx,origin.y+dy)){target={x:origin.x+dx,y:origin.y+dy};break;}
      }
    }
    if(!target){b.stored=true;continue;}
    b.x=target.x;b.y=target.y;placed.push({...target,w:f.w,h:f.h});
    const left=Math.floor((b.x-island[0])/n),right=Math.floor((b.x+f.w-1-island[0])/n);
    const top=Math.floor((b.y-island[1])/n),bottom=Math.floor((b.y+f.h-1-island[1])/n);
    for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++)regions.add(which+':'+col+':'+row);
  }
  result.regions=[...regions];result.land=[...cells];
}
function relocateIslands(result,oldIslands){
  const oldAt=(x,y)=>oldIslands.findIndex(p=>x>=p[0]&&y>=p[1]&&x<p[0]+p[2]&&y<p[1]+p[2]);
  result.land=result.land.map(cell=>{
    const [x,y]=cell.split(',').map(Number),index=oldAt(x,y);
    if(index<0)return cell;
    const old=oldIslands[index],next=DATA.islands[index];
    return key(x+next.x-old[0],y+next.y-old[1]);
  });
  result.buildings.forEach(b=>{
    if(b.stored)return;
    const index=oldAt(b.x,b.y);
    if(index<0)return;
    b.x+=DATA.islands[index].x-oldIslands[index][0];
    b.y+=DATA.islands[index].y-oldIslands[index][1];
  });
}
function migrateSave(raw){
  if(!raw||typeof raw!=="object"||raw.version>SAVE_VERSION)throw new Error("Incompatible save");
  if(!Array.isArray(raw.buildings)||!Array.isArray(raw.dragons)||!Array.isArray(raw.land))throw new Error("Save is missing data");
  const base=newGame();
  const result=Object.assign(base,raw);
  const mapSpecies=migrateSpeciesId;
  const mapElement=function(id){return id==="lightning"?"thunder":id==="plant"?"nature":id;};
  result.version=SAVE_VERSION;
  result.player=Object.assign({level:1,xp:0},raw.player||{});
  result.player.level=clamp(Number(result.player.level)||1,1,60);
  result.player.xp=Math.max(0,Number(result.player.xp)||0);
  result.gold=Math.max(0,Number(result.gold)||0);
  result.food=Math.max(0,Number(result.food)||0);
  result.gems=Math.max(0,Number(result.gems)||0);
  result.expansions=Math.max(0,Number(result.expansions)||0);
  result.lastTick=Number(result.lastTick)||Date.now();
  result.savedAt=Number(result.savedAt)||result.lastTick;
  result.nextId=Number(result.nextId)||3;
  result.land=result.land.filter(function(v){return typeof v==="string"&&/^\d{1,4},\d{1,4}$/.test(v);});
  /* SAVE: Lưới cũ 12×12 được chia mỗi tiles thành 2×2 tiles mới. */
  if(raw.version<4){
    const expanded=new Set();
    result.land.forEach(function(cell){
      const parts=cell.split(',').map(Number),x=parts[0]*2,y=parts[1]*2;
      if(x>=24||y>=24)return;
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)expanded.add(key(x+dx,y+dy));
    });
    result.land=[...expanded];result.expansions*=4;
  }
  /* SAVE: Lưới 24×24 được đưa into giữa bản đồ 400×400, mỗi tiles cũ thành 3×3 tiles. */
  if(raw.version<5){
    const expanded=new Set(),scale=DATA.legacyGridScale,offset=DATA.legacyGridOffset;
    result.land.forEach(function(cell){
      const parts=cell.split(',').map(Number),x=offset+parts[0]*scale,y=offset+parts[1]*scale;
      for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){
        if(inside(x+dx,y+dy))expanded.add(key(x+dx,y+dy));
      }
    });
    result.land=[...expanded];result.expansions*=scale*scale;
  }
  result.buildings=result.buildings.filter(function(b){return b&&DATA.buildings[b.type]&&Number.isInteger(b.id);})
    .map(function(b){
      const out=Object.assign({level:1,stored:false,storedGold:0,storedGems:0,upgradeEnds:0,
        upgradeStartedAt:0,crop:null,element:null,breeding:null},b);
      out.element=mapElement(out.element);
      out.x=Math.floor(Number(out.x)||0);out.y=Math.floor(Number(out.y)||0);
      if(raw.version<4){out.x*=2;out.y*=2;}
      if(raw.version<5){
        out.x=DATA.legacyGridOffset+out.x*DATA.legacyGridScale;
        out.y=DATA.legacyGridOffset+out.y*DATA.legacyGridScale;
      }
      out.level=clamp(Number(out.level)||1,1,DATA.buildings[out.type].maxLevel);
      if(out.type==='habitat'){
        const unlock=ELEMENT_UNLOCK[out.element]||1;
        const legacyCost=Math.round(200*(1+.09*(unlock-1))/10)*10;
        out.purchaseCost=Math.max(1,Math.floor(Number(out.purchaseCost)||legacyCost));
      }
      out.storedGold=Math.max(0,Number(out.storedGold)||0);
      out.storedGems=out.type==="habitat"?Math.max(0,Math.floor(Number(out.storedGems)||0)):0;
      out.upgradeEnds=Number(out.upgradeEnds)||0;
      if(out.level>=DATA.buildings[out.type].maxLevel)out.upgradeEnds=0;
      out.upgradeStartedAt=Number(out.upgradeStartedAt)||
        (out.upgradeEnds?out.upgradeEnds-upgradeSeconds(out)*1000:0);
      if(out.crop){
        const crop=cropById(out.crop.id);
        if(crop)out.crop.startedAt=Number(out.crop.startedAt)||out.crop.readyAt-crop.duration*1000;
        else out.crop=null;
      }
      return out;
    });
  const purchased=raw.habitatPurchases&&typeof raw.habitatPurchases==='object'?raw.habitatPurchases:{};
  result.habitatPurchases=Object.fromEntries(Object.keys(DATA.elements).map(function(element){
    const present=result.buildings.filter(b=>b.type==='habitat'&&b.element===element).length;
    return [element,Math.min(10000,Math.max(element==='fire'?1:0,present,
      Math.floor(Number(purchased[element])||0)))];
  }));
  /* SAVE: Bố trí lại công trình cũ theo diện tích mới; cấp và tiến trình vẫn giữ nguyên. */
  if(raw.version<5){
    const owned=new Set(result.land),placed=[];
    result.buildings.forEach(function(b){
      if(b.stored)return;
      const size=reservedFootprint(b),origin={x:b.x,y:b.y};
      let best=null;
      for(let radius=0;radius<=80&&!best;radius++){
        for(let y=Math.max(0,origin.y-radius);y<=Math.min(DATA.size-size.h,origin.y+radius);y++){
          for(let x=Math.max(0,origin.x-radius);x<=Math.min(DATA.size-size.w,origin.x+radius);x++){
            if(Math.max(Math.abs(x-origin.x),Math.abs(y-origin.y))!==radius)continue;
            if(placed.some(function(p){return x<p.x+p.w&&x+size.w>p.x&&y<p.y+p.h&&y+size.h>p.y;}))continue;
            let extra=0;
            for(let dy=0;dy<size.h;dy++)for(let dx=0;dx<size.w;dx++){
              if(!owned.has(key(x+dx,y+dy)))extra++;
            }
            if(!best||extra<best.extra)best={x:x,y:y,extra:extra};
          }
        }
      }
      if(!best){b.stored=true;return;}
      b.x=best.x;b.y=best.y;
      placed.push({x:b.x,y:b.y,w:size.w,h:size.h});
      for(let dy=0;dy<size.h;dy++)for(let dx=0;dx<size.w;dx++)owned.add(key(b.x+dx,b.y+dy));
    });
    result.land=[...owned];
  }
  if(raw.version<7){
    // Keep every existing tile and building in the shared map, translated to its new center.
    result.land=result.land.map(function(cell){
      const [x,y]=cell.split(',').map(Number);return key(x+553,y+553);
    });
    result.buildings.forEach(function(b){b.x+=553;b.y+=553;});
    result.regions=[];result.unlockedIslands=1;
  }
  result.unlockedIslands=clamp(Math.floor(Number(result.unlockedIslands)||1),1,DATA.islands.length);
  result.regions=[...new Set((Array.isArray(result.regions)?result.regions:[]).filter(function(id){
    if(typeof id!=="string"||!/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(id))return false;
    const [index,col,row]=id.split(':').map(Number),island=DATA.islands[index];
    const side=raw.version<8?PREVIOUS_ISLANDS[index]?.[2]/20:
      raw.version<9?COMPACT_ISLANDS[index]?.[2]/20:island?.size/DATA.islandRegionSize;
    return !!island&&index<result.unlockedIslands&&col<side&&row<side;
  }))];
  // Move complete legacy blocks into compact region ownership while retaining partial blocks.
  if(raw.version<7){
    const cells=new Set(result.land),regions=new Set(result.regions);
    for(let row=0;row<15;row++)for(let col=0;col<15;col++){
      const x=600+col*20,y=600+row*20;
      let complete=true;
      for(let dy=0;dy<20&&complete;dy++)for(let dx=0;dx<20;dx++){
        if(!cells.has(key(x+dx,y+dy))){complete=false;break;}
      }
      if(complete){
        regions.add('0:'+col+':'+row);
        for(let dy=0;dy<20;dy++)for(let dx=0;dx<20;dx++)cells.delete(key(x+dx,y+dy));
      }
    }
    result.regions=[...regions];result.land=[...cells];
  }
  if(raw.version<8)migrateCompactIslands(result);
  if(raw.version<9)migrateGridIslands(result);
  if(raw.version<10)relocateIslands(result,GRID_ISLANDS);
  if(raw.version===10)relocateIslands(result,SCATTERED_ISLANDS);
  result.dragons=result.dragons.filter(function(d){
    return d&&Number.isInteger(d.id)&&DATA.species[mapSpecies(d.species)];
  }).map(function(d){
    const out=Object.assign({level:1,stars:0,xp:0,feedProgress:0,hunger:10,happiness:80,habitatId:null,gemProgress:0},d);
    out.species=mapSpecies(out.species);
    out.level=clamp(Number(out.level)||1,1,DATA.progression.dragonMaxLevel);
    out.stars=Number.isFinite(Number(out.stars))?
      clamp(Math.floor(Number(out.stars)),0,DATA.progression.starUpgrades.length):0;
    out.feedProgress=raw.version<6?
      clamp(Math.floor((Math.max(0,Number(d.xp)||0)/dragonXPNeeded(out.level))*4),0,3):
      dragonFeedProgress(out);
    out.xp=0;
    out.hunger=clamp(Number(out.hunger)||0,0,100);
    out.happiness=clamp(Number(out.happiness)||0,0,100);
    out.gemProgress=clamp(Number(out.gemProgress)||0,0,1-1e-9);
    if(!result.buildings.some(function(b){return b.id===out.habitatId&&b.type==="habitat";}))out.habitatId=null;
    return out;
  });
  const usedNames=new Set();
  const legacyNames={"Mây":"Cloud","Nắng":"Sunny","Sóc":"Sparky","Bông":"Fluffy",
    "Lửa Nhỏ":"Ember","Gió Con":"Breezy","Mực":"Ink","Bé Băng":"Frosty",
    "Kim":"Steel","Mầm":"Sprout","Sao":"Star","Sương":"Mist","Bụi":"Dust",
    "Lá":"Leafy","Tia":"Flash"};
  result.dragons.forEach(function(d){
    d.nickname=legacyNames[d.nickname]||d.nickname;
    if(typeof d.nickname!=="string"||!d.nickname.trim()||usedNames.has(d.nickname)){
      d.nickname=uniqueNickname(usedNames);
    }
    usedNames.add(d.nickname);
  });
  result.eggs=(Array.isArray(raw.eggs)?raw.eggs:[]).filter(function(egg){
    return egg&&Number.isInteger(egg.id)&&DATA.species[mapSpecies(egg.species)];
  }).map(function(egg){
    const out=Object.assign({source:"shop",parents:null,hatcheryId:null,readyAt:0},egg);
    out.species=mapSpecies(out.species);
    if(!result.buildings.some(function(b){return b.id===out.hatcheryId&&b.type==="hatchery";})){
      out.hatcheryId=null;out.readyAt=0;
    }else{
      out.readyAt=Number(out.readyAt)||Date.now();
      out.startedAt=Number(out.startedAt)||
        out.readyAt-hatchingSeconds(DATA.species[out.species])*1000;
    }
    if(Array.isArray(out.parents))out.parents=out.parents.map(mapSpecies);
    return out;
  });
  result.buildings.forEach(function(b){
    if(!isBreedingCave(b)||!b.breeding)return;
    const breed=b.breeding;
    breed.fatherSpecies=mapSpecies(breed.fatherSpecies);
    breed.motherSpecies=mapSpecies(breed.motherSpecies);
    breed.result=mapSpecies(breed.result);
    if(!DATA.species[breed.result]||!DATA.species[breed.fatherSpecies]||
      !DATA.species[breed.motherSpecies])b.breeding=null;
    else breed.startedAt=Number(breed.startedAt)||
      breed.readyAt-breedingSeconds(DATA.species[breed.result],b.level,b,[DATA.species[breed.fatherSpecies],DATA.species[breed.motherSpecies]])*1000;
  });
  result.discovered=[...new Set((Array.isArray(raw.discovered)?raw.discovered:[])
    .concat(result.dragons.map(function(d){return d.species;}))
    .map(mapSpecies).filter(function(id){return !!DATA.species[id];}))];
  result.recipes=[...new Set((Array.isArray(raw.recipes)?raw.recipes:[])
    .filter(function(r){return typeof r==="string"&&r.split("|").length===3;})
    .map(function(r){return r.split("|").map(mapSpecies).join("|");})
    .filter(function(r){return r.split("|").every(function(id){return !!DATA.species[id];});}))];
  delete result.specialRewards;
  delete result.testGrantApplied;
  result.nextId=Math.max(result.nextId,1+Math.max(0,
    ...result.buildings.map(function(b){return b.id;}),
    ...result.dragons.map(function(d){return d.id;}),
    ...result.eggs.map(function(egg){return egg.id;})));
  return result;
}
async function loadGameFromServer(){
  const response=await fetch('/api/save',{headers:{'X-Dragon-Account':currentAccount.id},cache:'no-store'});
  if(!response.ok)throw new Error(response.status===401?'Session expired. Sign in again.':
    'Cannot read progress from the server.');
  const raw=await response.json();
  if(!raw)return newGame();
  return migrateSave(raw);
}
/* SAVE: Ghi các snapshot theo thứ tự; thao tác mới không bị bản lưu cũ ghi đè. */
function flushServerSave(){
  if(!serverSaveAvailable)return Promise.resolve(false);
  if(serverSaveBusy)return serverFlushPromise;
  serverSaveBusy=true;
  serverFlushPromise=(async function(){
    while(pendingServerSave){
      const snapshot=pendingServerSave;
      pendingServerSave=null;
      const response=await fetch('/api/save',{method:'PUT',headers:{'Content-Type':'application/json',
        'X-Dragon-Account':currentAccount.id},
        body:snapshot,cache:'no-store'});
      if(!response.ok)throw new Error(response.status===401?'Session expired.':
        response.status===409?'The account changed in this tab. Reload the page.':'Cannot save the JSON profile.');
    }
    return true;
  })().catch(function(error){
      pendingServerSave=null;
      if(!serverWarningShown){
        serverWarningShown=true;
        toast(error.message+' Check the connection and reload.');
      }
      return false;
  }).finally(function(){serverSaveBusy=false;});
  return serverFlushPromise;
}
function saveGame(){
  if(saveReadOnly||!state)return Promise.resolve(false);
  state.version=SAVE_VERSION;
  state.savedAt=Date.now();
  pendingServerSave=JSON.stringify(state);
  return flushServerSave();
}
/* SAVE: Chỉ đặt lại hồ sơ tài khoản hiện tại. */
function factoryReset(){
  if(!window.confirm("Start over? All dragons, buildings, unlocked land and resources will be replaced."))return;
  state=newGame();
  saveReadOnly=false;
  ui.selection=null;ui.bookTab="all";ui.bookPage=0;ui.shopTab="buildings";
  stopMode();closeModal();
  const home=DATA.islands[0],center=gridToScreen(home.x+home.size/2,home.y+home.size/2);
  ui.camera.x=center.x;ui.camera.y=center.y;
  updateUI();saveGame();
  toast("The island has been reset. Enjoy!");
}
/* SAVE: Tải và nhập bản JSON thủ công khi mở game trực tiếp trên điện thoại. */
function exportSaveJson(){
  advanceWorld(Date.now());saveGame();
  const blob=new Blob([JSON.stringify(state,null,2)+'\n'],{type:'application/json'});
  const address=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=address;link.download='dragon-isle-progress.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(function(){URL.revokeObjectURL(address);},1000);
  toast('Downloaded the save JSON.');
}
async function importSaveJson(file){
  try{
    if(file.size>12000000)throw new Error('The save exceeds 12 MB.');
    const parsed=JSON.parse(await file.text());
    const restored=migrateSave(parsed);
    state=restored;
    advanceWorld(Date.now());
    ui.selection=null;updateUI();saveGame();
    toast('Imported progress from JSON.');
  }catch(error){toast('Could not import JSON: '+error.message);}
}
