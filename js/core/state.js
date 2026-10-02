"use strict";

/* STATE: Chỉ dữ liệu tiến trình nằm trong save; camera, sheet và thao tác kéo là tạm thời. */
const SAVE_KEY = "dragon-isle-save";
const SAVE_VERSION = 12;
function newGame(){
  const land = [];
  const origin=DATA.islands[0],startX=origin.x+DATA.islandRegionSize,startY=origin.y+DATA.islandRegionSize;
  for(let y=startY;y<startY+DATA.islandRegionSize;y++)
    for(let x=startX;x<startX+DATA.islandRegionSize;x++)land.push(x+","+y);
  const starting=window.DragonConfig.economy.starting,care=window.DragonConfig.world.initialDragon;
  return {version:SAVE_VERSION,lastTick:Date.now(),savedAt:Date.now(),nextId:4,player:{level:1,xp:0},
    gold:starting.gold,food:starting.food,gems:starting.gems,expansions:0,land:land,regions:[],unlockedIslands:1,
    habitatPurchases:{fire:1},
    eggs:[],discovered:["fire"],recipes:[],
    buildings:[{id:1,type:"habitat",element:"fire",x:startX+11,y:startY+11,level:1,stored:false,
      storedGold:0,storedGems:0,purchaseCost:DATA.buildings.habitat.cost,
      upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null},
      {id:3,type:"hatchery",element:null,x:startX,y:startY,level:1,stored:false,
        storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null}],
    dragons:[{id:2,species:"fire",nickname:uniqueNickname([]),level:1,stars:0,xp:0,feedProgress:0,
      hunger:care.hunger,happiness:care.happiness,habitatId:1,gemProgress:0}]};
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
const ui = {modal:null,shopTab:"special",bookTab:"all",bookPage:0,guideTab:"start",
  breedFatherElements:[],breedMotherElements:[],breedFatherQuery:"",breedMotherQuery:"",
  dragonElements:[],bookElements:[],fixedDay:false,dayOffset:0,debugIso:false,
  returnModal:null,dragonReturn:null,
  breedDraft:{father:null,mother:null},selection:null,mode:null,pointers:new Map(),gesture:null,
  camera:{x:0,y:0,zoom:.9},
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
const fmtGold = new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
function money(n){return fmt.format(Math.floor(Math.max(0,n)));}
function goldDecimal(n){return fmtGold.format(Math.max(0,n));}
function goldPerMinute(n){return fmtShort.format(Math.max(0,n));}
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
function buildingById(id){return state.buildings.find(function(b){return b.id===id;});}
function dragonById(id){return state.dragons.find(function(d){return d.id===id;});}
function occupants(building){return state.dragons.filter(function(d){return d.habitatId===building.id;});}
function maxBuildingLevel(building){return DATA.buildings[building.type].maxLevel;}
/** Return the effective level used by content gates while player level remains unlimited. */
function contentRequirementLevel(level){
  return window.DragonRules.progression.contentRequirementLevel(level);
}
/** Dragon slots available in a Habitat level. */
function habitatCapacity(level){
  return window.DragonRules.buildings.capacityAt(level,window.DragonConfig.buildings.habitat.dragonCapacity);
}
/** Egg slots available in a Hatchery level. */
function hatcheryCapacity(level){
  return window.DragonRules.buildings.capacityAt(level,window.DragonConfig.buildings.hatchery.nests);
}
function habitatHasRoom(building){return building.type==="habitat"&&!building.stored&&!building.upgradeEnds&&
  occupants(building).length<habitatCapacity(building.level);}
/** XP required for the next player level. */
function playerXPNeeded(level){
  return window.DragonRules.progression.playerXPNeeded(level);
}
function dragonXPNeeded(level){return Math.ceil(DATA.progression.xpBase*Math.pow(level,DATA.progression.xpExponent));}
/** Food consumed by one feed action at a dragon level. */
function dragonFeedCost(level){
  return window.DragonRules.progression.dragonFeedCost(level,DATA.progression.dragonMaxLevel);
}
/** Maximum Farm count unlocked for a player level. */
function farmLimit(level){
  return window.DragonRules.progression.farmLimit(level);
}
function farmCount(){return state.buildings.filter(function(b){return b.type==="farm";}).length;}
/** Current dragon level cap derived from the active Dragon Academy. */
function dragonLevelCap(){
  const academy=state?.buildings.find(b=>b.type==="academy"&&!b.stored);
  return academy?DATA.progression.academyCaps[Math.min(academy.level-1,DATA.progression.academyCaps.length-1)]:
    window.DragonConfig.dragons.initialLevelCapWithoutAcademy;
}
/** Cost and ownership gates for the next Dragon Academy level. */
function academyUpgradeCost(level){
  return window.DragonRules.buildings.academyUpgradeCost(
    level,DATA.progression.academyUpgrades[level-1],dragonLevelCap(),contentRequirementLevel);
}
function academyQualifiedDragonCount(cost){
  if(!cost)return 0;
  return state.dragons.filter(function(dragon){
    return dragon.level>=cost.requiredDragonLevel;
  }).length;
}
/** Normalized number of feeds already applied toward the next dragon level. */
function dragonFeedProgress(dragon){
  return clamp(Math.floor(Number(dragon.feedProgress)||0),0,window.DragonConfig.world.feeding.feedsPerLevel-1);
}
/** Human-readable dragon lifecycle stage used by UI/art. */
function stageOf(dragon){
  const stages=window.DragonConfig.dragons.stages;
  return dragon.level<stages.adultAt?"Young":dragon.level<stages.elderAt?"Adult":"Elder";
}
function dragonStats(dragon){
  const species=DATA.species[dragon.species];
  return window.DragonCombat.stats(species.elements,species.rarity,dragon.level,
    DRAGON_DB.elements,DRAGON_DB.rarities,dragon.stars);
}
/**
 * Gold/hour generated by one dragon in a Habitat.
 * Level growth comes from progression config; care/Habitat multipliers come from world rules.
 */
function dragonIncome(dragon,building){
  const base=DATA.rarities[DATA.species[dragon.species].rarity].income;
  const steps=Math.max(0,Math.min(DATA.progression.dragonMaxLevel,dragon.level)-1);
  const rates=window.DragonConfig.progression.incomeGrowth;
  const growth=1+rates.linear*steps+rates.quadratic*steps*steps;
  return base*growth*rates.multiplier*window.DragonRules.world.incomeMultiplier(dragon,building.level);
}
/* LOGIC: Gold gốc trong dữ liệu là gold/hour; hiển thị và tích lũy theo phút. */
function dragonIncomePerMinute(dragon,building){
  return dragonIncome(dragon,building)/60;
}
function habitatIncomePerMinute(building){
  if(!building||building.type!=="habitat"||building.stored)return 0;
  return occupants(building).reduce(function(sum,d){return sum+dragonIncomePerMinute(d,building);},0);
}
/** Maximum uncollected Gold stored by a Habitat. */
function habitatGoldCapacity(building){
  return window.DragonRules.buildings.habitatGoldCapacity(building.level,ELEMENT_UNLOCK[building.element]||1);
}
/** Maximum uncollected Gems stored by a Habitat. */
function habitatGemCapacity(building){
  return window.DragonRules.buildings.habitatGemCapacity(building.level,ELEMENT_UNLOCK[building.element]||1);
}
/** Purchase price for the next Habitat of an element. */
function habitatPurchaseCost(element,purchased=state?.habitatPurchases?.[element]||0){
  return window.DragonRules.buildings.habitatPurchaseCost(
    DATA.buildings.habitat.cost,ELEMENT_UNLOCK[element]||1,purchased);
}
function buildingPurchaseCost(type,element){
  return type==='habitat'?habitatPurchaseCost(element):DATA.buildings[type].cost;
}
/** Incubation/breeding tier derived from species structure. */
function dragonTimeTier(species){return window.DragonRules.hatching.tierOf(species);}
/** Egg incubation duration in seconds. */
function hatchingSeconds(species){
  return window.DragonRules.hatching.seconds(species,ELEMENT_UNLOCK);
}
/** Shop price for a pure-element egg. */
function shopEggPrice(species){
  return window.DragonRules.buildings.eggPrice(
    species.detail.giaTrung,species.rarity,ELEMENT_UNLOCK[species.elements[0]]||1);
}
/* GEM: Mỗi cá thể hoàn thành một chu kỳ riêng, không cộng gộp giờ lẻ của nhiều dragons. */
function habitatGemRate(building){return !building||building.type!=="habitat"||building.stored?0:
  occupants(building).length*DATA.gemPerDragonPerHour;}
function gemNextSeconds(building){
  if(!building||building.type!=="habitat"||building.stored)return 0;
  if((building.storedGems||0)>=habitatGemCapacity(building))return 0;
  const dragons=occupants(building);
  if(!dragons.length)return 0;
  return Math.ceil((1-Math.max(...dragons.map(function(d){return d.gemProgress||0;})))*
    window.DragonConfig.world.gemSecondsPerHour/DATA.gemPerDragonPerHour);
}
/** Gold component of a standard building upgrade. */
function upgradeCost(building){
  const base=building.type==="habitat"?habitatPurchaseCost(building.element,0):
    buildingPurchaseCost(building.type,building.element);
  return window.DragonRules.buildings.upgradeGoldCost(base,building.level);
}
/** Gold+Gem cost of Habitat/Farm/Hatchery upgrades. */
function standardUpgradeCost(building){
  const base=building.type==="habitat"?habitatPurchaseCost(building.element,0):
    buildingPurchaseCost(building.type,building.element);
  const unlock=contentRequirementLevel(ELEMENT_UNLOCK[building.element]||1);
  return window.DragonRules.buildings.standardUpgradeCost(building.type,building.level,base,unlock);
}
/** Upgrade duration in seconds; Habitat time also scales by element unlock tier. */
function upgradeSeconds(building){
  const times=DATA.upgradeTimes[building.type];
  if(!times)return 0;
  const base=times[Math.min(building.level-1,times.length-1)];
  if(building.type!=="habitat")return base;
  return window.DragonRules.buildings.habitatUpgradeSeconds(
    base,contentRequirementLevel(ELEMENT_UNLOCK[building.element]||1));
}
/** Player-level gate for upgrading from the current Hatchery level. */
function hatcheryUpgradePlayerLevel(level){
  const gates=window.DragonConfig.progression.hatcheryUpgradeLevels;
  return contentRequirementLevel(gates[Math.max(0,Math.floor(Number(level)||1)-1)]||1);
}
/** Gem price for unlocking an island index. */
function islandUnlockCost(index){return window.DragonRules.buildings.islandUnlockCost(index);}
function islandUnlockIssue(index){
  const island=DATA.islands[index];
  if(!island||index<=0||index!==state.unlockedIslands)return "Unlock the previous island first.";
  if(!islandComplete(index-1))return "Fully unlock "+DATA.islands[index-1].name+" before buying the next island.";
  const level=contentRequirementLevel(Math.max(island.playerLevel||1,DATA.elementUnlocks[island.element]||1));
  if(state.player.level<level)return "Requires player level "+level+" to unlock "+island.name+" and buy its element egg.";
  if(island.element&&!state.dragons.some(function(dragon){
    return DATA.species[dragon.species]?.elements.includes(island.element);
  }))return "Own at least one dragon with the "+DATA.elements[island.element].name+" element to unlock "+island.name+".";
  const cost=islandUnlockCost(index);
  if(state.gems<cost)return "Requires "+cost+" gems to unlock "+island.name+".";
  return "";
}
/** Gold price for a land region on an island tier. */
function landRegionCost(index,opened){
  return window.DragonRules.buildings.landRegionCost(index,opened);
}
function landCost(x,y){
  const region=regionOf(x,y),index=region?.index||0;
  return landRegionCost(index,region?islandRegionCount(index):1)/DATA.islandRegionSize**2;
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
function expansionCost(x,y){return Math.round(landCost(x,y)*expansionTiles(x,y).length);}
/** Instant Gem alternative for a land expansion. */
function expansionGemCost(x,y){
  return window.DragonRules.buildings.goldToGemCost(expansionCost(x,y));
}
function cropById(id){return DATA.crops.find(function(c){return c.id===id;});}
