/**
 * Challenge presence policy.
 *
 * Keeps session/lobby freshness and in-match heartbeat math outside the
 * Challenge state machine so reconnect behavior can be tested independently.
 */
const config=require('../../js/config/challenge.js');

/**
 * Create Challenge presence/reconnect policy around injected auth/profile/clock dependencies.
 * Keeps online visibility and reconnect grace math out of the Challenge state machine.
 */
function createPresence({auth,users,now,heartbeatMs=config.heartbeatMs,reconnectMs=config.reconnectGraceMs}){
  /** True when an account is eligible to stay inside an existing challenge. */
  function sessionAvailable(id,userSnapshot){
    const user=userSnapshot||users().find(item=>item.id===id);
    return !!(user&&!user.disabled&&user.challengeEnabled&&auth.hasActiveSession(id));
  }

  /**
   * Refresh one side's challenge heartbeat.
   * Returns true only when the heartbeat should be persisted to disk.
   */
  function touch(match,id){
    const index=match.players.indexOf(id);
    if(index<0)return false;
    match.seen[index]=now();
    if(now()-(Number(match.persistedAt)||0)>=config.persistHeartbeatMs){
      match.persistedAt=now();return true;
    }
    return false;
  }

  /** Public reconnect state for one side of a match. */
  function state(match,index){
    const last=Number(match.seen[index])||0,age=Math.max(0,now()-last);
    return {state:age<=heartbeatMs?'online':'reconnecting',reconnectUntil:last+reconnectMs,age};
  }

  /** True when a challenge heartbeat exceeded the full reconnect grace period. */
  function expired(lastSeen){
    return now()-(Number(lastSeen)||0)>reconnectMs;
  }

  return {sessionAvailable,touch,state,expired};
}

module.exports={createPresence};
