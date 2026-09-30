"use strict";

/* STATE: Chỉ dữ liệu tiến trình nằm trong save; camera, sheet và thao tác kéo là tạm thời. */
const SAVE_KEY = "dragon-isle-save";
const SAVE_VERSION = 11;
function newGame(){
  const land = [];
  const origin=DATA.islands[0],startX=origin.x+DATA.islandRegionSize,startY=origin.y+DATA.islandRegionSize;
  for(let y=startY;y<startY+DATA.islandRegionSize;y++)
    for(let x=startX;x<startX+DATA.islandRegionSize;x++)land.push(x+","+y);
  return {version:SAVE_VERSION,lastTick:Date.now(),savedAt:Date.now(),nextId:4,player:{level:1,xp:0},
    gold:500,food:50,gems:10,expansions:0,land:land,regions:[],unlockedIslands:1,
    eggs:[],discovered:["fire"],recipes:[],testGrantApplied:false,
    buildings:[{id:1,type:"habitat",element:"fire",x:startX+11,y:startY+11,level:1,stored:false,
      storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null},
      {id:3,type:"hatchery",element:null,x:startX,y:startY,level:1,stored:false,
        storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null}],
    dragons:[{id:2,species:"fire",nickname:uniqueNickname([]),level:1,xp:0,feedProgress:0,
      hunger:10,happiness:80,habitatId:1,gemProgress:0}]};
}
/* Tên cá thể lấy ngẫu nhiên và không trùng, kể cả khi số dragons vượt danh sách mẫu. */
function uniqueNickname(taken){
  const used=new Set(taken);
  const pool=DATA.nicknames.filter(function(name){return !used.has(name);});
  if(pool.length)return pool[Math.floor(Math.random()*pool.length)];
  const base=DATA.nicknames[Math.floor(Math.random()*DATA.nicknames.length)];
  let number=2;
  while(used.has(base+" "+number))number++;
  return base+" "+number;
}
let state = null;
let storageAvailable = true;
let saveWarningShown = false;
const ui = {modal:null,shopTab:"buildings",bookTab:"all",bookPage:0,
  breedFatherElements:[],breedMotherElements:[],breedFatherQuery:"",breedMotherQuery:"",
  dragonElements:[],bookElements:[],fixedDay:false,dayOffset:0,
  returnModal:null,
  breedDraft:{father:null,mother:null},selection:null,mode:null,pointers:new Map(),gesture:null,jumps:new Map(),
  camera:{x:DATA.size*DATA.tile/2,y:DATA.size*DATA.tile/2,zoom:.9},
  toastTimer:0,particleCursor:0,particles:Array.from({length:110},function(){return {life:0};})};
const dom = {
  canvas:document.getElementById("island"),stage:document.getElementById("stage"),
  inspector:document.getElementById("inspector"),overlay:document.getElementById("overlay"),
  timers:document.getElementById("timersBar"),
  title:document.getElementById("sheetTitle"),body:document.getElementById("sheetBody"),
  toast:document.getElementById("toast"),bar:document.getElementById("placementBar"),
  barText:document.getElementById("placementText"),hint:document.getElementById("hint")
};
const ctx = dom.canvas.getContext("2d",{alpha:false});
const fmt = new Intl.NumberFormat("en-US");
const fmtShort = new Intl.NumberFormat("en-US",{maximumFractionDigits:1});
function money(n){return fmt.format(Math.floor(Math.max(0,n)));}
function goldDecimal(n){return money(n);}
function goldPerMinute(n){return fmt.format(Math.round(Math.max(0,n)));}
function headerGold(n){
  if(n>=1000000)return fmtShort.format(n/1000000)+"m";
  if(n>=10000)return fmtShort.format(n/1000)+"k";
  return goldDecimal(n);
}
function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
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
  return {x:(b.x+f.w/2)*DATA.tile,y:(b.y+f.h/2)*DATA.tile};
}
function buildingAt(x,y){return state.buildings.find(function(b){
  const f=reservedFootprint(b);
  return !b.stored&&x>=b.x&&x<b.x+f.w&&y>=b.y&&y<b.y+f.h;
});}
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
function buildingById(id){return state.buildings.find(function(b){return b.id===id;});}
function dragonById(id){return state.dragons.find(function(d){return d.id===id;});}
function occupants(building){return state.dragons.filter(function(d){return d.habitatId===building.id;});}
function maxBuildingLevel(building){return DATA.buildings[building.type].maxLevel;}
function habitatCapacity(level){return Math.min(4,level);}
function hatcheryCapacity(level){return Math.min(5,level);}
function habitatHasRoom(building){return building.type==="habitat"&&!building.stored&&!building.upgradeEnds&&
  occupants(building).length<habitatCapacity(building.level);}
function playerXPNeeded(level){return Math.floor(100+75*Math.pow(level,1.4));}
function dragonXPNeeded(level){return Math.ceil(DATA.progression.xpBase*Math.pow(level,DATA.progression.xpExponent));}
function dragonFeedCost(level){return Math.max(1,Math.min(DATA.progression.dragonMaxLevel,Math.floor(level)));}
function dragonLevelCap(){
  const academy=state?.buildings.find(b=>b.type==="academy"&&!b.stored);
  return academy?DATA.progression.academyCaps[Math.min(academy.level-1,4)]:30;
}
function academyUpgradeCost(level){
  const a=window.DragonEconomy.academy,step=DATA.progression.academyUpgrades[level-1];
  if(!step)return null;
  return {playerLevel:step.playerLevel,gold:Math.round(a.baseGold*Math.pow(a.costFactor,level)),
    food:Math.round(a.baseFood*Math.pow(a.costFactor,level)),
    gems:Math.round(a.baseGems*Math.pow(a.costFactor,level))};
}
function dragonFeedProgress(dragon){return clamp(Math.floor(Number(dragon.feedProgress)||0),0,3);}
function stageOf(dragon){return dragon.level<10?"Young":dragon.level<30?"Adult":"Elder";}
/* STATE: Hoạt động nghỉ/ngủ, vui và nhảy được tính ổn định từ đồng hồ; không ghi 50+ bộ elementsn giờ into save. */
function dragonActivity(dragon,now){
  const phase=Math.floor((now+dragon.id*1379)/18000)%8;
  if(dragon.hunger>=85||phase===0||(daylightAt(now)<.18&&phase%3===0))return {id:"sleep",label:"💤 Sleeping"};
  if(dragon.happiness>=65&&phase===4)return {id:"happy",label:"💖 Happy"};
  if(phase===2||phase===6)return {id:"jump",label:"🐾 Jumping"};
  return {id:"walk",label:"🐾 Walking"};
}
function dragonStats(dragon){
  const stats=DRAGON_DATA.getStats(DATA.species[dragon.species].detail,dragon.level);
  return {hp:stats.hp,attack:stats.tanCong,defense:stats.phongThu,speed:stats.tocDo};
}
function dragonIncome(dragon,building){
  const base = DATA.rarities[DATA.species[dragon.species].rarity].income;
  return base*Math.pow(1.15,dragon.level-1)*(0.5+dragon.happiness/100)*
    (1+0.1*building.level)*(dragon.hunger>=100?.5:1);
}
/* LOGIC: Gold gốc trong dữ liệu là gold/hour; hiển thị và tích lũy theo phút. */
function dragonIncomePerMinute(dragon,building){
  return Math.max(1,Math.round(dragonIncome(dragon,building)/60));
}
function habitatIncomePerMinute(building){
  return occupants(building).reduce(function(sum,d){return sum+dragonIncomePerMinute(d,building);},0);
}
function habitatGoldCapacity(building){
  const unlock=ELEMENT_UNLOCK[building.element]||1;
  return (600+100*(unlock-1))*Math.pow(2,building.level-1);
}
function habitatGemCapacity(building){
  const unlock=ELEMENT_UNLOCK[building.element]||1;
  return (2+Math.floor((unlock-1)/5))*building.level;
}
function habitatPurchaseCost(element){
  return Math.round(DATA.buildings.habitat.cost*(1+.09*((ELEMENT_UNLOCK[element]||1)-1))/10)*10;
}
function buildingPurchaseCost(type,element){
  return type==='habitat'?habitatPurchaseCost(element):DATA.buildings[type].cost;
}
function shopEggPrice(species){
  const base=species.detail.giaTrung;
  const rarity={common:1,rare:2,epic:4,legendary:8,mythic:16}[species.rarity]||1;
  const unlock=ELEMENT_UNLOCK[species.elements[0]]||1;
  const scale=rarity*(1+.06*(unlock-1));
  return base.vang?{vang:Math.ceil(base.vang*scale/10)*10}:{gem:Math.ceil(base.gem*scale)};
}
/* GEM: Mỗi cá thể hoàn thành một chu kỳ riêng, không cộng gộp giờ lẻ của nhiều dragons. */
function habitatGemRate(building){return occupants(building).length*DATA.gemPerDragonPerHour;}
function gemNextSeconds(building){
  if((building.storedGems||0)>=habitatGemCapacity(building))return 0;
  const dragons=occupants(building);
  if(!dragons.length)return 0;
  return Math.ceil((1-Math.max(...dragons.map(function(d){return d.gemProgress||0;})))*
    3600/DATA.gemPerDragonPerHour);
}
function upgradeCost(building){return Math.round(buildingPurchaseCost(building.type,building.element)*Math.pow(1.8,building.level));}
function upgradeSeconds(building){
  if(building.type==='academy'){
    const a=window.DragonEconomy.academy;
    return Math.round(a.baseUpgradeSeconds*Math.pow(a.timeFactor,building.level-1));
  }
  const times=DATA.upgradeTimes[building.type];
  return times?times[Math.min(building.level-1,times.length-1)]:0;
}
function landCost(x,y){
  const region=regionOf(x,y),opened=region?islandRegionCount(region.index):0;
  const prices=window.DragonEconomy.land;
  return Math.round(prices.basePerTile*Math.pow(prices.regionMultiplier,opened));
}
function expansionTiles(x,y){
  const r=regionOf(x,y),tiles=[];
  if(!r||r.index>=state.unlockedIslands)return tiles;
  for(let dy=0;dy<DATA.islandRegionSize;dy++)for(let dx=0;dx<DATA.islandRegionSize;dx++){
    const px=r.x+dx,py=r.y+dy;
    if(!unlocked(px,py))tiles.push(key(px,py));
  }
  return tiles;
}
function expansionCost(x,y){return landCost(x,y)*expansionTiles(x,y).length;}
function cropById(id){return DATA.crops.find(function(c){return c.id===id;});}
