/**
 * Egg incubation durations in seconds.
 *
 * Pure-element values are explicit because later elements intentionally take
 * longer. Hybrid durations use a tier base plus element-unlock pressure.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.hatching=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    fallbackSeconds:30,
    pureElementSeconds:Object.freeze({fire:30,water:45,earth:60,wind:75,ice:90,thunder:120,
      nature:150,dark:210,light:270,metal:360,war:480,pure:600,legend:750,primal:900,time:1200}),
    tierSeconds:Object.freeze({2:240,3:900,4:2700,double:5400}),
    elementLevelSeconds:12,maxElementBonusSeconds:3600
  });
});
