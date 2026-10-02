"use strict";

/* STATE: Chỉ dữ liệu tiến trình nằm trong save; camera, sheet và thao tác kéo là tạm thời. */
const SAVE_KEY = "dragon-isle-save";
const SAVE_VERSION = window.DragonConfig.system.save.version;
function newGame(){
  const land = [];
  const origin=DATA.islands[0],startX=origin.x+DATA.islandRegionSize,startY=origin.y+DATA.islandRegionSize;
  for(let y=startY;y<startY+DATA.islandRegionSize;y++)
    for(let x=startX;x<startX+DATA.islandRegionSize;x++)land.push(x+","+y);
  const starting=window.DragonConfig.economy.starting,care=window.DragonConfig.world.initialDragon,
    buildingBalance=window.DragonConfig.buildings.definitions;
  return {version:SAVE_VERSION,lastTick:Date.now(),savedAt:Date.now(),nextId:4,player:{level:1,xp:0},
    gold:starting.gold,food:starting.food,gems:starting.gems,expansions:0,land:land,regions:[],unlockedIslands:1,
    habitatPurchases:{fire:1},
    eggs:[],discovered:["fire"],recipes:[],
    buildings:[{id:1,type:"habitat",element:"fire",x:startX+11,y:startY+11,level:1,stored:false,
      storedGold:0,storedGems:0,purchaseCost:buildingBalance.habitat.cost,
      upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null},
      {id:3,type:"hatchery",element:null,x:startX,y:startY,level:1,stored:false,
        storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null}],
    dragons:[{id:2,species:"fire",nickname:uniqueNickname([]),level:1,stars:0,xp:0,feedProgress:0,
      hunger:care.hunger,happiness:care.happiness,habitatId:1,gemProgress:0}]};
}
/* Tên cá thể được lấy ngẫu nhiên và không trùng, kể cả khi số rồng vượt danh sách tên mẫu. */
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
/**
 * STATE MODULE CONTRACT:
 * This file intentionally stops at state/UI/DOM initialization.
 * Formatters, grid geometry, selectors and gameplay calculations live in
 * sibling core modules so state creation stays easy to audit.
 */
