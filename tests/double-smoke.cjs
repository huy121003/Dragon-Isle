const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const catalog=require('../data/dragons.json');
const game=require('../data/game.json');
const combat=require('../js/data/combat-rules.js');
const progressionConfig=require('../js/config/progression.js');
const arenaConfig=require('../js/config/arena.js');
const {createArena,arenaWindow}=require('../server/arena.cjs');
const {createVirtualRivals}=require('../server/arena/virtual-rivals.cjs');
require('../scripts/extend-catalog.cjs')(catalog,game);

const elements=Object.keys(catalog.elements),species=catalog.species.filter(s=>s.doHiem==='transcendent');
const doubleId=(primary,variant)=>species.filter(s=>s.elements[0]===primary)[variant].id;
const specials=Object.values(game.skills.elemental).flat().filter(skill=>skill.special);
assert.equal(species.length,30);
assert.equal(specials.length,30);
assert.equal(new Set(species.map(s=>s.id)).size,30);
assert.equal(new Set(species.map(s=>s.ten)).size,30);
assert.equal(new Set(specials.map(s=>s.id)).size,30);
assert.equal(new Set(specials.map(s=>s.name)).size,30);
assert(catalog.rarities.transcendent.heSoChiSo>catalog.rarities.legendary.heSoChiSo);
assert(catalog.rarities.transcendent.heSoChiSo<catalog.rarities.mythic.heSoChiSo);
const config=require('../data/double-elements.json');
assert.equal(new Date(arenaWindow(Date.parse('2026-10-02T07:59:59+07:00')).resetAt).toISOString(),
  '2026-10-02T01:00:00.000Z','Vietnam midnight window boundary');
assert.equal(new Date(arenaWindow(Date.parse('2026-10-02T08:00:00+07:00')).resetAt).toISOString(),
  '2026-10-02T09:00:00.000Z','Vietnam 08:00 window boundary');
const kinds=new Set(['poison','regen','heal','damage_up','damage_down','armor_up','armor_down',
  'freeze','damage_reduction','multi','cleanse','vitality','accuracy_down']);
for(const primary of elements){
  const group=species.filter(s=>s.elements[0]===primary);
  assert.equal(group.length,2,primary+' has two distinct designs');
  assert.notEqual(group[0].doubleForm,group[1].doubleForm);
  for(const s of group){
    assert.deepEqual(s.elements.slice(0,2),[primary,primary]);
    assert.equal(new Set(s.elements).size,3);
    assert.equal(s.soHe,3);
    assert.equal(s.slotCount,4);
    assert.equal(s.skillIds.length,4);
    assert.deepEqual(s.skillIds.slice(0,3),[primary+'-1',s.elements[2]+'-1',s.elements[3]+'-1']);
    const skill=specials.find(x=>x.id===s.skillIds[3]);
    assert(skill&&kinds.has(skill.effect.kind));
    assert(skill.cooldown>=3&&skill.cooldown<=4);
    if(skill.effect.target==='self'){
      assert.equal(combat.skillPower(500,{...skill,element:primary}),0,
        skill.name+' must never cause damage');
      assert.equal(combat.damage({attack:500},{defense:50,parts:['earth']},
        {...skill,element:primary},catalog.typeChart),0);
    }
    const parts=[primary,s.elements[2],s.elements[3]],level=35;
    const triple=combat.stats(parts,'legendary',level,catalog.elements,catalog.rarities);
    const value=combat.stats(s.elements,s.doHiem,level,catalog.elements,catalog.rarities);
    const upper=combat.stats(parts,'mythic',level,catalog.elements,catalog.rarities);
    for(const stat of ['hp','attack','defense'])
      assert(triple[stat]<value[stat]&&value[stat]<upper[stat],s.id+' '+stat);
  }
}
assert.equal(species.length+1740,catalog.species.length);
assert(config.elements.fire[0].skill.effect.kind==='poison');

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'dragon-double-test-'));
const dataDir=path.join(temporary,'data'),profilesDir=path.join(temporary,'profiles');
fs.mkdirSync(dataDir);fs.mkdirSync(profilesDir);
for(const file of ['dragons.json','game.json'])fs.copyFileSync(path.join(__dirname,'../data',file),path.join(dataDir,file));
const arena=createArena({dataDir,profilesDir,auth:{listUsers:()=>[
  {id:'red',username:'Red',disabled:false},{id:'blue',username:'Blue',disabled:false}]}});
const rankedExamples=catalog.species.slice(0,10).map((s,index)=>{
  const level=100-index*6,stars=index%4;
  return {id:index+1,species:s.id,level,stars,nickname:'Top '+(index+1),
    power:combat.power(combat.stats(s.elements,s.doHiem,level,catalog.elements,catalog.rarities,stars))};
}).sort((a,b)=>b.power-a.power);
const variants=createVirtualRivals({profile:{dragons:rankedExamples},playerLevel:45,
  roundKey:'test-window',makeFighter:arena.makeFighter,catalog,arenaConfig,progressionConfig});
assert.deepEqual(variants.map(rival=>rival.strength),['Weaker','Weaker','Balanced','Stronger','Stronger']);
const baseline=rankedExamples.slice(0,3).reduce((sum,dragon)=>sum+dragon.power,0);
const ratios=variants.map(rival=>rival.team.reduce((sum,dragon)=>sum+dragon.power,0)/baseline);
assert.equal(ratios.length,5,'Arena creates five catalog-backed difficulty bands');
assert(ratios.every(Number.isFinite),'Every generated team has calculable Combat Power');
assert(variants.every(rival=>rival.team.length===3&&rival.team.every(dragon=>
  dragon.id<0&&catalog.species.some(species=>species.id===dragon.species))),
  'NPC fighters are fresh virtual instances whose species resolve from the full catalog');
assert(variants.every(rival=>new Set(rival.team.map(dragon=>dragon.species)).size===3),
  'Each rival team uses three distinct catalog species');
assert.equal(new Set(variants.map(rival=>rival.team.map(dragon=>dragon.species).join('|'))).size,5,
  'Rival squads are distinct catalog lineups');
function profile(speciesId){return {player:{level:45},buildings:[{id:1,type:'arena'}],
  dragons:[1,2,3].map(id=>({id,species:speciesId,level:50,nickname:speciesId+' '+id}))};}
fs.writeFileSync(path.join(profilesDir,'red.json'),JSON.stringify(profile(doubleId('fire',1))));
fs.writeFileSync(path.join(profilesDir,'blue.json'),JSON.stringify(profile(doubleId('earth',0))));
async function run(){
  await arena.team({id:'red'},{attack:[1,2,3]});
  await arena.team({id:'blue'},{attack:[1,2,3]});
  const rivals=await arena.list({id:'red'});
  assert.equal(rivals.opponents.length,5,'Arena should generate five server-side AI rivals');
  assert(rivals.opponents.every(rival=>!('team' in rival)&&!('level' in rival)&&!('strength' in rival)),
    'Opponent teams and power details stay hidden until battle start');
  assert(rivals.dragons.every(dragon=>Number.isFinite(dragon.power))&&
    rivals.dragons.every((dragon,index,list)=>!index||list[index-1].power>=dragon.power),
    'Player rosters expose Combat Power sorted highest-first');
  assert.equal(rivals.attemptsRemaining,3);
  await arena.team({id:'red'},{attack:[2,3,1]});
  assert.deepEqual((await arena.list({id:'red'})).opponents.map(rival=>rival.id),
    rivals.opponents.map(rival=>rival.id),'Changing the attack team does not reroll this window’s rivals');
  let started=await arena.challenge({id:'red'},{opponentId:rivals.opponents[1].id});
  assert.equal((await arena.list({id:'red'})).attemptsRemaining,2,'Starting a match consumes one attempt');
  assert.equal(started.battle.attack[0].skills[3].special,true);
  assert.equal(started.battle.attack[0].skills[3].effect.kind,'damage_up');
  const first=await arena.turn({id:'red'},{action:'skill',skillIndex:3,expectedTurn:1});
  assert(first.battle,'Battle must continue after a support skill');
  const used=first.battle.events.find(e=>e.skill==='Phoenix Oath');
  assert(used&&used.damage===0&&used.effect==='damage_up');
  assert(first.battle.attack[0].statuses.some(s=>s.kind==='damage_up'&&s.turns===3));
  assert.equal(first.battle.attack[0].skills[3].remainingCooldown,4);
  await assert.rejects(()=>arena.turn({id:'red'},{action:'skill',skillIndex:3,
    expectedTurn:first.battle.turn}),/cooling down/);
  let turn=first.battle.turn;
  for(let i=0;i<4;i++){
    const outcome=await arena.turn({id:'red'},{action:'skill',skillIndex:0,expectedTurn:turn});
    if(!outcome.battle)break;
    turn=outcome.battle.turn;
    if(i<3)assert(outcome.battle.attack[0].skills[3].remainingCooldown>0);
    else assert.equal(outcome.battle.attack[0].skills[3].remainingCooldown,0);
  }
  // Attempts are charged at match start, even when the player forfeits.
  let current=(await arena.list({id:'red'})).battle;
  if(current){
    const forfeit=await arena.turn({id:'red'},{action:'forfeit',expectedTurn:current.turn});
    assert.equal(forfeit.result.won,false);
  }
  let remaining=(await arena.list({id:'red'})).attemptsRemaining;
  while(remaining>0){
    const rival=(await arena.list({id:'red'})).opponents[0];
    const match=await arena.challenge({id:'red'},{opponentId:rival.id});
    const lost=await arena.turn({id:'red'},{action:'forfeit',expectedTurn:match.battle.turn});
    assert.equal(lost.result.won,false);
    remaining=(await arena.list({id:'red'})).attemptsRemaining;
  }
  await assert.rejects(()=>arena.challenge({id:'red'},{opponentId:rivals.opponents[0].id}),/No Arena attempts left/);
  const arenaFile=path.join(dataDir,'arena','red.json'),saved=JSON.parse(fs.readFileSync(arenaFile,'utf8'));
  saved.windowKey='expired-window';fs.writeFileSync(arenaFile,JSON.stringify(saved));
  const scheduled=(await arena.list({id:'red'}));
  assert.equal(scheduled.attemptsRemaining,3,'New server window restores three attempts');
  assert.deepEqual(scheduled.defeatedOpponentIds,[],'Scheduled attempt reset preserves round defeat state');
  assert.deepEqual(scheduled.opponents.map(r=>r.id),rivals.opponents.map(r=>r.id),
    'Scheduled attempt reset preserves the five-rival round');
  const random=Math.random;
  try{
    Math.random=()=>.99;
    const burn=arena.fight([{id:10,species:doubleId('fire',0),level:50,nickname:'Pyre'}],
      [{id:11,species:doubleId('earth',0),level:50,nickname:'Stone'}]).events;
    assert(burn.some(e=>e.skill==='Sovereign Flame'&&e.effect==='poison'));
    assert(burn.some(e=>e.effect==='poison'&&e.statusTick&&e.damage>0));
    const freeze=arena.fight([{id:10,species:doubleId('ice',0),level:50,nickname:'Frost'}],
      [{id:11,species:doubleId('earth',0),level:50,nickname:'Stone'}]).events;
    assert(freeze.some(e=>e.effect==='freeze'&&e.skipped));
    const multi=arena.fight([{id:10,species:doubleId('war',1),level:50,nickname:'Marshal'}],
      [{id:11,species:doubleId('earth',0),level:50,nickname:'Stone'}]).events;
    assert(multi.some(e=>e.effect==='multi'&&e.hits===2&&e.damage>0));
  }finally{Math.random=random;fs.rmSync(temporary,{recursive:true,force:true});}
  console.log('PASS 30 Double Element species, skills, stats, cooldown and status combat');
}
run().catch(error=>{fs.rmSync(temporary,{recursive:true,force:true});console.error(error);process.exitCode=1;});
