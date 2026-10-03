/* TEST: Tải đúng các script như file HTML và kiểm tra các luồng tài nguyên quan trọng. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const progressionConfig=require('../js/config/progression.js');
const combatConfig=require('../js/config/combat.js');
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
  let remoteRevision=Math.max(0,Math.floor(Number(remote?.serverRevision)||0));
  const network=options.networkState||{down:false};
  const document={getElementById:element,createElement:()=>element('float'+Math.random()),
    querySelectorAll:()=>[],addEventListener(){},hidden:false};
  const window={devicePixelRatio:1,location:{protocol:options.protocol||'http:'},
    addEventListener(){},dispatchEvent(){},confirm:()=>true,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}};
  const fetchCalls=[];
  const fetch=async function(url,request={}){
    fetchCalls.push({url,request});
    if(network.down&&(url==='/api/auth/me'||url==='/api/save'))throw new TypeError('network offline');
    if(url==='/api/auth/me')return options.noAuth||network.sessionExpired?{ok:false,status:401,json:async()=>({error:'expired'})}:
      {ok:true,status:200,json:async()=>({user:{id:'demo',username:'demo'}})};
    if(url==='/api/save'&&request.method==='PUT'){
      const expected=Number(request.headers?.['X-Dragon-Save-Revision']);
      if(Number.isSafeInteger(expected)&&expected!==remoteRevision)
        return {ok:false,status:409,headers:{get:()=>null},json:async()=>({error:'Save conflict',code:'SAVE_CONFLICT',serverRevision:remoteRevision})};
      remote=JSON.parse(request.body);remoteRevision++;
      remote.serverRevision=remoteRevision;
      return {ok:true,status:200,headers:{get:name=>String(name).toLowerCase()==='x-dragon-save-revision'?String(remoteRevision):null},
        json:async()=>({ok:true,serverRevision:remoteRevision})};
    }
    if(url==='/api/save')return {ok:true,status:200,
      headers:{get:name=>String(name).toLowerCase()==='x-dragon-save-revision'?String(remoteRevision):null},
      json:async()=>remote};
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
  return {context,element,drawCalls,storage,fetchCalls,network,getRemote:()=>remote,
    run(code){return vm.runInContext(code,context,{timeout:2000});}};
}
function snapshot(game,expr){return JSON.parse(game.run('JSON.stringify('+expr+')'));}

(async()=>{
const game=await boot();
const check=(label,fn)=>{try{fn();console.log('PASS '+label);}catch(error){console.error('FAIL '+label+': '+error.message);throw error;}};
const arenaEvents=await game.run('(async()=>{'+
  'const fighter={id:1,nickname:"One",skills:[{name:"Strike"}]};'+
  'const initial={turn:1,eventSeq:0,attack:[fighter,{...fighter,id:2,nickname:"Two"}],'+
    'defense:[fighter],activeAttack:0,activeDefense:0,events:[]};'+
  'const switchEvent={turn:1,side:"attack",switchTo:"Two"};'+
  'const skillEvent={turn:1,side:"attack",skill:"Strike"};'+
  'const aiEvent={turn:1,side:"defense",skill:"Strike"};'+
  'const responses=[{battle:{...initial,activeAttack:1,eventSeq:1,events:[switchEvent]}},'+
    '{battle:{...initial,turn:2,activeAttack:1,eventSeq:3,events:[switchEvent,skillEvent,aiEvent]}}];'+
  'const calls=[];renderArena=()=>{};arenaRequest=async(path,method,payload)=>{calls.push(payload);return responses.shift();};'+
  'ui.arena.data={battle:initial};'+
  'await arenaTurn("switch",2);const first=ui.arena.presentation.events.slice();'+
  'finishArenaPresentation();await arenaTurn("skill",0);'+
  'return {first,second:ui.arena.presentation.events,payload:ui.arena.data.battle,calls};'+
'})()');
check('Arena keeps only new presentation events when a free swap and skill share a turn',()=>{
  assert.equal(arenaEvents.first.length,1);
  assert.equal(arenaEvents.second.length,2);
  assert.equal(arenaEvents.second[0].skill,'Strike');
  assert.equal(arenaEvents.payload.eventSeq,3);
  assert.deepEqual(Array.from(arenaEvents.calls,payload=>payload.expectedEvents),[0,1]);
});
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
{
 const g=await boot();
 g.network.down=true;
 g.run('state.gold=54321');
 assert.equal(await g.run('saveGame()'),false);
 assert(g.run('pendingServerSave!==null'),'Failed network save must stay queued');
 assert.equal(g.run('saveReadOnly'),false,'Network loss must not make the tab read-only');
 assert.equal(g.run('window.DragonConnectionState.status'),'reconnecting');
 assert.equal(g.run('window.DragonConnectionState.blocked'),true);
 g.run('ui.modal=null;handleAction({dataset:{action:"open-shop"}})');
 assert.equal(g.run('ui.modal'),null,'Gameplay actions must be blocked while reconnecting');
 g.network.down=false;
 assert.equal(await g.run('window.DragonConnectionApi.retry()'),true);
 assert.equal(g.run('pendingServerSave'),null);
 assert.equal(g.run('window.DragonConnectionState.status'),'connected');
 assert.equal(g.run('window.DragonConnectionState.blocked'),false);
 assert.equal(g.getRemote().gold,54321);
 const latestPut=g.fetchCalls.filter(x=>x.url==='/api/save'&&x.request.method==='PUT').at(-1);�]���$z{-���jםeAction({dataset:{action:"breed-select",slot:"mother",id:String(ui.breedDraft.father)}})');
 assert.notEqual(game.run('ui.breedDraft.mother'),game.run('ui.breedDraft.father'));
});
check('four-element AND filters apply in dragon roster and book tier tabs stay singular',()=>{
 game.run('ui.modal={name:"book"};renderBook()');
 assert(game.element('sheetBody').innerHTML.includes('class="tier-glyph"'));
 assert(!game.element('sheetBody').innerHTML.includes('data-action="rarity-filter" data-target="book"'),
   'Book has one tier control: the All/element-count tabs');
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
 assert(game.element('sheetBody').innerHTML.includes('data-action="rarity-filter" data-target="dragon"'));
 game.run('handleAction({dataset:{action:"rarity-filter",target:"dragon",rarity:"epic"}})');
 assert.deepEqual(snapshot(game,'ui.dragonRarities'),['epic']);
 game.run('handleAction({dataset:{action:"rarity-filter",target:"dragon",rarity:"rare"}})');
 assert.deepEqual(snapshot(game,'ui.dragonRarities'),['rare'],'roster tier selection replaces previous tier');
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
  assert(Math.abs(double.reduce((total,o)=>total+o.chance,0)-.0185)<1e-9);
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
check('battle dragon portraits mirror both sides and keep tails and heads in frame',()=>{
  for(const level of [1,15,40]){
    const stage=level<10?.74:level<30?1:1.2;
    for(const facing of [1,-1]){
      const placement=snapshot(balance,'battleDragonPortraitPlacement(290,230,'+level+','+facing+')');
      const actual=placement.scale*stage*1.05;
      const leftExtent=facing===1?94:60,rightExtent=facing===1?60:94;
      assert(placement.x-leftExtent*actual>=10,'Tail stays inside the '+(facing===1?'player':'opponent')+' portrait');
      assert(placement.x+rightExtent*actual<=280,'Head or tail stays clear of the right frame');
    }
  }
  const player=snapshot(balance,'battleDragonPortraitPlacement(290,230,40,1)');
  const rival=snapshot(balance,'battleDragonPortraitPlacement(290,230,40,-1)');
  assert.equal(player.x+rival.x,290,'Opponent placement mirrors player placement');
});
check('rare breeding, 100000 roll Monte Carlo',()=>{
 game.run('state.dragons[0].species="fire>water>earth";state.dragons[0].level=35;'+
  'state.dragons[1].species="wind>ice>thunder";state.dragons[1].level=35');
 const odds=JSON.parse(game.run('JSON.stringify(breedingOptions(state.dragons[0],state.dragons[1]))'));
 const sum=odds.reduce((a,o)=>a+o.chance,0);assert(Math.abs(sum-1)<1e-9);
 const tier=n=>odds.filter(o=>o.id.split('>').length===n).reduce((a,o)=>a+o.chance,0);
 assert(Math.abs(tier(3)-.16)<1e-9);assert(Math.abs(tier(4)-.03)<1e-9);
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
  assert(Math.abs(p4-(size===3?0:.03))<1e-9);
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
 assert(detail.includes('👊 Combat Power'),'Combat Power is shown in dragon details');
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
   'for(let level=1;level<=DATA.buildings[type].maxLevel;level++){' +
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
check('all fifteen habitat environments render with dragons',()=>{
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
