/* Live, invitation-only duels. No Arena building, currency reward or cooldown. */
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {readJson}=require('./store.cjs');
const challengeConfig=require('../js/config/challenge.js');
const {createPresence}=require('./challenge/presence.cjs');
const {createChallengeStore}=require('./challenge/store.cjs');
function error(message,status=409){return Object.assign(new Error(message),{status});}
/**
 * Create the live Challenge state machine.
 * @param {object} options
 * @param {object} options.auth - Session/account service.
 * @param {string} options.profilesDir - Profile persistence directory.
 * @param {object} options.arena - Shared fighter/battle engine facade.
 * @param {Function} options.now - Injectable clock for deterministic tests.
 * @param {number} options.heartbeatMs - Delay before opponent is shown reconnecting.
 * @param {number} options.reconnectMs - Grace period before a disconnected duel is released.
 */
function createChallenge({auth,profilesDir,arena,now=()=>Date.now(),
  heartbeatMs=challengeConfig.heartbeatMs,reconnectMs=challengeConfig.reconnectGraceMs,
  stateFile=path.join(profilesDir,'_challenge-state.json')}){
  let pending=Promise.resolve();
  const profile=id=>readJson(path.join(profilesDir,id+'.json'),null);
  const users=()=>auth.listUsers();
  const store=createChallengeStore({stateFile,users,now});
  const {matches,byUser,notices,persist,release}=store;
  const presencePolicy=createPresence({auth,users,profile,now,heartbeatMs,reconnectMs});
  /** Serialize state transitions so two requests cannot mutate one match concurrently. */
  function locked(fn){
    const next=pending.catch(()=>{}).then(async()=>{await store.ensureLoaded();return fn();});
    pending=next;return next;
  }
  /** Release expired, inactive, signed-out or reconnect-timeout matches. */
  async function sweep(){
    let changed=false;
    for(const match of [...matches.values()]){
      if(match.phase===challengeConfig.phases.INVITED&&match.until<now()){release(match,'Challenge invitation expired.');changed=true;}
      else if(match.updatedAt+challengeConfig.idleMs<now()){release(match,'Challenge ended due to inactivity.');changed=true;}
      else if(match.players.some(id=>!presencePolicy.sessionAvailable(id))){
        release(match,'Challenge ended because a player signed out or became unavailable.');changed=true;
      }else if(match.seen.some(last=>presencePolicy.expired(last))){
        release(match,'Challenge ended because a player could not reconnect in time.');changed=true;
      }
    }
    if(changed)await persist();
  }
  /** True when a player currently owns enough Arena-eligible dragons. */
  async function qualified(id){
    const p=await profile(id);
    return p?.dragons?.filter(d=>arena.eligible(p,d)).length>=challengeConfig.teamSize;
  }
  /** Build the perspective-correct Challenge DTO for one participant. */
  function view(match,id){
    const index=match.players.indexOf(id),opponentId=match.players[1-index];
    const opponent=users().find(u=>u.id===opponentId);
    const opponentPresence=presencePolicy.state(match,1-index);
    const result={id:match.id,phase:match.phase,opponent:opponent?.username||'Player',
      outgoing:index===0,until:match.until,ready:!!match.ready[index],
      opponentReady:!!match.ready[1-index],selection:match.selection[index]||[],
      updatedAt:match.updatedAt,opponentConnection:opponentPresence.state,
      opponentReconnectUntil:opponentPresence.reconnectUntil};
    if(match.phase===challengeConfig.phases.SELECT)result.roster=match.rosters[index];
    if(match.phase===challengeConfig.phases.BATTLE){
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
  /** Refresh heartbeat and return lobby/match status for one player. */
  async function status(user){
    return locked(async()=>{
      await sweep();
      const id=byUser.get(user.id),match=id&&matches.get(id);
      const heartbeatDirty=match?presencePolicy.touch(match,user.id):false;
      const notice=notices.get(user.id)||null;if(notice)notices.delete(user.id);
      if(heartbeatDirty||notice)await persist();
      const online=await presencePolicy.lobbyActive(user.id),eligible=await qualified(user.id),players=[];
      if(online&&eligible&&!match){
        for(const other of users()){
          if(other.id!==user.id&&await presencePolicy.lobbyActive(other.id)&&!byUser.has(other.id)&&await qualified(other.id))
            players.push({id:other.id,username:other.username});
        }
      }
      return {online,enabled:user.challengeEnabled!==false,eligible,
        players,match:match?view(match,user.id):null,notice};
    });
  }
  /** Create a two-player invitation when both players are online and eligible. */
  async function invite(user,otherId){
    return locked(async()=>{
      await sweep();
      const other=users().find(u=>u.id===otherId);
      if(!other||other.id===user.id||!await presencePolicy.lobbyActive(user.id)||!await presencePolicy.lobbyActive(other.id)||
        byUser.has(user.id)||byUser.has(other.id)||!await qualified(user.id)||!await qualified(other.id))
        throw error('This player is unavailable or not eligible.');
      const started=now();
      const match={id:randomUUID(),players:[user.id,other.id],phase:challengeConfig.phases.INVITED,
        until:started+challengeConfig.inviteMs,updatedAt:started,seen:[started,started],persistedAt:started,selection:[null,null],
        ready:[false,false],rosters:[null,null],battle:null};
      matches.set(match.id,match);byUser.set(user.id,match.id);byUser.set(other.id,match.id);
      await persist();return {match:view(match,user.id)};
    });
  }
  /** Accept/decline an invitation; acceptance moves the match to team selection. */
  async function respond(user,accept){
    return locked(async()=>{
      await sweep();const match=matches.get(byUser.get(user.id));
      if(!match||match.phase!==challengeConfig.phases.INVITED||match.players[1]!==user.id)throw error('Invitation is no longer available.');
      const heartbeatDirty=presencePolicy.touch(match,user.id);
      if(!accept){release(match,'Challenge declined by '+user.username+'.');await persist();return {ok:true};}
      const side=match.players.indexOf(user.id),opponent=presencePolicy.state(match,1-side);
      if(opponent.state!=='online'){
        if(heartbeatDirty)await persist();
        throw error('Opponent is reconnecting. Please wait before accepting.');
      }
      const profiles=await Promise.all(match.players.map(profile));
      if(profiles.some(p=>p?.dragons?.filter(d=>arena.eligible(p,d)).length<challengeConfig.teamSize)){
        release(match,'A player no longer has '+challengeConfig.teamSize+' eligible dragons.');await persist();
        throw error('Dragon eligibility changed.');
      }
      match.rosters=profiles.map(p=>arena.summary(p,p.dragons.map(d=>d.id)));
      match.phase=challengeConfig.phases.SELECT;match.updatedAt=now();
      await persist();return {match:view(match,user.id)};
    });
  }
  /** Lock one player's team; when both are ready create the live battle state. */
  async function select(user,ids){
    return locked(async()=>{
      await sweep();const match=matches.get(byUser.get(user.id));
      if(!match||match.phase!==challengeConfig.phases.SELECT)throw error('Team selection has ended.');
      const heartbeatDirty=presencePolicy.touch(match,user.id);
      const side=match.players.indexOf(user.id),opponent=presencePolicy.state(match,1-side);
      if(opponent.state!=='online'){
        if(heartbeatDirty)await persist();
        throw error('Opponent is reconnecting. Team selection is paused.');
      }
      if(!Array.isArray(ids)||ids.length!==challengeConfig.teamSize||ids.some(id=>!Number.isInteger(id))||
        new Set(ids).size!==challengeConfig.teamSize)throw error('Choose exactly '+challengeConfig.teamSize+' different dragons.',400);
      const p=await profile(user.id);
      if(!ids.every(id=>p?.dragons?.some(d=>d.id===id&&arena.eligible(p,d))))
        throw error('Some selected dragons are no longer eligible.',400);
      match.selection[side]=ids;match.ready[side]=true;match.updatedAt=now();
      if(match.ready.every(Boolean)){
        const profiles=await Promise.all(match.players.map(profile));
        const valid=profiles.map((profile,i)=>match.selection[i].every(id=>
          profile?.dragons?.some(d=>d.id===id&&arena.eligible(profile,d))));
        if(valid.some(ok=>!ok)){
          valid.forEach((ok,i)=>{if(!ok){match.selection[i]=null;match.ready[i]=false;}});
          match.rosters=profiles.map(p=>arena.summary(p,p.dragons.map(d=>d.id)));
          match.updatedAt=now();await persist();
          throw error('Selected dragons have changed. Choose again.');
        }
        const fighters=profiles.map((profile,i)=>match.selection[i].map(id=>
          arena.makeFighter(profile.dragons.find(d=>d.id===id))));
        match.battle={opponent:users().find(u=>u.id===match.players[1])?.username,
          turn:1,nextSide:'attack',attack:fighters[0],defense:fighters[1],
          activeAttack:0,activeDefense:0,events:[],reward:{gold:0,food:0,gems:0}};
        match.phase=challengeConfig.phases.BATTLE;
      }
      await persist();return {match:view(match,user.id)};
    });
  }
  async function turn(user,body){
    return locked(async()=>{
      await sweep();const match=matches.get(byUser.get(user.id));
      if(!match||match.phase!==challengeConfig.phases.BATTLE)throw error('The duel has ended.');
      const heartbeatDirty=presencePolicy.touch(match,user.id);
      const sideIndex=match.players.indexOf(user.id),opponent=presencePolicy.state(match,1-sideIndex);
      if(opponent.state!=='online'){
        if(heartbeatDirty)await persist();
        throw error('Opponent is reconnecting. The duel is paused.');
      }
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
        await persist();return {finished:true,won:winner===user.id};
      }
      await persist();return {match:view(match,user.id)};
    });
  }
  /** Leave and release a Challenge for both participants. */
  async function leave(user){return locked(async()=>{
    const match=matches.get(byUser.get(user.id));
    if(match){release(match,user.username+' left the challenge.');await persist();}
    return {ok:true};
  });}
  return {status,invite,respond,select,turn,leave};
}
module.exports={createChallenge};
