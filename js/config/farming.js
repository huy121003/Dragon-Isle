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
      Object.freeze({id:"wheat",name:"Wheat",duration:30,yield:20,cost:40}),
      Object.freeze({id:"carrot",name:"Carrot",duration:180,yield:140,cost:240}),
      Object.freeze({id:"pumpkin",name:"Pumpkin",duration:900,yield:1000,cost:1500}),
      Object.freeze({id:"dragonfruit",name:"Dragon Fruit",duration:7200,yield:10000,cost:12000})
    ])
  });
});
