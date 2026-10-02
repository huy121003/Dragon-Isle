/**
 * Arena team eligibility helpers.
 *
 * These helpers are deterministic except for the injectable clock. Keeping
 * them separate prevents team validation rules from drifting between list/team/fight flows.
 */
const arenaConfig=require('../../js/config/arena.js');

/** Create reusable Arena eligibility helpers around an injectable clock. */
function createEligibility({now=()=>Date.now()}={}){
  /** True when a dragon is currently locked in an active breeding task. */
  function breeding(profile,dragonId){
    return profile?.buildings?.some(building=>['cave','premiumCave'].includes(building.type)&&
      building.breeding&&building.breeding.readyAt>now()&&
      (building.breeding.fatherId===dragonId||building.breeding.motherId===dragonId));
  }

  /** Arena eligibility for one owned dragon. */
  function eligible(profile,dragon){
    return !!dragon&&dragon.level>=arenaConfig.minBattleLevel&&
      dragon.level<=arenaConfig.maxBattleLevel&&!breeding(profile,dragon.id);
  }

  /** Validate an exact Arena team against ownership, uniqueness and eligibility. */
  function ownedTeam(profile,ids){
    return Array.isArray(ids)&&ids.length===arenaConfig.teamSize&&
      ids.every(Number.isInteger)&&new Set(ids).size===ids.length&&
      ids.every(id=>profile?.dragons?.some(dragon=>dragon.id===id&&eligible(profile,dragon)));
  }

  /** Minimal UI-safe dragon summary used by Arena and Challenge rosters. */
  function summary(profile,ids){
    return ids.map(id=>profile.dragons.find(dragon=>dragon.id===id)).filter(Boolean).map(dragon=>({
      id:dragon.id,species:dragon.species,level:dragon.level,stars:dragon.stars||0,nickname:dragon.nickname,
      canBattle:eligible(profile,dragon),
      battleReason:dragon.level<arenaConfig.minBattleLevel?
        'Requires level '+arenaConfig.minBattleLevel:breeding(profile,dragon.id)?'Breeding':null
    }));
  }

  return {breeding,eligible,ownedTeam,summary};
}
module.exports={createEligibility};
