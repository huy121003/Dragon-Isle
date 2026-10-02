/**
 * Real-time world simulation and dragon-care parameters.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.world=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    /** Maximum offline progress processed after returning to the game. */
    offlineCapMs:12*60*60*1000,
    /** World simulation is chunked to this size so upgrades can finish mid-gap. */
    simulationStepMs:60*1000,
    hunger:Object.freeze({unhappyAt:50,severeAt:90,max:100,normalHappinessLossPerMinute:.35,
      severeHappinessLossPerMinute:1}),
    feeding:Object.freeze({feedsPerLevel:4,hungerReduction:8,happinessGain:5}),
    initialDragon:Object.freeze({hunger:10,happiness:80}),
    goldIncome:Object.freeze({happinessBase:.5,habitatLevelBonus:.1,starvationAt:100,starvationMultiplier:.5}),
    /** Passive Gem production per housed dragon per real-time hour. */
    gemPerDragonPerHour:.5,
    gemSecondsPerHour:3600,
    visual:Object.freeze({daySeconds:480,weatherParticles:10})
  });
});
