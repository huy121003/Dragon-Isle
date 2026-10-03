/** Assemble source catalogs without duplicating dragon or skill definitions. */
const fs=require('node:fs');
const path=require('node:path');
const tiers=['common','rare','epic','legendary','mythic'];
const read=(dir,file)=>JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));

function loadDragonCatalog(dir=__dirname){
  const {speciesOrder,...core}=read(dir,'dragon-core.json');
  const entries=tiers.flatMap(tier=>{
    const list=read(dir,`dragons/${tier}.json`);
    if(!Array.isArray(list)||list.some(species=>species.doHiem!==tier))
      throw Error(`Invalid dragon tier: ${tier}`);
    return list;
  });
  const byId=new Map(entries.map(species=>[species.id,species]));
  if(byId.size!==entries.length||speciesOrder.length!==entries.length||
    new Set(speciesOrder).size!==entries.length||speciesOrder.some(id=>!byId.has(id)))
    throw Error('Dragon tier files do not match the species manifest.');
  return {...core,species:speciesOrder.map(id=>byId.get(id))};
}
function loadGameCatalog(dir=__dirname){
  const game=read(dir,'game.json');
  if(game.skills)throw Error('Keep ordinary skills in data/skills, not game.json.');
  const neutral=read(dir,'skills/normal.json'),elemental=read(dir,'skills/elemental.json');
  const skills=[...neutral,...Object.values(elemental).flat()];
  if(neutral.length!==2||Object.keys(elemental).length!==15||
    Object.values(elemental).some(list=>list.length!==2)||
    new Set(skills.map(skill=>skill.id)).size!==skills.length)
    throw Error('Ordinary skill catalogs are incomplete or have duplicate IDs.');
  return {...game,skills:{neutral,elemental}};
}
module.exports={loadDragonCatalog,loadGameCatalog};
