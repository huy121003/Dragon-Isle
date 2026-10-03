/* AUTH/SESSION/SAVE regression: multi-device login, presence and stale-save protection. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {newProfile}=require('../server/profile.cjs');

const root=path.resolve(__dirname,'..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'dragon-isle-auth-session-'));
for(const name of ['dragon-core.json','game.json'])
  fs.copyFileSync(path.join(root,'data',name),path.join(temporary,name));
for(const folder of ['dragons','skills'])fs.cpSync(path.join(root,'data',folder),path.join(temporary,folder),{recursive:true});

function freePort(){return new Promise(resolve=>{
  const probe=net.createServer();probe.listen(0,'127.0.0.1',()=>{
    const port=probe.address().port;probe.close(()=>resolve(port));
  });
});}
function cookie(res){return res.headers.get('set-cookie').split(';')[0];}
async function launch(port){
  const child=spawn(process.execPath,['server.cjs','--port',String(port)],{
    cwd:root,env:{...process.env,DRAGON_ISLE_DATA_DIR:temporary},stdio:'pipe'});
  child.stderr.on('data',chunk=>process.stderr.write('[server] '+chunk));
  const base='http://127.0.0.1:'+port;
  for(let i=0;i<60;i++){
    try{if((await fetch(base+'/')).ok)return child;}catch(error){}
    await new Promise(r=>setTimeout(r,50));
  }
  child.kill();throw new Error('Server did not start');
}
async function stop(child){if(!child||child.killed)return;await new Promise(resolve=>{
  child.once('exit',resolve);child.kill();
});}
function eligibleProfile(){
  const p=newProfile(),base=p.dragons[0];
  base.level=10;
  p.dragons.push({...base,id:50,nickname:'Wing'}, {...base,id:51,nickname:'Scale'});
  p.nextId=Math.max(p.nextId,52);p.savedAt=Date.now();
  return p;
}

(async()=>{
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let child=await launch(port);
  async function post(route,username,password){
    return fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,password})});
  }
  async function me(session){return fetch(base+'/api/auth/me',{headers:{Cookie:session}});}
  async function logout(session){return fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:session}});}
  async function getSave(session,id){
    const res=await fetch(base+'/api/save',{headers:{Cookie:session,'X-Dragon-Account':id}});
    const body=res.ok?await res.json():await res.json().catch(()=>null);
    return {res,body,revision:Number(res.headers.get('x-dragon-save-revision')||0)};
  }
  async function putSave(session,id,value,revision){
    const res=await fetch(base+'/api/save',{method:'PUT',headers:{Cookie:session,
      'X-Dragon-Account':id,'X-Dragon-Save-Revision':String(revision),'Content-Type':'application/json'},
      body:JSON.stringify({...value,savedAt:Date.now()})});
    const body=await res.json().catch(()=>null);
    return {res,body,revision:Number(res.headers.get('x-dragon-save-revision')||body?.serverRevision||0)};
  }
  async function challenge(route,method,session,body){
    return fetch(base+'/api/challenge/'+route,{method,headers:{Cookie:session,'Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})});
  }
  try{
    const regA=await post('/api/auth/register','Multi_A','strong-pass-A');
    assert.equal(regA.status,200);const a0=cookie(regA);
    assert.match(regA.headers.get('set-cookie'),/HttpOnly/);
    assert.match(regA.headers.get('set-cookie'),/SameSite=Strict/);
    assert.equal((await post('/api/auth/register','multi_a','another-pass')).status,409,
      'Username uniqueness must be case-insensitive');
    assert.equal((await post('/api/auth/register','x','short')).status,400);

    const regB=await post('/api/auth/register','Multi_B','strong-pass-B');
    assert.equal(regB.status,200);const b0=cookie(regB);
    const users=JSON.parse(fs.readFileSync(path.join(temporary,'users.json'),'utf8'));
    const idA=users.find(u=>u.username==='Multi_A').id,idB=users.find(u=>u.username==='Multi_B').id;
    assert(!fs.readFileSync(path.join(temporary,'users.json'),'utf8').includes('strong-pass'));

    const login1=await post('/api/auth/login','Multi_A','strong-pass-A');
    const login2=await post('/api/auth/login','Multi_A','strong-pass-A');
    assert.equal(login1.status,200);assert.equal(login2.status,200);
    const a1=cookie(login1),a2=cookie(login2);
    assert.equal((await me(a0)).status,200);
    assert.equal((await me(a1)).status,200);
    assert.equal((await me(a2)).status,200);
    assert.equal((await post('/api/auth/login','Multi_A','wrong-pass')).status,401);

    assert.equal((await logout(a1)).status,200);
    assert.equal((await me(a1)).status,401,'Logging out must revoke only that session');
    assert.equal((await me(a2)).status,200,'Another device session must remain valid');

    const initialA=await getSave(a2,idA);
    assert.equal(initialA.res.status,200);assert.equal(initialA.revision,0);
    assert.equal(initialA.body.player.level,100,'The first registered admin starts at level 100');
    assert.equal(initialA.body.gold,1_000_000);assert.equal(initialA.body.food,1_000_000);
    assert.equal(initialA.body.gems,1_000_000,'The admin starter profile grants one million of each resource');
    const first=eligibleProfile();first.gold=11111;
    const saved1=await putSave(a2,idA,first,0);
    assert.equal(saved1.res.status,200);assert.equal(saved1.revision,1);

    const staleRevision=1;
    const device1=await getSave(a0,idA);
    const device2=await getSave(a2,idA);
    assert.equal(device1.revision,1);assert.equal(device2.revision,1);

    const newer={...device1.body,gold:22222};
    const saved2=await putSave(a0,idA,newer,staleRevision);
    assert.equal(saved2.res.status,200);assert.equal(saved2.revision,2);
    const stale={...device2.body,gold:333};
    const rejected=await putSave(a2,idA,stale,staleRevision);
    assert.equal(rejected.res.status,409);
    assert.equal(rejected.body.code,'SAVE_CONFLICT');
    assert.equal(rejected.body.serverRevision,2);
    assert.equal((await getSave(a0,idA)).body.gold,22222,'Stale device must not overwrite newer progress');

    const refreshed=await getSave(a2,idA);
    assert.equal(refreshed.revision,2);
    const resumed=await putSave(a2,idA,{...refreshed.body,gold:33333},refreshed.revision);
    assert.equal(resumed.res.status,200);assert.equal(resumed.revision,3);

    const concurrentA=await getSave(a0,idA),concurrentB=await getSave(a2,idA);
    assert.equal(concurrentA.revision,3);assert.equal(concurrentB.revision,3);
    const concurrent=await Promise.all([
      putSave(a0,idA,{...concurrentA.body,gold:40001},3),
      putSave(a2,idA,{...concurrentB.body,gold:40002},3)
    ]);
    assert.deepEqual(concurrent.map(x=>x.res.status).sort(),[200,409],
      'Exactly one concurrent save with the same revision may commit');
    const afterConcurrent=await getSave(a2,idA);
    assert.equal(afterConcurrent.revision,4);
    assert([40001,40002].includes(afterConcurrent.body.gold));
    const normalized=await putSave(a2,idA,{...afterConcurrent.body,gold:33333},4);
    assert.equal(normalized.res.status,200);assert.equal(normalized.revision,5);

    const profileB=eligibleProfile();profileB.gold=44444;
    const saveB=await putSave(b0,idB,profileB,0);
    assert.equal(saveB.res.status,200);

    const preCrash=await getSave(a2,idA);
    const huge={...preCrash.body,gold:35555,
      land:Array.from({length:180000},(_,i)=>(i%1000)+','+(Math.floor(i/1000)%1000))};
    const crashWrite=putSave(a2,idA,huge,preCrash.revision).catch(()=>null);
    await new Promise(r=>setTimeout(r,2));
    await stop(child);await crashWrite;child=await launch(port);
    assert.equal((await me(a0)).status,200,'Sessions must survive a server restart');
    assert.equal((await me(a2)).status,200);
    const afterCrash=await getSave(a2,idA);
    assert([33333,35555].includes(afterCrash.body.gold),
      'Interrupted atomic save must leave either the previous or complete next profile');
    assert([5,6].includes(afterCrash.revision));
    const restoredSmall={...afterCrash.body,gold:33333,land:first.land};
    const stabilized=await putSave(a2,idA,restoredSmall,afterCrash.revision);
    assert.equal(stabilized.res.status,200);
    const persisted=await getSave(a2,idA);
    assert.equal(persisted.body.gold,33333);
    assert.equal(persisted.revision,afterCrash.revision+1);

    let bStatus=await (await challenge('status','GET',b0)).json();
    assert(bStatus.players.some(p=>p.id===idA),'Fresh save + active session should be online');

    const invite=await challenge('invite','POST',b0,{opponentId:idA});
    assert.equal(invite.status,200);
    assert((await (await challenge('status','GET',a2)).json()).match);

    assert.equal((await logout(a2)).status,200);
    assert.equal((await me(a2)).status,401);
    assert((await (await challenge('status','GET',a0)).json()).match,
      'Logging out one of several sessions must not terminate the account challenge');

    assert.equal((await logout(a0)).status,200);
    assert.equal((await me(a0)).status,401);
    bStatus=await (await challenge('status','GET',b0)).json();
    assert.equal(bStatus.match,null,'Logging out the last session should leave the challenge');

    const relogin=await post('/api/auth/login','Multi_A','strong-pass-A');
    assert.equal(relogin.status,200);const a3=cookie(relogin);
    const profilePath=path.join(temporary,'profiles',idA+'.json');
    const old=JSON.parse(fs.readFileSync(profilePath,'utf8'));old.savedAt=Date.now()-40000;
    fs.writeFileSync(profilePath,JSON.stringify(old));
    bStatus=await (await challenge('status','GET',b0)).json();
    assert(!bStatus.players.some(p=>p.id===idA),'A stale save heartbeat should mark the account offline');
    const current=await getSave(a3,idA);
    assert.equal((await putSave(a3,idA,current.body,current.revision)).res.status,200);
    bStatus=await (await challenge('status','GET',b0)).json();
    assert(bStatus.players.some(p=>p.id===idA),'A fresh autosave heartbeat should restore online state');

    const clientSave=fs.readFileSync(path.join(root,'js/persistence/save-client.js'),'utf8');
    const clientAuth=fs.readFileSync(path.join(root,'js/auth.js'),'utf8');
    assert(clientSave.includes("'X-Dragon-Save-Revision':String(serverSaveRevision)"));
    assert(clientSave.includes("error.code==='SAVE_CONFLICT'")&&clientSave.includes("saveReadOnly=true"));
    assert(clientAuth.includes("if(!saveReadOnly&&!await saveGame())"),
      'A read-only stale tab must still be able to sign out');

    console.log('PASS auth/session/save multi-device regression');
  }finally{
    await stop(child).catch(()=>{});
    fs.rmSync(temporary,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
