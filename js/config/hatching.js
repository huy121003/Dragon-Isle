/**
 * Egg incubation durations in seconds.
 *
 * Pure-element values are explicit because later elements intentionally take
 * longer. Hybrid durations use a tier base plus a capped percentage based on
 * the average player-level gate of their elements.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.hatching=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    fallbackSeconds:30,
    /** Fixed incubation time by single element, in seconds; later unlocks take hours. */
    pureElementSeconds:Object.freeze({fire:30,water:60,earth:120,wind:300,ice:600,thunder:1200,
      nature:1800,dark:2700,light:3600,metal:5400,war:7200,pure:10800,legend:14400,primal:18000,time:21600}),
    /** Base incubation time by hybrid tier, in seconds. */
    tierSeconds:Object.freeze({2:10800,3:43200,4:129600,double:172800}),
    /** Hybrid pressure adds 0.15% per average element unlock level, capped at 15%. */
    elementLevelPercent:.0015,maxElementBonusPercent:.15
  });
});
