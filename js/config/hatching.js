/**
 * Egg incubation durations in seconds.
 *
 * Pure-element values are explicit because later elements intentionally take
 * longer. Hybrid durations sum their component-element times and scale by tier.
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
    /** Multiply the sum of the component-element times by offspring tier. */
    tierMultipliers:Object.freeze({2:2,3:4,4:8,double:12,apex:20}),
    /** Maximum incubation time at each hybrid tier. */
    maxTierSeconds:Object.freeze({2:21600,3:43200,4:86400,double:172800,apex:604800}),
    apexMinimumSeconds:86400
  });
});
