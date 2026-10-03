/* PROFILE: Hồ sơ khởi đầu dùng cùng source-of-truth balance với client. */
const game=require('../data/catalog-loader.cjs').loadGameCatalog();
const economyConfig=require('../js/config/economy.js');
const buildingConfig=require('../js/config/buildings.js');
const systemConfig=require('../js/config/system.js');
const worldConfig=require('../js/config/world.js');

/**
 * Tạo profile tối thiểu khi admin cấp tài nguyên trước lần đăng nhập đầu tiên.
 *
 * Balance values (starter resources, building prices) phải đọc trực tiếp từ
 * js/config/*; data/game.json chỉ giữ content/layout metadata.
 *
 * @returns {object} Save profile mới tương thích với SAVE_VERSION hiện tại.
 */
function newProfile({admin=false}={}){
  const now=Date.now(),land=[];
  const origin=game.islands[0],region=game.islandRegionSize;
  const startX=origin.x+region,startY=origin.y+region;
  for(let y=startY;y<startY+region;y++)for(let x=startX;x<startX+region;x++)land.push(x+','+y);
  return {version:systemConfig.save.version,lastTick:now,savedAt:now,nextId:4,player:{level:admin?100:1,xp:0},
    gold:admin?1_000_000:economyConfig.starting.gold,
    food:admin?1_000_000:economyConfig.starting.food,
    gems:admin?1_000_000:economyConfig.starting.gems,
    expansions:0,land,regions:[],unlockedIslands:1,eggs:[],discovered:['fire'],recipes:[],
    habitatPurchases:{fire:1},
    buildings:[{id:1,type:'habitat',element:'fire',x:startX+11,y:startY+11,level:1,stored:false,
      storedGold:0,storedGems:0,purchaseCost:buildingConfig.definitions.habitat.cost,
      upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null},
      {id:3,type:'hatchery',element:null,x:startX,y:startY,level:1,stored:false,
        storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null}],
    dragons:[{id:2,species:'fire',nickname:'Alex',level:1,stars:0,xp:0,feedProgress:0,
      hunger:worldConfig.initialDragon.hunger,happiness:worldConfig.initialDragon.happiness,
      habitatId:1,gemProgress:0}]};
}
module.exports={newProfile};
