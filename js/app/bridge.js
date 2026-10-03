"use strict";

/**
 * Install the compatibility bridge consumed by React while legacy Canvas/game
 * state remains authoritative. This module does not boot or mutate the game.
 */
function installGameBridge(){
  window.DragonGame={
    get state(){return state;},get ui(){return ui;},get account(){return currentAccount;},
    data:DATA,speciesIds:BOOK_SPECIES_IDS,
    skillMatchup(element,targetSpecies){
      const target=DATA.species[targetSpecies];
      return target?window.DragonCombat.matchup(element,target.elements,DRAGON_DB.typeChart):1;
    },
    xpNeeded:playerXPNeeded,
    save:saveGame,
    action(dataset){handleAction({dataset:{...dataset}});window.DragonRuntime?.emit();},
    importSave(file){return importSaveJson(file);},
    paint(canvas,speciesId,level,options={}){
      const context=canvas.getContext('2d');
      context.clearRect(0,0,canvas.width,canvas.height);
      const facing=options.facing||1;
      const placement=options.battleFit?
        battleDragonPortraitPlacement(canvas.width,canvas.height,level,facing):
        dragonPortraitPlacement(canvas.width,canvas.height,level);
      drawDragon(context,{dragon:{id:0,species:speciesId,level},...placement,
        time:options.time??900,facing,locomotion:options.locomotion!==false,
      });
    },
    advanceDay(minutes){ui.dayOffset+=Number(minutes||0)*60000;return daylightAt(Date.now());}
  };
}
