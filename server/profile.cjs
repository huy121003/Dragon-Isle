/* PROFILE: Hồ sơ khởi đầu tương đương đảo mới trên client, used khi admin cấp tài nguyên trước lần chơi đầu. */
function newProfile(){
  const now=Date.now(),land=[];
  for(let y=692;y<716;y++)for(let x=738;x<762;x++)land.push(x+','+y);
  return {version:11,lastTick:now,savedAt:now,nextId:4,player:{level:1,xp:0},
    gold:500,food:50,gems:10,expansions:0,land,regions:[],unlockedIslands:1,eggs:[],discovered:['fire'],recipes:[],
    testGrantApplied:true,
    buildings:[{id:1,type:'habitat',element:'fire',x:749,y:703,level:1,stored:false,
      storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null},
      {id:3,type:'hatchery',element:null,x:738,y:692,level:1,stored:false,
        storedGold:0,storedGems:0,upgradeEnds:0,upgradeStartedAt:0,crop:null,breeding:null}],
    dragons:[{id:2,species:'fire',nickname:'Alex',level:1,xp:0,feedProgress:0,hunger:10,happiness:80,
      habitatId:1,gemProgress:0}]};
}
module.exports={newProfile};
