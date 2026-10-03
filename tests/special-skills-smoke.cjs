const assert=require('node:assert/strict');
const catalog=require('../data/dragons.json');
const game=require('../data/game.json');
require('../scripts/extend-catalog.cjs')(catalog,game);
const {createBattleEngine}=require('../server/arena/battle-engine.cjs');
const fx=require('../server/arena/battle-effects.cjs');
const engine=createBattleEngine({catalog,game,rng:()=>.99});
const species=primary=>catalog.species.find(s=>s.doubleElement===primary).id;
const fighter=(primary,id)=>engine.makeFighter({id,species:species(primary),level:50,
  nickname:primary+id});
const setup=(left,right)=>({attack:left,defense:right,activeAttack:0,activeDefense:0,
  turn:1,events:[]});
const special=Object.values(game.skills.elemental).flat().filter(s=>s.special);
assert.equal(special.length,45);
assert.equal(catalog.species.filter(s=>s.doHiem==='transcendent').length,45);
for(const skill of special){
  const a=fighter(skill.element,1),reserve=fighter('water',2),b=fighter('earth',3);
  const battle=setup([a,reserve],[b,fighter('ice',4)]);
  if(skill.effect.kind==='revive_first'){reserve.hp=0;reserve.statuses=[];}
  a.skills[3]=skill;
  assert.doesNotThrow(()=>engine.strike(battle,'attack',skill,3),skill.name);
  assert(battle.events.length>0,skill.name+' emits a replay event');
  assert(a.cooldowns[3]>=0,skill.name+' has valid cooldown');
}
{
  const target=fighter('earth',1),team=setup([target],[fighter('fire',2)]);
  fx.addStatus(target,{kind:'poison',value:.04,duration:3},'nature');
  fx.addStatus(target,{kind:'poison',value:.02,duration:5},'nature');
  assert.equal(fx.status(target,'poison').turns,3,'weaker poison cannot extend time');
  fx.addStatus(target,{kind:'poison',value:.05,duration:5},'nature');
  assert.equal(fx.status(target,'poison').turns,3,'stronger poison cannot extend time');
  assert.equal(fx.status(target,'poison').value,.05);
  fx.addStatus(target,{kind:'burn',value:.04,duration:3},'fire');
  fx.addStatus(target,{kind:'curse',value:.04,duration:3},'dark');
  const hp=target.hp;fx.tickSide(team,'attack');
  assert.equal(hp-target.hp,Math.round(target.maxHp*.10),'DoT has a 10% cap');
}
{
  const a=fighter('earth',1),reserve=fighter('water',2);
  const battle=setup([a,reserve],[fighter('fire',3)]);
  fx.addStatus(a,{kind:'armor_down',value:.2,duration:2},'metal');
  fx.switchFighter(battle,'attack',1);
  assert(fx.status(a,'armor_down'),'debuff stays on the swapped-out dragon');
  assert(!fx.status(reserve,'armor_down'),'debuff does not transfer');
}
{
  const a=fighter('earth',1),reserve=fighter('water',2),enemy=fighter('fire',3);
  const battle=setup([a,reserve],[enemy,fighter('ice',4)]);
  battle.traps={attack:{value:.06,turns:2}};
  const hp=reserve.hp;
  fx.switchFighter(battle,'attack',1);
  assert.equal(hp-reserve.hp,Math.round(reserve.maxHp*.06),'trap hits incoming reserve');
  fx.addStatus(reserve,{kind:'lock_switch',value:1,duration:1},'ice');
  assert.throws(()=>fx.switchFighter(battle,'attack',0),/locked/);
}
{
  const a=fighter('light',1),dead=fighter('water',2),enemy=fighter('earth',3);
  const battle=setup([a,dead],[enemy]);
  dead.hp=0;dead.statuses=[];
  const revive=game.skills.elemental.light.find(s=>s.effect?.kind==='revive_first');
  engine.strike(battle,'attack',revive,3);
  assert.equal(dead.hp,Math.round(dead.maxHp*.12));
  assert.throws(()=>engine.strike(battle,'attack',revive,3),/revive/);
}
console.log('PASS 45 special skills, 45 species, status stacking, reserve switch and DoT cap');
