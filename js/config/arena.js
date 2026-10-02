/**
 * Arena configuration shared by client expectations and authoritative server.
 *
 * Time values use milliseconds. Reward and AI values are gameplay balance;
 * edit them here instead of copying numbers into UI/server services.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.arena=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    /** Exact number of dragons required in attack and defense teams. */
    teamSize:3,
    /** Owned dragon level range accepted by Arena and live Challenge. */
    minBattleLevel:10,
    maxBattleLevel:100,
    /** Cooldown applied after an Arena loss/forfeit. Winners can battle again immediately. */
    cooldownMs:15*60*1000,
    /** Safety cap that ends battles which cannot naturally reach a knockout. */
    maxTurns:80,
    /** Number of recent authoritative events exposed to clients. */
    eventHistory:40,
    rewards:Object.freeze({
      /** Base + per-opponent-level reward scaling; opponent level is capped by progression content cap. */
      goldBase:2500,
      goldPerOpponentLevel:250,
      foodBase:250,
      foodPerOpponentLevel:40,
      /** Gem reward adds gemPerLevelStep for every gemLevelStep opponent levels. */
      gemBase:1,
      gemLevelStep:20,
      gemPerLevelStep:1
    }),
    ai:Object.freeze({
      /** Relative utility weights used only by the server defensive skill scorer. */
      healWeight:1.1,
      regenWeight:.8,
      vitalityWeight:.7,
      freezeWeight:.55,
      poisonWeight:.5,
      damageBuffHitWeight:.4,
      damageBuffIncomingWeight:.5,
      defenseWeight:.8,
      debuffWeight:.5,
      /** Fallback effect strength when a debuff definition has no explicit value. */
      defaultDebuffValue:.2
    })
  });
});
