const assert=require('node:assert/strict');
const catalog=require('../data/catalog-loader.cjs').loadDragonCatalog(),game=require('../data/catalog-loader.cjs').loadGameCatalog();
require('../scripts/extend-catalog.cjs')(catalog,game);
const combat=require('../js/data/combat-rules.js');
const {createBattleEngine}=require('../server/arena/battle-engine.cjs');
const fx=require('../server/arena/battle-effects.cjs');
const engine=createBattleEngine({catalog,game,rng:()=>.99});
const species=Object.fromEntries(catalog.species.filter(s=>s.doubleElement).map(s=>[s.doubleElement,s.id]));
const elements=Object.keys(catalog.elements);
const standard=[...game.skills.neutral,...Object.entries(game.skills.elemental).flatMap(([element,list])=>
  list.filter(s=>!s.special).map(s=>({...s,element})))];
assert.equal(standard.length,32,'2 neutral + 30 elemental skills');
for(const [element,skills] of Object.entries(game.skills.elemental)){
  for(const [slot,skill] of skills.filter(s=>!s.special).entries()){
    assert.equal(skill.power,[.9,1.1][slot],`${element} slot ${slot+1} direct elemental power`);
    assert(!Object.hasOwn(skill,'bonus'),`${skill.id} stores direct % base attack only`);
  }
}
assert.deepEqual(game.skills.neutral.map(skill=>skill.power),[.5,.7],
  'neutral attacks use 50% and 70% of base attack');
const skillIds=new Set([...game.skills.neutral,...Object.values(game.skills.elemental).flat()].map(s=>s.id));
const assignedVariants=Object.fromEntries(elements.map(element=>[element,new Set()]));
for(const dragon of catalog.species){
  assert.equal(dragon.skillIds.length,4,`${dragon.id} has four assigned skill slots`);
  assert.equal(new Set(dragon.skillIds).size,4,`${dragon.id} has no duplicate skill slots`);
  if(dragon.doHiem==='apex'){
    assert(dragon.skillIds.every(id=>Object.values(game.skills.elemental).flat().some(skill=>skill.id===id&&skill.special)),
      `${dragon.id} reserves every skill slot for a special skill`);
    continue;
  }
  const distinct=[...new Set(dragon.elements)];
  if(distinct.length===1&&!dragon.doubleElement){
    assert.deepEqual(dragon.skillIds,['claw','slam',distinct[0]+'-1',distinct[0]+'-2'],
      `${dragon.id} retains both elemental skills`);
    continue;
  }
  const expectedElements=distinct;
  const elementalIds=dragon.skillIds.filter(id=>expectedElements.some(element=>
    id===element+'-1'||id===element+'-2'));
  assert.equal(elementalIds.length,expectedElements.length,
    `${dragon.id} has one elemental skill for each represented element`);
  for(const element of expectedElements){
    const selected=elementalIds.find(id=>id.startsWith(element+'-'));
    assert(['1','2'].includes(selected?.slice(element.length+1)),
      `${dragon.id} has a valid ${element} skill variant`);
    assignedVariants[element].add(selected);
  }
  for(const id of dragon.skillIds){
    const known=skillIds.has(id)||game.skills.elemental[dragon.doubleElement]?.some(skill=>skill.id===id);
    assert(known,`${dragon.id} references defined skill ${id}`);
  }
  if(dragon.doubleElement)assert(dragon.skillIds[3].includes('-special-'),
    `${dragon.id} keeps its Special Skill in slot four`);
}
for(const [element,variants] of Object.entries(assignedVariants))
  assert.equal(variants.size,2,`${element} species include both fixed skill variants`);
const make=(element,id)=>engine.makeFighter({id,species:species[element],level:50,nickname:element+id});
let resolved=0,strong=0,weak=0,neutral=0;
const variance=require('../js/config/combat.js').variance;
const roll=variance.min+.99*(variance.max-variance.min);
for(const skill of standard){
  for(const element of elements){
    for(const side of ['attack','defense']){
      const actor=make(skill.element||'fire',1),target=make(element,2);
      actor.skills[0]=skill;
      const battle={attack:side==='attack'?[actor]:[target],defense:side==='defense'?[actor]:[target],
        activeAttack:0,activeDefense:0,turn:1,events:[]};
      const matchup=skill.element?catalog.typeChart[skill.element][element]:1;
      const expected=Math.min(target.hp,combat.battleDamage(actor,target,skill,
        catalog.typeChart,roll,false));
      engine.strike(battle,side,skill,0);
      const event=battle.events.find(e=>e.skill===skill.name&&e.target===target.nickname);
      assert(event,skill.id+' event against '+element+' from '+side);
      assert.equal(event.damage,expected,skill.id+' damage against '+element+' from '+side);
      assert.equal(event.matchup,matchup,skill.id+' matchup against '+element);
      assert.equal(target.hp,target.maxHp-expected,skill.id+' target HP');
      assert.equal(actor.hp,actor.maxHp,skill.id+' never costs own HP');
      assert.equal(actor.cooldowns[0],0,skill.id+' no cooldown');
      assert.equal(target.statuses.length,0,skill.id+' causes no special status');
      resolved++;
      if(matchup===2)strong++;else if(matchup===.5)weak++;else neutral++;
    }
  }
}
// Critical and accuracy modifiers are applied at resolution, after selecting a skill.
{
  const actor=make('fire',1),target=make('ice',2),skill=game.skills.elemental.fire[0];
  actor.skills[0]=skill;
  const battle={attack:[actor],defense:[target],activeAttack:0,activeDefense:0,turn:1,events:[]};
  createBattleEngine({catalog,game,rng:()=>0}).strike(battle,'attack',skill,0);
  assert(battle.events[0].critical,'a low random roll triggers a critical strike');
  assert.equal(battle.events[0].damage,Math.min(target.maxHp,
    combat.battleDamage(actor,{...target,hp:target.maxHp},skill,catalog.typeChart,variance.min,true)));
}
{
  const skill=game.skills.elemental.fire[0];
  const run=shield=>{
    const actor=make('fire',1),target=make('ice',2),battle={attack:[actor],defense:[target],
      activeAttack:0,activeDefense:0,turn:1,events:[]};
    if(shield)fx.addStatus(target,{kind:'shield',value:.2,duration:2},'earth');
    engine.strike(battle,'attack',skill,0);
    return {event:battle.events[0],target};
  };
  const plain=run(false),guarded=run(true);
  assert(guarded.event.damage<plain.event.damage,'shield absorbs ordinary elemental damage');
  assert(guarded.target.hp>plain.target.hp);
}
{
  const actor=engine.makeFighter({id:1,species:'fire',level:1,nickname:'New dragon'});
  actor.skills[3]=game.skills.elemental.fire[1];
  const target=make('ice',2),battle={attack:[actor],defense:[target],activeAttack:0,
    activeDefense:0,turn:1,nextSide:'attack',events:[]};
  assert.throws(()=>engine.liveTurn(battle,'attack',{action:'skill',skillIndex:3}),/unavailable/,
    'Challenge rejects a locked skill even if its data is present');
  actor.level=50;actor.cooldowns[3]=1;
  assert.throws(()=>engine.liveTurn(battle,'attack',{action:'skill',skillIndex:3}),/unavailable/,
    'Challenge rejects a cooling skill');
  actor.cooldowns[3]=0;
  engine.liveTurn(battle,'attack',{action:'skill',skillIndex:3});
  assert(battle.events.some(e=>e.skill==='Inferno Burst'),'Challenge accepts unlocked ready skill');
}
console.log(`PASS ${standard.length} standard skills × ${elements.length} targets × 2 sides = ${resolved} hits `+
  `(${strong} strong, ${weak} weak, ${neutral} neutral), crit, shield, lock and cooldown`);
