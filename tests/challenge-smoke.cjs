const assert=require('node:assert/strict');
const economy=require('../data/economy.js');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {newProfile}=require('../server/profile.cjs');
const {createArena}=require('../server/arena.cjs');
const {createChallenge}=require('../server/challenge.cjs');

(async()=>{
  const profilesDir=fs.mkdtempSync(path.join(os.tmpdir(),'dragon-challenge-'));
  try{
    const users=['A','B','C'].map((username,i)=>({id:String(i+1),username,
      challengeEnabled:true,disabled:false}));
    const auth={listUsers:()=>users,hasActiveSession:()=>true};
    const makeProfile=()=>{
      const p=newProfile();p.savedAt=Date.now();p.dragons[0].level=30;
      p.dragons.push({...p.dragons[0],id:5,species:'water',nickname:'Water'});
      p.dragons.push({...p.dragons[0],id:9,species:'ice',nickname:'Ice'});
      return p;
    };
    const files=users.map(u=>path.join(profilesDir,u.id+'.json'));
    files.forEach(file=>fs.writeFileSync(file,JSON.stringify(makeProfile())));
    const arena=createArena({profilesDir,dataDir:path.resolve(__dirname,'../data'),auth});
    const duel=createChallenge({profilesDir,auth,arena});
    const [a,b,c]=users;
    assert((await duel.status(a)).players.some(u=>u.id===b.id));
    await duel.status(b);await duel.status(c);
    users[1].challengeEnabled=false;
    assert(!(await duel.status(a)).players.some(u=>u.id===b.id));
    users[1].challengeEnabled=true;
    const invitation=await duel.invite(a,b.id);
    assert.equal(invitation.match.phase,'invited');
    assert.equal((await duel.status(b)).match.outgoing,false);
    await assert.rejects(duel.invite(c,b.id),{status:409});
    await duel.respond(b,false);
    assert.match((await duel.status(a)).notice,/declined/);
    await duel.invite(a,b.id);
    await duel.respond(b,true);
    assert.equal((await duel.status(a)).match.phase,'select');
    const selected=await duel.select(a,[2,5,9]);
    assert.equal(selected.match.ready,true);
    const privateView=(await duel.status(b)).match;
    assert.equal(privateView.opponentReady,true);
    assert.deepEqual(privateView.selection,[]);
    assert.equal(privateView.roster.length,3);
    assert.equal(privateView.battle,undefined);
    await assert.rejects(duel.select(b,[2,2,9]),{status:400});
    const started=await duel.select(b,[2,5,9]);
    assert.equal(started.match.phase,'battle');
    assert.equal(started.match.myTurn,false);
    const first=(await duel.status(a)).match;
    assert.equal(first.myTurn,true);
    await assert.rejects(duel.turn(b,{action:'skill',skillIndex:0,expectedTurn:1,expectedEvents:0}),{status:409});
    const swappedA=(await duel.turn(a,{action:'switch',dragonId:5,
      expectedTurn:1,expectedEvents:0})).match;
    assert.equal(swappedA.myTurn,true,'Challenger keeps their action after swapping');
    assert.equal(swappedA.battle.turn,1);
    assert.equal(swappedA.battle.attack[swappedA.battle.activeAttack].id,5);
    assert.equal(swappedA.eventSeq,1,'The swap is recorded for concurrency checks');
    await duel.turn(a,{action:'skill',skillIndex:0,expectedTurn:1,expectedEvents:swappedA.eventSeq});
    const after=(await duel.status(b)).match;
    assert.equal(after.myTurn,true);
    assert.equal(after.battle.attack[0].id,2,'Each player sees their own team on the left');
    assert.equal(after.battle.events.at(-1).side,'defense','Events are mirrored for the invitee');
    await assert.rejects(duel.turn(a,{action:'skill',skillIndex:0,expectedTurn:1,expectedEvents:0}),{status:409});
    const swappedB=(await duel.turn(b,{action:'switch',dragonId:5,
      expectedTurn:1,expectedEvents:after.eventSeq})).match;
    assert.equal(swappedB.myTurn,true,'Invitee also keeps their action after swapping');
    assert.equal(swappedB.battle.turn,1);
    assert.equal(swappedB.battle.attack[swappedB.battle.activeAttack].id,5);
    const final=await duel.turn(b,{action:'forfeit',expectedTurn:1,expectedEvents:swappedB.eventSeq});
    assert.equal(final.finished,true);assert.equal(final.won,false);
    assert.match((await duel.status(a)).notice,/won/);
    assert.equal((await duel.status(b)).match,null);
    assert.equal(JSON.parse(fs.readFileSync(files[0])).gold,economy.starting.gold,'A duel has no prize');
    await duel.invite(a,b.id);
    await duel.leave(a);
    const stale=JSON.parse(fs.readFileSync(files[1]));stale.savedAt=Date.now()-40000;
    fs.writeFileSync(files[1],JSON.stringify(stale));
    assert(!(await duel.status(a)).players.some(u=>u.id===b.id),'A stale save is offline');
    await assert.rejects(duel.invite(a,b.id),{status:409});
    console.log('PASS live challenge presence, privacy, busy lock, turns and zero reward');
  }finally{fs.rmSync(profilesDir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
