/**
 * Live Challenge presence/state-machine parameters.
 *
 * All timing values are milliseconds. Lobby presence intentionally expires
 * faster than an active duel; reconnectGraceMs protects an in-progress match
 * from a brief network interruption.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.challenge=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    /** Exact private team size selected by each duel participant. */
    teamSize:3,
    /** A save newer than this keeps the player visible in the online lobby. */
    lobbySaveFreshMs:35_000,
    /** Invitation lifetime before an unanswered challenge expires. */
    inviteMs:30_000,
    /** Maximum match inactivity before server cleanup releases both players. */
    idleMs:5*60*1000,
    /** Age after which an opponent is shown as reconnecting rather than online. */
    heartbeatMs:8_000,
    /** Full reconnect window before the live duel is abandoned. */
    reconnectGraceMs:60_000,
    /** Minimum interval between persisted heartbeat writes to avoid disk churn. */
    persistHeartbeatMs:5_000,
    /** Stable state names persisted to the Challenge store and exposed through API DTOs. */
    phases:Object.freeze({INVITED:"invited",SELECT:"select",BATTLE:"battle"})
  });
});
