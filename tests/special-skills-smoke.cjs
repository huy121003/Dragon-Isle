const assert=require('node:assert/strict');
const catalog=require('../data/dragons.json');
const game=require('../data/game.json');
require('../scripts/extend-catalog.cjs')(catalog,game);
const {createBattleEngine}=require('../server/arena/battle-engine.cjs');
const fx=require('../server/arena/battle-effects.cjs');
const combat=require('../js/data/combat-rules.js');
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
  if(skill.effect.kind==='echo_last')a.lastDirectDamage=100;
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
{
  const actor=fighter('fire',1),target=fighter('primal',2),skill=actor.skills[0];
  const baseline=combat.battleDamage(actor,target,skill,catalog.typeChart);
  fx.addStatus(target,{kind:'carapace',value:.35,duration:2},'primal');
  assert(combat.battleDamage(actor,target,skill,catalog.typeChart)<baseline,
    'Primeval Carapace adds actual defense');
}
{
  const actor=fighter('wind',1),first=fighter('earth',2),reserve=fighter('water',3);
  const battle=setup([actor],[first,reserve]);
  first.hp=1;
  const combo=game.skills.elemental.wind.find(s=>s.effect?.kind==='multi');
  const hp=reserve.hp;
  engine.strike(battle,'attack',combo,3);
  assert(reserve.hp<hp,'remaining combo hits continue onto the next living reserve');
  assert(battle.events.some(event=>event.target===reserve.nickname&&event.damage>0));
}
{
  const skill=game.skills.elemental.wind.find(s=>s.effect?.kind==='switch_punish');
  const plain=setup([fighter('wind',1)],[fighter('earth',2)]);
  const switched=setup([fighter('wind',3)],[fighter('earth',4)]);
  switched.lastSwitchSide='defense';
  engine.strike(plain,'attack',skill,3);
  engine.strike(switched,'attack',skill,3);
  assert(switched.events[0].damage>plain.events[0].damage);
  assert.equal(switched.lastSwitchSide,null,'switch bonus lasts one opposing action');
}
{
  const actor=fighter('dark',1),target=fighter('earth',2);
  const skill=game.skills.elemental.dark.find(s=>s.effect?.kind==='curse_strike');
  engine.strike(setup([actor],[target]),'attack',skill,3);
  assert(fx.status(target,'damage_down'),'Dread Shroud reduces target damage');
}
{
  const active=fighter('earth',1),reserve=fighter('water',2);
  const battle=setup([active,reserve],[fighter('fire',3)]);
  fx.addStatus(reserve,{kind:'poison',value:.04,duration:3},'nature');
  fx.addStatus(reserve,{kind:'shield',value:.2,duration:2},'earth');
  const hp=reserve.hp,shield=fx.status(reserve,'shield').amount;
  fx.tickSide(battle,'attack');
  assert.equal(reserve.hp,hp,'reserve shield absorbs poison before HP');
  assert(fx.status(reserve,'shield').amount<shield);
  fx.switchFighter(battle,'attack',1);
  assert.equal(fx.status(reserve,'poison').turns,2,'swap preserves remaining poison');
}
{
  const actor=fighter('legend',1),target=fighter('earth',2);
  const battle=setup([actor],[target]);
  battle.lastSkillBySide={defense:'fire-special-1'};
  const mimic=game.skills.elemental.legend.find(s=>s.effect?.kind==='copy_last');
  engine.strike(battle,'attack',mimic,3);
  assert.equal(fx.status(target,'burn')?.value,.04*.65,'Mimic scales copied burn');
}
{
  const actor=fighter('metal',1),target=fighter('fire',2),battle=setup([actor],[target]);
  fx.addStatus(target,{kind:'reflect',value:.18,cap:.12,duration:2},'metal');
  const hp=actor.hp;engine.strike(battle,'attack',actor.skills[0],0);
  assert(actor.hp<hp,'reflect damages the direct attacker');
}
{
  const actor=fighter('time',1),target=fighter('earth',2);
  const echo=game.skills.elemental.time.find(s=>s.effect?.kind==='echo_last');
  assert.throws(()=>engine.strike(setup([actor],[target]),'attack',echo,3),
    /previous direct attack/);
  actor.lastDirectDamage=actor.attack;
  engine.strike(setup([actor],[target]),'attack',echo,3);
  assert(target.hp<target.maxHp,'Echo repeats an eligible direct hit');
}
console.log('PASS 45 special skills, 45 species, status stacking, reserve switch and DoT cap');
