/* TEST: Tải đúng các script như file HTML và kiểm tra các luồng tài nguyên quan trọng. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1]);
assert(scripts.length>=15,'Thiếu các module script');
for(const src of scripts)assert(fs.existsSync(path.join(root,src)),`Không thấy ${src}`);

async function boot(saveValue,options={}){
  const elements=new Map(),drawCalls=[];
  const canvasCtx=new Proxy({}, {get(target,key){
    if(key in target)return target[key];
    if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});
    return (...args)=>{drawCalls.push([key,...args]);return {};};
  },set(target,key,value){target[key]=value;return true;}});
  function element(id){
    if(!elements.has(id))elements.set(id,{
      id,style:{},dataset:{},innerHTML:'',textContent:'',scrollLeft:0,scrollTop:0,
      classList:{add(){},remove(){},toggle(){}},
      addEventListener(){},setAttribute(name,value){this[name]=String(value);},getBoundingClientRect(){return {left:0,top:0,width:800,height:600};},
      getContext(){return canvasCtx;},appendChild(){},remove(){},setPointerCapture(){}
    });
    return elements.get(id);
  }
  const storage=new Map();if(options.legacyLocal)storage.set('dragon-isle-save',options.legacyLocal);
  let remote=options.remote!==undefined?options.remote:(saveValue?JSON.parse(saveValue):null);
  const document={getElementById:element,createElement:()=>element('float'+Math.random()),
    querySelectorAll:()=>[],addEventListener(){},hidden:false};
  const window={devicePixelRatio:1,location:{protocol:options.protocol||'http:'},
    addEventListener(){},dispatchEvent(){},confirm:()=>true,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}};
  const fetchCalls=[];
  const fetch=async function(url,request={}){
    fetchCalls.push({url,request});
    if(url==='/api/auth/me')return options.noAuth?{ok:false,status:401}:
      {ok:true,status:200,json:async()=>({user:{id:'demo',username:'demo'}})};
    if(url==='/api/save'&&request.method==='PUT'){remote=JSON.parse(request.body);return {ok:true,status:200};}
    if(url==='/api/save')return {ok:true,status:200,json:async()=>remote};
    return {ok:false,status:404,json:async()=>({error:'Không tìm thấy.'})};
  };
  const sandbox={document,window,Event:class Event{constructor(type){this.type=type;}},Intl,Math,Date,Map,Set,Number,String,Object,Array,JSON,
    fetch,performance:{now:()=>Date.now()},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,
    requestAnimationFrame(){},console:{error(...args){throw new Error(args.join(' '));},log(){},warn(){}}};
  const context=vm.createContext(sandbox);
  for(const src of scripts){
    const source=fs.readFileSync(path.join(root,src),'utf8');
    vm.runInContext(source,context,{filename:src,timeout:2000});
  }
  await vm.runInContext('window.gameBootPromise',context);
  return {context,element,drawCalls,storage,fetchCalls,
    run(code){return vm.runInContext(code,context,{timeout:2000});}};
}
function snapshot(game,expr){return JSON.parse(game.run('JSON.stringify('+expr+')'));}

(async()=>{
const game=await boot();
const check=(label,fn)=>{try{fn();console.log('PASS '+label);}catch(error){console.error('FAIL '+label+': '+error.message);throw error;}};
const db=JSON.parse(fs.readFileSync(path.join(root,'data/dragons.json')));
assert.equal(Object.keys(db.quads).length,150,'Exactly 150 four-element recipes must be in dragons.json');
require('../scripts/extend-catalog.cjs')(db,JSON.parse(fs.readFileSync(path.join(root,'data/game.json'))));
const balance=await boot();
const lifecycle=await boot();
const countdownUI=await boot();
const habitatTap=await boot();
check('tapping a Habitat opens its inspector before optional full details',()=>{
 const g=habitatTap;
 g.run('state=newGame();ui.modal=null;ui.selection=null;focusIsland(0)');
 const point=snapshot(g,'(()=>{const b=state.buildings.find(b=>b.type==="habitat");'+
   'const p=gridToScreen(b.x+.5,b.y+.5);return worldToScreen(p.x,p.y+islandBob(0));})()');
 const event=JSON.stringify({clientX:point.x,clientY:point.y,pointerId:1,pointerType:'mouse'});
 g.run('pointerDown({...'+event+',preventDefault(){}});pointerUp({...'+event+',preventDefault(){}})');
 assert.equal(g.run('ui.modal'),null);
 assert.equal(g.run('ui.selection.type'),'building');
 assert(g.element('inspector').innerHTML.includes('data-action="habitat-menu"'));
 g.run('handleAction({dataset:{action:"habitat-menu",id:String(ui.selection.id)}})');
 assert.equal(g.run('ui.modal.name'),'habitat');
});
check('other building taps use one inspector and open management only on request',()=>{
 const g=habitatTap;
 g.run('state=newGame();focusIsland(0)');
 const point=snapshot(g,'(()=>{const b=state.buildings[0],p=gridToScreen(b.x+.5,b.y+.5);'+
   'return worldToScreen(p.x,p.y+islandBob(0));})()');
 const event=JSON.stringify({clientX:point.x,clientY:point.y,pointerId:2,pointerType:'mouse'});
 for(const [type,action] of [['farm','crop-menu'],['hatchery','hatchery-menu'],
   ['cave','breeding-menu'],['premiumCave','breeding-menu'],['arena','open-arena'],
   ['academy','upgrade'],['decor','move']]){
   g.run('state.buildings[0].type='+JSON.stringify(type)+';ui.selection=null;ui.modal=null;'+
     'pointerDown({...'+event+',preventDefault(){}});pointerUp({...'+event+',preventDefault(){}})');
   assert.equal(g.run('ui.modal'),null,type+' should not auto-open a popup');
   assert(g.element('inspector').innerHTML.includes('data-action="'+action+'"'),
     type+' should expose its relevant action in the inspector');
 }
});
check('finished crop refreshes once and shows Harvest without reopening Farm',()=>{
 const g=countdownUI,expires=Date.now()+3000;
 g.run('state.buildings.push({id:98,type:"farm",level:1,stored:false,crop:{id:DATA.crops[0].id,'+
   'startedAt:Date.now()-1000,readyAt:'+expires+'}});ui.modal={name:"crops",extra:98};renderCrops(98);'+
   'window.refreshCount=0;const originalRender=renderModal;renderModal=function(){window.refreshCount++;originalRender();};');
 const timer={dataset:{end:String(expires)},textContent:'',closest:selector=>selector==='#sheet'?{}:null};
 g.context.document.querySelectorAll=()=>[timer];
 g.run('refreshCountdowns()');
 assert.equal(g.run('window.refreshCount'),0);
 g.run('buildingById(98).crop.readyAt=Date.now()-1');timer.dataset.end=String(Date.now()-1);
 g.run('refreshCountdowns()');
 assert(g.element('sheetBody').innerHTML.includes('data-action="harvest"'));
 g.run('refreshCountdowns()');
 assert.equal(g.run('window.refreshCount'),1,'A completed timer must not redraw the panel every second');
});
check('new accounts receive starter gold and food without changing existing saves',()=>{
 const fresh=snapshot(game,'newGame()');
 assert.equal(fresh.gold,10000);
 assert.equal(fresh.food,2500);
 assert.equal(fresh.gems,20);
 fresh.gold=126;fresh.food=37;
 const restored=snapshot(game,'migrateSave('+JSON.stringify(fresh)+')');
 assert.equal(restored.gold,126);
 assert.equal(restored.food,37);
});
check('only habitats can be sold or stored and ready eggs block the next turn',()=>{
  lifecycle.run('state=newGame();state.buildings.push({id:91,type:"farm",x:740,y:704,level:1,stored:false});'+
    'storeBuilding(91);sellBuilding(91);');
  assert(lifecycle.run('!!buildingById(91)&&!buildingById(91).stored'));
  lifecycle.run('addEgg("fire","shop");addEgg("fire","shop");');
  assert.equal(lifecycle.run('state.eggs.filter(e=>e.hatcheryId!==null).length'),1);
  assert.equal(lifecycle.run('state.eggs.filter(e=>e.hatcheryId===null).length'),1);
  lifecycle.run('state.eggs[0].readyAt=Date.now()-1;autoAssignWaitingEggs();');
  assert.equal(lifecycle.run('state.eggs.filter(e=>e.hatcheryId!==null).length'),1);
  assert.deepEqual(snapshot(lifecycle,'[1,2,3,4,5].map(hatcheryCapacity)'),[1,2,3,4,5]);
  lifecycle.run('state.eggs.shift();autoAssignWaitingEggs();');
  assert.equal(lifecycle.run('state.eggs[0].hatcheryId'),3);
  lifecycle.run('state.buildings.push({id:92,type:"cave",stored:false,breeding:null});'+
    'state.dragons[0].level=5;state.dragons.push({...state.dragons[0],id:77,species:"water",level:5});'+
    'state.eggs.push({id:93,species:"fire",source:"breed",caveId:92,hatcheryId:null});'+
    'startBreeding(92,state.dragons[0].id,77);');
  assert.equal(lifecycle.run('buildingById(92).breeding'),null);
  lifecycle.run('renderBreeding(92)');
  assert(lifecycle.element('sheetBody').innerHTML.includes('previous bred egg'));
  assert(!lifecycle.element('sheetBody').innerHTML.includes('data-action="start-breeding"'));
});
check('upgraded hatchery fills all nests and keeps ready eggs occupying slots',()=>{
 const g=lifecycle;
 g.run('state=newGame();buildingById(3).level=5;for(let i=0;i<6;i++)addEgg("fire","shop");');
 assert.equal(g.run('eggsInHatchery(3).length'),5);
 assert.equal(g.run('state.eggs.filter(e=>e.hatcheryId===null).length'),1);
 g.run('state.eggs[0].readyAt=Date.now()-1;autoAssignWaitingEggs();');
 assert.equal(g.run('eggsInHatchery(3).length'),5,'A ready egg still occupies a nest');
 const before=snapshot(g,'state.eggs.filter(e=>e.hatcheryId===3).map(e=>e.readyAt)');
 assert(before.every(n=>n>0),'Each egg has its own incubation timer');
 g.run('state.eggs.shift();autoAssignWaitingEggs();');
 assert.equal(g.run('eggsInHatchery(3).length'),5,'A waiting egg fills the free nest');
 g.run('state=newGame();addEgg("fire","shop");addEgg("water","shop");'+
   'buildingById(3).upgradeEnds=Date.now()-1;finishUpgrades(Date.now());');
 assert.equal(g.run('eggsInHatchery(3).length'),2,'Increasing capacity pulls waiting eggs');
 assert.equal(g.run('buildingById(3).level'),2);
 g.run('buildingById(3).level=3');
 g.run('renderHatchery(3)');
 assert(g.element('sheetBody').innerHTML.includes('2/3')||
   g.element('sheetBody').innerHTML.includes('3 incubation nests'));
});
check('hatchery eggs scale with nests and do not overlap at level five',()=>{
 const sizes=snapshot(game,'[1,2,3,4,5].map(level=>({level,scale:hatcheryEggScale(level,900,500)}))');
 assert(sizes.every(({scale})=>scale>.85),'Eggs should be visibly larger than the old fixed scale');
 assert(sizes[0].scale>sizes[4].scale,'A single nest has more room than five nests');
 const final=sizes[4].scale,slots=snapshot(game,'nestSlots(5)');
 for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
   if(Math.abs(slots[i][1]-slots[j][1])>.1)continue;
   assert(Math.abs(slots[i][0]-slots[j][0])>26*final/900,
     'Adjacent eggs should not overlap inside the five-nest hatchery');
 }
});

check('battle preview, multiple attacking elements and colored skill symbols',()=>{
 const combat=require('../js/data/combat-rules.js');
 const waterFire=db.species.find(s=>s.elements.join('>')==='water>fire');
 const ice=db.species.find(s=>s.id==='ice');
 const flame={...JSON.parse(fs.readFileSync(path.join(root,'data/game.json'))).skills.elemental.fire[0],element:'fire'};
 const attacker={species:waterFire.id,level:25},defender={species:ice.id,level:25};
 const actor=combat.stats(waterFire.elements,waterFire.doHiem,25,db.elements,db.rarities);
 const target={...combat.stats(ice.elements,ice.doHiem,25,db.elements,db.rarities),parts:ice.elements};
 assert.equal(balance.run('calculateSkillDamage('+JSON.stringify(attacker)+','+JSON.stringify(defender)+','+
   JSON.stringify(flame)+',1)'),combat.damage(actor,target,flame,db.typeChart));
 const matchup=snapshot(balance,'matchupFor(DATA.species["'+waterFire.id+'"])');
 assert.equal(matchup.weak.length,2);
 assert(matchup.strong.includes('ice'),'Secondary Fire counters Ice');
 const detail=balance.run('dragonDetailHtml(DATA.species["fire"],{species:"fire",level:25,nickname:"Fire",habitatId:1})');
 assert(detail.includes('skill-hex neutral')&&detail.includes('skill-hex elemental'));
 assert(detail.includes('100% base attack + '));
});
check('early player XP, level rewards and dragon feeding costs',()=>{
 assert.equal(balance.run('playerXPNeeded(1)'),93);
 assert.equal(balance.run('playerXPNeeded(20)'),1276);
 assert.equal(balance.run('Array.from({length:4},(_,i)=>playerXPNeeded(i+1)).reduce((a,b)=>a+b,0)'),627);
 assert(balance.run('playerXPNeeded(1)')<100);
 assert(balance.run('playerXPNeeded(20)')<2000);
 assert(balance.run('playerXPNeeded(21)')>balance.run('playerXPNeeded(20)'));
 assert(balance.run('dragonFeedCost(1)')>1);
 assert(balance.run('dragonFeedCost(30)')>100);
 const before=snapshot(balance,'{gold:state.gold,food:state.food,gems:state.gems}');
 balance.run('gainPlayerXP(playerXPNeeded(1))');
 assert.equal(balance.run('state.player.level'),2);
 assert.equal(balance.run('state.gold'),before.gold+1500);
 assert.equal(balance.run('state.food'),before.food+300);
 assert.equal(balance.run('state.gems'),before.gems+1);
 balance.run('state.player.level=4;state.player.xp=0;gainPlayerXP(playerXPNeeded(4))');
 assert.equal(balance.run('state.player.level'),5);
 assert.equal(balance.run('state.gems'),before.gems+5);
 balance.run('state.player.level=3;state.player.xp=playerXPNeeded(3)+52;gainPlayerXP(0)');
 assert.equal(balance.run('state.player.level'),4);
 assert.equal(balance.run('state.player.xp'),52);
 balance.run('state.player.level=5;state.player.xp=0');
 balance.run('updateHeader()');
 assert.equal(balance.element('xpText').textContent,'0 / '+balance.run('playerXPNeeded(5)')+' XP');
 balance.run('state.player.level=60;updateHeader()');
 assert.equal(balance.element('xpText').textContent,'MAX LEVEL');
 assert.equal(balance.element('xpFill').style.width,'100%');
});
check('element unlocks, hatchery gates and crop timers follow the progression curve',()=>{
 assert.deepEqual(snapshot(balance,'DATA.elementUnlocks'),{
   fire:1,water:2,earth:4,wind:6,ice:8,thunder:11,nature:14,dark:18,
   light:22,metal:27,war:32,pure:37,legend:42,primal:48,time:55
 });
 assert.deepEqual(snapshot(balance,'[1,2,3,4].map(hatcheryUpgradePlayerLevel)'),[5,12,22,35]);
 assert.deepEqual(snapshot(balance,'DATA.crops.map(c=>c.duration)'),[30,180,900,7200]);
 assert.deepEqual(snapshot(balance,'DATA.upgradeTimes'),{
   habitat:[45,180,600],farm:[30,120,480],hatchery:[90,300,900,2400],academy:[300,900,2700,7200]
 });
});
const income=await boot();
check('gold scales steadily, active Habitats and higher levels hold more gold',()=>{
 const ratios=snapshot(income,'[1,10,30,50,100].map(level=>dragonIncome({...state.dragons[0],level},buildingById(1)))');
 assert(ratios.every((n,i)=>i===0||n>ratios[i-1]));
 assert(ratios[4]<ratios[0]*15,'Level 100 should not explode exponentially');
 assert(income.run('habitatGoldCapacity({type:"habitat",element:"fire",level:4})')>
   income.run('habitatGoldCapacity({type:"habitat",element:"fire",level:1})')*10);
 assert(income.run('habitatGoldCapacity({type:"habitat",element:"time",level:4})')>
   income.run('habitatGoldCapacity({type:"habitat",element:"fire",level:4})'));
 assert(income.run('habitatGoldCapacity({type:"habitat",element:"fire",level:4})')>=350000);
 assert(income.run('habitatGoldCapacity({type:"habitat",element:"time",level:4})')>=1000000);
 income.run('buildingById(1).stored=true');
 assert.equal(income.run('habitatIncomePerMinute(buildingById(1))'),0);
 assert.equal(income.run('habitatGemRate(buildingById(1))'),0);
 assert(income.run('dragonDetailHtml(DATA.species.fire,state.dragons[0])').includes('No gold until placed in an active Habitat'));
});
const economy=await boot();
check('Habitat levels hold 2, 3, 4 and 5 dragons for assignment and hatching',()=>{
 assert.deepEqual(snapshot(economy,'[1,2,3,4].map(habitatCapacity)'),[2,3,4,5]);
 for(let level=1;level<=4;level++){
   economy.run('state=newGame();buildingById(1).level='+level+';'+
     'for(let i=0;i<'+(level+1)+';i++)state.dragons.push({...state.dragons[0],'+
     'id:100+i,nickname:"Extra "+i,habitatId:null});');
   for(let i=0;i<level;i++)economy.run('assignDragon('+(100+i)+',1)');
   assert.equal(economy.run('occupants(buildingById(1)).length'),level+1);
   assert.equal(economy.run('habitatHasRoom(buildingById(1))'),false);
   economy.run('assignDragon('+(100+level)+',1);renderHabitat(1)');
   assert.equal(economy.run('dragonById('+(100+level)+').habitatId'),null);
   assert(economy.element('sheetBody').innerHTML.includes('<b>'+(level+1)+'/'+(level+1)+'</b>'));
 }
 economy.run('state=newGame();addEgg("fire","shop");state.eggs[0].readyAt=Date.now()-1;'+
   'hatchEgg(state.eggs[0].id,1)');
 assert.equal(economy.run('occupants(buildingById(1)).length'),2);
 economy.run('addEgg("fire","shop");state.eggs[0].readyAt=Date.now()-1;'+
   'hatchEgg(state.eggs[0].id,1)');
 assert.equal(economy.run('state.eggs.length'),1,'A full level-one Habitat blocks hatching');
 economy.run('buildingById(1).level=2;hatchEgg(state.eggs[0].id,1)');
 assert.equal(economy.run('occupants(buildingById(1)).length'),3);
 assert.equal(economy.run('state.eggs.length'),0);
});
check('Habitat purchase history, resale, old saves and the Arena shortcut',()=>{
 economy.run('state=newGame();state.gold=100000;syncDock()');
 assert.equal(economy.element('arenaDockButton').hidden,true);
 const first=economy.run('habitatPurchaseCost("water")');
 economy.run('beginMode({kind:"buy",type:"habitat",element:"water"})');
 const site=snapshot(economy,'(()=>{for(let y=692;y<716;y++)for(let x=738;x<762;x++)'+
   'if(getBuildValid(x,y,ui.mode))return {x,y};return null})()');
 assert(site,'Starting island needs a free six by six plot');
 economy.run('completePlacement('+site.x+','+site.y+')');
 assert.equal(economy.run('state.habitatPurchases.water'),1);
 assert.equal(economy.run('state.buildings.find(b=>b.element==="water").purchaseCost'),first);
 assert(economy.run('habitatPurchaseCost("water")')>first);
 const owned=snapshot(economy,'state');
 assert.equal(economy.run('migrateSave('+JSON.stringify(owned)+').habitatPurchases.water'),1);
 delete owned.habitatPurchases;
 assert.equal(economy.run('migrateSave('+JSON.stringify(owned)+').habitatPurchases.water'),1);
 const habitatId=economy.run('state.buildings.find(b=>b.element==="water").id');
 economy.run('sellBuilding('+habitatId+')');
 assert.equal(economy.run('state.habitatPurchases.water'),1);
 assert.equal(economy.run('state.buildings.some(b=>b.element==="water")'),false);
 assert(economy.run('habitatPurchaseCost("water")')>first);
 economy.run('state.buildings.push({id:99,type:"arena",level:1,stored:false});syncDock()');
 assert.equal(economy.element('arenaDockButton').hidden,false);
 economy.run('state.buildings.at(-1).stored=true;syncDock()');
 assert.equal(economy.element('arenaDockButton').hidden,true);
});
check('Shop prices and tier-element breeding and incubation durations are balanced',()=>{
 assert(economy.run('shopEggPrice(DATA.species.fire).vang')>=700);
 assert(economy.run('shopEggPrice(DATA.species.time).vang')>economy.run('shopEggPrice(DATA.species.fire).vang'));
 assert.equal(economy.run('hatchingSeconds(DATA.species.fire)'),30);
 assert.equal(economy.run('hatchingSeconds(DATA.species.water)'),45);
 assert.equal(economy.run('hatchingSeconds(DATA.species.time)'),1200);
 const ids=snapshot(economy,'({two:Object.keys(DATA.species).find(id=>DATA.species[id].elements.length===2),'+
   'three:TRIPLE_IDS[0],four:FOUR_IDS[0],double:DOUBLE_IDS[0]})');
 assert(economy.run('hatchingSeconds(DATA.species['+JSON.stringify(ids.two)+'])')>45);
 assert(economy.run('hatchingSeconds(DATA.species['+JSON.stringify(ids.three)+'])')>
   economy.run('hatchingSeconds(DATA.species['+JSON.stringify(ids.two)+'])'));
 assert(economy.run('hatchingSeconds(DATA.species['+JSON.stringify(ids.four)+'])')>
   economy.run('hatchingSeconds(DATA.species['+JSON.stringify(ids.three)+'])'));
 assert(economy.run('hatchingSeconds(DATA.species['+JSON.stringify(ids.double)+'])')>
   economy.run('hatchingSeconds(DATA.species['+JSON.stringify(ids.four)+'])'));
 assert(economy.run('breedingSeconds(DATA.species['+JSON.stringify(ids.three)+'])')>
   economy.run('breedingSeconds(DATA.species['+JSON.stringify(ids.two)+'])'));
 economy.run('state=newGame();addEgg(DOUBLE_IDS[0],"shop")');
 assert.equal(economy.run('state.eggs[0].readyAt-state.eggs[0].startedAt'),
   economy.run('hatchingSeconds(DATA.species[DOUBLE_IDS[0]])*1000'));
 economy.run('ui.shopTab="special";renderShop()');
 assert(economy.element('sheetBody').innerHTML.includes('● 10,000'));
 economy.run('ui.shopTab="habitats";renderShop()');
 assert(economy.element('sheetBody').innerHTML.includes('Purchased 1×'));
});
check('selling, storing, feeding and moving settle old income before rates change',()=>{
 income.run('state=newGame();state.dragons[0].gemProgress=.999;state.lastTick=Date.now()-60000');
 const expected=income.run('dragonIncomePerMinute(state.dragons[0],buildingById(1))');
 income.run('sellDragon(state.dragons[0].id)');
 const house=()=>snapshot(income,'{gold:buildingById(1).storedGold,gems:buildingById(1).storedGems}');
 assert(Math.abs(house().gold-expected)<.05);
 assert.equal(house().gems,1);
 assert.equal(income.run('habitatIncomePerMinute(buildingById(1))'),0);
 assert.equal(income.run('habitatGemRate(buildingById(1))'),0);
 const before=house();
 income.run('advanceWorld(Date.now()+3600000)');
 assert.deepEqual(house(),before);
 const saleBalance=income.run('state.gold'),gemBalance=income.run('state.gems');
 income.run('collect(buildingById(1))');
 assert(Math.abs(income.run('state.gold')-saleBalance-before.gold)<.0001);
 assert.equal(income.run('state.gems'),gemBalance+1);
 income.run('state=newGame();state.lastTick=Date.now()-60000;storeBuilding(1)');
 const stored=income.run('buildingById(1).storedGold');
 assert(stored>0);
 income.run('advanceWorld(Date.now()+60000)');
 assert.equal(income.run('buildingById(1).storedGold'),stored);
 income.run('state=newGame();state.buildings.push({...buildingById(1),id:92,x:750,y:700,storedGold:0,storedGems:0});'+
   'state.lastTick=Date.now()-60000;assignDragon(state.dragons[0].id,92)');
 assert(income.run('buildingById(1).storedGold')>0);
 assert.equal(income.run('buildingById(92).storedGold'),0);
 income.run('state=newGame();state.dragons[0].feedProgress=3;state.food=100;state.lastTick=Date.now()-60000');
 const oldRate=income.run('dragonIncomePerMinute(state.dragons[0],buildingById(1))');
 income.run('feedDragon(state.dragons[0].id)');
 assert(Math.abs(income.run('buildingById(1).storedGold')-oldRate)<.05);
 assert(income.run('dragonIncomePerMinute(state.dragons[0],buildingById(1))')>oldRate);
});
check('five dragon stars consume only qualified duplicates and raise all combat stats',()=>{
 const stars=balance;
 stars.run('state=newGame();state.gold=10000000;state.food=1000000;state.gems=1000;state.lastTick=Date.now();');
 assert.deepEqual(snapshot(stars,'DATA.progression.starUpgrades.map(rule=>rule.dragons)'),[2,4,6,8,10]);
 const original=snapshot(stars,'dragonStats(state.dragons[0])');
 assert(stars.run('dragonDetailHtml(DATA.species.fire,state.dragons[0])').includes('aria-label="0 of 5 stars"'));
 stars.run('state.dragons.push({id:50,species:"water",level:100,stars:0},'+
   '{id:51,species:"fire",level:100,stars:1},'+
   '{id:52,species:"fire",level:29,stars:0})');
 assert.equal(stars.run('starDonors(state.dragons[0]).length'),0);
 assert.equal(stars.run('upgradeDragonStar(2)'),false);
 for(let rank=0;rank<5;rank++){
   const rule=JSON.parse(fs.readFileSync(path.join(root,'data/game.json'))).progression.starUpgrades[rank];
   stars.run('for(let i=0;i<'+rule.dragons+';i++)state.dragons.push({id:1000+'+rank+'*100+i,'+
     'species:"fire",nickname:"Donor "+i,level:'+rule.level+',stars:0,habitatId:null})');
   assert.equal(stars.run('starDonors(state.dragons.find(d=>d.id===2)).length'),rule.dragons);
   assert.equal(stars.run('upgradeDragonStar(2)'),true);
   assert.equal(stars.run('state.dragons.find(d=>d.id===2).stars'),rank+1);
   assert.equal(stars.run('state.dragons.filter(d=>d.id>=1000).length'),0);
   const enhanced=snapshot(stars,'dragonStats(state.dragons.find(d=>d.id===2))');
   for(const stat of ['hp','attack','defense'])
     assert.equal(enhanced[stat],Math.round(original[stat]*(1+(rank+1)*.05)));
 }
 assert.equal(stars.run('upgradeDragonStar(2)'),false);
 assert.equal(stars.run('state.dragons.length'),4,'Target and ineligible dragons remain');
 assert(stars.run('dragonDetailHtml(DATA.species.fire,state.dragons.find(d=>d.id===2))')
   .includes('aria-label="5 of 5 stars"'));
 const legacy=snapshot(stars,'newGame()');legacy.version=11;delete legacy.dragons[0].stars;
 assert.equal(stars.run('migrateSave('+JSON.stringify(legacy)+').dragons[0].stars'),0);
 legacy.dragons[0].stars=999;
 assert.equal(stars.run('migrateSave('+JSON.stringify(legacy)+').dragons[0].stars'),5);
});
check('farm slots, food shop purchase and level four Dragon Fruit',()=>{
 balance.run('state.player.level=1;state.gold=10000;state.food=0;');
 assert.equal(balance.run('farmLimit(state.player.level)'),1);
 balance.run('ui.shopTab="supplies";renderShop()');
 let shop=balance.element('sheetBody').innerHTML;
 assert(shop.includes('data-count="500"'));
 assert(!shop.includes('data-action="topup-test"'));
 balance.run('window.DragonGame.action({action:"buy-food",count:"100"})');
 assert.equal(balance.run('state.food'),100);
 assert.equal(balance.run('state.gold'),8500);
 balance.run('state.gold=0;renderShop();window.DragonGame.action({action:"buy-food",count:"100"})');
 assert(balance.element('sheetBody').innerHTML.includes('Need 1,500 more gold'));
 assert.equal(balance.run('state.food'),100);
 assert(balance.element('toast').textContent.includes('Not enough gold'));
 balance.run('state.gold=9500');
 balance.run('state.buildings.push({id:state.nextId++,type:"farm",level:4,x:750,y:692,stored:false,crop:null})');
 assert(balance.run('buildLockReason("farm",null)').includes('limit'));
 balance.run('state.player.level=5');
 assert.equal(balance.run('farmLimit(state.player.level)'),2);
 const farmId=balance.run('state.buildings.at(-1).id');
 balance.run('renderCrops('+farmId+')');
 assert(balance.element('sheetBody').innerHTML.includes('data-crop="dragonfruit"'));
 balance.run('state.gold=0;renderCrops('+farmId+');window.DragonGame.action({action:"plant",id:"'+farmId+'",crop:"dragonfruit"})');
 assert.equal(balance.run('state.buildings.at(-1).crop'),null);
 assert(balance.element('toast').textContent.includes('Not enough gold'));
 balance.run('state.gold=20000');
 balance.run('window.DragonGame.action({action:"plant",id:"'+farmId+'",crop:"dragonfruit"})');
 assert.equal(balance.run('state.buildings.at(-1).crop.id'),'dragonfruit');
 assert.equal(balance.run('state.gold'),8000);
 balance.run('state.buildings.at(-1).crop.readyAt=Date.now()-1;harvest(state.buildings.at(-1))');
 assert(balance.run('state.food')>100);
});
const commerce=await boot();
check('Shop purchase and Farm planting keep their panels stable',()=>{
 commerce.run('state=newGame();state.gold=10000;ui.shopTab="supplies";openModal("shop");dom.body.scrollTop=72;'+
   'handleAction({dataset:{action:"buy-food",count:"100"}})');
 assert.equal(commerce.run('ui.modal.name'), 'shop');
 assert.equal(commerce.run('ui.shopTab'), 'supplies');
 assert.equal(commerce.run('dom.body.scrollTop'),72);
 assert(commerce.element('sheetBody').innerHTML.includes('data-count="100"'));
 commerce.run('ui.shopTab="special";renderShop();handleAction({dataset:{action:"choose-build",type:"farm"}})');
 assert.equal(commerce.run('ui.modal'),null,'Placement temporarily exposes the island');
 assert.equal(commerce.run('ui.mode.fromShop'),true);
 assert(commerce.element('placementText').textContent.includes('on placement'));
 assert.equal(commerce.run('state.gold'),8500,'Choosing a plot does not charge before placement');
 commerce.run('handleAction({dataset:{action:"cancel-mode"}})');
 assert.equal(commerce.run('ui.modal.name'),'shop');
 assert.equal(commerce.run('ui.shopTab'),'special');
 commerce.run('state.buildings.push({id:91,type:"farm",level:1,x:740,y:704,stored:false,crop:null});'+
   'openModal("crops",91);dom.body.scrollTop=48;'+
   'handleAction({dataset:{action:"plant",id:"91",crop:"wheat"}})');
 assert.equal(commerce.run('ui.modal.name'),'crops');
 assert.equal(commerce.run('dom.body.scrollTop'),48);
 assert.equal(commerce.run('buildingById(91).crop.id'),'wheat');
 assert(commerce.element('sheetBody').innerHTML.includes('crop-progress'));
 assert(!commerce.element('sheetBody').innerHTML.includes('data-action="plant"'),
   'An active Farm shows only its crop progress');
 commerce.run('buildingById(91).crop.readyAt=Date.now()-1;'+
   'handleAction({dataset:{action:"harvest",id:"91"}})');
 assert.equal(commerce.run('ui.modal.name'),'crops');
 assert.equal(commerce.run('buildingById(91).crop'),null);
 assert(commerce.element('sheetBody').innerHTML.includes('data-action="plant"'),
   'Harvest returns directly to crop choices');
});
const navigation=await boot();
check('dragon detail back navigation and habitat actions follow their source and state',()=>{
 navigation.run('state=newGame();openModal("dragons");handleAction({dataset:{action:"dragon-detail",id:"2"}})');
 assert.equal(navigation.run('ui.modal.name'),'dragon-detail');
 assert(navigation.element('sheetBody').innerHTML.includes('Back to Dragons'));
 assert.equal((navigation.element('sheetBody').innerHTML.match(/data-action="sell-dragon"/g)||[]).length,1);
 navigation.run('handleAction({dataset:{action:"dragon-back"}})');
 assert.equal(navigation.run('ui.modal.name'),'dragons');
 assert(navigation.element('sheetBody').innerHTML.includes('role="button" tabindex="0"'));
 assert(!navigation.element('sheetBody').innerHTML.includes('View stats and skills'),
   'The dragon card itself opens details without a duplicate button');
 navigation.run('openModal("habitat",1);handleAction({dataset:{action:"dragon-detail",id:"2"}});'+
   'handleAction({dataset:{action:"dragon-back"}})');
 assert.equal(navigation.run('ui.modal.name'),'habitat');
 assert(!navigation.element('sheetBody').innerHTML.includes('data-action="sell"'),
   'Occupied Habitats cannot be sold');
 assert(navigation.element('sheetBody').innerHTML.includes('data-action="collect" data-id="1" disabled'));
 navigation.run('buildingById(1).storedGold=10;renderHabitat(1)');
 assert(navigation.element('sheetBody').innerHTML.includes('data-action="collect" data-id="1">'));
 navigation.run('buildingById(1).upgradeEnds=Date.now()+60000;renderHabitat(1)');
 assert(!navigation.element('sheetBody').innerHTML.includes('data-action="move"'));
 assert(!navigation.element('sheetBody').innerHTML.includes('data-action="store"'));
 navigation.run('ui.shopTab="save";openModal("shop")');
 assert(navigation.element('sheetBody').innerHTML.includes('10,000 gold, 2,500 food'));
 assert(navigation.element('sheetBody').innerHTML.includes('<summary>Testing &amp; debug</summary>'));
});
check('a waiting egg enters the only free Hatchery without a chooser popup',()=>{
 navigation.run('state=newGame();addEgg("fire");var waitingEgg=addEgg("fire");openModal("inventory")');
 assert.equal(navigation.run('waitingEgg.hatcheryId'),null);
 assert(navigation.element('sheetBody').innerHTML.includes('Hatchery full'));
 navigation.run('state.eggs.shift();renderInventory();handleAction({dataset:{action:"egg-find-home",id:String(waitingEgg.id)}})');
 assert.equal(navigation.run('ui.modal.name'),'hatchery');
 assert.equal(navigation.run('waitingEgg.hatcheryId'),3);
});
check('Hatchery movement and XP for land and island',()=>{
 const g=balance;
 g.run('state= newGame();addEgg("fire");beginMode({kind:"move",id:3});completePlacement(750,692)');
 assert.equal(g.run('state.buildings.find(b=>b.type==="hatchery").x'),750);
 assert.equal(g.run('state.eggs[0].hatcheryId'),3);
 g.run('state.gold=500000;unlockLand(739,691)');
 assert(g.run('state.player.level')>=2);
 g.run('state.player.level=10;state.player.xp=0;state.gems=1000;'+
   'state.regions=[...new Set([...state.regions,...Array.from({length:9},(_,i)=>`0:${i%3}:${Math.floor(i/3)}`)])];unlockIsland(1)');
 assert.equal(g.run('state.player.xp'),150);
});
check('two-element breeding is favored and chance labels have two decimals',()=>{
 balance.run('state.dragons.push({id:state.nextId++,species:"water",level:5,habitatId:null});'+
   'state.dragons[0].species="fire";state.dragons[0].level=5;'+
   'ui.breedDraft={father:state.dragons[0].id,mother:state.dragons.at(-1).id};'+
   'state.buildings.push({id:state.nextId++,type:"cave",level:1,stored:false,x:740,y:705,breeding:null})');
 const odds=snapshot(balance,'breedingOptions(state.dragons[0],state.dragons.at(-1))');
 assert(Math.abs(odds.filter(o=>o.id.includes('>')).reduce((n,o)=>n+o.chance,0)-.75)<1e-9);
 balance.run('renderBreeding(state.buildings.at(-1).id)');
 const html=balance.element('sheetBody').innerHTML;
 assert(html.includes('75.00%'));
 assert(html.includes('breed-probabilities')&&html.includes('breed-tier-outcomes'));
 assert.equal(balance.run('breedingChanceLabel(.000000015)'),'0.00000150%');
 assert.equal((html.match(/class="breed-chance /g)||[]).length,5);
 assert.equal(balance.run('breedingOptions(state.dragons[0],state.dragons.at(-1)).reduce((sum,o)=>sum+o.chance,0)'),1);
});
check('four-element and Double breeding follow the parent recipes',()=>{
 const outcomes=(father,mother,level)=>snapshot(balance,'breedingOptions('+
   JSON.stringify({id:101,species:father,level})+','+
   JSON.stringify({id:102,species:mother,level})+')');
 const four=options=>options.filter(o=>{
   const parts=o.id.split('>');return parts.length===4&&new Set(parts).size===4;
 });
 const double=options=>options.filter(o=>o.id.split('>').length===4&&
   new Set(o.id.split('>')).size===3);
 const chance=options=>options.reduce((sum,o)=>sum+o.chance,0);
 const same=outcomes('fire>water>earth','fire>water>earth',5);
 assert.equal(four(same).length,0,'Three shared elements cannot produce four-element dragons');
 assert.equal(four(outcomes('fire>water>earth','fire>water>wind',30)).length,0,
   'A four-element set missing from the 150 recipes cannot appear');
 const overlap=outcomes('fire>earth>ice','fire>earth>dark',30);
 assert(four(overlap).length>0&&Math.abs(chance(four(overlap))-.0225)<1e-9);
 const focused=outcomes('fire>earth>ice','fire>earth>dark',30);
 const fullyInherited=four(focused).filter(o=>o.id.split('>').every(e=>
   ['fire','earth','ice','dark'].includes(e)));
 const mutated=four(focused).filter(o=>!fullyInherited.includes(o));
 assert.equal(fullyInherited.length,1);
 assert.equal(mutated.length,0,'No fourth element can appear outside the parents');
 assert.equal(snapshot(balance,'DRAGON_DB.quads["dark|earth|fire|ice"]'),fullyInherited[0].id);
 assert(four(outcomes('fire>earth>ice','fire>earth>dark',100)).length>0);
 assert.equal(four(outcomes('fire>water>earth','water>ice',100)).length,0);
 const fireFours=snapshot(balance,'FOUR_IDS.filter(id=>DATA.species[id].elements[0]==="fire")');
 const waterFour=snapshot(balance,'FOUR_IDS.find(id=>DATA.species[id].elements[0]==="water")');
 assert.equal(double(outcomes(fireFours[0],fireFours[1],39)).length,0);
 const doubles=double(outcomes(fireFours[0],fireFours[1],40));
 assert.equal(doubles.length,2,'Both Double variants of the shared primary are possible');
 assert(doubles.every(o=>o.id.startsWith('fire>fire>')));
 assert(Math.abs(chance(doubles)-.009)<1e-9);
 assert.equal(double(outcomes(fireFours[0],waterFour,100)).length,0);
 assert.equal(double(outcomes(fireFours[0],'fire>water>earth',100)).length,0);
 assert.equal(four(outcomes(fireFours[0],fireFours[1],100)).length,0);
 const doubleParent=double(outcomes(fireFours[0],fireFours[1],40))[0].id;
 assert.equal(double(outcomes(doubleParent,fireFours[0],40)).length,2);
 for(const options of [same,overlap,outcomes(fireFours[0],fireFours[1],40)])
   assert(Math.abs(chance(options)-1)<1e-9);
});
const premium=await boot();
check('Celestial Sanctuary costs gems once and persists through saves',()=>{
 premium.run('state=newGame();state.gems=249;ui.shopTab="special";renderShop()');
 assert(premium.element('sheetBody').innerHTML.includes('data-type="premiumCave"'));
 assert(premium.element('sheetBody').innerHTML.includes('♦ 250'));
 premium.run('beginMode({kind:"buy",type:"premiumCave"})');
 const site=snapshot(premium,'(()=>{for(let y=692;y<716;y++)for(let x=738;x<762;x++)'+
   'if(getBuildValid(x,y,ui.mode))return {x,y};return null})()');
 assert(site,'The starting island needs a free premium cave plot');
 premium.run('completePlacement('+site.x+','+site.y+')');
 assert.equal(premium.run('state.buildings.filter(b=>b.type==="premiumCave").length'),0);
 assert.equal(premium.run('state.gems'),249);
 premium.run('state.gems=250;completePlacement('+site.x+','+site.y+')');
 assert.equal(premium.run('state.gems'),0);
 assert.equal(premium.run('state.gold'),10000,'Gem purchase must not charge gold');
 assert.equal(premium.run('state.buildings.filter(b=>b.type==="premiumCave").length'),1);
 assert(premium.run('buildLockReason("premiumCave")'));
 premium.run('storeBuilding(state.buildings.at(-1).id);sellBuilding(state.buildings.at(-1).id)');
 assert.equal(premium.run('state.buildings.filter(b=>b.type==="premiumCave").length'),1);
 assert.equal(premium.run('state.buildings.at(-1).stored'),false);
 assert.equal(premium.run('migrateSave(state).buildings.filter(b=>b.type==="premiumCave").length'),1);
});
check('premium breeding boosts every 3+ element result relatively and keeps 100% odds',()=>{
 const evaluate=(father,mother)=>snapshot(premium,'(()=>{const father='+JSON.stringify({id:101,species:father,level:40})+
   ',mother='+JSON.stringify({id:102,species:mother,level:40})+';return ['+
   'breedingOptions(father,mother),breedingOptions(father,mother,{type:"premiumCave"})];})()');
 for(const pair of [['fire>earth>ice','fire>earth>dark'],
   ...[snapshot(premium,'FOUR_IDS.filter(id=>DATA.species[id].elements[0]==="fire").slice(0,2)')]]){
   const [regular,enhanced]=evaluate(...pair),base=new Map(regular.map(o=>[o.id,o.chance]));
   assert(Math.abs(enhanced.reduce((sum,o)=>sum+o.chance,0)-1)<1e-9);
   assert(enhanced.some(o=>o.id.split('>').length>=3));
   for(const option of enhanced){
     if(option.id.split('>').length>=3)
       assert(Math.abs(option.chance/base.get(option.id)-1.4)<1e-9,option.id);
   }
   assert(enhanced.filter(o=>o.id.split('>').length<=2).reduce((sum,o)=>sum+o.chance,0)<
     regular.filter(o=>o.id.split('>').length<=2).reduce((sum,o)=>sum+o.chance,0));
 }
 const regularTime=premium.run('breedingSeconds(DATA.species["fire>earth>ice"],1)');
 const premiumTime=premium.run('breedingSeconds(DATA.species["fire>earth>ice"],1,{type:"premiumCave"})');
 assert.equal(premiumTime,Math.round(regularTime*.8));
 assert(premiumTime<regularTime);
});
check('premium cave shares busy rules and has its own breeding turn',()=>{
 premium.run('state=newGame();state.dragons[0].species="fire>earth>ice";state.dragons[0].level=40;'+
   'state.dragons.push({...state.dragons[0],id:92,species:"fire>earth>dark",nickname:"Other"});'+
   'state.buildings.push({id:93,type:"premiumCave",level:1,x:750,y:692,stored:false,breeding:null},'+
   '{id:94,type:"cave",level:1,x:738,y:707,stored:false,breeding:null});renderBreeding(93)');
 assert(premium.element('sheetBody').innerHTML.includes('29.40%'));
 assert(premium.element('sheetBody').innerHTML.includes('3.57%'));
 assert(premium.element('sheetBody').innerHTML.includes('1.40× chance'));
 assert(premium.element('sheetBody').innerHTML.includes('premium-breeding-banner'));
 premium.run('startBreeding(93,2,92)');
 const round=snapshot(premium,'buildingById(93).breeding');
 assert(round&&round.result);
 assert.equal(round.readyAt-round.startedAt,premium.run(
   'breedingSeconds(DATA.species[buildingById(93).breeding.result],1,buildingById(93),[dragonById(2),dragonById(92)])*1000'));
 const restored=snapshot(premium,'(()=>{const old=JSON.parse(JSON.stringify(state));'+
   'delete old.buildings.find(b=>b.id===93).breeding.startedAt;return migrateSave(old).buildings.find(b=>b.id===93).breeding;})()');
 assert.equal(restored.startedAt,round.startedAt,'Saved premium timer uses its shorter duration');
 assert.equal(premium.run('dragonBusy(2)'),true);
 assert(premium.run('activeTimers().some(t=>t.kind==="breed"&&t.id===93)'));
 premium.run('startBreeding(94,2,92)');
 assert.equal(premium.run('buildingById(94).breeding'),null);
 premium.run('renderBreeding(93)');
 assert(premium.element('sheetBody').innerHTML.includes('premium-breeding'));
 assert(premium.element('sheetBody').innerHTML.includes('breed-parents'));
 premium.run('buildingById(93).breeding.readyAt=Date.now()-1;renderBreeding(93)');
 assert(premium.element('sheetBody').innerHTML.includes('breed-ready-egg'));
 premium.run('collectBreeding(93)');
 assert.equal(premium.run('state.eggs.at(-1).caveId'),93);
 assert.equal(premium.run('buildingById(93).breeding'),null);
 premium.run('startBreeding(94,2,92)');
 assert(premium.run('!!buildingById(94).breeding'),'The other cave runs independently');
});
check('both breeding buildings render larger parents and a larger ready egg',()=>{
 const captured=snapshot(premium,'(()=>{const seen=[],originalDragon=drawDragon,originalEgg=drawEgg;'+
   'drawDragon=(context,params)=>seen.push({kind:"dragon",scale:params.scale});'+
   'drawEgg=(context,egg,x,y,time,scale)=>seen.push({kind:"egg",scale});'+
   'try{for(const type of ["cave","premiumCave"]){const b={id:98,type,level:1,x:738,y:692,'+
   'breeding:{fatherId:2,motherId:92,result:"fire",readyAt:Date.now()+10000}};'+
   'drawBuilding(b,1800);b.breeding.readyAt=Date.now()-1;drawBuilding(b,1800);}}'+
   'finally{drawDragon=originalDragon;drawEgg=originalEgg;}return seen;})()');
 assert.equal(captured.filter(item=>item.kind==='dragon').length,4);
 assert.equal(captured.filter(item=>item.kind==='egg').length,2);
 assert(captured.filter(item=>item.kind==='dragon').every(item=>item.scale>1.2));
 assert(captured.filter(item=>item.kind==='egg').every(item=>item.scale>=3));
});
check('guide navigation and game-driven help pages',()=>{
 game.run('handleAction({dataset:{action:"open-guide"}})');
 assert.equal(game.run('ui.modal.name'),'guide');
 assert.equal((game.element('sheetBody').innerHTML.match(/data-action="guide-tab"/g)||[]).length,10);
 game.run('handleAction({dataset:{action:"guide-tab",tab:"elements"}})');
 const chart=game.element('sheetBody').innerHTML;
 assert(chart.includes('Xung khắc hệ')&&chart.includes('War'));
 assert.equal((chart.match(/class="element-flag/g)||[]).length,75);
 assert(!chart.includes('class="guide-element"'));
 game.run('handleAction({dataset:{action:"guide-tab",tab:"breeding"}})');
 const breeding=game.element('sheetBody').innerHTML;
 assert(breeding.includes('0,9%')&&breeding.includes('2,8%')&&
   breeding.includes('mỗi ô ấp một trứng độc lập'));
 assert(breeding.includes('Rồng 1 hệ có thể lấy một hệ từ bố hoặc mẹ'));
 game.run('handleAction({dataset:{action:"guide-tab",tab:"special"}})');
 const special=game.element('sheetBody').innerHTML;
 assert.equal((special.match(/class="guide-special-group"/g)||[]).length,15);
 assert.equal((special.match(/class="guide-special-card"/g)||[]).length,30);
 assert.equal((special.match(/class="skill-hex/g)||[]).length,30);
 assert(!special.includes('Cinderheart Sovereign')&&!special.includes('<table'));
 assert(special.includes('Sovereign Flame')&&special.includes('Rewind Wounds'));
 assert(special.includes('5.5% HP tối đa mỗi lượt trong 3 lượt'));
 game.run('handleAction({dataset:{action:"guide-tab",tab:"resources"}})');
 assert(game.element('sheetBody').innerHTML.includes('XP và thưởng khi lên Player Level'));
 game.run('handleAction({dataset:{action:"guide-tab",tab:"islands"}})');
 assert(game.element('sheetBody').innerHTML.includes('Giá trứng 1 hệ'));
 assert(game.element('sheetBody').innerHTML.includes('tổng số Chuồng hệ đó từng mua'));
 game.run('handleAction({dataset:{action:"guide-tab",tab:"updates"}})');
 assert(game.element('sheetBody').innerHTML.includes('Thay đổi gần đây'));
 assert.equal(game.run('ui.guideTab'),'updates');
});
check('16 element-ordered islands open in two compact rings around home',()=>{
 assert.equal(game.run('DATA.islands.length'),16);
  assert.deepEqual(snapshot(game,'DATA.islands.slice(11).map(i=>i.element)'),['war','pure','legend','primal','time']);
 assert(game.run('DATA.islands.every(i=>i.size===72)'));
 assert.deepEqual([...new Set(db.species.map(s=>s.id))].length,db.species.length);
 assert.equal(game.run('DATA.islandRegionSize'),24);
 assert.equal(game.run('islandRegionTotal(0)'),9);
 const islands=JSON.parse(game.run('JSON.stringify(DATA.islands)'));
 assert.equal(islands[0].x,714);assert.equal(islands[0].y,668);
 const home=islands[0],step=78;
 for(let i=1;i<islands.length;i++){
   const ring=Math.max(Math.abs(islands[i].x-home.x),Math.abs(islands[i].y-home.y))/step;
   assert.equal(ring,i<=8?1:2,`${islands[i].id} is outside its unlock ring`);
   assert(islands.slice(0,i).some(other=>
     Math.max(Math.abs(other.x-islands[i].x),Math.abs(other.y-islands[i].y))===step),
   `${islands[i].id} is detached from previously unlocked islands`);
 }
 for(let i=0;i<islands.length;i++)for(let j=i+1;j<islands.length;j++){
   const a=islands[i],b=islands[j];
   const gapX=Math.max(0,Math.max(a.x,b.x)-Math.min(a.x+a.size,b.x+b.size));
   const gapY=Math.max(0,Math.max(a.y,b.y)-Math.min(a.y+a.size,b.y+b.size));
   assert(Math.hypot(gapX,gapY)>=6,`${a.id} and ${b.id} overlap`);
 }
 assert(Math.max(...islands.map(i=>i.x+i.size))-Math.min(...islands.map(i=>i.x))<=384);
 assert(Math.max(...islands.map(i=>i.y+i.size))-Math.min(...islands.map(i=>i.y))<=384);
 const outline=snapshot(game,'islandOutline(DATA.islands[0],0)');
 const corners=snapshot(game,'footprintVertices(714,668,72,72)');
 assert.equal(outline.length,32);
 for(let edge=0;edge<4;edge++)assert.deepEqual(outline[edge*8],corners[edge]);
 assert(outline.some((p,n)=>n%8&&p.x!==corners[Math.floor(n/8)].x));
});
check('region purchase and placement work',()=>{
 game.run('state.gold=500000;var firstLandPrice=expansionCost(739,691);unlockLand(739,691)');
 assert.equal(game.run('firstLandPrice'),1200);
 assert(game.run('state.regions.includes("0:1:0")'));
 assert(game.run('unlocked(744,680)'));
 assert(game.run('footprintValid(744,678,{w:6,h:6})'));
 assert.equal(game.run('islandRegionCount(0)'),2);
 assert(game.run('expansionCost(715,670)')>1200);
});
check('island unlock and land expansion costs increase by island and progress',()=>{
 const g=game;
 assert.equal(g.run('islandUnlockCost(0)'),0);
 assert.equal(g.run('islandUnlockCost(1)'),100);
 assert.equal(g.run('islandUnlockCost(15)'),1500);
 for(let i=2;i<16;i++)assert(g.run('islandUnlockCost('+i+')')>g.run('islandUnlockCost('+(i-1)+')'));
 for(let i=1;i<16;i++)assert.equal(g.run('islandUnlockCost('+i+')'),i*100);
 assert.equal(g.run('DATA.islands.some(i=>Object.hasOwn(i,"gemCost"))'),false);
 g.run('state=newGame();state.regions.push("1:1:1")');
 assert.equal(g.run('expansionCost(739,691)'),1200);
 const home=g.run('landCost(715,670)'),fire=g.run('landCost(715,592)');
 assert(fire>home,'The next island costs more per tile at the same expansion count');
 g.run('state.regions.push("0:0:0")');
 assert(g.run('landCost(715,670)')>home,'Each unlocked region raises the next land price');
 const bands=snapshot(g,'(()=>{state=newGame();state.land=[];return DATA.islands.map((island,index)=>{'+
   'const ids=Array.from({length:9},(_,n)=>index+":"+Math.floor(n/3)+":"+(n%3));'+
   'const prices=[];for(let opened=1;opened<=8;opened++){state.regions=ids.slice(0,opened);'+
   'prices.push(Math.round(landCost(island.x+1,island.y+1)*DATA.islandRegionSize**2));}'+
   'return prices;});})()');
 assert.deepEqual(bands[0],[1200,1440,1728,2074,2489,2987,3584,4301],
   'Origin Island starts at 1,200 gold and rises 20% each region');
 assert.equal(bands[1][0],2460,'Fire Island starts on the next progression tier');
 assert.equal(bands[1][7],8813,'Fire Island expansions grow by 20%');
 assert.equal(bands[2][0],4080,'Water Island starts above Fire without exponential carry-over');
 for(let i=0;i<bands.length;i++){
   for(let opened=1;opened<8;opened++)
     if(i&&bands[i][opened-1]>Number.MAX_SAFE_INTEGER/2)
       assert(Math.abs(bands[i][opened]/bands[i][opened-1]-1.2)<1e-12,
         `Island ${i} expansion ${opened+1} grows by 20% even past safe integers`);
     else assert.equal(bands[i][opened],Math.round(bands[i][opened-1]*1.2),
       `Island ${i} expansion ${opened+1} follows its own pricing rule`);
   if(i)assert(bands[i][0]>bands[i-1][0],
     `Island ${i} must start above the previous island without exponential carry-over`);
 }
 g.run('state.regions=["0:1:1","0:0:0","0:0:1","0:1:0","0:2:0","0:2:1","0:0:2","0:1:2","0:2:2"];'+
   'state.gems=1000;state.player.level=60;unlockIsland(1)');
 assert.equal(g.run('state.gems'),900);
 assert.equal(g.run('state.unlockedIslands'),2);
});
const islandGate=await boot();
check('island purchase requires egg level and a dragon carrying its element',()=>{
 const g=islandGate;
 g.run('state=newGame();state.unlockedIslands=2;state.player.level=60;state.gems=1000;'+
   'state.regions=Array.from({length:9},(_,n)=>"1:"+(n%3)+":"+Math.floor(n/3))');
 assert(g.run('islandUnlockIssue(2)').includes('Water element'));
 g.run('renderIslands();ui.selection={type:"island",index:2};updateInspector()');
 assert(g.element('sheetBody').innerHTML.includes('Own at least one dragon'));
 assert(g.element('inspector').innerHTML.includes('Own at least one dragon'));
 g.run('unlockIsland(2)');
 assert.equal(g.run('state.unlockedIslands'),2);
 assert.equal(g.run('state.gems'),1000);
 const hybrid=g.run('Object.keys(DATA.species).find(id=>DATA.species[id].elements.length>1&&DATA.species[id].elements.includes("water"))');
 assert(hybrid,'Catalog contains a hybrid with the Water element');
 g.run('state.dragons[0].species='+JSON.stringify(hybrid));
 assert.equal(g.run('islandUnlockIssue(2)'), '');
 g.run('unlockIsland(2)');
 assert.equal(g.run('state.unlockedIslands'),3);
 assert.equal(g.run('state.gems'),800);
 g.run('state.regions=Array.from({length:9},(_,n)=>"2:"+(n%3)+":"+Math.floor(n/3));'+
   'state.player.level=2;state.dragons[0].species="earth"');
 assert(g.run('islandUnlockIssue(3)').includes('player level 4'));
 g.run('unlockIsland(3)');
 assert.equal(g.run('state.unlockedIslands'),3);
});
check('Academy uses placement and upgrade gates/cost formula',()=>{
 game.run('state.player.level=30;state.gold=500000;state.food=100000;state.gems=1000;'+
   'state.buildings.push({id:91,type:"academy",level:1,x:738,y:703,stored:false,upgradeEnds:0})');
 assert(game.run('academyUpgradeCost(2).gold')>game.run('academyUpgradeCost(1).gold')*2);
 assert.equal(game.run('academyUpgradeCost(1).gold'),17600);
 assert.equal(game.run('upgradeSeconds({type:"academy",level:2})'),900);
 game.run('beginMode({kind:"move",id:91})');
 assert.equal(game.run('ui.mode.kind'),'move');
 game.run('completePlacement(738,705)');
 assert.equal(game.run('buildingById(91).y'),705);
});
check('two independent breeding filters/searches and no duplicate parent',()=>{
 game.run('state.dragons.push({...state.dragons[0],id:99,species:"water",level:15,nickname:"Coral"});state.dragons[0].level=15;'+
   'state.buildings.push({id:92,type:"cave",level:1,stored:false,breeding:null})');
 game.run('ui.modal={name:"breeding",extra:92};renderBreeding(92)');
 let html=game.element('sheetBody').innerHTML;
 assert(html.includes('Estimated breeding time for this parent combination'));
 assert(html.includes('data-target="breed-father"')&&html.includes('data-target="breed-mother"'));
 assert(html.indexOf('data-action="start-breeding"')>html.indexOf('breed-probabilities')&&
   html.indexOf('data-action="start-breeding"')<html.indexOf('breed-results'),
   'Start breeding should be available before the long possible-dragon list');
 assert(html.includes('data-breed-search="father"')&&html.includes('data-breed-search="mother"'));
 game.run('handleAction({dataset:{action:"element-filter",target:"breed-father",element:"fire"}})');
 game.run('handleAction({dataset:{action:"element-filter",target:"breed-father",element:"water"}})');
 assert.deepEqual(snapshot(game,'ui.breedFatherElements'),['fire','water']);
 assert.deepEqual(snapshot(game,'ui.breedMotherElements'),[]);
 html=game.element('sheetBody').innerHTML;
 assert(html.includes('aria-label="Filter: Fire" aria-pressed="true"'));
 assert(html.includes('aria-label="Filter: Water" aria-pressed="true"'));
 assert(html.includes('2/4 elements selected'));
 for(const element of ['earth','wind','ice'])game.run('handleAction({dataset:{action:"element-filter",target:"breed-father",element:"'+element+'"}})');
 assert.equal(game.run('ui.breedFatherElements.length'),4);
 game.run('handleAction({dataset:{action:"element-filter",target:"breed-mother",element:"earth"}})');
 assert.deepEqual(snapshot(game,'ui.breedMotherElements'),['earth']);
 assert.equal(game.run('ui.breedFatherElements.length'),4);
 game.run('handleAction({dataset:{action:"element-filter",target:"breed-father",element:"all"}})');
 assert.deepEqual(snapshot(game,'ui.breedFatherElements'),[]);
 game.run('handleAction({dataset:{action:"breed-select",slot:"mother",id:String(ui.breedDraft.father)}})');
 assert.notEqual(game.run('ui.breedDraft.mother'),game.run('ui.breedDraft.father'));
});
check('four-element AND filters apply in dragon roster and book',()=>{
 assert(game.run('matchesElementFilter(DATA.species["fire>water"],["fire","water"])'));
 assert(!game.run('matchesElementFilter(DATA.species["fire>water"],["fire","earth"])'));
 for(const element of ['fire','water','earth','wind','ice'])game.run('handleAction({dataset:{action:"element-filter",target:"book",element:"'+element+'"}})');
 assert.deepEqual(snapshot(game,'ui.bookElements'),['fire','water','earth','wind']);
 assert(game.element('sheetBody').innerHTML.includes('4/4 elements selected'));
 assert(game.element('sheetBody').innerHTML.includes('data-element="ice" title="Ice" aria-label="Filter: Ice" aria-pressed="false" disabled'));
 game.run('handleAction({dataset:{action:"element-filter",target:"book",element:"all"}})');
 assert.deepEqual(snapshot(game,'ui.bookElements'),[]);
 game.run('handleAction({dataset:{action:"element-filter",target:"dragon",element:"fire"}})');
 assert.deepEqual(snapshot(game,'ui.dragonElements'),['fire']);
});
check('all single-element dragons are named after their element',()=>{
  const ids=['war','pure','legend','primal','time'];
  assert.deepEqual(snapshot(game,'DATA.islands.slice(11).map(island=>island.element)'),ids);
  for(const id of ids){
    assert.equal(db.species.find(s=>s.id===id).ten,
      id.charAt(0).toUpperCase()+id.slice(1)+' Dragon');
    assert(game.run('DATA.species['+JSON.stringify(id)+'].name').endsWith(' Dragon'));
  }
  assert(!game.run('DATA.skills.elemental.primal.some(skill=>skill.icon==="☯")'));
});
check('1770 unique phenomenon-named species and no retired Special category',()=>{
 assert.equal(db.species.length,1770);
 assert.equal(new Set(db.species.map(s=>s.ten)).size,db.species.length);
 assert(db.species.every(s=>!s.id.startsWith('special_')&&s.ten.endsWith(' Dragon')));
 assert(db.species.filter(s=>s.doHiem==='transcendent').every(s=>s.ten.startsWith('Resonant ')));
 assert(db.species.filter(s=>s.id.includes('>war')).every(s=>s.ten!=='War Dragon'));
 for(const element of Object.keys(db.elements))assert.equal(
   db.species.find(s=>s.id===element).ten,db.elements[element].ten+' Dragon');
 assert.equal(db.species.find(s=>s.id==='fire>water').ten,'Geyser Dragon');
 assert.equal(db.species.find(s=>s.id==='water>fire').ten,'Steam Eruption Dragon');
 assert.equal(db.species.find(s=>s.id==='light>dark').ten,'Penumbral Eclipse Dragon');
 assert.equal('specials' in db,false);
 assert.equal(game.run('BOOK_SPECIES_IDS.some(x=>x.startsWith("special_"))'),false);
 game.run('openModal("book")');assert(!game.element('sheetBody').innerHTML.includes('>Special<'));
});
check('ordered pairs, unique triples and 150 balanced four-element species',()=>{
 const elements=Object.keys(db.elements);
 const groups=Object.fromEntries([1,2,3,4].map(n=>[n,db.species.filter(s=>s.elements.length===n)]));
 assert.deepEqual([1,2,3,4].map(n=>groups[n].length),[15,210,1365,180]);
 const byId=new Map(db.species.map(s=>[s.id,s]));
 for(const a of elements)for(const b of elements){
   if(a===b)continue;
   assert(byId.has(a+'>'+b),'Missing directed pair '+a+'>'+b);
 }
 assert.equal(game.run('DATA.species["fire>time"].elements[0]'),'fire');
 assert.equal(game.run('DATA.species["time>fire"].elements[0]'),'time');
 const triples=groups[3],tripleKeys=triples.map(s=>
   s.elements[0]+'|'+s.elements.slice(1).sort().join('|'));
 assert.equal(new Set(tripleKeys).size,triples.length);
 assert.equal(game.run('DATA.species["fire>time>water"].id'),'fire>water>time');
 const fours=groups[4].filter(s=>s.doHiem==='mythic'),
   quartets=fours.map(s=>s.elements.slice().sort().join('|'));
 const legacyFours=fours.slice(0,150);
 assert.equal(fours.length,150);
 assert.equal(new Set(quartets).size,fours.length);
 assert.deepEqual(new Set(quartets),new Set(Object.keys(db.quads)));
 assert.equal(db.quads['earth|fire|water|wind'],undefined,'Unlisted sets are not invented');
 const existing=JSON.parse(fs.readFileSync(path.join(root,'data/dragons.json'))).species
   .filter(s=>s.elements.length===4);
 for(const s of existing)assert.equal(byId.get(s.id)?.ten,s.ten,
   'Previously owned dragon IDs and names must survive');
 for(const a of elements){
   const primary=legacyFours.filter(s=>s.elements[0]===a);
   assert.equal(primary.length,10,a+' has 10 dominant dragons');
   assert.equal(legacyFours.filter(s=>s.elements.slice(1).includes(a)).length,30,
     a+' appears exactly 30 times as an additional element');
   for(const b of elements){
     if(a===b)continue;
     const count=primary.filter(s=>s.elements.slice(1).includes(b)).length;
     assert(count>=2&&count<=3,a+' and '+b+' are spread across primary groups');
   }
 }
 // Previously generated four-element dragons still load with their primary and advanced affinity.
 for(const id of ['fire>water>earth>war','water>fire>wind>pure',
   'earth>fire>wind>legend','wind>fire>ice>primal','ice>fire>water>time',
   'war>fire>water>pure']){
   const migrated=game.run('migrateSpeciesId('+JSON.stringify(id)+')');
   const original=id.split('>'),parts=migrated.split('>');
   assert.equal(parts[0],original[0]);
   for(const advanced of original.filter(e=>db.elements[e].epicHybrid))
     assert(parts.includes(advanced),id+' must keep its advanced element');
 }
 for(const a of ['war','pure','legend','primal','time'])
   for(let slot=1;slot<=3;slot++){
   const count=legacyFours.filter(s=>s.elements[slot]===a).length;
     assert(count>=9&&count<=11,a+' is balanced across secondary positions');
   }
});
check('Double Element breeding needs qualified parents and preserves probability',()=>{
  balance.run('state=newGame();const fireParents=FOUR_IDS.filter(id=>DATA.species[id].elements[0]==="fire");'+
    'state.dragons[0].species=fireParents[0];state.dragons[0].level=39;'+
    'state.dragons.push({...state.dragons[0],id:906,species:fireParents[1],level:50});');
  assert.equal(balance.run('breedingOptions(state.dragons[0],state.dragons[1]).filter(o=>DATA.species[o.id].rarity==="transcendent").length'),0);
  balance.run('state.dragons[0].level=50;');
  const odds=snapshot(balance,'breedingOptions(state.dragons[0],state.dragons[1])');
  const double=odds.filter(o=>db.species.find(s=>s.id===o.id)?.doHiem==='transcendent');
  assert(double.some(o=>o.id==='fire>fire>water>thunder'),JSON.stringify(double));
  assert(Math.abs(double.reduce((total,o)=>total+o.chance,0)-.0105)<1e-9);
  assert(Math.abs(odds.reduce((total,o)=>total+o.chance,0)-1)<1e-9);
  balance.run('state.dragons[1].species=FOUR_IDS.find(id=>DATA.species[id].elements[0]==="earth");');
  assert.equal(balance.run('breedingOptions(state.dragons[0],state.dragons[1]).filter(o=>DATA.species[o.id].rarity==="transcendent").length'),0);
});
check('30 Double Element designs draw at baby, young and adult stages',()=>{
  const ids=db.species.filter(s=>s.doHiem==='transcendent').map(s=>s.id);
  assert.equal(ids.length,30);
  for(const id of ids)for(const level of [1,15,35]){
    const before=balance.drawCalls.length;
    balance.run('drawDragon(ctx,{dragon:{id:906,species:'+JSON.stringify(id)+',level:'+level+
      '},x:150,y:150,time:900,scale:1})');
    assert(balance.drawCalls.length>before,id+' must draw at level '+level);
  }
});
check('every catalog species draws with the rebuilt renderer',()=>{
  const ids=db.species.map(s=>s.id),silhouettes=new Set();
  for(let index=0;index<ids.length;index++){
    const id=ids[index],level=[1,15,40][index%3];
    balance.drawCalls.length=0;
    balance.run('drawDragon(ctx,{dragon:{id:0,species:'+JSON.stringify(id)+',level:'+level+
      '},x:150,y:150,time:2200,scale:1})');
    assert(balance.drawCalls.some(call=>call[0]==='fill'),id+' needs a painted body');
    const slots=db.species[index].elements.length;
    const segments=balance.drawCalls.filter(call=>call[0]==='arc'&&call[3]===16);
    assert.equal(segments.length,slots>=3?slots*2:0,id+' tail ring segments');
    assert(!balance.drawCalls.some(call=>call[0]==='ellipse'&&call[1]===-4&&call[2]===-19),
      id+' has an old body halo');
    if(id.indexOf('>')<0)silhouettes.add(JSON.stringify(balance.drawCalls
      .filter(call=>call[0]==='moveTo'||call[0]==='lineTo').slice(0,30)));
  }
  assert.equal(ids.length,1770);
  assert.equal(silhouettes.size,15,'Every primary element needs distinct geometry');
  balance.drawCalls.length=0;
});
check('articulated wings, head and tail change across frames',()=>{
  for(const id of ['fire','water','wind','war','time','fire>fire>water>thunder']){
    const frames=[];
    for(const time of [900,2200]){
      balance.drawCalls.length=0;
      balance.run('drawDragon(ctx,{dragon:{id:0,species:'+JSON.stringify(id)+
        ',level:40},x:120,y:120,time:'+time+',scale:1})');
      frames.push(JSON.stringify(balance.drawCalls));
    }
    assert.notEqual(frames[0],frames[1],id+' needs motion between frames');
  }
  balance.drawCalls.length=0;
});
check('body-specific leg steps animate in habitats while Arena keeps a grounded stance',()=>{
  for(const id of ['fire','earth','ice','thunder','war','wind','time']){
    const render=(time,locomotion)=>{
      balance.drawCalls.length=0;
      balance.run('var form=DATA.dragonForms['+JSON.stringify(id)+'];'+
        'var d={id:88,species:'+JSON.stringify(id)+',level:15};'+
        'var pose=dragonPose(d,'+time+',form,0,'+locomotion+');'+
        'drawDragonLimbs(ctx,form,DATA.species[d.species].detail.mau,pose,'+time+',d.id,form.width,form.height,false)');
      return JSON.stringify(balance.drawCalls.filter(call=>call[0]==='moveTo'||call[0]==='lineTo'));
    };
    assert.notEqual(render(900,true),render(1300,true),id+' should change foot position');
    assert.equal(render(900,false),render(1300,false),id+' should stand in Arena');
  }
  balance.run('state.dragons[0].hunger=100;var observedTimes=[];'+
    'var originalDragonDraw=drawDragon;drawDragon=function(c,p){observedTimes.push(p.time);originalDragonDraw(c,p)};'+
    'paintHabitat(state.buildings[0],1500,0);'+
    'var parents=[state.dragons[0].id,77];'+
    'state.dragons.push({...state.dragons[0],id:77});'+
    'paintCave({id:91,breeding:{fatherId:parents[0],motherId:parents[1],readyAt:Date.now()+10000}},1800,0);'+
    'drawDragon=originalDragonDraw;');
  const observed=snapshot(balance,'observedTimes');
  assert.deepEqual(observed.slice(-2),[1800,1800]);
  assert(observed.slice(0,-2).length>0&&observed.slice(0,-2).every(time=>time===1500));
  balance.drawCalls.length=0;
});
check('dragon feet plant backward and gait follows travel through a turn',()=>{
 const quarter=snapshot(balance,'[0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]'+
   '.map(dragonTravelPhase)');
 assert(quarter.every((n,i)=>i===0||n>quarter[i-1]));
 const toe=angle=>{
   balance.drawCalls.length=0;
   balance.run('drawDragonLimbs(ctx,DATA.dragonForms.fire,DATA.species.fire.detail.mau,'+
     '{stepPhase:'+angle+',locomotion:true},0,2,DATA.dragonForms.fire.width,'+
     'DATA.dragonForms.fire.height,false)');
   return balance.drawCalls.filter(call=>call[0]==='lineTo')[1][1];
 };
 assert(toe(Math.PI+.2)>toe(Math.PI+1.2),
   'Planted foot must slide backward while the body travels forward');
 assert(toe(.2)<toe(1.2),'Lifted foot must swing forward');
});
check('dragon portraits leave room for the tail ring and the head',()=>{
  for(const [width,height] of [[92,78],[240,172],[290,230]]){
    for(const level of [1,15,40]){
      const placement=snapshot(balance,'dragonPortraitPlacement('+width+','+height+','+level+')');
      const stage=level<10?.74:level<30?1:1.2,actual=placement.scale*stage*1.05;
      assert(placement.x-94*actual>=0,width+'×'+height+' tail should remain in frame');
      assert(placement.x+60*actual<=width,width+'×'+height+' head should remain in frame');
    }
  }
});
check('rare breeding, 100000 roll Monte Carlo',()=>{
 game.run('state.dragons[0].species="fire>water>earth";state.dragons[0].level=35;'+
  'state.dragons[1].species="wind>ice>thunder";state.dragons[1].level=35');
 const odds=JSON.parse(game.run('JSON.stringify(breedingOptions(state.dragons[0],state.dragons[1]))'));
 const sum=odds.reduce((a,o)=>a+o.chance,0);assert(Math.abs(sum-1)<1e-9);
 const tier=n=>odds.filter(o=>o.id.split('>').length===n).reduce((a,o)=>a+o.chance,0);
 assert(Math.abs(tier(3)-.195)<1e-9);assert(Math.abs(tier(4)-.0225)<1e-9);
 const results=[0,0,0,0];let seed=234553;
 for(let i=0;i<100000;i++){
   seed=(seed*1664525+1013904223)>>>0;const roll=seed/4294967296;
   let cumulative=0;for(const o of odds){cumulative+=o.chance;if(roll<cumulative){results[o.id.split('>').length-1]++;break;}}
 }
 assert(Math.abs(results[2]/100000-tier(3))<.003);
 assert(Math.abs(results[3]/100000-tier(4))<.0015);
 console.log('    1/2/3/4 elements: '+results.map(n=>(n/1000).toFixed(2)+'%').join(' / '));
 game.run('state.dragons[1].level=29');
 assert(game.run('breedingOptions(state.dragons[0],state.dragons[1]).some(o=>DATA.species[o.id].rarity==="mythic")'));
});
check('100000 rolls for 3, 4, 5 and 6 parent-union elements',()=>{
 const pairs=[
  ['fire>water>earth','fire>water>earth',3],
  ['fire>earth>ice','fire>earth>dark',4],
  ['fire>water>wind','fire>thunder>ice',5],
  ['fire>water>earth','wind>ice>thunder',6]
 ];
 for(const [a,b,size] of pairs){
  const options=snapshot(balance,'breedingOptions('+
    JSON.stringify({id:501,species:a,level:35})+','+
    JSON.stringify({id:502,species:b,level:35})+')');
  let cumulative=0;const thresholds=options.map(o=>(cumulative+=o.chance));
  const p4=options.filter(o=>o.id.split('>').length===4).reduce((n,o)=>n+o.chance,0);
  assert(Math.abs(p4-(size===3?0:.0225))<1e-9);
  assert(options.filter(o=>o.id.split('>').length===4).every(o=>
    o.id.split('>').every(e=>new Set(a.split('>').concat(b.split('>'))).has(e))));
  let seed=234553,observed=0;
  for(let i=0;i<100000;i++){
    seed=(seed*1664525+1013904223)>>>0;
    const roll=seed/4294967296;
    let lo=0,hi=thresholds.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(roll<thresholds[mid])hi=mid;else lo=mid+1;}
    if(options[lo].id.split('>').length===4)observed++;
  }
  assert(Math.abs(observed/100000-p4)<.0015,`Union ${size}: ${observed/100000} vs ${p4}`);
 }
});
check('hex skill icons, flags in three sizes',()=>{
 const detail=game.run('dragonDetailHtml(DATA.species.fire,{...state.dragons[0],species:"fire",level:30})');
 assert(detail.includes('class="skill-hex'));assert(!detail.includes('skill-icon'));
 assert(detail.includes('flag-lg'));
 const filter=game.run('elementFilter("dragon","fire")');assert(filter.includes('flag-sm'));
 const css=fs.readFileSync(path.join(root,'css/style.css'),'utf8');
 assert(css.includes('var(--skill-color,#7f93a1)'));
 assert(!css.includes('.skill-hex::before'));
 assert(detail.includes('--skill-color:#E8452C'));
});
await (async()=>{
 const current=JSON.parse(game.run('JSON.stringify(state)'));
 const old={...current,version:8,regions:['0:3:3'],land:['735,735'],buildings:[{...current.buildings[0],x:747,y:747},
   {...current.buildings[1],x:735,y:735}],dragons:[{...current.dragons[0],species:'special_time'}]};
 const m=await boot(JSON.stringify(old));
   assert.equal(m.run('state.version'),12);
   assert.equal(m.run('state.dragons[0].species'),'light>dark');
   assert.equal(m.run('islandAt(state.buildings[0].x,state.buildings[0].y)'),0);
 console.log('PASS v8 save and Special migrate to v12');
})();
const old={...JSON.parse(game.run('JSON.stringify(state)')),version:8,regions:['0:3:3'],land:[],buildings:[]};
const migrated=await boot(JSON.stringify(old));
assert.equal(migrated.run('state.version'),12);
const v7={...old,version:7,regions:['0:1:1','0:3:3'],land:[],buildings:[]};
const migratedV7=await boot(JSON.stringify(v7));
assert.equal(migratedV7.run('state.version'),12);
assert(migratedV7.run('islandRegionCount(0)')>=1);
console.log('PASS v7 purchased land migrates through both layouts');
const saved9=JSON.parse(game.run('JSON.stringify(newGame())'));
saved9.version=9;saved9.regions=['0:1:1','1:1:1'];saved9.unlockedIslands=2;
saved9.land=['494,494','505,505','635,505'];
saved9.buildings[0].x=505;saved9.buildings[0].y=505;
saved9.buildings[1].x=494;saved9.buildings[1].y=494;
saved9.buildings.push({id:88,type:'farm',level:1,x:635,y:505,stored:false});
const moved=await boot(JSON.stringify(saved9));
assert.equal(moved.run('state.version'),12);
assert.equal(moved.run('state.buildings[0].x'),749);
assert.equal(moved.run('state.buildings[0].y'),703);
assert.equal(moved.run('islandAt(state.buildings[2].x,state.buildings[2].y)'),1);
assert(moved.run('unlocked(738,692)'));
assert.equal(moved.run('state.regions.length'),2);
console.log('PASS v9 land and buildings follow their islands');
const saved10=JSON.parse(game.run('JSON.stringify(newGame())'));
saved10.version=10;saved10.unlockedIslands=2;saved10.regions=['1:0:0'];
saved10.land.push('540,460');
saved10.buildings.push({id:89,type:'farm',level:1,x:540,y:460,stored:false});
const close=await boot(JSON.stringify(saved10));
assert.equal(close.run('state.version'),12);
assert.equal(close.run('state.buildings[2].x'),725);
assert.equal(close.run('state.buildings[2].y'),603);
assert(close.run('unlocked(725,603)'));
assert.equal(close.run('islandRegionCount(1)'),1);
console.log('PASS v10 land and buildings move with closer islands');
check('daylight cycle and gallery resources',()=>{
 assert.equal(game.run('daylightAt(Date.now())>=0&&daylightAt(Date.now())<=1'),true);
 game.run('ui.fixedDay=true');assert.equal(game.run('daylightAt(Date.now())'),1);
 assert(fs.existsSync(path.join(root,'debug/gallery.html')));
});
check('canvas scene renders without errors',()=>{
 game.run('ui.fixedDay=false;showWorld();drawScene(12345,.016)');
 assert(game.drawCalls.some(call=>call[0]==='lineTo'));
 assert(game.drawCalls.some(call=>call[0]==='clip'));
});
check('unbought islands are clouded and clouds fade after purchase',()=>{
 assert(game.run('DATA.islands.every(i=>!!i.description&&!i.landmark)'));
 assert.equal(game.run('typeof drawIslandFeature'),'undefined');
 assert.equal(game.run('typeof drawIslandGuardian'),'undefined');
 const cloud=snapshot(game,'(()=>{const old=state.unlockedIslands,oldReveal=ui.cloudReveal;'+
   'const original=drawIslandClouds,seen=[];try{state.unlockedIslands=1;'+
   'drawIslandClouds=(island,index,time,rim,bottom,opacity)=>seen.push([index,opacity]);'+
   'drawFloatingIslands({x:-1e9,y:-1e9},{x:1e9,y:1e9},1200);'+
   'ui.cloudReveal={index:1,startedAt:1000};state.unlockedIslands=2;'+
   'return {seen,fade:[islandCloudOpacity(1,1000),islandCloudOpacity(1,1900),'+
   'islandCloudOpacity(1,2800)],home:islandCloudOpacity(0,1000)};'+
   '}finally{drawIslandClouds=original;state.unlockedIslands=old;ui.cloudReveal=oldReveal;}})()');
 assert.deepEqual(cloud.seen.map(([index])=>index).sort((a,b)=>a-b),
   Array.from({length:15},(_,n)=>n+1));
 assert.deepEqual(cloud.fade,[1,.5,0]);assert.equal(cloud.home,0);
 game.run('renderIslands()');
 assert(!game.element('sheetBody').innerHTML.includes('Landmark:'));
 assert(game.element('sheetBody').innerHTML.includes('Warm volcanic stone'));
 game.run('ui.selection={type:"island",index:0};updateInspector();ui.selection=null');
 assert(game.element('inspector').innerHTML.includes('above the clouds'));
});
const cloudPurchase=await boot();
cloudPurchase.run('state.gems=1000;state.regions=Array.from({length:9},(_,n)=>"0:"+(n%3)+":"+Math.floor(n/3));unlockIsland(1)');
assert.equal(cloudPurchase.run('state.unlockedIslands'),2);
assert.equal(cloudPurchase.run('ui.cloudReveal.index'),1);
assert.equal(cloudPurchase.run('islandCloudOpacity(1,ui.cloudReveal.startedAt)'),1);
assert.equal(cloudPurchase.run('islandCloudOpacity(1,ui.cloudReveal.startedAt+1800)'),0);
console.log('PASS buying an island starts and completes the cloud reveal');
check('islands and their buildings draw from upper left to lower right',()=>{
 const order=snapshot(game,'islandDrawOrder()');
 assert.equal(order.length,16);
 assert(order.indexOf(7)<order.indexOf(1),'left island must draw before right island at the same height');
 assert(order.indexOf(1)<order.indexOf(0),'upper island must draw before lower island');
 const painted=snapshot(game,'(()=>{const ground=drawIslandGround,build=drawBuilding;'+
   'const buildings=state.buildings,items=[];showWorld();'+
   'state.buildings=[{id:901,type:"farm",x:720,y:596,level:1,stored:false},'+
   '{id:902,type:"farm",x:720,y:674,level:1,stored:false}];'+
   'drawIslandGround=(island,index)=>items.push("island:"+index);'+
   'drawBuilding=b=>items.push("building:"+b.id);'+
   'try{drawScene(12345,.016);}finally{drawIslandGround=ground;'+
   'drawBuilding=build;state.buildings=buildings;}return items;})()');
 assert.deepEqual(painted.filter(item=>item.startsWith('island:')),
   order.map(index=>'island:'+index));
 assert(painted.indexOf('island:1')<painted.indexOf('building:901'));
 assert(painted.indexOf('building:901')<painted.indexOf('island:0'));
 assert(painted.indexOf('island:0')<painted.indexOf('building:902'));
});
check('isometric tiles, footprints and touch coordinates share one projection',()=>{
 const configurable=snapshot(game,'(()=>{const old=[DATA.tileW,DATA.tileH,DATA.originX,DATA.originY];'+
   'DATA.tileW=72;DATA.tileH=36;DATA.originX=100;DATA.originY=-50;'+
   'const p=gridToScreen(3,4),back=worldToGrid(p.x,p.y);'+
   '[DATA.tileW,DATA.tileH,DATA.originX,DATA.originY]=old;return {p,back};})()');
 assert.deepEqual(configurable,{p:{x:64,y:76},back:{c:3,r:4}});
 for(const zoom of [.08,.25,.5,1,2]){
   game.run('ui.camera.zoom='+zoom+';focusIsland(0);ui.camera.zoom='+zoom);
   for(const [c,r] of [[714,668],[747,705],[470,470]]){
     const hit=snapshot(game,'(()=>{const p=gridToScreen('+c+'+.5,'+r+'+.5);'+
       'const s=worldToScreen(p.x,p.y+islandBob(islandAt('+c+','+r+')));'+
       'return screenCell(s.x,s.y);})()');
     assert.deepEqual(hit,{x:c,y:r});
   }
 }
 const v=snapshot(game,'footprintVertices(740,700,12,9)');
 assert.equal(v.length,4);
 assert.equal(v[0].x+v[2].x,v[1].x+v[3].x);
 assert.equal(v[0].y+v[2].y,v[1].y+v[3].y);
 game.run('ui.debugIso=true;drawScene(1200,.016);ui.debugIso=false');
 assert(game.drawCalls.some(call=>call[0]==='arc'));
});
check('floating island motion keeps buildings, placement and touch targets together',()=>{
 const motion=snapshot(game,'[islandBob(0,1200),islandBob(0,3400),islandBob(1,1200)]');
 assert(Math.abs(motion[0]-motion[1])>5);
 assert(Math.abs(motion[0]-motion[2])>5);
 for(const time of [1200,3400,5800])for(const zoom of [.08,.4,1.6]){
   game.run('ui.renderTime='+time+';ui.camera.zoom='+zoom);
   const hit=snapshot(game,'(()=>{const p=gridToScreen(750.5,704.5);'+
     'const s=worldToScreen(p.x,p.y+islandBob(0,'+time+'));'+
     'return screenCell(s.x,s.y);})()');
   assert.deepEqual(hit,{x:750,y:704});
 }
});
check('mouse and touch placement follows the same cell at zoom and device pixel ratios',()=>{
 for(const [zoom,ratio,kind] of [[.08,1,'mouse'],[.5,2,'touch'],[2,2,'mouse']]){
   game.run('state=newGame();focusIsland(0);ui.camera.zoom='+zoom+';'+
     'window.devicePixelRatio='+ratio+';resizeCanvas();'+
     'ui.mode={kind:"move",id:1,x:state.buildings[0].x,y:state.buildings[0].y};');
   const start=snapshot(game,'(()=>{const b=state.buildings[0],p=gridToScreen(b.x+.5,b.y+.5);'+
     'return worldToScreen(p.x,p.y+islandBob(islandAt(b.x,b.y)));})()');
   const end=snapshot(game,'(()=>{const b=state.buildings[0],p=gridToScreen(b.x+1.5,b.y+.5);'+
     'return worldToScreen(p.x,p.y+islandBob(islandAt(b.x,b.y)));})()');
   const event=(p)=>JSON.stringify({clientX:p.x,clientY:p.y,pointerId:1,pointerType:kind});
   game.run('pointerDown({...'+event(start)+',preventDefault(){}});'+
     'pointerMove({...'+event(end)+',preventDefault(){}});'+
     'pointerUp({...'+event(end)+',preventDefault(){}});');
   assert.equal(game.run('state.buildings[0].x'),750);
   assert.equal(game.run('state.buildings[0].y'),703);
   assert.equal(game.run('dom.canvas.width'),800*ratio);
 }
});
check('depth sorting uses the farthest grid cell for every footprint',()=>{
 const order=snapshot(game,'(()=>{const original=drawBuilding,order=[];'+
   'const saved=state.buildings;'+
   'state.buildings=[{id:81,type:"farm",x:748,y:701,level:1,stored:false},'+
   '{id:82,type:"academy",x:742,y:698,level:1,stored:false},'+
   '{id:83,type:"decor",x:756,y:705,level:1,stored:false}];'+
   'drawBuilding=b=>order.push(b.id);drawScene(1200,.016);'+
   'drawBuilding=original;state.buildings=saved;return order;})()');
 const footprints=JSON.parse(fs.readFileSync(path.join(root,'data/game.json'))).footprints;
 const buildings=[{id:81,type:'farm',x:748,y:701},{id:82,type:'academy',x:742,y:698},
   {id:83,type:'decor',x:756,y:705}];
 const depth=b=>b.x+footprints[b.type][0][0]-1+b.y+footprints[b.type][0][1]-1;
 assert.deepEqual(order,buildings.sort((a,b)=>depth(a)-depth(b)).map(b=>b.id));
});
check('every new building silhouette renders by day and night',()=>{
 const before=game.drawCalls.length;
 game.run('for(const kind of ["habitat","farm","hatchery","academy","arena","cave","premiumCave","decor"]){'+
   'const b={id:500,type:kind,element:"fire",x:740,y:699,level:1,stored:false,'+
   'crop:kind==="farm"?{id:"wheat",readyAt:Date.now()-1}:null};'+
   'ui.fixedDay=true;drawBuilding(b,12345);ui.fixedDay=false;drawBuilding(b,24680);}');
 assert(game.drawCalls.length>before+400);
});
check('all building art remains within its diamond base width',()=>{
 const bounds=snapshot(game,'(()=>{const out=[];ui.debugIso=true;'+
   'for(const type of ["habitat","farm","hatchery","academy","arena","cave","premiumCave","decor"])'+
   'for(let level=1;level<=Math.min(5,DATA.buildings[type].maxLevel);level++){' +
   'const b={id:910,type,element:"fire",x:740,y:699,level,stored:false,'+
   'crop:type==="farm"?{id:"wheat",readyAt:Date.now()-1}:null};'+
   'out.push({type,level,...drawBuilding(b,12345)});'+
   '}ui.debugIso=false;return out;})()');
 for(const item of bounds)assert(item.min>=-.561&&item.max<=.561,
   `${item.type} level ${item.level} projects outside its base: ${item.min}..${item.max}`);
});
check('low building silhouettes and larger habitat dragons retain the exact base',()=>{
 const compressed=snapshot(game,'(()=>{const b={id:950,type:"academy",x:740,y:700,level:1};'+
   'const f=buildingFootprint(b),v=footprintVertices(b.x,b.y,f.w,f.h);'+
   'const height=Math.max(...v.map(p=>p.y))-Math.min(...v.map(p=>p.y));'+
   'const original=ctx.scale,scales=[];ctx.scale=(x,y)=>{scales.push([x,y]);original(x,y);};'+
   'drawBuilding(b,12345);ctx.scale=original;return {height,scale:scales[0]};})()');
 assert(Math.abs(compressed.scale[1]-compressed.height/.4*.48)<1e-8);
 const dragons=snapshot(game,'(()=>{const previous=state.dragons,original=drawDragon,out=[];'+
   'const first=previous[0];drawDragon=(context,params)=>out.push(params.scale);'+
   'state.dragons=[first];drawBuilding(state.buildings[0],12345);'+
   'state.dragons=[first,...[1,2,3].map(i=>({...first,id:1000+i}))];'+
   'drawBuilding(state.buildings[0],12345);state.dragons=previous;drawDragon=original;return out;})()');
 assert.equal(dragons[0],1.35);
 assert.deepEqual(dragons.slice(1),[.86,.86,.86,.86]);
});
check('all ten habitat environments render with dragons',()=>{
 const before=game.drawCalls.length;
 game.run('for(const [i,element] of Object.keys(DATA.elements).entries()){' +
   'const b={id:state.dragons[0].habitatId,type:"habitat",element,x:738+i,y:700,'+
   'level:2,stored:false,storedGold:1,storedGems:1};drawBuilding(b,12345+i*350);}');
 assert(game.drawCalls.length>before+300);
});
check('reset centers the camera on the projected home island',()=>{
 game.run('factoryReset()');
 const position=snapshot(game,'(()=>{const home=DATA.islands[0];'+
   'return {camera:ui.camera,center:gridToScreen(home.x+home.size/2,home.y+home.size/2)};})()');
 assert.equal(position.camera.x,position.center.x);
 assert.equal(position.camera.y,position.center.y);
});
console.log('PASS update smoke suite');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
