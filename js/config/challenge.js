/**
 * Live Challenge presence/state-machine timings in milliseconds.
 *
 * Lobby presence intentionally expires faster than an active duel. During a
 * duel, reconnectGraceMs gives the disconnected player time to return.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.challenge=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    teamSize:3,lobbySaveFreshMs:35000,inviteMs:30000,idleMs:5*60*1000,
    heartbeatMs:8000,reconnectGraceMs:60000,persistHeartbeatMs:5000,
    phases:Object.freeze({INVITED:"invited",SELECT:"select",BATTLE:"battle"})
  });
});
