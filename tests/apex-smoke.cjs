const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const catalog=require('../data/catalog-loader.cjs').loadDragonCatalog();
const game=require('../data/catalog-loader.cjs').loadGameCatalog();
require('../scripts/extend-catalog.cjs')(catalog,game);
const {createBattleEngine}=require('../server/arena/battle-engine.cjs');
const breeding=require('../js/rules/breeding.js');
const hatching=require('../js/rules/hatching.js');
const config=require('../js/config/hatching.js');

const apex=catalog.species.filter(species=>species.doHiem==='apex');
const apexSkills=Object.values(game.skills.elemental).flat().filter(skill=>skill.apex);
assert.equal(apex.length,15);
assert.equal(apexSkills.length,15);
assert.equal(catalog.rarities.apex.heSoChiSo,4.8);
assert.equal(hatching.tierOf({rarity:'apex',elements:['fire','water','earth','wind']}),'apex');
assert.equal(hatching.seconds({rarity:'apex',elements:['fire','water','earth','wind']}),
  Math.max(config.apexMinimumSeconds,Math.min(config.maxTierSeconds.apex,
    510*config.tierMultipliers.apex)));

const usedDouble=new Map();
for(const dragon of apex){
  assert.match(dragon.ten,/ Dragon$/);
  assert.equal(dragon.elements.length,4);
  assert.equal(new Set(dragon.elements).size,4);
  assert.equal(dragon.elements[0],dragon.apexPrimary);
  assert.equal(dragon.skillIds.length,4);
  for(const id of dragon.skillIds){
    const skill=Object.values(game.skills.elemental).flat().find(item=>item.id===id);
    assert(skill?.special,id+' is a registered special skill');
    assert(skill.glyph&&/[À-ỹ]/u.test(skill.descriptionVi),id+' has an icon and Vietnamese description');
    if(id.includes('-special-'))usedDouble.set(id,(usedDouble.get(id)||0)+1);
    else assert(skill.apex,id+' is the unique Apex signature skill');
  }
}

assert.equal(usedDouble.size,45);
assert([...usedDouble.values()].every(count=>count===1),'all 45 Double skills are used exactly once');

const browserDb=JSON.parse(JSON.stringify(catalog));
browserDb.species=browserDb.species.filter(species=>species.doHiem!=='apex');
delete browserDb.rarities.apex;
const browserGame=JSON.parse(JSON.stringify(game));
for(const skills of Object.values(browserGame.skills.elemental))
  for(let index=skills.length-1;index>=0;index--)if(skills[index].apex)skills.splice(index,1);
globalThis.DragonDatabase=browserDb;
delete require.cache[require.resolve('../js/data/dragon-rules.js')];
const browserRules=require('../js/data/dragon-rules.js');
const browserContext={DragonDatabase:browserDb,GameDatabase:browserGame,
  DragonApexTier:require('../data/apex-tier.json'),DragonData:browserRules};
const runtimeSource=fs.readFileSync(require.resolve('../js/data/apex-runtime.js'),'utf8');
vm.runInNewContext(runtimeSource,browserContext);
assert.equal(browserDb.species.filter(species=>species.doHiem==='apex').length,15,
  'the browser runtime adds the Apex tier when an older generated cache is loaded');
assert.equal(Object.values(browserGame.skills.elemental).flat().filter(skill=>skill.apex).length,15);
vm.runInNewContext(runtimeSource,browserContext);
assert.equal(browserDb.species.filter(species=>species.doHiem==='apex').length,15,
  'the browser runtime is safe when the generated cache already includes Apex');

const byId=Object.fromEntries(catalog.species.map(species=>[species.id,{
  id:species.id,name:species.ten,elements:species.elements,rarity:species.doHiem
}]));
const first=apex[0],second=apex[1];
const noApexParents=breeding.offspringOptions({fatherSpecies:byId[first.id],motherSpecies:byId[second.id],
  fatherLevel:100,motherLevel:100,speciesById:byId,elementOrder:Object.keys(catalog.elements),
  fourIds:apex.map(species=>species.id),doubleIds:[],quads:catalog.quads,premium:false});
assert.deepEqual(noApexParents,[],'Apex dragons cannot be breeding parents');

const engine=createBattleEngine({catalog,game,rng:()=>.99});
for(const dragon of apex){
  const actor=engine.makeFighter({id:1,species:dragon.id,level:50,nickname:'Apex'});
  const ally=engine.makeFighter({id:2,species:'water',level:50,nickname:'Ally'});
  const enemy=engine.makeFighter({id:3,species:'earth',level:50,nickname:'Enemy'});
  const reserve=engine.makeFighter({id:4,species:'ice',level:50,nickname:'Reserve'});
  actor.hp=Math.round(actor.maxHp*.4);ally.hp=Math.round(ally.maxHp*.6);
  enemy.statuses.push({kind:'poison',value:.04,turns:2});
  if(dragon.id==='apex-pure')actor.damageLastTurn=Math.round(actor.maxHp*.3);
  const battle={attack:[actor,ally],defense:[enemy,reserve],activeAttack:0,activeDefense:0,
    turn:1,nextSide:'attack',events:[],revives:{}};
  const skill=actor.skills[3];
  assert(skill.apex,dragon.id+' has its signature in slot four');
  const view=engine.publicBattle(battle).attack[0].skills[3];
  assert.equal(view.name,skill.name);
  assert.equal(view.power,skill.power);
  assert.equal(view.description,skill.descriptionVi);
  assert.equal(view.glyph,skill.glyph);
  assert(view.apex,'Arena and Challenge DTOs identify the Apex icon frame');
  assert.doesNotThrow(()=>engine.strike(battle,'attack',skill,3),skill.name);
  assert(battle.events.some(event=>event.skill===skill.name),skill.id+' resolves in battle');
  if(skill.id==='apex-water-signature')assert(enemy.hp<enemy.maxHp&&reserve.hp<reserve.maxHp&&
    ally.hp>Math.round(ally.maxHp*.6),
    'Froststorm Surge damages the full enemy team and heals injured allies');
  if(skill.id==='apex-earth-signature')assert(ally.statuses.some(status=>status.kind==='shield'),
    'Radiant Worldroot grants team shields');
  if(skill.id==='apex-nature-signature')assert(ally.statuses.some(status=>status.kind==='damage_up'),
    'Celestial Bloom grants an allied damage buff');
  if(skill.id==='apex-primal-signature')assert(!actor.statuses.some(status=>status.kind==='poison'),
    'Genesis Purge removes one harmful status');
  if(skill.id==='apex-primal-signature')assert(actor.statuses.some(status=>status.kind==='shield'),
    'Genesis Purge creates a fallback shield when there is nothing to cleanse');
  if(skill.id==='apex-light-signature')assert(enemy.statuses.some(status=>status.kind==='anti_heal'),
    'Eclipse Verdict reduces healing on a debuffed target');
  if(skill.id==='apex-war-signature')assert(actor.hp>Math.round(actor.maxHp*.4),
    'Warbeast Stampede returns part of its damage as healing below half HP');
  if(skill.id==='apex-pure-signature')assert(actor.hp>Math.round(actor.maxHp*.4),
    'Crystal Rewind restores damage taken on the prior turn');
  if(skill.id==='apex-wind-signature')assert(actor.statuses.some(status=>status.kind==='next_attack_up'),
    'Thunderforge Cyclone readies a stronger direct strike');
}

function castSignature(speciesId,targetHp=1,rng=()=>.99){
  const battleEngine=createBattleEngine({catalog,game,rng});
  const actor=battleEngine.makeFighter({id:70,species:speciesId,level:50,nickname:'Tester'});
  const target=battleEngine.makeFighter({id:71,species:'apex-metal',level:50,nickname:'Target'});
  const reserve=battleEngine.makeFighter({id:72,species:'water',level:50,nickname:'Reserve'});
  target.hp=Math.round(target.maxHp*targetHp);
  const battle={attack:[actor],defense:[target,reserve],activeAttack:0,activeDefense:0,turn:1,events:[]};
  battleEngine.strike(battle,'attack',actor.skills[3],3);
  return {actor,target,reserve,battle,battleEngine};
}
const plainForge=castSignature('apex-fire'),burningForge=castSignature('apex-fire');
burningForge.target.statuses.push({kind:'burn',value:.04,turns:2});
burningForge.battleEngine.strike(burningForge.battle,'attack',burningForge.actor.skills[3],3);
assert(burningForge.battle.events.at(-1).damage>plainForge.battle.events[0].damage,
  'Forgefire Ascension gains its bonus against a burning target');
const trapped=castSignature('apex-metal');
const trappedHp=trapped.reserve.hp;
trapped.battleEngine.switchFighter(trapped.battle,'defense',1);
assert.equal(trappedHp-trapped.reserve.hp,Math.round(trapped.reserve.maxHp*.05),
  'Mountainbreaker Strike punishes the next opponent switch');
const aurora=castSignature('apex-ice');
assert(aurora.target.statuses.some(status=>status.kind==='damage_down'),
  'Aurora Tempest applies its debuff after at least two hits');
const cleanse=castSignature('apex-primal',1,()=>.99);
cleanse.actor.hp=Math.round(cleanse.actor.maxHp*.4);
cleanse.actor.statuses.push({kind:'poison',value:.04,turns:3});
const actorHpBeforeCleanse=cleanse.actor.hp;
cleanse.battleEngine.strike(cleanse.battle,'attack',cleanse.actor.skills[3],3);
assert(!cleanse.actor.statuses.some(status=>status.kind==='poison'),
  'Genesis Purge removes an existing harmful effect');
assert(cleanse.actor.hp>actorHpBeforeCleanse,'Genesis Purge heals after a cleanse');
const rewind=castSignature('apex-pure');
rewind.actor.damageLastTurn=Math.round(rewind.actor.maxHp*.3);
rewind.actor.hp=Math.round(rewind.actor.maxHp*.4);
const rewindBefore=rewind.actor.hp;
rewind.battleEngine.strike(rewind.battle,'attack',rewind.actor.skills[3],3);
assert.equal(rewind.actor.hp-rewindBefore,Math.round(rewind.actor.maxHp*.2),
  'Crystal Rewind is capped at 20% max HP');
const executeReady=castSignature('apex-thunder',.25),executeHealthy=castSignature('apex-thunder',1);
assert(executeReady.battle.events[0].damage>executeHealthy.battle.events[0].damage,
  'Stormfire Dominion uses its execute bonus below 30% target HP');
const frozen=castSignature('apex-time',1,()=>.25);
frozen.target.statuses.push({kind:'damage_down',value:.2,turns:2});
frozen.battleEngine.strike(frozen.battle,'attack',frozen.actor.skills[3],3);
assert(frozen.target.statuses.some(status=>status.kind==='freeze'),
  'Frozen Moment reaches its increased freeze chance against a weakened target');

const pvpActor=engine.makeFighter({id:20,species:'apex-fire',level:50,nickname:'Arena Apex'});
const pvpEnemy=engine.makeFighter({id:21,species:'water',level:50,nickname:'Arena rival'});
const arenaResult=engine.fight([{id:20,species:'apex-fire',level:50,nickname:'Arena Apex'},
  {id:22,species:'water',level:50,nickname:'Ally'},
  {id:23,species:'earth',level:50,nickname:'Ally 2'}],
  [{id:21,species:'water',level:50,nickname:'Rival'},
    {id:24,species:'fire',level:50,nickname:'Rival 2'},
    {id:25,species:'ice',level:50,nickname:'Rival 3'}]);
assert(arenaResult.events.length>0,'Arena simulation accepts Apex fighters');
const challengeBattle={attack:[pvpActor],defense:[pvpEnemy],activeAttack:0,activeDefense:0,
  turn:1,nextSide:'attack',events:[],revives:{}};
engine.liveTurn(challengeBattle,'attack',{action:'skill',skillIndex:3});
assert(challengeBattle.events.some(event=>event.skill==='Forgefire Ascension'),
  'Challenge accepts the Apex signature skill in slot four');

const waterActor=engine.makeFighter({id:30,species:'water',level:50,nickname:'Water healer'});
const waterAlly=engine.makeFighter({id:31,species:'fire',level:50,nickname:'Full ally'});
const fullBattle={attack:[waterActor,waterAlly],defense:[pvpEnemy],activeAttack:0,activeDefense:0,
  turn:1,events:[]};
const teamHeal=game.skills.elemental.water.find(skill=>skill.id==='water-special-2');
waterActor.skills[3]=teamHeal;
const actorMax=waterActor.hp,allyMax=waterAlly.hp;
engine.strike(fullBattle,'attack',teamHeal,3);
assert.equal(waterActor.hp,actorMax,'a full caster cannot exceed max HP');
assert.equal(waterAlly.hp,allyMax,'unused team healing never spills into a full teammate');

const source=fs.readFileSync(require.resolve('../js/logic/achievements.js'),'utf8')+
  '\nglobalThis.apexTest={checkApexAchievements};';
const state={discovered:catalog.species.filter(species=>species.doHiem==='transcendent'&&
  species.elements[0]==='fire').map(species=>species.id),achievements:{apexEggs:{}}};
const eggs=[],context={DRAGON_DB:catalog,DATA:{elements:catalog.elements},state,
  addEgg:(species,source)=>{const egg={species,source};eggs.push(egg);return egg;},
  toast:()=>{}};
vm.runInNewContext(source,context);
assert.equal(context.apexTest.checkApexAchievements().length,1,'three same-primary Double discoveries award one egg');
assert.equal(eggs[0].species,'apex-fire');
assert.equal(eggs[0].source,'achievement');
assert.equal(context.apexTest.checkApexAchievements().length,0,'a completed achievement never awards twice');
state.discovered=[];
assert.equal(context.apexTest.checkApexAchievements().length,0,'releasing dragons cannot revoke a completed reward');

console.log('PASS 15 Apex dragons, 15 signature skills, 45 unique Double skill assignments, breeding exclusion, Arena/Challenge engine effects and one-time achievement eggs');
