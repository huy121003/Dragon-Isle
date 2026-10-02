/* TEST: Đăng ký, cookie phiên, tách hồ sơ và bảo vệ dữ liệu trên máy chủ thật. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const economyRules=require('../data/economy.js');
const root=path.resolve(__dirname,'..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'dragon-isle-auth-'));
for(const name of ['dragons.json','game.json'])fs.copyFileSync(path.join(root,'data',name),path.join(temporary,name));
function freePort(){return new Promise(resolve=>{
  const probe=net.createServer();probe.listen(0,'127.0.0.1',()=>{
    const port=probe.address().port;probe.close(()=>resolve(port));
  });
});}
function session(res){return res.headers.get('set-cookie').split(';')[0];}
async function launch(port){
  const child=spawn(process.execPath,['server.cjs','--port',String(port)],{
    cwd:root,env:{...process.env,DRAGON_ISLE_DATA_DIR:temporary},stdio:'pipe'});
  const base='http://127.0.0.1:'+port;
  for(let i=0;i<50;i++){
    try{const result=await fetch(base+'/');if(result.ok)return child;}catch(error){}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  child.kill();throw new Error('Máy chủ không khởi động');
}
(async()=>{
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let child=await launch(port);
  try{
    async function post(route,username,password,cookie){return fetch(base+route,{method:'POST',
      headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
      body:JSON.stringify({username,password})});}
    assert.equal((await fetch(base+'/api/save')).status,401);
    assert.equal((await fetch(base+'/data/users.json')).status,403);
    assert.equal((await fetch(base+'/data/sessions.json')).status,403);
    assert.equal((await fetch(base+'/data/progress.json')).status,403);
    const catalog=await (await fetch(base+'/data/dragons.json')).json();
    assert.equal(Object.keys(catalog.elements).length,15);
    assert.equal(catalog.species.length,1770);
    assert.equal(Object.keys(catalog.quads).length,150);
    const economy=await fetch(base+'/data/economy.js');
    assert.equal(economy.status,200);
    assert((await economy.text()).includes('DragonEconomy'));
    assert.equal((await fetch(base+'/debug/gallery.html')).status,200);
    assert.equal((await fetch(base+'/README.md')).status,403);
    const cache=await (await fetch(base+'/js/data/db-cache.js')).text();
    assert(cache.includes('window.DragonDatabase='));
    const a=await post('/api/auth/register','Alex_1','very-safe-pass-1');
    const b=await post('/api/auth/register','Bela_2','very-safe-pass-2');
    assert.equal(a.status,200);assert.equal(b.status,200);
    const cookieA=session(a),cookieB=session(b);
    assert.equal((await (await fetch(base+'/api/auth/me',{headers:{Cookie:cookieA}})).json()).user.role,'admin');
    assert.equal((await (await fetch(base+'/api/auth/me',{headers:{Cookie:cookieB}})).json()).user.role,'player');
    assert.equal((await fetch(base+'/api/admin/users')).status,401);
    assert.equal((await fetch(base+'/api/admin/users',{headers:{Cookie:cookieB}})).status,403);
    assert.equal((await (await fetch(base+'/api/admin/users',{headers:{Cookie:cookieA}})).json()).users.length,2);
    assert(a.headers.get('set-cookie').includes('HttpOnly'));
    assert(a.headers.get('set-cookie').includes('SameSite=Strict'));
    assert.equal((await post('/api/auth/register','alex_1','different-pass')).status,409);
    assert.equal((await post('/api/auth/login','Alex_1','wrong-pass')).status,401);
    assert.equal((await post('/api/auth/register','a','short')).status,400);
    const users=JSON.parse(fs.readFileSync(path.join(temporary,'users.json'),'utf8'));
    assert.equal(users.length,2);
    assert(!fs.readFileSync(path.join(temporary,'users.json'),'utf8').includes('very-safe-pass'));
    const idA=users.find(u=>u.username==='Alex_1').id,idB=users.find(u=>u.username==='Bela_2').id;
    assert.notEqual(idA,idB);
    const state={version:5,lastTick:12345,savedAt:Date.now(),land:[],dragons:[],buildings:[],eggs:[],gold:123};
    const putA=await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookieA,'X-Dragon-Account':idA,'Content-Type':'application/json'},body:JSON.stringify(state)});
    assert.equal(putA.status,200);
    assert.equal((await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookieA,
      'X-Dragon-Account':idA,'Content-Type':'application/json'},
      body:JSON.stringify({...state,version:11})})).status,200,'Save v11 được chấp nhận');
    assert.equal((await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookieA,
      'X-Dragon-Account':idA,'Content-Type':'application/json'},
      body:JSON.stringify({...state,version:12})})).status,200,'Save v12 được chấp nhận');
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:cookieB,'X-Dragon-Account':idB}})).json()),null);
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:cookieA,'X-Dragon-Account':idA}})).json()).gold,123);
    assert.equal((await fetch(base+'/data/profiles/'+idA+'.json')).status,403);
    assert.equal((await fetch(base+'/api/save',{headers:{Cookie:cookieA,'X-Dragon-Account':idB}})).status,409);
    assert.equal((await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookieB,
      'X-Dragon-Account':idA,'Content-Type':'application/json'},body:JSON.stringify({...state,gold:999})})).status,409);
    assert.equal(JSON.parse(fs.readFileSync(path.join(temporary,'profiles',idA+'.json'),'utf8')).gold,123);
    const other={...state,gold:987};
    assert.equal((await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookieB,'X-Dragon-Account':idB,'Content-Type':'application/json'},body:JSON.stringify(other)})).status,200);
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:cookieA,'X-Dragon-Account':idA}})).json()).gold,123);
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:cookieB,'X-Dragon-Account':idB}})).json()).gold,987);
    const resetOnlyA={...state,gold:500};
    assert.equal((await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookieA,
      'X-Dragon-Account':idA,'Content-Type':'application/json'},body:JSON.stringify(resetOnlyA)})).status,200);
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:cookieB,'X-Dragon-Account':idB}})).json()).gold,987);
    assert.equal((await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookieA,'X-Dragon-Account':idA,'Content-Type':'application/json'},body:'{}'})).status,400);
    assert.equal((await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookieA,'X-Dragon-Account':idA,Origin:'https://evil.invalid','Content-Type':'application/json'},body:JSON.stringify(state)})).status,403);
    await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
    child=await launch(port);
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:cookieA,'X-Dragon-Account':idA}})).json()).gold,500);
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:cookieB,'X-Dragon-Account':idB}})).json()).gold,987);
    const logOut=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:cookieA}});
    assert.equal(logOut.status,200);
    assert.equal((await fetch(base+'/api/save',{headers:{Cookie:cookieA}})).status,401);
    const login=await post('/api/auth/login','Alex_1','very-safe-pass-1');
    assert.equal(login.status,200);
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:session(login),'X-Dragon-Account':idA}})).json()).gold,500);
    /* ADMIN: Chỉ quản trị có thể đặt lại/khóa/mở người chơi, phiên cũ bị thu hồi. */
    assert.equal((await fetch(base+'/api/admin/users/'+idA+'/reset',{method:'POST',headers:{Cookie:session(login)}})).status,400);
    assert.equal((await fetch(base+'/api/admin/users/'+idB+'/reset',{method:'POST',headers:{Cookie:cookieB}})).status,403);
    assert.equal((await fetch(base+'/api/admin/users/'+idB+'/reset',{method:'POST',headers:{Cookie:session(login)}})).status,200);
    assert.equal((await fetch(base+'/api/save',{headers:{Cookie:cookieB,'X-Dragon-Account':idB}})).status,401);
    const newB=await post('/api/auth/login','Bela_2','very-safe-pass-2');
    assert.equal(newB.status,200);
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:session(newB),'X-Dragon-Account':idB}})).json()),null);
    assert.equal((await fetch(base+'/api/admin/users/'+idB+'/disable',{method:'POST',headers:{Cookie:session(login)}})).status,200);
    assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:session(newB)}})).status,401);
    assert.equal((await post('/api/auth/login','Bela_2','very-safe-pass-2')).status,401);
    assert.equal((await fetch(base+'/api/admin/users/'+idB+'/enable',{method:'POST',headers:{Cookie:session(login)}})).status,200);
    assert.equal((await post('/api/auth/login','Bela_2','very-safe-pass-2')).status,200);
    /* TÀI NGUYÊN: Chỉnh số dư từng user, khởi tạo hồ sơ chưa chơi, áp dụng cho toàn bộ user. */
    async function resourcePut(route,patch,cookie){return fetch(base+route,{method:'PUT',
      headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(patch)});}
    const editB='/api/admin/users/'+idB+'/resources',adminCookie=session(login);
    assert.equal((await resourcePut(editB,{gold:999},null)).status,401);
    assert.equal((await resourcePut(editB,{gold:999},cookieB)).status,401);
    const activeB=await post('/api/auth/login','Bela_2','very-safe-pass-2');
    assert.equal((await resourcePut(editB,{gold:999},session(activeB))).status,403);
    for(const invalid of [{},{gold:-1},{food:1.5},{gems:1_000_000_001},{gold:'999'},{level:60}])
      assert.equal((await resourcePut(editB,invalid,adminCookie)).status,400);
    assert.equal((await resourcePut(editB,{gold:4321,gems:77},adminCookie)).status,200);
    assert.equal((await fetch(base+'/api/save',{headers:{Cookie:session(activeB),'X-Dragon-Account':idB}})).status,401);
    assert.equal((await resourcePut(editB,{food:321},adminCookie)).status,200);
    const profileB=JSON.parse(fs.readFileSync(path.join(temporary,'profiles',idB+'.json'),'utf8'));
    assert.equal(profileB.gold,4321);assert.equal(profileB.food,321);assert.equal(profileB.gems,77);
    assert.equal(profileB.dragons.length,1);assert.equal(profileB.buildings.length,2);
    assert(profileB.buildings.some(b=>b.type==='hatchery'&&b.level===1));
    assert.equal((await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:session(activeB),
      'X-Dragon-Account':idB,'Content-Type':'application/json'},body:JSON.stringify(state)})).status,401);
    const c=await post('/api/auth/register','Cami_3','very-safe-pass-3');
    assert.equal(c.status,200);
    const idC=JSON.parse(fs.readFileSync(path.join(temporary,'users.json'),'utf8')).find(u=>u.username==='Cami_3').id;
    assert.equal((await (await fetch(base+'/api/save',{headers:{Cookie:session(c),'X-Dragon-Account':idC}})).json()),null);
    const bulk=await resourcePut('/api/admin/resources',{food:0,gems:42},adminCookie);
    assert.equal(bulk.status,200);
    assert.equal((await bulk.json()).updated,3);
    assert.equal((await fetch(base+'/api/admin/users',{headers:{Cookie:adminCookie}})).status,401);
    for(const [id,expectedGold] of [[idA,500],[idB,4321],[idC,economyRules.starting.gold]]){
      const profile=JSON.parse(fs.readFileSync(path.join(temporary,'profiles',id+'.json'),'utf8'));
      assert.equal(profile.gold,expectedGold);assert.equal(profile.food,0);assert.equal(profile.gems,42);
      assert.equal(profile.dragons.length,idA===id?0:1);
    }
    const adminAgain=await post('/api/auth/login','Alex_1','very-safe-pass-1');
    const summary=(await (await fetch(base+'/api/admin/users',{headers:{Cookie:session(adminAgain)}})).json()).users;
    assert(summary.every(user=>user.progress.food===0&&user.progress.gems===42));
    const page=await (await fetch(base+'/')).text();
    assert(page.includes('/assets/index-'),'Máy chủ phải phục vụ bản React đã build');
    assert.equal((await fetch(base+'/src/main.jsx')).status,403);
    /* Arena: AI rivals, attack-only setup and server-owned attempt windows. */
    const {newProfile}=require('../server/profile.cjs');
    const cookieAdmin=session(adminAgain);
    const high=newProfile();
    high.buildings.push({id:4,type:'arena',level:1,x:200,y:182,stored:false});
    high.dragons[0].level=100;high.dragons[0].species='water';
    high.dragons.push({...high.dragons[0],id:5,species:'water',nickname:'Backup',level:100});
    high.dragons.push({...high.dragons[0],id:9,nickname:'Guard',level:100});
    high.dragons.push({...high.dragons[0],id:6,nickname:'Breeding',level:20});
    high.dragons.push({...high.dragons[0],id:8,nickname:'Low level',level:9});
    high.buildings.push({id:7,type:'cave',level:1,x:204,y:182,stored:false,
      breeding:{fatherId:6,motherId:12,readyAt:Date.now()+3600_000}});
    async function putProfile(id,cookie,value){
      return fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookie,'X-Dragon-Account':id,
        'Content-Type':'application/json'},body:JSON.stringify(value)});
    }
    async function arenaCall(route,method,cookie,body){
      return fetch(base+'/api/arena/'+route,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},
        ...(body?{body:JSON.stringify(body)}:{})});
    }
    assert.equal((await putProfile(idA,cookieAdmin,high)).status,200);
    const challengeCall=(route,method,cookie,body)=>fetch(base+'/api/challenge/'+route,{
      method,headers:{Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    assert.equal((await challengeCall('status','GET',cookieAdmin)).status,200);
    const highTeam=[2,5,9];
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:[2,5]})).status,400,
      'Reject attack teams with fewer than three dragons');
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:[999,5,9]})).status,400,
      'Reject dragons the player does not own');
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:[8,5,9]})).status,400,
      'Reject dragons below the minimum battle level');
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:[6,5,9]})).status,400,
      'Reject dragons in active breeding');
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:highTeam})).status,200);
    const choices=await (await arenaCall('list','GET',cookieAdmin)).json();
    assert(choices.dragons.every(dragon=>Number.isFinite(dragon.power))&&
      choices.dragons.every((dragon,index,list)=>!index||list[index-1].power>=dragon.power),
      'The server returns every owned dragon with its Combat Power ranking');
    assert.equal(choices.opponents.length,3,'The server creates exactly three rivals');
    assert(choices.opponents.every(rival=>String(rival.id).startsWith('bot-')),
      'Arena rivals are server-generated, not other accounts');
    assert(choices.opponents.every(rival=>!('team' in rival)&&!('level' in rival)&&!('strength' in rival)),
      'Rival strength and dragons are hidden until the battle starts');
    assert.equal(choices.attemptsRemaining,3);
    assert.equal(choices.dragons.find(d=>d.id===8).battleReason,'Requires level 10');
    assert.equal(choices.dragons.find(d=>d.id===6).battleReason,'Breeding');
    assert(choices.opponents.every(rival=>Object.keys(rival).length===1),
      'The list exposes only opaque rival IDs');
    assert.equal((await arenaCall('fight','POST',cookieAdmin,{opponentId:'unknown-user'})).status,400,
      'Human user ids are not valid Arena rivals');
    const started=await (await arenaCall('fight','POST',cookieAdmin,{opponentId:choices.opponents[0].id})).json();
    assert.equal(started.battle.turn,1);
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).attemptsRemaining,2,
      'Starting a match immediately consumes an attempt');
    assert.equal((await arenaCall('fight','POST',cookieAdmin,{opponentId:choices.opponents[1].id})).status,409,
      'A player cannot open another match while one is active');
    let round=started;
    for(let i=0;i<80&&!round.result;i++)round=await (await arenaCall('turn','POST',cookieAdmin,
      {action:'skill',skillIndex:2,expectedTurn:round.battle.turn})).json();
    assert.equal(round.result?.won,true,'An Arena victory completes and keeps its existing rewards');
    assert(round.result.reward.gold>0&&round.result.reward.food>0&&round.result.reward.gems>0);
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).wins,1);
    const afterWin=await (await arenaCall('list','GET',cookieAdmin)).json();
    assert(afterWin.defeatedOpponentIds.includes(choices.opponents[0].id),
      'A defeated rival is recorded for the current 8-hour window');
    assert.equal((await arenaCall('fight','POST',cookieAdmin,{opponentId:choices.opponents[0].id})).status,409,
      'A player cannot challenge a rival they already defeated');
    for(let attempt=1;attempt<3;attempt++){
      const roster=await (await arenaCall('list','GET',cookieAdmin)).json();
      const match=await (await arenaCall('fight','POST',cookieAdmin,{opponentId:roster.opponents[attempt].id})).json();
      const result=await (await arenaCall('turn','POST',cookieAdmin,
        {action:'forfeit',expectedTurn:match.battle.turn})).json();
      assert.equal(result.result.won,false);
    }
    const exhausted=await (await arenaCall('list','GET',cookieAdmin)).json();
    assert.equal(exhausted.attemptsRemaining,0);
    assert.equal((await arenaCall('fight','POST',cookieAdmin,{opponentId:exhausted.opponents[1].id})).status,429);
    const arenaFile=path.join(temporary,'arena',idA+'.json');
    const savedArena=JSON.parse(fs.readFileSync(arenaFile,'utf8'));
    savedArena.windowKey='expired-window';fs.writeFileSync(arenaFile,JSON.stringify(savedArena));
    const reset=await (await arenaCall('list','GET',cookieAdmin)).json();
    assert.equal(reset.attemptsRemaining,3,'The server restores three attempts in a new time window');
    assert.deepEqual(reset.defeatedOpponentIds,[],'Defeated rivals reset in a new 8-hour window');
    console.log('OK: account sessions, server-generated Arena rivals, attack team validation and 8-hour attempts.');
  }finally{
    child.kill();
    fs.rmSync(temporary,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
