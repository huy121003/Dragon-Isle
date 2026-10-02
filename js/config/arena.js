/**
 * Arena configuration shared by client expectations and authoritative server.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.arena=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    teamSize:3,minBattleLevel:10,maxBattleLevel:100,cooldownMs:15*60*1000,maxTurns:80,eventHistory:40,
    rewards:Object.freeze({goldBase:2500,goldPerOpponentLevel:250,foodBase:250,
      foodPerOpponentLevel:40,gemBase:1,gemPer20Levels:1}),
    ai:Object.freeze({healWeight:1.1,regenWeight:.8,vitalityWeight:.7,freezeWeight:.55,
      poisonWeight:.5,damageBuffHitWeight:.4,damageBuffIncomingWeight:.5,
      defenseWeight:.8,debuffWeight:.5,defaultDebuffValue:.2})
  });
});
