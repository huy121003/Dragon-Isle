/* Live, invitation-only duels. No Arena building, currency reward or cooldown. */
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {readJson}=require('./store.cjs');
const ONLINE_SAVE_MS=35000,INVITE_MS=30000,IDLE_MS=5*60*1000;
const MATCH_HEARTBEAT_MS=8000,MATCH_RECONNECT_MS=60000;
function error(message,status=409){return Object.assign(new Error(message),{status});}
function createChallenge({auth,profilesDir,arena,now=()=>Date.now(),heartbeatMs=MATCH_HEARTBEAT_MS,reconnectMs=MATCH_RECONNECT_MS}){
  const matches=new Map(),byUser=new Map(),notices=new Map();
  let pending=Promise.resolve();
  function locked(fn){const next=pending.catch(()=>{}).then(fn);pending=next;return next;}
  const profile=id=>readJson(path.join(profilesDir,id+'.json'),null);
  const users=()=>auth.listUsers();
  async function active(id){
    if(!users().some(u=>u.id===id&&!u.disabled&&u.challengeEnabled)||
      !auth.hasActiveSession(id))return false;
    const saved=Number((await profile(id))?.savedAt)||0;
    return saved<=now()&&saved>now()-ONLINE_SAVE_MS;
  }
  function release(match,message){
    matches.delete(match.id);
    for(const id of match.players){byUser.delete(id);notices.set(id,message);}
  }
  function sessionAvailable(id){
    const user=users().find(u=>u.id===id);
    return !!(user&&!user.disabled&&user.challengeEnabled&&auth.hasActiveSession(id));
  }
  function touch(match,id){
    const index=match.players.indexOf(id);
    if(index>=0)match.seen[index]=now();
  }
  function presence(match,index){
    const last=Number(match.seen[index])||0,age=Math.max(0,now()-last);
    return {state:age<=heartbeatMs?'online':'reconnecting',
      reconnectUntil:last+reconnectMs,age};
  }
  async function sweep(){
    for(const match of [...matches.values()]){
      if(match.phase==='invited'&&match.until<now())release(match,'Challenge invitation expired.');
      else if(match.updatedAt+IDLE_MS<now())release(match,'Challenge ended due to inactivity.');
      else if(match.players.some(id=>!sessionAvailable(id)))
        release(match,'Challenge ended because a player signed out or became unavailable.');
      else if(match.seen.some(last=>now()-(Number(last)||0)>reconnectMs))
        release(match,'Challenge ended because a player could not reconnect in time.');
    }
  }
  async function qualified(id){
    const p=await profile(id);
    return p?.dragons?.filter(d=>arena.eligible(p,d)).length>=3;
  }
  function view(match,id){
    const index=match.players.indexOf(id),opponentId=match.players[1-index];
    const opponent=users().find(u=>u.id===opponentId);
    const opponentPresence=presence(match,1-index);
    const result={id:match.id,phase:match.phase,opponent:opponent?.username||'Player',
      outgoing:index===0,until:match.until,ready:!!match.ready[index],
      opponentReady:!!match.ready[1-index],selection:match.selection[index]||[],
      updatedAt:match.updatedAt,opponentConnection:opponentPresence.state,
      opponentReconnectUntil:opponentPresence.reconnectUntil};
    if(match.phase==='select')result.roster=match.rosters[index];
    if(match.phase==='battle'){
      const reverse=index===1,raw=arena.publicBattle(match.battle);
      const flip=side=>side==='attack'?'defense':side==='defense'?'attack':side;
      const swapEvent=e=>reverse?{...e,side:flip(e.side),targetSide:flip(e.targetSide),
        state:e.state?{...e.state,attack:e.state.defense,defense:e.state.attack,
          activeAttack:e.state.activeDefense,activeDefense:e.state.activeAttack}:undefined}:e;
      result.battle=reverse?{...raw,attack:raw.defense,defense:raw.attack,
        activeAttack:raw.activeDefense,activeDefense:raw.activeAttack,
        events:raw.events.map(swapEvent)}:raw;
      result.battle.opponent=result.opponent;
      result.eventSeq=match.battle.events.length;
      result.myTurn=match.battle.nextSide===(reverse?'defense':'attack');
    }
    return result;
  }
  async function status(user){
    return locked(async()=>{
      await sweep();
      const id=byUser.get(user.id),match=id&&matches.get(id);
      if(match)touch(match,user.id);
      const notice=notices.get(user.id)||null;notices.delete(user.id);
      const online=await active(user.id),eligible=await qualified(user.id),players=[];
      if(online&&eligible&&!match){
        for(const other of users()){
          if(other.id!==user.id&&await active(other.id)&&!byUser.has(other.id)&&await qualified(other.id))
            players.push({id:other.id,username:other.username});
        }
      }
      return {online,enabled:user.challengeEnabled!==false,eligible,
        players,match:match?view(match,user.id):null,notice};
    });
  }
  async function invite(user,otherId){
    return locked(async()=>{
      await sweep();
      const other=users().find(u=>u.id===otherId);
      if(!other||other.id===user.id||!await active(user.id)||!await active(other.id)||
        byUser.has(user.id)||byUser.has(other.id)||!await qualified(user.id)||!await qualified(other.id))
        throw error('This player is unavailable or not eligible.');
      const started=now();
      const match={id:randomUUID(),players:[user.id,other.id],phase:'invited',
        until:started+INVITE_MS,updatedAt:started,seen:[started,started],selection:[null,null],
        ready:[false,false],rosters:[null,null],battle:null};
      matches.set(match.id,match);byUser.set(user.id,match.id);byUser.set(other.id,match.id);
      return {match:view(match,user.id)};
    });
  }
  async function respond(user,accept){
    return locked(async()=>{
      await sweep();const match=matches.get(byUser.get(user.id));
      if(!match||match.phase!=='invited'||match.players[1]!==user.id)throw error('Invitation is no longer available.');
      touch(match,user.id);
      if(!accept){release(match,'Challenge declined by '+user.username+'.');return {ok:true};}
      const profiles=await Promise.all(match.players.map(profile));
      if(profiles.some((p,i)=>p?.dragons?.filter(d=>arena.eligible(p,d)).length<3)){
        release(match,'A player no longer has three eligible dragons.');throw error('Dragon eligibility changed.');
      }
      match.rosters=profiles.map(p=>arena.summary(p,p.dragons.map(d=>d.id)));
      match.phase='select';match.updatedAt=now();
      return {match:view(match,user.id)};
    });
  }
  async function select(user,ids){
    return locked(async()=>{
      await sweep();const match=matches.get(byUser.get(user.id));
      if(!match||match.phase!=='select')throw error('Team selection has ended.');
      touch(match,user.id);
      const side=match.players.indexOf(user.id);
      if(!Array.isArray(ids)||ids.length!==3||ids.some(id=>!Number.isInteger(id))||
        new Set(ids).size!==3)throw error('Choose exactly three different dragons.',400);
      const p=await profile(user.id);
      if(!ids.every(id=>p?.dragons?.some(d=>d.id===id&&arena.eligible(p,d))))
        throw error('Some selected dragons are no longer eligible.',400);
      match.selection[side]=ids;match.ready[side]=true;match.updatedAt=now();
      if(match.ready.every(Boolean)){
        const profiles=await Promise.all(match.players.map(profile));
        if(profiles.some((profile,i)=>!match.selection[i].every(id=>
          profile?.dragons?.some(d=>d.id===id&&arena.eligible(profile,d)))))
          throw error('Selected dragons have changed. Choose again.');
        const fighters=profiles.map((profile,i)=>match.selection[i].map(id=>
          arena.makeFighter(profile.dragons.find(d=>d.id===id))));
        match.battle={opponent:users().find(u=>u.id===match.players[1])?.username,
          turn:1,nextSide:'attack',attack:fighters[0],defense:fighters[1],
          activeAttack:0,activeDefense:0,events:[],reward:{gold:0,food:0,gems:0}};
        match.phase='battle';
      }
      return {match:view(match,user.id)};
    });
  }
  async function turn(user,body){
    return locked(async()=>{
      await sweep();const match=matches.get(byUser.get(user.id));
      if(!match||match.phase!=='battle')throw error('The duel has ended.');
      touch(match,user.id);
      const sideIndex=match.players.indexOf(user.id),opponent=presence(match,1-sideIndex);
      if(opponent.state!=='online')throw error('Opponent is reconnecting. The duel is paused.');
      const side=match.players[0]===user.id?'attack':'defense';
      if(!Number.isInteger(body?.expectedTurn)||body.expectedTurn!==match.battle.turn||
        body.expectedEvents!==match.battle.events.length)throw error('The turn changed. Refresh the duel.');
      const finished=arena.liveTurn(match.battle,side,body);
      match.updatedAt=now();
      if(finished){
        const winner=match.players[finished.winner==='attack'?0:1];
        release(match,winner===user.id?'You won the duel. No rewards or cooldown.':
          'You lost the duel. No rewards or cooldown.');
        const other=match.players.find(id=>id!==user.id);
        notices.set(other,winner===other?'You won the duel. No rewards or cooldown.':
          'You lost the duel. No rewards or cooldown.');
        return {finished:true,won:winner===user.id};
      }
      return {match:view(match,user.id)};
    });
  }
  async function leave(user){return locked(()=>{
    const match=matches.get(byUser.get(user.id));
    if(match)release(match,user.username+' left the challenge.');
    return {ok:true};
  });}
  return {status,invite,respond,select,turn,leave};
}
module.exports={createChallenge};
