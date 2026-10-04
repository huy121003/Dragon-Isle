/* Extend the existing JSON catalog with elemental species using its original dragon builder. */
const expansion=require('../data/elements-expansion.json');
const specialSkillCatalog=require('../data/special-skills.json');
const doubleDragonCatalog=require('../data/dragons/transcendent.json');
const apexCatalog=require('../data/apex-tier.json');
const {skillIdsFor}=require('../js/data/skill-assignment.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const physical={
  fire:{adjective:'Volcanic',noun:'Flare'},
  water:{adjective:'Tidal',noun:'Surge'},
  earth:{adjective:'Seismic',noun:'Fault'},
  wind:{adjective:'Aeolian',noun:'Cloud'},
  ice:{adjective:'Cryogenic',noun:'Frost'},
  thunder:{adjective:'Electrified',noun:'Discharge'},
  nature:{adjective:'Biogenic',noun:'Bloom'},
  dark:{adjective:'Nocturnal',noun:'Umbra'},
  light:{adjective:'Solar',noun:'Halo'},
  metal:{adjective:'Magnetic',noun:'Flux'},
  war:{adjective:'Ballistic',noun:'Shockwave'},
  pure:{adjective:'Prismatic',noun:'Refraction'},
  legend:{adjective:'Cosmic',noun:'Nebula'},
  primal:{adjective:'Primordial',noun:'Uplift'},
  time:{adjective:'Temporal',noun:'Chronological Drift'}
};
function phenomenonName(parts){
  const [primary,secondary,third,fourth]=parts;
  if(!secondary)return primary.charAt(0).toUpperCase()+primary.slice(1)+' Dragon';
  const terms=[physical[primary].adjective,physical[secondary].noun];
  if(third)terms.unshift(physical[third].adjective);
  if(fourth)terms.unshift(physical[fourth].adjective);
  return terms.join(' ')+' Dragon';
}
function extendCatalog(db,game){
  if(db.elements[expansion.elements[0].id])return {db,game};
  const originalIds=Object.keys(db.elements);
  for(const d of expansion.elements){
    if(db.elements[d.id])throw Error('Duplicate element: '+d.id);
    const base=clone(db.elements[d.base]);
    base.id=d.id;base.ten=d.name;base.icon=d.icon;
    base.epicHybrid=!!d.epicHybrid;
    base.moTa=d.name+' dragons channel '+physical[d.id].noun.toLowerCase()+
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
    [b,a===b?1:expansion.wins[a].includes(b)?2:
      expansion.wins[b].includes(a)?0.5:1]))]));
  for(const id of ids){
    const outgoing=ids.filter(b=>db.typeChart[id][b]>1);
    const incoming=ids.filter(a=>db.typeChart[a][id]>1);
    if(outgoing.length!==2||incoming.length!==2||
      outgoing.some(b=>db.typeChart[b][id]>1))
      throw Error('Unbalanced element chart: '+id);
  }
  db.khac=Object.fromEntries(ids.map(id=>[id,ids.filter(target=>expansion.wins[id].includes(target))]));
  if(doubleDragonCatalog.rarityConfig.id!==doubleDragonCatalog.rarity)
    throw Error('Double Element rarity metadata does not match its recipes.');
  db.rarities[doubleDragonCatalog.rarity]=clone(doubleDragonCatalog.rarityConfig);
  if(apexCatalog.rarityConfig.id!==apexCatalog.rarity||apexCatalog.dragons.length!==15||
    apexCatalog.skills.length!==15)throw Error('Apex tier must define 15 dragons and signature skills.');
  db.rarities[apexCatalog.rarity]=clone(apexCatalog.rarityConfig);
  globalThis.DragonDatabase=db;
  // Use the same factory, rarity, colors, stats, passive and skills as all existing dragons.
  const rulesPath=require.resolve('../js/data/dragon-rules.js');
  delete require.cache[rulesPath];
  const rules=require(rulesPath);
  function append(parts){
    const id=parts.join('>');
    if(seen.has(id))return;
    const dragon=rules.buildDragon(parts);
    const name=phenomenonName(parts);
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
  // Keep existing four-element IDs stable; distribute new combinations across all 15 elements.
  const fourExisting=db.species.filter(s=>s.elements.length===4);
  const targetPerPrimary=10,globalQuota=targetPerPrimary*3;
  const minimumPerPair=Math.floor(globalQuota/(ids.length-1));
  const maximumPerPair=Math.ceil(globalQuota/(ids.length-1));
  const fourSets=new Set(fourExisting.map(s=>s.elements.slice().sort().join('|')));
  const perPrimary=Object.fromEntries(ids.map(a=>[a,
    fourExisting.filter(s=>s.elements[0]===a).length]));
  const secondary=Object.fromEntries(ids.map(e=>[e,
    fourExisting.filter(s=>s.elements.slice(1).includes(e)).length]));
  const local=Object.fromEntries(ids.map(a=>[a,Object.fromEntries(ids.map(e=>[e,
    fourExisting.filter(s=>s.elements[0]===a&&s.elements.slice(1).includes(e)).length]))]));
  const positions=[0,1,2,3].map(slot=>Object.fromEntries(ids.map(e=>[e,
    fourExisting.filter(s=>s.elements[slot]===e).length])));
  // Stable pseudo-random tie-breaks give varied combinations without changing the catalog on each build.
  function jitter(value){
    let hash=2166136261;
    for(const character of value){
      hash^=character.charCodeAt(0);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0)/4294967296;
  }
  function orderSecondary(parts){
    const [a,b,c]=parts;
    const choices=[[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]];
    let best,lowest=Infinity;
    for(const choice of choices){
      // The first 50 species are fixed, so balance positions around their existing counts.
      const cost=choice.reduce((sum,e,i)=>sum+2*(positions[i+1][e]-targetPerPrimary)+1,0);
      if(cost<lowest){best=choice;lowest=cost;}
    }
    best.forEach((e,i)=>positions[i+1][e]++);
    return best;
  }
  for(const a of ids){
    const rest=ids.filter(e=>e!==a);
    const toAdd=targetPerPrimary-perPrimary[a];
    if(toAdd<0)throw Error('Too many four-element species for '+a);
    for(let step=0;step<toAdd;step++){
      const remaining=toAdd-step-1;
      let chosen=null,highest=-Infinity;
      for(let i=0;i<rest.length;i++)
        for(let j=i+1;j<rest.length;j++)
          for(let k=j+1;k<rest.length;k++){
            const parts=[rest[i],rest[j],rest[k]];
            const key=[a,...parts].slice().sort().join('|');
            if(fourSets.has(key)||parts.some(e=>
              local[a][e]>=maximumPerPair||secondary[e]>=globalQuota))continue;
            const needed=rest.map(e=>Math.max(0,minimumPerPair-local[a][e]-
              (parts.includes(e)?1:0)));
            if(needed.some(n=>n>remaining)||
              needed.reduce((sum,n)=>sum+n,0)>remaining*3)continue;
            const score=parts.reduce((sum,e)=>sum+
              12*(local[a][e]<minimumPerPair)+2*(globalQuota-secondary[e])+
              1.2*(maximumPerPair-local[a][e]),0)+jitter(key+step)*.2;
            if(score>highest){chosen=parts;highest=score;}
          }
      if(!chosen)throw Error('Cannot balance four-element species for '+a);
      const quartet=[a,...orderSecondary(chosen)];
      append(quartet);
      fourSets.add(quartet.slice().sort().join('|'));
      perPrimary[a]++;
      chosen.forEach(e=>{secondary[e]++;local[a][e]++;});
    }
  }
  for(const a of ids){
    if(perPrimary[a]!==targetPerPrimary||secondary[a]!==globalQuota||
      ids.some(e=>e!==a&&(local[a][e]<minimumPerPair||
        local[a][e]>maximumPerPair)))
      throw Error('Unbalanced four-element species for '+a);
  }
  if(fourSets.size!==ids.length*targetPerPrimary)
    throw Error('The four-element catalog must contain exactly 150 recipes.');
  const quads=Object.fromEntries(db.species.filter(s=>s.elements.length===4&&
    new Set(s.elements).size===4).map(s=>[s.elements.slice().sort().join('|'),s.id]));
  if(db.quads&&(Object.keys(db.quads).length!==Object.keys(quads).length||
    Object.entries(db.quads).some(([elements,id])=>quads[elements]!==id)))
    throw Error('The canonical quads map does not match the dragon catalog.');
  db.quads=quads;
  if(specialSkillCatalog.skills.length!==45||
    doubleDragonCatalog.dragons.length!==45)
    throw Error('The Double Element release requires 45 skills and 45 dragon recipes.');
  const skillById=new Map(specialSkillCatalog.skills.map(skill=>[skill.id,skill]));
  if(skillById.size!==specialSkillCatalog.skills.length)
    throw Error('Duplicate special skill IDs.');
  for(const skill of specialSkillCatalog.skills){
    if(!ids.includes(skill.element)||!game.skills.elemental[skill.element])
      throw Error('Unknown special skill element: '+skill.element);
    game.skills.elemental[skill.element].push({...clone(skill),
      icon:db.elements[skill.element].icon,special:true});
  }
  const dragonRecipeIds=new Set();
  for(const recipe of doubleDragonCatalog.dragons){
    const {primary,partners,specialSkillId}=recipe;
    const parts=[primary,primary,...partners];
    if(parts.length!==4||new Set([primary,...partners]).size!==3||
      parts.join('>')!==recipe.speciesId||!ids.includes(primary)||
      partners.some(element=>!ids.includes(element)))
      throw Error('Invalid Double Element dragon recipe: '+recipe.speciesId);
    if(dragonRecipeIds.has(recipe.speciesId)||seen.has(recipe.speciesId))
      throw Error('Duplicate Double Element species: '+recipe.speciesId);
    dragonRecipeIds.add(recipe.speciesId);
    const skill=skillById.get(specialSkillId);
    if(!skill||skill.element!==primary)
      throw Error('Missing or mismatched special skill: '+specialSkillId);
    const dragon=rules.buildDragon(parts);
    dragon.ten='Resonant '+phenomenonName([primary,...partners]);
    dragon.doubleElement=primary;
    dragon.doubleForm=recipe.form;
    dragon.specialSkillIds=[specialSkillId];
    dragon.skillIds=skillIdsFor(parts,recipe.speciesId,specialSkillId);
    dragon.hienTuong=dragon.ten+' channels '+db.elements[primary].ten+
      ' twice, with '+partners.map(e=>db.elements[e].ten).join(' and ')+'.';
    dragon.moTa=dragon.hienTuong;
    dragon.sachGhi='Double Element: '+db.elements[primary].ten+
      '; additional: '+partners.map(e=>db.elements[e].ten).join(', ')+
      '. Special Skill: '+skill.name+' — '+(skill.descriptionVi||skill.description);
    db.species.push(dragon);seen.add(recipe.speciesId);
  }
  if(ids.some(id=>specialSkillCatalog.skills.filter(skill=>skill.element===id).length!==3))
    throw Error('Each primary element must have exactly three special skills.');
  const apexSkillIds=new Set();
  for(const skill of apexCatalog.skills){
    if(apexSkillIds.has(skill.id)||!ids.includes(skill.element)||!game.skills.elemental[skill.element])
      throw Error('Invalid or duplicate Apex signature skill: '+skill.id);
    apexSkillIds.add(skill.id);
    game.skills.elemental[skill.element].push({...clone(skill),
      icon:db.elements[skill.element].icon,special:true,apex:true});
  }
  const coveredDoubleSkills=new Set();
  for(const recipe of apexCatalog.dragons){
    const parts=[recipe.primary,...recipe.partners];
    if(parts.length!==4||new Set(parts).size!==4||!ids.includes(recipe.primary)||
      recipe.partners.some(element=>!ids.includes(element))||seen.has(recipe.speciesId))
      throw Error('Invalid or duplicate Apex species: '+recipe.speciesId);
    const dragon=rules.buildDragon(parts);
    const signature=apexCatalog.skills.find(skill=>skill.id===recipe.skillId);
    if(!signature||signature.element!==recipe.primary)
      throw Error('Apex signature skill does not match its primary element: '+recipe.speciesId);
    const doubleSkills=recipe.partners.map((element,index)=>element+'-special-'+(index+1));
    for(const id of doubleSkills){
      const skill=skillById.get(id);
      if(!skill||skill.element!==id.split('-special-')[0]||coveredDoubleSkills.has(id))
        throw Error('Invalid or repeated Double skill in Apex recipe: '+id);
      coveredDoubleSkills.add(id);
    }
    dragon.id=recipe.speciesId;dragon.ten=recipe.name;dragon.elements=parts;
    dragon.soHe=4;dragon.slotCount=4;dragon.doHiem=apexCatalog.rarity;
    dragon.doHiemTen=apexCatalog.rarityConfig.ten;dragon.vienMau=apexCatalog.rarityConfig.vien;
    dragon.doubleElement=null;dragon.apexPrimary=recipe.primary;dragon.apexForm='crown';
    dragon.specialSkillIds=[...doubleSkills,recipe.skillId];
    dragon.skillIds=dragon.specialSkillIds.slice();dragon.apGiay=apexCatalog.rarityConfig.apGiay;
    dragon.giaTrung=null;dragon.giaBan=apexCatalog.rarityConfig.banGia;
    dragon.tenTrung=recipe.name.replace(/ Dragon$/,'')+' Egg';
    dragon.moTa='Apex Dragon — '+db.elements[recipe.primary].ten+' primary with '+
      recipe.partners.map(element=>db.elements[element].ten).join(', ')+
      ' secondary affinities. Cannot be bred.';
    dragon.hienTuong=dragon.moTa;dragon.sachGhi=dragon.moTa;
    dragon.specialSkillIds.forEach((id,index)=>{
      const skill=index===3?signature:skillById.get(id);
      if(!skill)throw Error('Missing Apex skill: '+id);
    });
    db.species.push(dragon);seen.add(recipe.speciesId);
  }
  if(apexSkillIds.size!==15||coveredDoubleSkills.size!==45)
    throw Error('Apex releases must use all 45 Double skills exactly once.');
  // Species metadata follows the rarity's current incubation clock, including legacy catalog entries.
  for(const dragon of db.species)dragon.apGiay=db.rarities[dragon.doHiem].apGiay;
  return {db,game};
}
module.exports=extendCatalog;
