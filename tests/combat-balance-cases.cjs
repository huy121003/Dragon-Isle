const assert=require('node:assert/strict');
const catalog=require('../data/catalog-loader.cjs').loadDragonCatalog(),game=require('../data/catalog-loader.cjs').loadGameCatalog();
require('../scripts/extend-catalog.cjs')(catalog,game);
const combat=require('../js/data/combat-rules.js');
const rules=require('../js/rules/progression.js');
const config=require('../js/config/combat.js');
const tiers=['common','rare','epic','legendary','transcendent','mythic','apex'];
const sample=Object.fromEntries(tiers.map(tier=>[tier,catalog.species.find(s=>
  s.doHiem===tier&&s.elements[0]==='fire')]));
assert(tiers.every(tier=>sample[tier]),'representative Fire-led species exists for each tier');
assert.deepEqual(Object.keys(catalog.rarities),
  ['common','rare','epic','legendary','mythic','transcendent','apex'],
  'rarity ordering remains distinct from combat power ordering');
const stats=(tier,level)=>combat.stats(sample[tier].elements,tier,level,
  catalog.elements,catalog.rarities);
const skill={...game.skills.elemental.fire[0],element:'fire'};
for(const level of [1,15,40,100]){
  let previous=0;
  for(const tier of tiers){
    const value=stats(tier,level),rating=combat.power(value);
    assert(rating>previous,`${tier} at level ${level} must outrank the previous tier`);
    previous=rating;
    const damage=combat.damage(value,{...value,parts:sample[tier].elements},skill,
      catalog.typeChart,1,false);
    const hits=Math.ceil(value.hp/damage);
    const maximumHits=tier==='apex'?12:9;
    assert(hits>=5&&hits<=maximumHits,`${tier} level ${level} equal-tier duel lasts ${hits} hits`);
  }
}
for(const level of [40,100]){
  let previous=0;
  for(const tier of tiers){
    const group=catalog.species.filter(species=>species.doHiem===tier);
    const average=group.reduce((sum,species)=>sum+combat.power(combat.stats(
      species.elements,tier,level,catalog.elements,catalog.rarities)),0)/group.length;
    if(previous)assert(average>previous*1.15,
      `${tier} level ${level} average combat power clears the previous tier by 15%`);
    previous=average;
  }
}
const oldCost=level=>Math.ceil(10+3*level+.18*level*level);
const segment=(start,end,cost)=>Array.from({length:end-start},(_,index)=>
  4*cost(start+index)).reduce((sum,item)=>sum+item,0);
const ranges=[[1,15,1.05,1.2],[15,40,1.3,1.55],[40,100,28,32]];
const totals=[];
for(const [start,end,min,max] of ranges){
  const before=segment(start,end,oldCost),after=segment(start,end,l=>rules.dragonFeedCost(l,100));
  assert(after/before>=min&&after/before<=max,`${start}–${end} food increase`);
  totals.push(`${start}–${end}: ${before} → ${after} (${(after/before).toFixed(2)}×)`);
}
for(let level=1;level<100;level++){
  assert(rules.dragonFeedCost(level+1,100)>=rules.dragonFeedCost(level,100),
    'feeding cost never drops at a stage boundary');
}
assert(rules.dragonFeedCost(99,100)>100000,'each feed from level 99 to 100 exceeds 100k food');
assert(rules.dragonFeedCost(99,100)*4<=12*48000,
  'four level-99 feeds fit within one full 12-farm crystal-melon harvest');
assert(config.defenseScale<.6,'base defense is reduced');
console.log(`PASS seven tiers × four level milestones: combat ranking, 5–12 hits; food ${totals.join(', ')}`);
