const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {newProfile}=require('../server/profile.cjs');
const {createArena}=require('../server/arena.cjs');
const {createChallenge}=require('../server/challenge.cjs');

(async()=>{
  const profilesDir=fs.mkdtempSync(path.join(os.tmpdir(),'dragon-challenge-presence-'));
  try{
    let time=Date.now();
    const now=()=>time;
    const users=['A','B'].map((username,i)=>({id:String(i+1),username,
      challengeEnabled:true,disabled:false}));
    const sessions=new Set(users.map(user=>user.id));
    const auth={listUsers:()=>users,hasActiveSession:id=>sessions.has(id)};
    const makeProfile=()=>{
      const p=newProfile();p.savedAt=time;p.dragons[0].level=30;
      p.dragons.push({...p.dragons[0],id:5,species:'water',nickname:'Water'});
      p.dragons.push({...p.dragons[0],id:9,species:'ice',nickname:'Ice'});
      return p;
    };
    const files=users.map(user=>path.join(profilesDir,user.id+'.json'));
    files.forEach(file=>fs.writeFileSync(file,JSON.stringify(makeProfile())));
    const arena=createArena({profilesDir,dataDir:path.resolve(__dirname,'../data'),auth});
    const stateFile=path.join(profilesDir,'_challenge-state.json');
    let duel=createChallenge({profilesDir,auth,arena,now,heartbeatMs:8000,reconnectMs:60000,stateFile});
    const [a,b]=users;

    assert((await duel.status(a)).players.some(player=>player.id===b.id));
    await duel.invite(a,b.id);
    await duel.respond(b,true);
    await duel.select(a,[2,5,9]);
    const started=await duel.select(b,[2,5,9]);
    assert.equal(started.match.phase,'battle');

    time+=9000;
    let aView=await duel.status(a);
    assert.equal(aView.match.phase,'battle');
    assert.equal(aView.match.opponentConnection,'reconnecting');
    assert.equal(aView.match.opponentReconnectUntil,time-9000+60000);

    const staleB=JSON.parse(fs.readFileSync(files[1]));
    staleB.savedAt=time-40000;fs.writeFileSync(files[1],JSON.stringify(staleB));
    aView=await duel.status(a);
    assert.equal(aView.match.phase,'battle',
      'A stale lobby save heartbeat must not immediately terminate an active challenge');

    await assert.rejects(
      duel.turn(a,{action:'skill',skillIndex:0,expectedTurn:1,expectedEvents:0}),
      error=>error.status===409&&/reconnecting/i.test(error.message)
    );

    await duel.status(b);
    aView=await duel.status(a);
    assert.equal(aView.match.opponentConnection,'online');
    await duel.turn(a,{action:'skill',skillIndex:0,expectedTurn:1,expectedEvents:0});
    const beforeRestart=(await duel.status(b)).match;
    assert.equal(beforeRestart.phase,'battle');
    assert.equal(beforeRestart.eventSeq,1);
    assert.equal(beforeRestart.myTurn,true);

    duel=createChallenge({profilesDir,auth,arena,now,heartbeatMs:8000,reconnectMs:60000,stateFile});
    const afterRestart=(await duel.status(b)).match;
    assert.equal(afterRestart.phase,'battle','Challenge battle must survive a short server restart');
    assert.equal(afterRestart.eventSeq,1);
    assert.equal(afterRestart.myTurn,true);

    await duel.status(a);
    await duel.status(b);
    time+=9000;
    aView=await duel.status(a);
    assert.equal(aView.match.opponentConnection,'reconnecting');
    time+=52000;
    aView=await duel.status(a);
    assert.equal(aView.match,null,'Challenge must end after the opponent misses the full reconnect grace');
    assert.match(aView.notice,/reconnect/i);
    assert.equal((await duel.status(b)).match,null);

    // Lobby/save heartbeat remains stricter than in-match reconnect grace.
    for(const file of files){
      const profile=JSON.parse(fs.readFileSync(file));profile.savedAt=time;
      fs.writeFileSync(file,JSON.stringify(profile));
    }

    await duel.invite(a,b.id);
    sessions.delete(b.id);
    const loggedOut=await duel.status(a);
    assert.equal(loggedOut.match,null,'Last-session logout must terminate the shared challenge immediately');
    assert.match(loggedOut.notice,/signed out|unavailable/i);
    sessions.add(b.id);

    for(const file of files){
      const profile=JSON.parse(fs.readFileSync(file));profile.savedAt=time;
      fs.writeFileSync(file,JSON.stringify(profile));
    }
    await duel.invite(a,b.id);
    await duel.respond(b,true);
    await duel.select(a,[2,5,9]);
    const profileA=JSON.parse(fs.readFileSync(files[0]));
    const removed=profileA.dragons.find(dragon=>dragon.id===2);
    profileA.dragons=profileA.dragons.filter(dragon=>dragon.id!==2);
    fs.writeFileSync(files[0],JSON.stringify(profileA));
    await assert.rejects(duel.select(b,[2,5,9]),/Selected dragons have changed/);
    const rolledBack=(await duel.status(a)).match;
    assert.equal(rolledBack.phase,'select');
    assert.equal(rolledBack.ready,false,'Invalidated ready side must be reset');
    assert.deepEqual(rolledBack.selection,[]);
    profileA.dragons.push(removed);profileA.savedAt=time;
    fs.writeFileSync(files[0],JSON.stringify(profileA));
    await duel.leave(a);

    const profileB=JSON.parse(fs.readFileSync(files[1]));profileB.savedAt=time;
    fs.writeFileSync(files[1],JSON.stringify(profileB));
    await duel.invite(a,b.id);
    time+=31000;
    const expired=await duel.status(a);
    assert.equal(expired.match,null);
    assert.match(expired.notice,/expired/i);

    const persisted=JSON.parse(fs.readFileSync(stateFile,'utf8'));
    assert(Array.isArray(persisted.matches)&&Array.isArray(persisted.notices));

    console.log('PASS challenge two-sided presence, reconnect grace, restart persistence and rollback');
  }finally{fs.rmSync(profilesDir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
