/**
 * Dragon lifecycle/economy parameters not tied to a specific catalog species.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.dragons=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    /** Visual/lifecycle stage thresholds. */
    stages:Object.freeze({adultAt:10,elderAt:30}),
    /** Resale values grow by this fraction for every level above 1. */
    resale:Object.freeze({minimumGold:100,levelBonus:.05}),
    /** Feed progress is clamped to [0, feedsPerLevel-1]. */
    initialLevelCapWithoutAcademy:30
  });
});
