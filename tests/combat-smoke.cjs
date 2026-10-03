const assert=require('node:assert/strict');
const path=require('node:path');
const db=require('../data/dragons.json');
const game=require('../data/game.json');
const combat=require('../js/data/combat-rules.js');
require('../scripts/extend-catalog.cjs')(db,game);
const {createArena}=require('../server/arena.cjs');

const ids=Object.keys(db.elements);
assert.equal(ids.length,15);
for(const attack of ids){
  const wins=ids.filter(target=>db.typeChart[attack][target]>1);
  const losses=ids.filter(source=>db.typeChart[source][attack]>1);
  assert.equal(wins.length,2,attack+' must counter exactly two elements');
  assert.equal(losses.length,2,attack+' must be countered by exactly two elements');
  assert.deepEqual(wins,db.khac[attack]);
  for(const target of ids){
    const value=db.typeChart[attack][target];
    assert([.5,1,2].includes(value));
    if(value===2)assert.equal(db.typeChart[target][attack],.5);
  }
  assert(!('tocDo' in db.elements[attack].chiSo));
}
for(const species of db.species)assert(!('tocDo' in species.chiSo));
const fire=combat.stats(['fire'],'common',25,db.elements,db.rarities);
const fireHigher=combat.stats(['fire'],'common',26,db.elements,db.rarities);
const rare=combat.stats(['fire','water'],'rare',25,db.elements,db.rarities);
assert.equal(combat.power(fire),Math.round(fire.hp*.1+fire.attack*2+fire.defense*1.5));
assert(combat.power(fireHigher)>combat.power(fire),'Combat Power should increase with level');
assert(combat.power(rare)>combat.power(fire),'Combat Power should include element count and rarity');
assert(fireHigher.hp>fire.hp&&fireHigher.attack>fire.attack&&fireHigher.defense>fire.defense);
assert(rare.hp>fire.hp&&rare.attack>fire.attack);
assert.deepEqual(Object.keys(fire),['hp','attack','defense']);
const rawDefense=Math.round(db.elements.fire.chiSo.phongThu*db.rarities.common.heSoChiSo*(1+.07*24+.0003*24**2));
assert.equal(fire.defense,Math.round(rawDefense*.45),'Global defense scale should lower base armor by 55%');
for(let stars=1;stars<=5;stars++){
  const enhanced=combat.stats(['fire'],'common',25,db.elements,db.rarities,stars);
  for(const stat of ['hp','attack','defense'])
    assert.equal(enhanced[stat],Math.round(fire[stat]*(1+stars*.05)));
  assert(combat.power(enhanced)>combat.power(fire),'Combat Power should include star bonuses');
}
assert.deepEqual(combat.stats(['fire'],'common',25,db.elements,db.rarities,99),
  combat.stats(['fire'],'common',25,db.elements,db.rarities,5));
const normal=game.skills.neutral[0];
const flame={...game.skills.elemental.fire[0],element:'fire'};
assert.equal(combat.skillPower(fire.attack,normal),fire.attack*normal.power);
assert.equal(combat.skillPower(fire.attack,flame),fire.attack*(1+flame.bonus));
const target=(parts)=>({...combat.stats(parts,'common',25,db.elements,db.rarities),parts});
const strong=combat.damage(fire,target(['ice']),flame,db.typeChart);
const resistant=combat.damage(fire,target(['water']),flame,db.typeChart);
assert(strong>resistant);
assert.equal(combat.damage(fire,{...target(['ice']),parts:['ice','water']},flame,db.typeChart),strong,
  'Defense only uses the primary element');
const hybrid={...combat.stats(['water','fire'],'rare',25,db.elements,db.rarities)};
assert(combat.damage(hybrid,target(['ice']),flame,db.typeChart)>
  combat.damage(hybrid,target(['ice']),normal,db.typeChart),
  'Secondary element can counter with its own skill');
const arena=createArena({profilesDir:'/unused',dataDir:path.resolve(__dirname,'../data'),auth:{listUsers:()=>[]}});
const fighters=[{id:1,species:'fire',level:25,nickname:'Fire'}];
const defenders=[{id:2,species:'ice',level:25,nickname:'Ice'}];
const random=Math.random;
try{
  Math.random=()=>.5;
  const first=arena.fight(fighters,defenders).events[0];
  const expected=Math.min(target(['ice']).hp,combat.damage(fire,target(['ice']),flame,db.typeChart));
  assert.equal(first.side,'attack');
  assert.equal(first.damage,expected,'Arena damage must match shared combat rules');
  const starred=arena.fight([{...fighters[0],stars:5}],defenders).events[0];
  assert(starred.damage>first.damage,'Arena must use enhanced attack on the server');
  assert.equal(first.matchup,2,'Combat event reports the actual target primary matchup');
  const counter=arena.fight(fighters,[{id:3,species:'water',level:25,nickname:'Water'}]).events[1];
  assert.equal(counter.side,'defense');
  assert.equal(counter.skill,'Tidal Surge','Defense should choose its strongest effective attack');
  assert.equal(counter.matchup,2);
  const neutral=arena.fight(fighters,[{id:4,species:'fire',level:25,nickname:'Mirror'}]).events[1];
  assert.equal(neutral.skill,'Inferno Burst','Without a counter, defense should favor higher damage');
}finally{Math.random=random;}
console.log('PASS element chart, three stats, skills, defense primary and server damage');
