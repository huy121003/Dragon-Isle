/**
 * Pure timer pricing/progress rules.
 */
(function(root,factory){
  const config=typeof module!=="undefined"&&module.exports?
    require("../config/timers.js"):root.DragonConfig.timers;
  const api=factory(config);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root){root.DragonRules=root.DragonRules||{};root.DragonRules.timers=api;}
})(typeof window!=="undefined"?window:globalThis,function(config){
  "use strict";

  /** Gem price to skip a timer ending at endMs. */
  function skipCost(endMs,nowMs){
    return Math.min(config.maxSkipGems,Math.ceil(Math.max(0,endMs-nowMs)/(config.secondsPerGem*1000)));
  }

  /** Percentage [0,100] completed for a timer. */
  function progress(startMs,endMs,nowMs){
    const span=Math.max(1,endMs-startMs);
    return Math.max(0,Math.min(100,(nowMs-startMs)/span*100));
  }

  return {skipCost,progress};
});
