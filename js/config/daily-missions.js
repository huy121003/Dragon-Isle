/**
 * Daily mission targets and rewards.
 *
 * Resource goals count only the matching in-game collection action. Reset time
 * is interpreted in the player's local timezone.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.dailyMissions=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    resetHour:5,
    objectives:Object.freeze({
      hatch:Object.freeze({title:"Hatch a Dragon",icon:"🥚",goal:1,reward:Object.freeze({xp:40,gold:500,food:250})}),
      breed:Object.freeze({title:"Breed a Dragon",icon:"💞",goal:1,reward:Object.freeze({xp:35,gold:500,food:250})}),
      feed:Object.freeze({title:"Feed 3 Dragons",icon:"🍎",goal:3,reward:Object.freeze({xp:25,gold:350,food:250})}),
      plant:Object.freeze({title:"Plant Food",icon:"🌱",goal:1,reward:Object.freeze({xp:20,gold:250,food:300})}),
      arena:Object.freeze({title:"Fight in the Arena",icon:"⚔️",goal:1,reward:Object.freeze({xp:30,gold:400,food:250})}),
      collectGold:Object.freeze({title:"Collect Gold",icon:"🪙",goal:1000,reward:Object.freeze({xp:25,gold:250,food:200})}),
      collectFood:Object.freeze({title:"Collect Food",icon:"🍎",goal:300,reward:Object.freeze({xp:25,gold:250,food:200})})
    })
  });
});
