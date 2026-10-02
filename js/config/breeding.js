/**
 * Breeding probability and duration parameters.
 *
 * Percentages are decimal probabilities: .15 = 15%. Tier weights describe the
 * relative split between 1-element and 2-element offspring after rare tiers are
 * removed from the probability pool.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.breeding=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    three:Object.freeze({base:.15,perTenLevels:.015,cap:.27}),
    four:Object.freeze({base:.0225,perTenLevels:.003,cap:.045,growthStartLevel:30}),
    double:Object.freeze({base:.009,perTenLevels:.0015,cap:.018,minParentLevel:40}),
    premium:Object.freeze({rareFactor:1.40,timeFactor:.80}),
    timeByTier:Object.freeze({1:45,2:180,3:600,4:1800,double:3600}),
    elementLevelSeconds:8,maxElementBonusSeconds:1800,
    combinationSecondsPerExtraElement:45,mixedTierSeconds:30,
    /** Bias applied when a candidate inherits elements shared by both parents. */
    inheritanceBias:Object.freeze({sharedElement:.3,parentPrimary:.1}),
    tierWeights:Object.freeze({
      "1+1":Object.freeze([25,75]),"1+2":Object.freeze([20,80]),"1+3":Object.freeze([18,82]),
      "1+4":Object.freeze([16,84]),"2+2":Object.freeze([20,80]),"2+3":Object.freeze([18,82]),
      "2+4":Object.freeze([16,84]),"3+3":Object.freeze([16,84]),"3+4":Object.freeze([15,85]),
      "4+4":Object.freeze([14,86])
    })
  });
});
