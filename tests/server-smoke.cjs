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
    /* PvP chạy trên máy chủ: đội hình, phần thưởng, chờ thua và autosave cũ. */
    const {newProfile}=require('../server/profile.cjs');
    const cookieAdmin=session(adminAgain);
    const playerAgain=await post('/api/auth/login','Bela_2','very-safe-pass-2');
    const cookiePlayer=session(playerAgain);
    const high=newProfile(),low=newProfile();
    high.buildings.push({id:4,type:'arena',level:1,x:200,y:182,stored:false});
    low.buildings.push({id:4,type:'arena',level:1,x:200,y:182,stored:false});
    high.dragons[0].level=100;
    high.dragons.push({...high.dragons[0],id:5,species:'water',nickname:'Dự bị',level:20});
    high.dragons.push({...high.dragons[0],id:9,nickname:'Hộ vệ',level:30});
    high.dragons.push({...high.dragons[0],id:6,nickname:'Đang lai',level:20});
    high.dragons.push({...high.dragons[0],id:8,nickname:'Cấp thấp',level:9});
    high.buildings.push({id:7,type:'cave',level:1,x:204,y:182,stored:false,
      breeding:{fatherId:6,motherId:12,readyAt:Date.now()+3600_000}});
    low.dragons[0].level=10;
    low.dragons.push({...low.dragons[0],id:5,nickname:'Đồng đội',level:10});
    low.dragons.push({...low.dragons[0],id:9,nickname:'Hộ vệ',level:10});
    async function putProfile(id,cookie,value){
      return fetch(base+'/api/save',{method:'PUT',headers:{Cookie:cookie,'X-Dragon-Account':id,
        'Content-Type':'application/json'},body:JSON.stringify(value)});
    }
    async function arenaCall(route,method,cookie,body){
      return fetch(base+'/api/arena/'+route,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},
        ...(body?{body:JSON.stringify(body)}:{})});
    }
    assert.equal((await putProfile(idA,cookieAdmin,high)).status,200);
    assert.equal((await putProfile(idB,cookiePlayer,low)).status,200);
    const challengeCall=(route,method,cookie,body)=>fetch(base+'/api/challenge/'+route,{
      method,headers:{Cookie:cookie,'Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})});
    assert.equal((await challengeCall('status','GET',null)).status,401);
    assert.equal((await challengeCall('status','GET',cookiePlayer)).status,200);
    assert((await (await challengeCall('status','GET',cookieAdmin)).json()).players.some(u=>u.id===idB));
    assert.equal((await challengeCall('availability','PUT',cookiePlayer,{enabled:false})).status,200);
    assert(!(await (await challengeCall('status','GET',cookieAdmin)).json()).players.some(u=>u.id===idB));
    assert.equal((await challengeCall('availability','PUT',cookiePlayer,{enabled:true})).status,200);
    assert((await (await challengeCall('status','GET',cookieAdmin)).json()).players.some(u=>u.id===idB));
    fs.mkdirSync(path.join(temporary,'arena'),{recursive:true});
    fs.writeFileSync(path.join(temporary,'arena',idB+'.json'),JSON.stringify({attack:[2],defense:[2]}));
    const legacyTeam=await (await arenaCall('list','GET',cookieAdmin)).json();
    assert(!legacyTeam.opponents.some(u=>u.id===idB),'Đội hình cũ 1 rồng phải chọn lại');
    const highTeam=[2,5,9],lowTeam=[2,5,9];
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:[2,5],defense:highTeam})).status,400,
      'Đội tấn công chỉ có 2 rồng phải bị từ chối');
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:highTeam,defense:[2,5]})).status,400,
      'Đội phòng thủ chỉ có 2 rồng phải bị từ chối');
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:highTeam,defense:highTeam})).status,200);
    assert.equal((await arenaCall('team','PUT',cookiePlayer,{attack:lowTeam,defense:lowTeam})).status,200);
    assert.equal((await arenaCall('team','PUT',cookiePlayer,{attack:[999,5,9],defense:lowTeam})).status,400);
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:[8,5,9],defense:highTeam})).status,400,
      'Rồng dưới cấp 10 không thể vào đội');
    assert.equal((await arenaCall('team','PUT',cookieAdmin,{attack:[6,5,9],defense:highTeam})).status,400,
      'Rồng đang lai tạo không thể vào đội');
    const choices=await (await arenaCall('list','GET',cookieAdmin)).json();
    assert.equal(choices.wins,0);assert.equal(choices.losses,0);
    assert.equal(choices.dragons.find(d=>d.id===8).battleReason,'Requires level 10');
    assert.equal(choices.dragons.find(d=>d.id===6).battleReason,'Breeding');
    assert(choices.opponents.some(u=>u.id===idB));
    const breedingLow=JSON.parse(JSON.stringify(low));
    breedingLow.buildings.push({id:7,type:'premiumCave',level:1,x:204,y:182,stored:false,
      breeding:{fatherId:2,motherId:2,readyAt:Date.now()+3600_000}});
    assert.equal((await putProfile(idB,cookiePlayer,breedingLow)).status,200);
    assert(!(await (await arenaCall('list','GET',cookieAdmin)).json()).opponents.some(u=>u.id===idB),
      'Đội phòng thủ đang lai tạo không thể được thách đấu');
    assert.equal((await arenaCall('fight','POST',cookieAdmin,{opponentId:idB})).status,409);
    assert.equal((await putProfile(idB,cookiePlayer,low)).status,200);
    const started=await (await arenaCall('fight','POST',cookieAdmin,{opponentId:idB})).json();
    assert.equal(started.battle.turn,1);
    assert.equal((await arenaCall('fight','POST',cookieAdmin,{opponentId:idB})).status,409);
    assert.equal((await arenaCall('turn','POST',cookieAdmin,
      {action:'skill',skillIndex:0,expectedTurn:2})).status,409);
    assert.equal((await arenaCall('turn','POST',cookieAdmin,
      {action:'skill',skillIndex:-1,expectedTurn:1})).status,400);
    assert.equal((await arenaCall('turn','POST',cookieAdmin,
      {action:'switch',dragonId:2,expectedTurn:1})).status,400);
    const switched=await (await arenaCall('turn','POST',cookieAdmin,
      {action:'switch',dragonId:5,expectedTurn:1})).json();
    assert.equal(switched.battle.activeAttack,1);
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).battle.activeAttack,1);
    await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
    child=await launch(port);
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).battle.activeAttack,1,
      'Khởi động lại máy chủ vẫn tiếp tục được trận dang dở');
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).wins,0);
    let round=switched,victory;
    for(let i=0;i<80&&!round.result;i++)
      round=await (await arenaCall('turn','POST',cookieAdmin,
        {action:'skill',skillIndex:2,expectedTurn:round.battle.turn})).json();
    victory=round.result;
    assert.equal(victory.won,true);
    assert(victory.events.length>0&&victory.reward.gems===1);
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).wins,1);
    assert.equal((await (await arenaCall('list','GET',cookiePlayer)).json()).losses,1);
    await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
    child=await launch(port);
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).wins,1,
      'Số trận thắng còn nguyên sau khi khởi động lại máy chủ');
    assert.equal((await (await arenaCall('list','GET',cookiePlayer)).json()).losses,1,
      'Số trận thua phòng thủ còn nguyên sau khi khởi động lại máy chủ');
    const rewarded=JSON.parse(fs.readFileSync(path.join(temporary,'profiles',idA+'.json'),'utf8'));
    assert.equal(rewarded.gold,high.gold+victory.reward.gold);
    assert.equal((await putProfile(idA,cookieAdmin,high)).status,200);
    assert.equal(JSON.parse(fs.readFileSync(path.join(temporary,'profiles',idA+'.json'),'utf8')).gold,
      high.gold+victory.reward.gold,'Autosave cũ không xóa thưởng đấu trường');
    const lowStart=await (await arenaCall('fight','POST',cookiePlayer,{opponentId:idA})).json();
    assert.equal((await arenaCall('turn','POST',cookiePlayer,
      {action:'skill',skillIndex:1,expectedTurn:lowStart.battle.turn})).status,400);
    let lowRound=await (await arenaCall('turn','POST',cookiePlayer,
      {action:'skill',skillIndex:0,expectedTurn:lowStart.battle.turn})).json();
    const firstEvents=(lowRound.result?.events||lowRound.battle.events)
      .filter(event=>event.turn===lowStart.battle.turn&&event.damage);
    assert.equal(firstEvents[0]?.side,'attack',
      'Đội chủ động chọn chiêu phải đánh trước, kể cả khi rồng phòng thủ nhanh hơn');
    for(let i=1;i<80&&!lowRound.result;i++)
      lowRound=await (await arenaCall('turn','POST',cookiePlayer,
        {action:'skill',skillIndex:0,expectedTurn:lowRound.battle.turn})).json();
    const loss=lowRound.result;
    assert.equal(loss.won,false);
    assert.equal((await (await arenaCall('list','GET',cookiePlayer)).json()).losses,2);
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).wins,2);
    assert.equal((await arenaCall('fight','POST',cookiePlayer,{opponentId:idA})).status,429);
    const next=await (await arenaCall('fight','POST',cookieAdmin,{opponentId:idB})).json();
    assert.equal((await (await arenaCall('turn','POST',cookieAdmin,
      {action:'forfeit',expectedTurn:next.battle.turn})).json()).result.won,false);
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).losses,1);
    assert.equal((await (await arenaCall('list','GET',cookiePlayer)).json()).wins,1);
    assert.equal((await arenaCall('fight','POST',cookieAdmin,{opponentId:idB})).status,429);
    const arenaFile=path.join(temporary,'arena',idA+'.json');
    const expired=JSON.parse(fs.readFileSync(arenaFile,'utf8'));
    expired.cooldownUntil=Date.now()-1000;
    fs.writeFileSync(arenaFile,JSON.stringify(expired));
    assert.equal((await (await arenaCall('list','GET',cookieAdmin)).json()).cooldownUntil,0,
      'Thời gian chờ đã hết không còn hiển thị là đang chờ');
    assert.equal((await arenaCall('fight','POST',cookieAdmin,{opponentId:idB})).status,200,
      'Có thể đánh tiếp sau khi thời gian chờ kết thúc');
    console.log('OK: tài khoản riêng, quản trị tài nguyên từng user/toàn bộ, reset/khóa/mở và React build.');
  }finally{
    child.kill();
    fs.rmSync(temporary,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
