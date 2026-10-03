const assert=require('node:assert/strict');
const catalog=require('../data/dragons.json'),game=require('../data/game.json');
require('../scripts/extend-catalog.cjs')(catalog,game);
const combat=require('../js/data/combat-rules.js');
const rules=require('../js/rules/progression.js');
const config=require('../js/config/combat.js');
const tiers=['common','rare','epic','legendary','mythic','transcendent'];
const sample=Object.fromEntries(tiers.map(tier=>[tier,catalog.species.find(s=>
  s.doHiem===tier&&s.elements[0]==='fire')]));
assert(tiers.every(tier=>sample[tier]),'representative Fire-led species exists for each tier');
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
    assert(hits>=3&&hits<=7,`${tier} level ${level} equal-tier duel lasts ${hits} hits`);
  }
}
const oldCost=level=>Math.ceil(10+3*level+.18*level*level);
const segment=(start,end,cost)=>Array.from({length:end-start},(_,index)=>
  4*cost(start+index)).reduce((sum,item)=>sum+item,0);
const ranges=[[1,15,1.05,1.2],[15,40,1.3,1.55],[40,100,2.6,3.1]];
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
assert.equal(rules.dragonFeedCost(100,100),8440);
assert(config.defenseScale<.6,'base defense is reduced');
console.log(`PASS six tiers × four level milestones: combat ranking, 3–7 hits; food ${totals.join(', ')}`);
