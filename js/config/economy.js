/**
 * Economy configuration.
 *
 * Contains only editable prices/rewards/exchange values. Any calculation that
 * consumes these values must live in a rule module so balancing never requires
 * editing UI or mutation code.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.economy=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    /** Resources for a new account. */
    starting:Object.freeze({gold:10000,food:2500,gems:20}),
    /** Developer/test top-up targets. These are not granted during normal progression. */
    testResources:Object.freeze({gold:10000000,food:100000,gems:10000}),
    /** Island unlocks cost this many Gems multiplied by island index. */
    island:Object.freeze({gemPerIsland:100}),
    /** Land expansion pricing. goldPerGem is the instant-purchase conversion. */
    land:Object.freeze({homeFirstRegionGold:1200,nextIslandMultiplier:1.2,expansionMultiplier:1.2,
      islandTierLinear:.9,islandTierQuadratic:.15,goldPerGem:5000}),
    /** Shop price-growth and resource exchange packs. */
    shop:Object.freeze({
      habitatUnlockLinear:.08,habitatUnlockQuadratic:.006,
      habitatRepeatLinear:.32,habitatRepeatQuadratic:.10,
      eggBaseMultiplier:2.2,eggUnlockLinear:.18,eggUnlockQuadratic:.012,
      eggRarityMultiplier:Object.freeze({common:1,rare:2,epic:4,legendary:8,mythic:16,transcendent:20}),
      /** Standard Food bundles purchased with Gold; cost = amount * progression.foodGoldPrice. */
      standardFoodAmounts:Object.freeze([100,500,2000]),
      resourcePacks:Object.freeze({
        goldForGems:Object.freeze([{cost:5,amount:20000},{cost:20,amount:100000},{cost:50,amount:300000}]),
        gemsForGold:Object.freeze([{cost:75000,amount:3},{cost:300000,amount:10},{cost:900000,amount:25}]),
        foodForGems:Object.freeze([{cost:5,amount:1500},{cost:15,amount:6000},{cost:40,amount:20000}])
      })
    })
  });
});
