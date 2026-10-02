"use strict";

/* DATA: Mọi bản ghi gốc nằm trong JSON; file này chỉ thích nghi chúng cho game. */
const DRAGON_DATA=window.DragonData;
const GAME_CONFIG=window.GameDatabase;
const DRAGON_DB=window.DragonDatabase;
const CONFIG=window.DragonConfig;
/** Player-level unlock map for each element; shared by pricing, islands, breeding and hatching rules. */
const ELEMENT_UNLOCK=CONFIG.progression.elementUnlocks;
const BUILDING_BALANCE=CONFIG.buildings.definitions;
const DATA={
  footprints:GAME_CONFIG.footprints,
  legacyGridOffset:GAME_CONFIG.legacyGridOffset,
  legacyGridScale:GAME_CONFIG.legacyGridScale,
  habitatThemes:GAME_CONFIG.habitatThemes,
  size:GAME_CONFIG.size,tile:GAME_CONFIG.tile,
  tileW:GAME_CONFIG.tileW||64,tileH:GAME_CONFIG.tileH||32,
  originX:GAME_CONFIG.originX||0,originY:GAME_CONFIG.originY||0,
  islands:GAME_CONFIG.islands.map(function(island){
    const playerLevel=island.element?ELEMENT_UNLOCK[island.element]||1:1;
    return {...island,playerLevel};
  }),
  elementUnlocks:ELEMENT_UNLOCK,
  islandRegionSize:GAME_CONFIG.islandRegionSize||24,
  environment:{...GAME_CONFIG.environment,cycleSeconds:CONFIG.world.visual.daySeconds,
    particlesPerIsland:CONFIG.world.visual.weatherParticles},
  testResources:CONFIG.economy.testResources,nicknames:GAME_CONFIG.nicknames,
  gemPerDragonPerHour:CONFIG.world.gemPerDragonPerHour,
  progression:{
    dragonMaxLevel:CONFIG.progression.dragonMaxLevel,
    starUpgrades:CONFIG.progression.starUpgrades,
    breedLevel:CONFIG.progression.breedLevel,
    skillUnlockLevels:CONFIG.progression.skillUnlockLevels,
    xpBase:CONFIG.dragons.xp.base,xpExponent:CONFIG.dragons.xp.exponent,
    academyCaps:CONFIG.progression.academyCaps,
    academyUpgrades:CONFIG.progression.academyUpgrades
  },
  upgradeTimes:CONFIG.buildings.upgradeTimes,
  breedingTimes:{
    common:CONFIG.breeding.timeByTier[1],rare:CONFIG.breeding.timeByTier[2],
    epic:CONFIG.breeding.timeByTier[3],legendary:CONFIG.breeding.timeByTier[4],
    mythic:CONFIG.breeding.timeByTier.double,transcendent:CONFIG.breeding.timeByTier.double
  },
  dragonForms:GAME_CONFIG.dragonForms,tertiaryForms:GAME_CONFIG.tertiaryForms,
  buildings:Object.fromEntries(Object.entries(GAME_CONFIG.buildings).map(function([id,meta]){
    return [id,{...meta,...BUILDING_BALANCE[id]}];
  })),
  crops:CONFIG.farming.crops,skills:GAME_CONFIG.skills,
  elements:Object.fromEntries(Object.entries(DRAGON_DB.elements).map(function([id,raw]){
    return [id,{name:raw.ten,color:raw.mau.chinh,light:raw.mau.sang,
      dark:raw.mau.toi,mark:raw.icon,art:raw.kieu}];
  })),
  rarities:Object.fromEntries(Object.entries(DRAGON_DB.rarities).map(function([id,raw]){
    return [id,{name:raw.ten,color:raw.vien==="rainbow"?"#ed8cc4":raw.vien,
      income:raw.vangGio,eggCost:raw.giaTrung,incubate:raw.apGiay,
      statFactor:raw.heSoChiSo}];
  })),
  species:null
};
function adaptSpecies(raw){
  const wing={doi:0,lon:1,la:2},horn={cong:0,thang:1,tinhThe:2,nhanh:3};
  const tail={nhon:0,quat:1,gai:2},pattern={dom:0,soc:1,vay:2};
  return {id:raw.id,name:raw.ten,elements:raw.elements.slice(),rarity:raw.doHiem,
    art:{wing:wing[raw.kieu.canh],horn:horn[raw.kieu.sung],tail:tail[raw.kieu.duoi],
      pattern:pattern[raw.kieu.hoaTiet]},detail:raw};
}
/* DATA: Chỉ nhận tổ hợp trong danh mục; ID cũ được gộp và giữ hệ chủ đạo. */
const speciesStore=Object.create(null);
DRAGON_DB.species.forEach(function(raw){speciesStore[raw.id]=adaptSpecies(raw);});
const elementIds=Object.keys(DATA.elements);
const elementOrder=Object.fromEntries(elementIds.map(function(id,index){return [id,index];}));
const fourSpecies=DRAGON_DB.species.filter(function(s){
  return s.elements.length===4&&new Set(s.elements).size===4;
});
const fourBySet=DRAGON_DB.quads||Object.fromEntries(fourSpecies.map(function(s){
  return [s.elements.slice().sort().join("|"),s.id];
}));
function canonicalSpeciesId(id){
  if(typeof id!=="string")return id;
  if(speciesStore[id])return id;
  const parts=id.split(">");
  if(parts.length<3||parts.length>4||new Set(parts).size!==parts.length||
    parts.some(function(e){return !DATA.elements[e];}))return id;
  if(parts.length===3)return [parts[0]].concat(parts.slice(1).sort(function(a,b){
    return elementOrder[a]-elementOrder[b];
  })).join(">");
  const fourId=fourBySet[parts.slice().sort().join("|")];
  return fourId&&speciesStore[fourId].elements[0]===parts[0]?fourId:id;
}
function migrateSpeciesId(id){
  const mapped=canonicalSpeciesId(OLD_SPECIES_IDS[id]||id);
  if(speciesStore[mapped]||typeof id!=="string")return mapped;
  const parts=id.split(">");
  if(parts.length!==4||new Set(parts).size!==4||parts.some(function(e){return !DATA.elements[e];}))return mapped;
  const candidates=fourSpecies.filter(function(s){return s.elements[0]===parts[0];});
  candidates.sort(function(a,b){
    // Old saves may contain four-element recipes from the earlier, uneven catalog.
    // Keep their dominant affinity and favor scarce/advanced secondary affinities.
    const score=s=>s.elements.filter(function(e){return parts.includes(e);}).length+
      s.elements.slice(1).filter(function(e){
        return parts.includes(e)&&DRAGON_DB.elements[e].epicHybrid;
      }).length*3;
    return score(b)-score(a)||a.id.localeCompare(b.id);
  });
  return candidates[0]?.id||mapped;
}
DATA.species=new Proxy(speciesStore,{get:function(target,id){
  return typeof id==="string"?target[canonicalSpeciesId(id)]:Reflect.get(target,id);
}});
const TRIPLE_IDS=DRAGON_DB.species.filter(function(s){return s.elements.length===3;}).map(function(s){return s.id;});
const FOUR_IDS=fourSpecies.map(function(s){return s.id;});
const DOUBLE_IDS=DRAGON_DB.species.filter(function(s){return s.doHiem==="transcendent";})
  .map(function(s){return s.id;});
const BOOK_SPECIES_IDS=DRAGON_DB.species.map(function(s){return s.id;});
const OLD_SPECIES_IDS={
  ember:"fire",aqua:"water",pebble:"earth",breeze:"wind",frost:"ice",spark:"thunder",
  sprout:"nature",shade:"dark",glimmer:"light",ironclad:"metal",
  steam:"fire>water",dust:"earth>wind",blizzard:"ice>wind",storm:"water>thunder",
  magma:"fire>earth",mud:"water>earth",bloom:"nature>light",thorn:"nature>earth",
  rust:"water>metal",smoke:"fire>dark",tempest:"wind>thunder",glacier:"ice>earth",
  inferno:"fire>thunder",eclipse:"dark>light",verdant:"nature>water",
  steelfang:"metal>fire",nightfrost:"dark>ice",aurora:"light>ice",
  plasma:"thunder>metal",wraith:"dark>wind",phoenix:"fire>light",
  leviathan:"water>dark",titan:"earth>metal",skyroar:"wind>light",
  yggdrasil:"nature>light",voidwalker:"dark>metal","cryo-emperor":"ice>thunder",
  chronos:"light>dark",celestia:"light>wind>ice",chaos:"fire>water>earth",
  special_time:"light>dark",special_heaven:"light>wind>ice",special_chaos:"fire>water>earth"
};
