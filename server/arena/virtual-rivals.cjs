/**
 * Generates persistent Arena NPC squads from the dragon catalog.
 *
 * Player-owned dragons are used only as a matchmaking profile (power, rarity,
 * level and stars). NPC species always come from the full catalog, filtered by
 * player-level element gates; no owned dragon is cloned or stat-tuned.
 */
const RARITY_ORDER=['common','rare','epic','legendary','mythic','transcendent'];
const RIVAL_NAMES=['Rookie Warden','Scout Keeper','Balanced Guard','Veteran Champion','Arena Legend'];
const NICKNAMES=['Rookie','Scout','Keeper','Veteran','Legend'];
const STRENGTHS=['Weaker','Weaker','Balanced','Stronger','Stronger'];
const LEVEL_OFFSETS=[-3,-1,0,1,3];
const STAR_OFFSETS=[-1,0,0,1,1];

/** Make a stable pseudo-random generator for one Arena round. */
function seededRandom(seed){
  let value=0x811c9dc5;
  for(const character of String(seed)){value^=character.charCodeAt(0);value=Math.imul(value,0x01000193);}
  return ()=>{
    value+=0x6d2b79f5;
    let t=value;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

/** Return a deterministic random array member. */
function pick(list,rng){return list[Math.floor(rng()*list.length)];}

/** Select a rarity using the player's top-20 distribution and rival difficulty. */
function pickRarity(rarities,index,rng){
  const tiers=rarities.slice().sort((a,b)=>RARITY_ORDER.indexOf(a)-RARITY_ORDER.indexOf(b));
  const difficulty=(index-2)*0.22;
  const weights=tiers.map(tier=>{
    const tierPosition=RARITY_ORDER.indexOf(tier)+1;
    return Math.max(1,rarities.counts[tier]||0)*Math.pow(tierPosition,difficulty);
  });
  const total=weights.reduce((sum,weight)=>sum+weight,0);
  let cursor=rng()*total;
  for(let i=0;i<tiers.length;i++){cursor-=weights[i];if(cursor<=0)return tiers[i];}
  return tiers[tiers.length-1];
}

/** Sample an NPC level/star profile from the player's top-20 progression. */
function sampleProgression(profile,index,rng,arenaConfig){
  const offset=LEVEL_OFFSETS[index];
  const levelSource=pick(profile.levels,rng)||arenaConfig.minBattleLevel;
  const starSource=pick(profile.stars,rng)||0;
  return {
    level:Math.max(arenaConfig.minBattleLevel,Math.min(arenaConfig.maxBattleLevel,
      Math.round(levelSource+offset))),
    stars:Math.max(0,Math.min(5,Math.round(starSource+STAR_OFFSETS[index])))
  };
}

/** Build a player profile used only to shape the five Arena rivals. */
function analyzePlayer(profile,makeFighter,arenaConfig){
  const owned=(Array.isArray(profile?.dragons)?profile.dragons:[]).map(dragon=>{
    const fighter=makeFighter(dragon);
    return fighter?{dragon,power:fighter.power,rarity:fighter.rarity}:null;
  }).filter(Boolean).sort((a,b)=>b.power-a.power||a.dragon.id-b.dragon.id).slice(0,20);
  const counts={};
  for(const item of owned)counts[item.rarity]=(counts[item.rarity]||0)+1;
  const observedRarities=RARITY_ORDER.filter(rarity=>counts[rarity]>0);
  // Top-20 rarity sets the ceiling; lower tiers stay available for mixed squads.
  const highestObserved=RARITY_ORDER.indexOf(observedRarities[observedRarities.length-1]);
  const rarities=RARITY_ORDER.slice(0,highestObserved+1);
  const strongestThree=owned.slice(0,arenaConfig.teamSize);
  return {
    owned,
    rarities:Object.assign(rarities,{counts}),
    levels:owned.map(item=>item.dragon.level).filter(Number.isFinite),
    stars:owned.map(item=>item.dragon.stars||0),
    benchmarkPower:strongestThree.reduce((sum,item)=>sum+item.power,0)
  };
}

/**
 * A bot may use an element if the player-level gate opened it or if the player
 * already owns a dragon containing it (for example, an event reward).
 */
function unlockedPlayerElements(profile,playerLevel,progressionConfig,catalog){
  const elements=new Set(Object.entries(progressionConfig.elementUnlocks)
    .filter(([,requiredLevel])=>playerLevel>=requiredLevel).map(([element])=>element));
  const speciesById=new Map(catalog.species.map(species=>[species.id,species]));
  for(const dragon of Array.isArray(profile?.dragons)?profile.dragons:[]){
    const species=speciesById.get(dragon.species);
    const parts=species?.elements||String(dragon.species||'').split('>').filter(Boolean);
    parts.forEach(element=>elements.add(element));
  }
  return elements;
}

/**
 * Create five catalog-backed, progression-appropriate NPC squads.
 * Candidate teams receive naturally sampled levels/stars and are ranked against
 * the player's top-three Combat Power. Individual dragons are never tuned to a
 * target score.
 */
function createVirtualRivals({profile,playerLevel,roundKey,makeFighter,catalog,
  arenaConfig,progressionConfig,rng=seededRandom(roundKey)}){
  if(typeof makeFighter!=='function'||!catalog?.species?.length)return [];
  const player=analyzePlayer(profile,makeFighter,arenaConfig);
  if(player.owned.length<arenaConfig.teamSize||!player.rarities.length)return [];

  const unlockedElements=unlockedPlayerElements(profile,playerLevel,progressionConfig,catalog);
  const poolByRarity=new Map(player.rarities.map(rarity=>[rarity,[]]));
  for(const species of catalog.species){
    const parts=species.elements||String(species.id||'').split('>').filter(Boolean);
    const rarity=species.doHiem;
    if(!poolByRarity.has(rarity)||!parts.length||!parts.every(element=>unlockedElements.has(element)))continue;
    poolByRarity.get(rarity).push({id:species.id,parts,rarity});
  }
  for(const [rarity,species] of poolByRarity){
    if(!species.length)poolByRarity.delete(rarity);
  }
  const availableRarities=player.rarities.filter(rarity=>poolByRarity.has(rarity));
  if(!availableRarities.length)return [];

  const targetRatios=arenaConfig.rivalPowerRatios;
  const candidateCount=arenaConfig.rivalCandidateTeams||120;
  const usedSpecies=new Set();
  const playerLevelSafe=Math.max(1,Math.min(progressionConfig.contentLevelCap,
    Math.floor(Number(playerLevel)||1)));

  return targetRatios.map((ratio,index)=>{
    const target=player.benchmarkPower*ratio;
    let best=null,bestScore=Infinity;
    for(let candidateIndex=0;candidateIndex<candidateCount;candidateIndex++){
      const team=[],seen=new Set(),primaryCounts={};
      for(let slot=0;slot<arenaConfig.teamSize;slot++){
        const rarity=pickRarity(Object.assign(availableRarities,{counts:player.rarities.counts}),index,rng);
        const speciesPool=poolByRarity.get(rarity)||[];
        const uniqueAvailable=speciesPool.filter(item=>!seen.has(item.id));
        // Arena permits different dragons of the same species; use that fallback
        // for early accounts that have only one or two progression-legal species.
        const available=uniqueAvailable.length?uniqueAvailable:speciesPool;
        if(!available.length)break;
        // Prefer broad elemental coverage while keeping a small chance of overlap.
        const diverse=available.filter(item=>!primaryCounts[item.parts[0]]);
        const selected=pick(diverse.length&&rng()<0.8?diverse:available,rng);
        const progression=sampleProgression(player,index,rng,arenaConfig);
        const dragon={id:-(index*1000+candidateIndex*10+slot+1),species:selected.id,
          nickname:NICKNAMES[index]+' '+(slot+1),level:progression.level,stars:progression.stars};
        const fighter=makeFighter(dragon);
        if(!fighter)break;
        team.push({...dragon,power:fighter.power});
        seen.add(selected.id);primaryCounts[selected.parts[0]]=(primaryCounts[selected.parts[0]]||0)+1;
      }
      if(team.length!==arenaConfig.teamSize)continue;
      const power=team.reduce((sum,dragon)=>sum+dragon.power,0);
      const reuseCount=team.filter(dragon=>usedSpecies.has(dragon.species)).length;
      const repeatedPrimary=Object.values(primaryCounts).reduce((sum,count)=>sum+Math.max(0,count-1),0);
      const score=Math.abs(power-target)+reuseCount*Math.max(1,target*0.12)+
        repeatedPrimary*Math.max(1,target*0.035);
      if(score<bestScore){bestScore=score;best={team,power};}
    }
    if(!best)return null;
    best.team.forEach(dragon=>usedSpecies.add(dragon.species));
    return {id:`bot-${roundKey}-${index+1}`,username:RIVAL_NAMES[index],
      level:Math.max(1,Math.min(progressionConfig.contentLevelCap,playerLevelSafe+LEVEL_OFFSETS[index])),
      strength:STRENGTHS[index],targetPower:target,team:best.team};
  }).filter(Boolean);
}

module.exports={analyzePlayer,createVirtualRivals,seededRandom,unlockedPlayerElements};
