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
      addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:800,height:600};},
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
check('11 closely grouped islands with the home island centered',()=>{
 assert.equal(game.run('DATA.islands.length'),11);
 assert(game.run('DATA.islands.every(i=>i.size===72)'));
 assert.deepEqual([...new Set(db.species.map(s=>s.id))].length,db.species.length);
 assert.equal(game.run('DATA.islandRegionSize'),24);
 assert.equal(game.run('islandRegionTotal(0)'),9);
 const islands=JSON.parse(game.run('JSON.stringify(DATA.islands)'));
 assert.equal(islands[0].x,714);assert.equal(islands[0].y,668);
 assert.equal(islands.filter(i=>i.x<islands[0].x-4).length,4);
 assert.equal(islands.filter(i=>i.x>islands[0].x+4).length,4);
 assert.equal(islands.filter(i=>Math.abs(i.x-islands[0].x)<=4).length,3);
 assert(islands.some(i=>i.y<islands[0].y-80)&&islands.some(i=>i.y>islands[0].y+90));
 for(let i=0;i<islands.length;i++)for(let j=i+1;j<islands.length;j++){
   const a=islands[i],b=islands[j];
   const gapX=Math.max(0,Math.max(a.x,b.x)-Math.min(a.x+a.size,b.x+b.size));
   const gapY=Math.max(0,Math.max(a.y,b.y)-Math.min(a.y+a.size,b.y+b.size));
   assert(Math.hypot(gapX,gapY)>=9,`${a.id} and ${b.id} overlap`);
 }
 assert(Math.max(...islands.map(i=>i.x+i.size))-Math.min(...islands.map(i=>i.x))<500);
 assert(Math.max(...islands.map(i=>i.x+i.size))-Math.min(...islands.map(i=>i.x))<410);
});
check('region purchase and placement work',()=>{
 game.run('state.gold=500000;unlockLand(739,691)');
 assert(game.run('state.regions.includes("0:1:0")'));
 assert(game.run('unlocked(744,680)'));
 assert(game.run('footprintValid(744,678,{w:6,h:6})'));
 assert.equal(game.run('islandRegionCount(0)'),2);
 assert(game.run('landCost(739,691)')>20);
});
check('Academy uses placement and upgrade gates/cost formula',()=>{
 game.run('state.player.level=30;state.gold=500000;state.food=100000;state.gems=1000;'+
   'state.buildings.push({id:91,type:"academy",level:1,x:738,y:703,stored:false,upgradeEnds:0})');
 assert(game.run('academyUpgradeCost(2).gold')>game.run('academyUpgradeCost(1).gold')*2);
 assert.equal(game.run('academyUpgradeCost(1).gold'),3750);
 assert.equal(game.run('upgradeSeconds({type:"academy",level:2})'),660);
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
 assert(html.includes('data-target="breed-father"')&&html.includes('data-target="breed-mother"'));
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
check('510 unique English species and no Special',()=>{
 assert.equal(db.species.length,510);
 assert.equal(new Set(db.species.map(s=>s.ten)).size,db.species.length);
 assert(db.species.every(s=>!s.id.startsWith('special_')&&/Dragon$/.test(s.ten)));
 assert.equal(db.species.find(s=>s.id==='fire').ten,'Flame Dragon');
 assert.equal(db.species.find(s=>s.id==='thunder').ten,'Electric Dragon');
 assert.equal(db.species.find(s=>s.id==='fire>water').ten,'Geyser Dragon');
 assert.equal(db.species.find(s=>s.id==='water>fire').ten,'Steam Eruption Dragon');
 assert.equal(db.species.find(s=>s.id==='light>dark').ten,'Penumbral Eclipse Dragon');
 assert.equal('specials' in db,false);
 assert.equal(game.run('BOOK_SPECIES_IDS.some(x=>x.startsWith("special_"))'),false);
 game.run('openModal("book")');assert(!game.element('sheetBody').innerHTML.includes('>Special<'));
});
check('rare breeding, 100000 roll Monte Carlo',()=>{
 game.run('state.dragons[0].species="fire>water>earth";state.dragons[0].level=35;'+
  'state.dragons[1].species="wind>ice>thunder";state.dragons[1].level=35');
 const odds=JSON.parse(game.run('JSON.stringify(breedingOptions(state.dragons[0],state.dragons[1]))'));
 const sum=odds.reduce((a,o)=>a+o.chance,0);assert(Math.abs(sum-1)<1e-9);
 const tier=n=>odds.filter(o=>o.id.split('>').length===n).reduce((a,o)=>a+o.chance,0);
 assert(Math.abs(tier(3)-.055)<1e-9);assert(tier(4)>=.005&&tier(4)<=.01);
 const results=[0,0,0,0];let seed=234553;
 for(let i=0;i<100000;i++){
   seed=(seed*1664525+1013904223)>>>0;const roll=seed/4294967296;
   let cumulative=0;for(const o of odds){cumulative+=o.chance;if(roll<cumulative){results[o.id.split('>').length-1]++;break;}}
 }
 assert(Math.abs(results[2]/100000-tier(3))<.003);
 assert(Math.abs(results[3]/100000-tier(4))<.0015);
 console.log('    1/2/3/4 elements: '+results.map(n=>(n/1000).toFixed(2)+'%').join(' / '));
 game.run('state.dragons[1].level=29');
 assert.equal(game.run('breedingOptions(state.dragons[0],state.dragons[1]).filter(o=>o.id.split("> ").length===4).length'),0);
 assert.equal(game.run('breedingOptions(state.dragons[0],state.dragons[1]).filter(o=>DATA.species[o.id].elements.length===4).length'),0);
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
   assert.equal(m.run('state.version'),11);
   assert.equal(m.run('state.dragons[0].species'),'light>dark');
   assert.equal(m.run('islandAt(state.buildings[0].x,state.buildings[0].y)'),0);
 console.log('PASS v8 save and Special migrate to v11');
})();
const old={...JSON.parse(game.run('JSON.stringify(state)')),version:8,regions:['0:3:3'],land:[],buildings:[]};
const migrated=await boot(JSON.stringify(old));
assert.equal(migrated.run('state.version'),11);
const v7={...old,version:7,regions:['0:1:1','0:3:3'],land:[],buildings:[]};
const migratedV7=await boot(JSON.stringify(v7));
assert.equal(migratedV7.run('state.version'),11);
assert(migratedV7.run('islandRegionCount(0)')>=1);
console.log('PASS v7 purchased land migrates through both layouts');
const saved9=JSON.parse(game.run('JSON.stringify(newGame())'));
saved9.version=9;saved9.regions=['0:1:1','1:1:1'];saved9.unlockedIslands=2;
saved9.land=['494,494','505,505','635,505'];
saved9.buildings[0].x=505;saved9.buildings[0].y=505;
saved9.buildings[1].x=494;saved9.buildings[1].y=494;
saved9.buildings.push({id:88,type:'farm',level:1,x:635,y:505,stored:false});
const moved=await boot(JSON.stringify(saved9));
assert.equal(moved.run('state.version'),11);
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
assert.equal(close.run('state.version'),11);
assert.equal(close.run('state.buildings[2].x'),642);
assert.equal(close.run('state.buildings[2].y'),568);
assert(close.run('unlocked(642,568)'));
assert.equal(close.run('islandRegionCount(1)'),1);
console.log('PASS v10 land and buildings move with closer islands');
check('daylight cycle and gallery resources',()=>{
 assert.equal(game.run('daylightAt(Date.now())>=0&&daylightAt(Date.now())<=1'),true);
 game.run('ui.fixedDay=true');assert.equal(game.run('daylightAt(Date.now())'),1);
 assert(fs.existsSync(path.join(root,'debug/gallery.html')));
});
check('canvas scene renders without errors',()=>{
 game.run('ui.fixedDay=false;showWorld();drawScene(12345,.016)');
 assert(game.drawCalls.some(call=>call[0]==='strokeRect'));
 assert(game.drawCalls.some(call=>call[0]==='clip'));
});
check('floating islands keep buildings and hit targets aligned',()=>{
 const actual=snapshot(game,'[islandBob(0,1200),islandBob(0,4300),islandBob(1,1200)]');
 assert(Math.abs(actual[0]-actual[1])>5);
 assert(Math.abs(actual[0]-actual[2])>5);
 game.run('performance.now=()=>1200');
 const tapped=snapshot(game,'(()=>{const island=DATA.islands[0],T=DATA.tile;'+
   'const p=worldToScreen((island.x+4.5)*T,(island.y+.5)*T+islandBob(0,1200));'+
   'return screenCell(p.x,p.y);})()');
 assert.equal(tapped.x,714+4);assert.equal(tapped.y,668);
 const before=game.drawCalls.length;
 game.run('drawScene(1200,.016)');
 const transforms=game.drawCalls.slice(before).filter(call=>call[0]==='translate');
 assert(transforms.some(call=>Math.abs(call[1])<.001&&Math.abs(call[2]-actual[0])<.001));
});
check('every new building silhouette renders by day and night',()=>{
 const before=game.drawCalls.length;
 game.run('for(const kind of ["habitat","farm","hatchery","academy","arena","cave","decor"]){'+
   'const b={id:500,type:kind,element:"fire",x:740,y:699,level:1,stored:false,'+
   'crop:kind==="farm"?{id:"wheat",readyAt:Date.now()-1}:null};'+
   'ui.fixedDay=true;drawBuilding(b,12345);ui.fixedDay=false;drawBuilding(b,24680);}');
 assert(game.drawCalls.length>before+400);
});
check('all ten habitat environments render with dragons',()=>{
 const before=game.drawCalls.length;
 game.run('for(const [i,element] of Object.keys(DATA.elements).entries()){' +
   'const b={id:state.dragons[0].habitatId,type:"habitat",element,x:738+i,y:700,'+
   'level:2,stored:false,storedGold:1,storedGems:1};drawBuilding(b,12345+i*350);}');
 assert(game.drawCalls.length>before+300);
});
console.log('PASS update smoke suite');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
