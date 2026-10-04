'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const economy=require('../data/economy.js');
const game=require('../data/catalog-loader.cjs').loadGameCatalog();
const progressionConfig=require('../js/config/progression.js');
const buildingConfig=require('../js/config/buildings.js');
const farmingConfig=require('../js/config/farming.js');
const worldConfig=require('../js/config/world.js');
const systemConfig=require('../js/config/system.js');
const challengeConfig=require('../js/config/challenge.js');
const combat=require('../js/data/combat-rules.js');
const combatConfig=require('../js/config/combat.js');
const catalog=require('../data/catalog-loader.cjs').loadDragonCatalog();
require('../scripts/extend-catalog.cjs')(catalog,game);

function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function xpNeeded(level){
  const r=economy.progression,n=Math.max(1,Math.floor(Number(level)||1));
  return Math.round(r.xpBase+r.xpLinear*n+r.xpPower*Math.pow(n,r.xpExponent));
}
function habitatPrice(element,count=0){
  const unlock=Math.max(0,(progressionConfig.elementUnlocks[element]||1)-1),r=economy.shop;
  const unlockScale=1+r.habitatUnlockLinear*unlock+r.habitatUnlockQuadratic*unlock*unlock;
  const repeatScale=1+r.habitatRepeatLinear*count+r.habitatRepeatQuadratic*count*count;
  return Math.ceil(buildingConfig.definitions.habitat.cost*unlockScale*repeatScale/10)*10;
}
function habitatUpgradeSeconds(element,level){
  const base=buildingConfig.upgradeTimes.habitat[Math.min(level-1,buildingConfig.upgradeTimes.habitat.length-1)];
  const unlock=Math.max(0,Math.min(economy.progression.contentLevelCap,progressionConfig.elementUnlocks[element]||1)-1);
  const r=economy.habitat;
  return Math.round(base*(1+r.upgradeTimeUnlockLinear*unlock+r.upgradeTimeUnlockQuadratic*unlock*unlock));
}
function standardGemCost(type,level,element='fire'){
  const r=economy.buildings,base=r.upgradeGemBase[type]||0;
  let gems=Math.ceil(base*Math.pow(r.upgradeGemLevelFactor,Math.max(0,level-1)));
  if(type==='habitat'){
    const unlock=Math.min(economy.progression.contentLevelCap,progressionConfig.elementUnlocks[element]||1)-1;
    gems=Math.ceil(gems*(1+r.habitatGemUnlockLinear*unlock));
  }
  return gems;
}
function landCost(islandIndex,opened=1){
  const p=economy.land;
  let amount=p.homeFirstRegionGold*(1+p.islandTierLinear*islandIndex+p.islandTierQuadratic*islandIndex*islandIndex);
  for(let region=1;region<Math.max(1,opened);region++)amount=Math.round(amount*p.expansionMultiplier);
  return Math.round(amount);
}
function hatchingSeconds(parts,rarity='common'){
  if(parts.length===1)return economy.hatching.pureElementSeconds[parts[0]];
  const tier=rarity==='transcendent'?'double':rarity==='apex'?'apex':parts.length;
  const base=parts.reduce((sum,e)=>sum+(economy.hatching.pureElementSeconds[e]||60),0);
  const seconds=Math.min(economy.hatching.maxTierSeconds[tier]||economy.hatching.maxTierSeconds[4],
    base*(economy.hatching.tierMultipliers[tier]||economy.hatching.tierMultipliers[4]));
  return tier==='apex'?Math.max(economy.hatching.apexMinimumSeconds,seconds):seconds;
}

console.log('SESSION REGRESSION: combat');
for(const attacker of Object.keys(catalog.typeChart)){
  const row=Object.values(catalog.typeChart[attacker]);
  assert.equal(row.filter(v=>v===2).length,2,attacker+' must counter exactly 2 elements');
  assert.equal(row.filter(v=>v===0.5).length,2,attacker+' must be resisted by exactly 2 elements');
  assert(row.every(v=>[0.5,1,2].includes(v)),attacker+' has an invalid matchup multiplier');
}
const rawFireDefense=Math.round(
  catalog.elements.fire.chiSo.phongThu*catalog.rarities.common.heSoChiSo*
  (1+combatConfig.statGrowth.linear*24+combatConfig.statGrowth.quadratic*24**2)
);
const fireStats=combat.stats(['fire'],'common',25,catalog.elements,catalog.rarities,0);
assert.equal(combatConfig.defenseScale,.45);
assert.equal(fireStats.defense,Math.round(rawFireDefense*combatConfig.defenseScale));

console.log('SESSION REGRESSION: economy');
assert.deepEqual(economy.starting,{gold:10000,food:2500,gems:20});
assert.equal(economy.progression.goldIncomeMultiplier,2.5);
assert.equal(worldConfig.gemPerDragonPerHour,0.5);
assert.deepEqual(economy.habitat.dragonCapacity,[2,3,4,5]);
assert.deepEqual(economy.hatchery.nests,[1,2,3,4,5]);
assert.deepEqual(farmingConfig.crops.map(x=>x.duration),[30,180,420,900,1800,7200,14400,28800]);
assert.deepEqual(buildingConfig.upgradeTimes.habitat,[45,180,600]);
assert.deepEqual(buildingConfig.upgradeTimes.farm,[30,120,480]);
assert.deepEqual(buildingConfig.upgradeTimes.hatchery,[90,300,900,2400]);
assert.deepEqual(buildingConfig.upgradeTimes.academy,[300,900,1800,3600,7200,14400]);

for(const type of ['habitat','farm','hatchery']){
  assert(economy.buildings.upgradeGemBase[type]>0,type+' upgrades must require gems');
}
assert(standardGemCost('habitat',1,'time')>standardGemCost('habitat',1,'fire'));
assert(habitatPrice('water')>habitatPrice('fire'));
assert(habitatPrice('legend')>habitatPrice('water'));
assert(habitatPrice('time')>habitatPrice('legend'));
assert(habitatPrice('fire',1)>habitatPrice('fire',0));
assert(habitatUpgradeSeconds('time',1)>habitatUpgradeSeconds('fire',1));

const bestGoldPerGem=Math.max(...economy.shop.resourcePacks.goldForGems.map(p=>p.amount/p.cost));
const bestGemPerGold=Math.max(...economy.shop.resourcePacks.gemsForGold.map(p=>p.amount/p.cost));
for(const p of economy.shop.resourcePacks.goldForGems)
  assert(p.amount*bestGemPerGold<p.cost,'Gem→Gold→Gem arbitrage detected');
for(const p of economy.shop.resourcePacks.gemsForGold)
  assert(p.amount*bestGoldPerGem<p.cost,'Gold→Gem→Gold arbitrage detected');

const firstLand=game.islands.map((_,i)=>landCost(i,1));
assert(firstLand.every((v,i)=>i===0||v>firstLand[i-1]),'Island land prices must rise by tier');
assert(landCost(game.islands.length-1,8)<1_000_000,'Late land price must not explode');

console.log('SESSION REGRESSION: progression');
assert.equal(economy.progression.contentLevelCap,60);
assert(xpNeeded(61)>xpNeeded(60));
assert(xpNeeded(100)>xpNeeded(61));
assert(xpNeeded(200)>xpNeeded(100));
assert.deepEqual(progressionConfig.elementUnlocks,{
  fire:1,water:2,earth:4,wind:6,ice:8,thunder:11,nature:14,dark:18,
  light:22,metal:27,war:32,pure:37,legend:42,primal:48,time:55
});
assert.equal(Math.max(...Object.values(progressionConfig.elementUnlocks)),55);
assert.deepEqual(economy.progression.hatcheryUpgradeLevels,[5,12,22,35]);

console.log('SESSION REGRESSION: hatching / breeding');
assert.equal(economy.hatching.pureElementSeconds.fire,30);
assert.equal(economy.hatching.pureElementSeconds.water,60);
assert.equal(economy.hatching.pureElementSeconds.time,21600);
assert.deepEqual(economy.hatching.tierMultipliers,{2:2,3:4,4:8,double:12,apex:20});
assert.deepEqual(economy.hatching.maxTierSeconds,{2:21600,3:43200,4:86400,double:172800,apex:604800});
assert.equal(economy.hatching.apexMinimumSeconds,86400);
assert.deepEqual(economy.breeding.elementSeconds,{fire:60,water:60,earth:90,wind:120,ice:180,thunder:300,
  nature:420,dark:600,light:900,metal:1200,war:1800,pure:2400,legend:3000,primal:3600,time:4200});
assert.equal(economy.breeding.tierMultipliers[2],2);
assert(hatchingSeconds(['fire','water'])>economy.hatching.pureElementSeconds.fire);
assert(hatchingSeconds(['fire','water','earth'])>hatchingSeconds(['fire','water']));
assert(hatchingSeconds(['fire','water','earth','wind'])>hatchingSeconds(['fire','water','earth']));
assert(hatchingSeconds(['fire','fire','water','earth'],'transcendent')>
  hatchingSeconds(['fire','fire','water','earth'],'mythic'));
assert(hatchingSeconds(['fire','water','earth','wind'],'apex')>
  hatchingSeconds(['fire','water','earth','wind'],'mythic'));

console.log('SESSION REGRESSION: Academy');
assert.equal(buildingConfig.definitions.academy.maxLevel,7);
assert.deepEqual(progressionConfig.academyCaps,[40,50,60,70,80,90,100]);
assert.deepEqual(
  progressionConfig.academyUpgrades.map(x=>[x.playerLevel,x.requiredDragons,x.requiredDragonLevel]),
  [[10,2,40],[18,3,50],[28,4,60],[38,5,70],[48,6,80],[58,8,90]]
);
assert(progressionConfig.academyUpgrades.every(x=>x.playerLevel<=economy.progression.contentLevelCap));
assert.equal(game.footprints.academy.length,7);
assert.equal(game.progression,undefined,'game.json must not duplicate progression balance');
assert.equal(game.elementUnlocks,undefined,'game.json must not duplicate element unlock balance');
assert.equal(game.upgradeTimes,undefined,'game.json must not duplicate upgrade timers');
assert.equal(game.crops,undefined,'game.json must not duplicate crop balance');
assert.equal(game.gemPerDragonPerHour,undefined,'game.json must not duplicate passive Gem balance');
assert(Object.values(game.buildings).every(meta=>meta.cost===undefined&&meta.maxLevel===undefined&&meta.sellRate===undefined),
  'game.json building metadata must not duplicate balance values');

console.log('SESSION REGRESSION: source synchronization');
const save=read('js/save.js');
const react=read('src/main.jsx');
const world=read('js/logic/world.js');
const progressionLogic=read('js/logic/progression.js');
const state=read('js/core/state.js');
const calculations=read('js/core/calculations.js');
const arena=read('server/arena.cjs');
const profile=read('server/profile.cjs');
const guide=['shared','start','dragons','breeding','islands','resources','combat']
  .map(name=>read('js/ui/guide/'+name+'.js')).concat(read('js/ui/guide.js')).join('\n');
const validation=read('server/validation.cjs');
const main=read('js/main.js');

assert(!save.includes('clamp(Number(result.player.level)||1,1,60)'),'Save must preserve levels above 60');
assert(!react.includes("'MAX LEVEL'"),'React shell must not show MAX LEVEL at 60');
assert(progressionLogic.includes('while(state.player.xp>=playerXPNeeded(state.player.level))'),'Player leveling must remain unlimited');
assert(calculations.includes('contentRequirementLevel'),'Content gates must use the level-60 cap helper');
assert(arena.includes("require('../js/config/arena.js')"),'Arena rewards must use shared Arena config');
assert(arena.includes("require('../js/config/progression.js')"),'Arena reward scaling must use shared progression config');
assert(arena.includes('progressionConfig.contentLevelCap'),'Arena reward scaling must stop at content cap');
assert(!arena.includes("require('../data/economy.js')"),'Arena service must not depend on the legacy economy facade');
assert(profile.includes("require('../js/config/economy.js')"),'Server starter resources must use direct economy config');
assert(profile.includes("require('../js/config/buildings.js')"),'Server starter habitat price must use direct building config');
assert(!profile.includes("require('../data/economy.js')"),'Server profile must not depend on the legacy economy facade');
assert(!profile.includes('game.buildings.habitat.cost'),'Server profile must not read removed balance values from game.json');
assert(!guide.includes('×1,5')&&!guide.includes('×0,75'),'Guide contains stale combat multipliers');
assert(!guide.includes('DragonEconomy'),'Guide must read direct config instead of compatibility facade');
assert(validation.includes('challengeConfig.teamSize'),'Challenge validation must use shared team size');
assert(main.includes('DragonConfig.system.runtime'),'Runtime cadence must use system config');
assert.equal(systemConfig.save.version,12);
assert.equal(challengeConfig.teamSize,3);
assert(guide.includes('Rồng sở hữu yêu cầu'),'Academy ownership requirements must be documented');

console.log('SESSION REGRESSION PASS');
