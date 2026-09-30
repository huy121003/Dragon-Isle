/* Extend the existing JSON catalog with elemental species using its original dragon builder. */
const expansion=require('../data/elements-expansion.json');
const clone=value=>JSON.parse(JSON.stringify(value));
const rootNames={fire:'Ember',water:'Pearl',earth:'Granite',wind:'Zephyr',ice:'Rime',
  thunder:'Storm',nature:'Briar',dark:'Dusk',light:'Dawn',metal:'Iron',
  war:'Crimson Marshal',pure:'Rose Oracle',legend:'Eternal Warden',
  primal:'Firstborn Guardian',time:'Chronicle Keeper'};
const traits={fire:'Cinder',water:'Tide',earth:'Citadel',wind:'Gale',ice:'Glacier',
  thunder:'Bolt',nature:'Grove',dark:'Eclipse',light:'Halo',metal:'Forge',
  war:'Banner',pure:'Prism',legend:'Infinity',primal:'Fang',time:'Hourglass'};
const domains={fire:'Ash',water:'Abyss',earth:'Mountain',wind:'Sky',ice:'Winter',
  thunder:'Tempest',nature:'Canopy',dark:'Twilight',light:'Aurora',metal:'Foundry',
  war:'Siege',pure:'Sanctum',legend:'Stars',primal:'Origins',time:'Ages'};
const titles={fire:'Phoenix',water:'Leviathan',earth:'Colossus',wind:'Skyborn',ice:'Winterborn',
  thunder:'Stormcaller',nature:'Lifebringer',dark:'Nightkeeper',light:'Sunkeeper',
  metal:'Ironbound',war:'Conqueror',pure:'Oracle',legend:'Immortal',
  primal:'Firstborn',time:'Timekeeper'};
function extendCatalog(db,game){
  if(db.elements[expansion.elements[0].id])return {db,game};
  const originalIds=Object.keys(db.elements);
  for(const d of expansion.elements){
    if(db.elements[d.id])throw Error('Duplicate element: '+d.id);
    const base=clone(db.elements[d.base]);
    base.id=d.id;base.ten=d.name;base.icon=d.icon;
    base.moTa=d.name+' dragons channel '+domains[d.id].toLowerCase()+
      ' through their distinctive form, breath and elemental techniques.';
    base.chiSo={hp:d.stats[0],tanCong:d.stats[1],phongThu:d.stats[2]};
    Object.assign(base.mau,{chinh:d.color,sang:d.light,toi:d.dark,bung:d.light,
      sung:d.light,mat:'#fff7e0',vien:d.dark,canh:d.color,canhMang:d.light,
      hoaTiet:d.light,hao:d.light});
    db.elements[d.id]=base;
  }
  const ids=Object.keys(db.elements),seen=new Set(db.species.map(s=>s.id));
  // Directed 2-regular graph: every element wins against two and loses to two.
  if(ids.length!==Object.keys(expansion.wins).length)throw Error('Element chart out of sync.');
  db.typeChart=Object.fromEntries(ids.map(a=>[a,Object.fromEntries(ids.map(b=>
    [b,a===b?1:expansion.wins[a].includes(b)?1.5:
      expansion.wins[b].includes(a)?0.75:1]))]));
  for(const id of ids){
    const outgoing=ids.filter(b=>db.typeChart[id][b]>1);
    const incoming=ids.filter(a=>db.typeChart[a][id]>1);
    if(outgoing.length!==2||incoming.length!==2||
      outgoing.some(b=>db.typeChart[b][id]>1))
      throw Error('Unbalanced element chart: '+id);
  }
  db.khac=Object.fromEntries(ids.map(id=>[id,ids.filter(target=>expansion.wins[id].includes(target))]));
  globalThis.DragonDatabase=db;
  // Use the same factory, rarity, colors, stats, passive and skills as all existing dragons.
  const rulesPath=require.resolve('../js/data/dragon-rules.js');
  delete require.cache[rulesPath];
  const rules=require(rulesPath);
  function append(parts){
    const id=parts.join('>');
    if(seen.has(id))return;
    const dragon=rules.buildDragon(parts);
    const name=parts.length===1?rootNames[parts[0]]:
      rootNames[parts[0]]+' '+traits[parts[1]]+
      (parts.length>=3?' of the '+domains[parts[2]]:'')+
      (parts.length>=4?', '+titles[parts[3]]:'');
    dragon.ten=name;dragon.hienTuong=name+' commands '+parts.length+
      ' elemental forces, led by '+db.elements[parts[0]].ten+'.';
    dragon.moTa=dragon.hienTuong;
    dragon.sachGhi='Primary: '+db.elements[parts[0]].ten+
      (parts.length>1?'; additional: '+parts.slice(1).map(e=>db.elements[e].ten).join(', '):'')+
      '. '+dragon.hienTuong;
    db.species.push(dragon);seen.add(id);
  }
  const fresh=parts=>parts.some(id=>!originalIds.includes(id));
  for(const a of ids)if(fresh([a]))append([a]);
  for(const a of ids)for(const b of ids)if(a!==b&&fresh([a,b]))append([a,b]);
  for(const a of ids){
    const rest=ids.filter(e=>e!==a);
    for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++){
      const parts=[a,rest[i],rest[j]];
      if(fresh(parts))append(parts);
    }
  }
  const existingSets=new Set(db.species.filter(s=>s.elements.length===4)
    .map(s=>s.elements.slice().sort().join('|')));
  for(const a of ids){
    const rest=ids.filter(e=>e!==a);
    let added=0;
    for(let i=0;i<rest.length&&added<5;i++)
      for(let j=i+1;j<rest.length&&added<5;j++)
        for(let k=j+1;k<rest.length&&added<5;k++){
          const parts=[a,rest[i],rest[j],rest[k]],key=parts.slice().sort().join('|');
          if(!fresh(parts)||existingSets.has(key))continue;
          append(parts);existingSets.add(key);added++;
        }
    if(added!==5)throw Error('Insufficient four-element species for '+a);
  }
  return {db,game};
}
module.exports=extendCatalog;
