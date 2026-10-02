/* PROFILE: Hồ sơ khởi đầu tương đương đảo mới trên client khi admin cấp tài nguyên trước lần chơi đầu. */
const game=require('../data/game.json');
const economy=require('../data/economy.js');
function newProfile(){
  const now=Date.now(),land=[];
  const origin=game.islands[0],region=game.islandRegionSize;
  const startX=origin.x+region,startY=origin.y+region;
  for(let y=startY;y<startY+region;y++)for(let x=startX;x<startX+region;x++)land.push(x+','+y);
  return {version:12,lastTick:now,savedAt:now,nextId:4,player:{level:1,xp:0},
    gold:economy.starting.gold,food:economy.starting.food,gems:economy.starting.gems,expansions:0,land,regions:[],unlockedIslands:1,eggs:[],discovered:['fire'],recipes:[],
    habitatPurchases:{fire:1},
    buildings:[{id:1,type:'habitat',element:'fire',x:startX+11,y:startY+11,level:1,stored:false,
      storedGold:0,storedGems:0,purchaseCost:game.buildings.habitat.cost,
      upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null},
      {id:3,type:'hatchery',element:null,x:startX,y:startY,level:1,stored:false,
        storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null}],
    dragons:[{id:2,species:'fire',nickname:'Alex',level:1,stars:0,xp:0,feedProgress:0,hunger:10,happiness:80,
      habitatId:1,gemProgress:0}]};
}
module.exports={newProfile};
