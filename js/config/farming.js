/**
 * Farm crop balance configuration.
 *
 * duration is in seconds; cost/yield are Food/Gold gameplay values consumed by
 * farm logic. Crop display labels live here too because each row is a balance
 * product definition rather than visual art metadata.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.farming=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    crops:Object.freeze([
      Object.freeze({id:"wheat",name:"Wheat",icon:"🌾",unlockLevel:1,duration:30,yield:20,cost:40}),
      Object.freeze({id:"carrot",name:"Carrot",icon:"🥕",unlockLevel:2,duration:180,yield:140,cost:240}),
      Object.freeze({id:"blueberry",name:"Blueberry",icon:"🫐",unlockLevel:2,duration:420,yield:360,cost:520}),
      Object.freeze({id:"pumpkin",name:"Pumpkin",icon:"🎃",unlockLevel:3,duration:900,yield:1000,cost:1500}),
      Object.freeze({id:"corn",name:"Sweet Corn",icon:"🌽",unlockLevel:3,duration:1800,yield:2300,cost:3000}),
      Object.freeze({id:"dragonfruit",name:"Dragon Fruit",icon:"🌵",unlockLevel:4,duration:7200,yield:10000,cost:12000}),
      Object.freeze({id:"starfruit",name:"Starfruit",icon:"⭐",unlockLevel:4,duration:14400,yield:22000,cost:26000}),
      Object.freeze({id:"crystal-melon",name:"Crystal Melon",icon:"🍈",unlockLevel:4,duration:28800,yield:48000,cost:58000})
    ])
  });
});
