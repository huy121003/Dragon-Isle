/* Stable, evocative English names informed by the ordered elemental fusion. */
const fs=require('node:fs');
const file='data/dragons.json',db=JSON.parse(fs.readFileSync(file,'utf8'));
const pure={fire:'Ember Wyvern',water:'Pearl Serpent',earth:'Mossback Titan',wind:'Cloud Dancer',ice:'Frost Swan',thunder:'Storm Raptor',nature:'Verdant Gecko',dark:'Duskwraith',light:'Dawn Seraph',metal:'Ironheart Lion'};
const primary={fire:'Cinder',water:'Tidal',earth:'Stone',wind:'Zephyr',ice:'Glacial',thunder:'Tempest',nature:'Bloom',dark:'Umbral',light:'Solar',metal:'Forged'};
const secondary={fire:'Flare',water:'Undertow',earth:'Bastion',wind:'Whisper',ice:'Rime',thunder:'Spark',nature:'Thicket',dark:'Veil',light:'Halo',metal:'Gear'};
const tertiary={fire:'of the Ashen Crown',water:'of the Deep Current',earth:'of the Ancient Crag',wind:'of the Wandering Sky',ice:'of the Crystal Vale',thunder:'of the Thunderhead',nature:'of the Wild Canopy',dark:'of the Hollow Moon',light:'of the Golden Dawn',metal:'of the Silver Forge'};
const fourth={fire:'the Phoenix',water:'the Leviathan',earth:'the Colossus',wind:'the Skyborn',ice:'the Winterborn',thunder:'the Stormcaller',nature:'the Lifebringer',dark:'the Nightkeeper',light:'the Sunkeeper',metal:'the Ironbound'};
const pairExceptions={
  'fire>water':'Steamveil','water>fire':'Boiling Tide',
  'fire>earth':'Magmaheart','earth>fire':'Volcanic Bastion',
  'fire>wind':'Ashen Mistral','wind>fire':'Sirocco',
  'water>earth':'Siltfin','earth>water':'Riverstone',
  'water>wind':'Monsoon Sail','wind>water':'Rainwhisper',
  'water>nature':'Mangrove Guardian','nature>water':'Reefbloom',
  'ice>thunder':'Hailstorm Crown','thunder>ice':'Winterbolt',
  'light>dark':'Eclipse Herald','dark>light':'Twilight Wraith',
  'metal>fire':'Furnace Lion','fire>metal':'Molten Fang',
  'wind>thunder':'Skybreaker','thunder>wind':'Stormwing'
};
const seen=new Set();
for(const s of db.species){
  const e=s.elements,pair=e.slice(0,2).join('>');
  const root=e.length===1?pure[e[0]]:(pairExceptions[pair]||`${primary[e[0]]} ${secondary[e[1]]}`);
  const name=e.length<=2?root:e.length===3?`${root} ${tertiary[e[2]]}`:
    `${root} ${tertiary[e[2]]}, ${fourth[e[3]]}`;
  if(seen.has(name))throw Error('Duplicate '+name);
  seen.add(name);s.ten=name;
  s.hienTuong=`${name} channels ${e.length} elemental forces with ${db.elements[e[0]].ten} as its primary affinity.`;
  s.moTa=`Primary affinity: ${db.elements[e[0]].ten}. ${e.length} elements.`;
  s.sachGhi=s.moTa;
}
for(const [id,pair] of Object.entries(db.pairs||{})){
  const s=db.species.find(s=>s.id===id);if(s){pair.ten=s.ten;pair.ten_ngan=s.ten;}
}
for(const [id,triple] of Object.entries(db.triples||{})){
  const s=db.species.find(s=>s.id===id);if(s)triple.ten=s.ten;
}
fs.writeFileSync(file,JSON.stringify(db,null,2)+'\n');
console.log('Named '+seen.size+' species uniquely in English.');
