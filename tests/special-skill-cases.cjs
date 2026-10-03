const assert=require('node:assert/strict');
const catalog=require('../data/dragons.json'),game=require('../data/game.json');
require('../scripts/extend-catalog.cjs')(catalog,game);
const {createBattleEngine}=require('../server/arena/battle-engine.cjs');
const {publicBattle}=require('../server/arena/battle-view.cjs');
const fx=require('../server/arena/battle-effects.cjs');
const ids=Object.fromEntries(catalog.species.filter(s=>s.doubleElement).map(s=>[s.doubleElement,s.id]));
const skills=Object.values(game.skills.elemental).flat().filter(s=>s.special);
const engine=createBattleEngine({catalog,game,rng:()=>.99});
const make=(element,id)=>engine.makeFighter({id,species:ids[element],level:50,nickname:element+id});
const fixture=(skill)=>{
  const actor=make(skill.element,1),ally=make('water',2),enemy=make('earth',3),reserve=make('ice',4);
  actor.skills[3]=skill;
  return {actor,ally,enemy,reserve,battle:{attack:[actor,ally],defense:[enemy,reserve],
    activeAttack:0,activeDefense:0,turn:1,events:[]}};
};
const cast=(f,s)=>engine.strike(f.battle,'attack',s,3);
const mark=(f,who,kind,value=.04,turns=3)=>fx.addStatus(f[who],{kind,value,duration:turns},'fire');
let checked=0;
for(const s of skills){
  assert(s.descriptionVi&&/[À-ỹ]/u.test(s.descriptionVi),s.id+' Vietnamese description');
  const f=fixture(s),k=s.effect.kind;
  f.actor.hp-=Math.round(f.actor.maxHp*.2);
  f.ally.hp-=Math.round(f.ally.maxHp*.4);
  if(k==='revive_first'){f.ally.hp=0;f.ally.statuses=[];}
  if(k==='echo_last')f.actor.lastDirectDamage=100;
  if(k==='copy_last')f.enemy.lastSkill='fire-special-1';
  if(k==='spore_bloom')mark(f,'enemy','poison');
  if(k==='cleanse_heal_lowest')mark(f,'ally','poison');
  if(k==='detonate_burn')mark(f,'enemy','burn');
  if(k==='dispel_strike')mark(f,'enemy','armor_up');
  if(k==='rewind_ally')f.ally.damageLastTurn=Math.round(f.ally.maxHp*.3);
  const before={a:f.actor.hp,b:f.ally.hp,e:f.enemy.hp,r:f.reserve.hp};
  cast(f,s);
  const hits=f.battle.events;
  assert(hits.length,s.id+' emits an event');
  assert.equal(f.actor.cooldowns[3],s.cooldown,s.id+' cooldown');
  if(['burn','poison','curse','damage_down','armor_down','lock_switch','curse_strike'].includes(k))
    assert(fx.status(f.enemy,k==='curse_strike'?'damage_down':k),s.id+' inflicts status');
  if(['shield','damage_reduction','armor_up','reflect','damage_up','next_attack_up','vitality','carapace'].includes(k))
    assert(fx.status(f.actor,k),s.id+' buffs actor');
  if(k==='heal_team'||k==='cleanse_team_heal'){
    assert(f.actor.hp>before.a&&f.ally.hp>before.b,s.id+' heals both living allies');
    assert.equal(f.enemy.hp,before.e,s.id+' does not heal enemy');
  }
  if(k==='heal_lowest'||k==='cleanse_heal_lowest'||k==='rewind_ally'){
    assert(f.ally.hp>before.b,s.id+' heals injured lowest ally');
    assert.equal(f.actor.hp,before.a,s.id+' does not heal healthier actor');
  }
  if(k==='revive_first'){
    assert.equal(f.ally.hp,Math.round(f.ally.maxHp*.12));
    assert.equal(publicBattle(f.battle).attack[0].skills[3].available,false);
  }
  if(k==='multi'||k==='low_hp_power'){
    assert.equal(hits.filter(x=>x.hits===1).length,s.effect.hits,s.id+' hit count');
  }
  if(k==='area'||k==='spore_bloom'){
    assert(f.enemy.hp<before.e&&f.reserve.hp<before.r,s.id+' reaches reserves');
  }
  if(k==='spore_bloom')assert(fx.status(f.reserve,'poison'),s.id+' spreads poison');
  if(k==='detonate_burn')assert(!fx.status(f.enemy,'burn'),s.id+' consumes burn');
  if(k==='dispel_strike')assert(!fx.status(f.enemy,'armor_up'),s.id+' removes armor buff');
  if(k==='switch_trap')assert.equal(f.battle.traps.defense.value,s.effect.value);
  if(k==='regen_team')assert(f.actor.hp>before.a&&f.ally.hp>before.b,'regen ticks for both allies');
  if(k==='cleanse_heal_self')assert(f.actor.hp>before.a);
  if(k==='lifesteal_cost')assert(hits.some(x=>x.heal>0)&&f.actor.hp>=before.a-Math.round(before.a*.08),'lifesteal restores some paid HP');
  if(k==='freeze_chance')assert(!fx.status(f.enemy,'freeze'),'no freeze with RNG .99');
  if(k==='blood_crit')assert(hits.some(x=>x.critical),'guaranteed crit');
  if(k==='copy_last')assert(fx.status(f.enemy,'burn'),'copies active target’s prior burn');
  if(k==='echo_last')assert(f.enemy.hp<before.e);
  checked++;
}
// Full-health team healing never converts excess healing into extra casts on the actor.
for(const id of ['water-special-2','light-special-2','nature-special-2']){
  const s=skills.find(x=>x.id===id),f=fixture(s);
  cast(f,s);
  assert.equal(f.actor.hp,f.actor.maxHp,id+' full actor remains full');
  assert.equal(f.ally.hp,f.ally.maxHp,id+' full reserve remains full');
  assert(f.battle.events.filter(x=>x.heal>0).length===0,id+' has no transferred heal');
}
{
  const s=skills.find(x=>x.id==='water-special-2'),f=fixture(s);
  f.actor.hp-=100;const hp=f.actor.hp;
  cast(f,s);
  assert.equal(f.actor.hp,Math.min(f.actor.maxHp,hp+Math.round(f.actor.maxHp*.07)));
  assert.equal(f.ally.hp,f.ally.maxHp,'full teammate does not donate its heal');
}
{
  const s=skills.find(x=>x.id==='light-special-3'),f=fixture(s);
  assert.equal(publicBattle(f.battle).attack[0].skills[3].available,false);
  assert.match(publicBattle(f.battle).attack[0].skills[3].unavailableReason,/đồng đội đã gục/);
  assert.throws(()=>cast(f,s),/revive/,'cannot revive a living team');
  f.ally.hp=0;f.ally.statuses=[];
  assert.equal(publicBattle(f.battle).attack[0].skills[3].available,true);
  cast(f,s);
  f.ally.hp=0;
  assert.equal(publicBattle(f.battle).attack[0].skills[3].available,false);
  assert.throws(()=>cast(f,s),/revive/,'only one revive per team');
}
{
  const s=skills.find(x=>x.id==='time-special-3'),f=fixture(s);
  assert.equal(publicBattle(f.battle).attack[0].skills[3].available,false);
  assert.throws(()=>cast(f,s),/previous direct attack/);
  f.actor.lastDirectDamage=100;
  assert.equal(publicBattle(f.battle).attack[0].skills[3].available,true);
}
{
  const s=skills.find(x=>x.id==='legend-special-2'),f=fixture(s);
  f.enemy.lastSkill='light-special-3';cast(f,s);
  assert(f.enemy.hp<f.enemy.maxHp,'ineligible resurrection falls back to damage');
}
console.log(`PASS ${checked} individual special effect cases, full/mixed HP, revive gate, echo gate, copy fallback`);
{
  const f=fixture(skills.find(x=>x.id==='legend-special-2'));
  f.enemy.lastSkill='fire-special-1';f.reserve.lastSkill='earth-special-2';
  cast(f,f.actor.skills[3]);
  assert(fx.status(f.enemy,'burn'),'Mimic uses active opponent, not a reserve dragon');
  assert(!fx.status(f.enemy,'armor_down'));
}
{
  const s=skills.find(x=>x.id==='ice-special-1'),f=fixture(s);
  createBattleEngine({catalog,game,rng:()=>0}).strike(f.battle,'attack',s,3);
  assert(fx.status(f.enemy,'freeze'),'low RNG triggers the 25% control chance');
  const g=fixture(skills.find(x=>x.id==='wind-special-1'));
  createBattleEngine({catalog,game,rng:()=>0}).strike(g.battle,'attack',g.actor.skills[3],3);
  assert.equal(g.battle.events.filter(x=>x.misses).length,3,'all three hits can miss independently');
}
{
  const s=skills.find(x=>x.id==='water-special-2'),f=fixture(s);
  f.ally.hp=0;cast(f,s);
  assert.equal(f.ally.hp,0,'team heal cannot revive a fallen dragon');
  assert(!f.battle.events.some(e=>e.target===f.ally.nickname&&e.heal));
}
{
  const s=skills.find(x=>x.id==='dark-special-1'),f=fixture(s);
  cast(f,s);
  assert(fx.status(f.enemy,'curse'),'support curse targets enemy even without direct damage');
  assert(!fx.status(f.actor,'curse'),'support curse must not target caster');
  assert(!f.battle.events.some(e=>e.target===f.actor.nickname&&e.skill===s.name),
    'curse animation has no spurious self heal');
}
{
  const s=skills.find(x=>x.id==='light-special-3'),f=fixture(s);
  f.battle.nextSide='attack';
  assert.throws(()=>engine.liveTurn(f.battle,'attack',{action:'skill',skillIndex:3}),/revive/,
    'Challenge action rejects revival without a casualty');
  f.ally.hp=0;
  engine.liveTurn(f.battle,'attack',{action:'skill',skillIndex:3});
  assert(f.ally.hp>0,'Challenge action revives a casualty');
}
console.log('PASS chance branches, miss branches, active-opponent copy, dead ally, curse target, Challenge revive');
const special=id=>skills.find(s=>s.id===id);
const damageCase=(id,prepare=()=>{})=>{
  const s=special(id),f=fixture(s);
  f.enemy.maxHp*=100;f.enemy.hp=f.enemy.maxHp;
  prepare(f);cast(f,s);
  return f.battle.events.filter(e=>e.target===f.enemy.nickname).reduce((sum,e)=>sum+(e.damage||0),0);
};
for(const [id,prepare,label] of [
  ['wind-special-3',f=>{f.battle.lastSwitchSide='defense';},'switch punishment'],
  ['dark-special-2',f=>mark(f,'enemy','curse'),'cursed target bonus'],
  ['legend-special-3',f=>{f.enemy.lastSkill='claw';f.enemy.skillUses={claw:2};},'repeated skill punishment'],
  ['war-special-3',f=>{f.actor.hp=Math.round(f.actor.maxHp*.25);},'last stand'],
  ['primal-special-1',f=>{f.actor.hp=Math.round(f.actor.maxHp*.35);},'low HP multihit'],
  ['primal-special-3',f=>{f.enemy.hp=Math.round(f.enemy.maxHp*.25);},'execute']
]){
  assert(damageCase(id,prepare)>damageCase(id),id+' '+label+' raises real damage');
}
{
  const s=special('fire-special-3'),plain=damageCase(s.id),burning=damageCase(s.id,f=>mark(f,'enemy','burn'));
  assert(burning>plain,'detonation consumes burn and adds damage');
}
{
  const f=fixture(special('nature-special-2'));
  f.actor.hp-=1000;f.ally.hp-=1000;
  const before=f.actor.hp;cast(f,f.actor.skills[3]);
  assert(f.actor.hp>before,'regeneration ticks after casting');
  assert.equal(fx.status(f.actor,'regen')?.turns,1,'one remaining tick after casting turn');
  const first=f.actor.hp;fx.tickSide(f.battle,'attack');
  assert(f.actor.hp>first&&!fx.status(f.actor,'regen'),'second tick expires regeneration');
}
{
  const f=fixture(special('earth-special-1'));
  cast(f,f.actor.skills[3]);
  const shield=fx.status(f.actor,'shield'),before=f.actor.hp;
  fx.absorb(f.actor,Math.min(shield.amount,100));
  assert.equal(f.actor.hp,before,'shield absorbs damage before HP');
}
console.log('PASS conditional power branches, burn detonation, regeneration duration, shield absorption');
