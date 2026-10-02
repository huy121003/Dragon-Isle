/**
 * Instant-completion timer pricing.
 *
 * All gameplay timers use the same conversion so crop, upgrade, breeding and
 * hatching skips cannot drift into separate pricing rules.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.timers=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    /** Remaining seconds represented by one Gem; skip cost rounds up. */
    secondsPerGem:600,
    /** Maximum Gems charged for any single instant-completion action. */
    maxSkipGems:120
  });
});
