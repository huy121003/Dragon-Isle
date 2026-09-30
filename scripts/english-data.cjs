const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const gameFile=path.join(root,'data/game.json');
const dragonFile=path.join(root,'data/dragons.json');
const game=JSON.parse(fs.readFileSync(gameFile));
const db=JSON.parse(fs.readFileSync(dragonFile));
const labels={fire:'Fire',water:'Water',earth:'Earth',wind:'Wind',ice:'Ice',thunder:'Thunder',nature:'Nature',dark:'Dark',light:'Light',metal:'Metal'};
const rarities={common:'Common',rare:'Rare',epic:'Epic',legendary:'Legendary',mythic:'Mythic'};
const passiveNames={fire:'Blazing Spirit',water:'Tidal Flow',earth:'Stone Guard',wind:'Swift Gale',ice:'Frozen Armor',thunder:'Charged Strike',nature:'Vital Bloom',dark:'Shadow Veil',light:'Radiant Aura',metal:'Iron Will'};
const skillNames={neutral:['Rending Claw','Tail Slam'],fire:['Flame Slash','Inferno Burst'],water:['Water Strike','Tidal Surge'],earth:['Earthquake','Stone Impact'],wind:['Wind Blade','Cyclone'],ice:['Frost Slash','Blizzard'],thunder:['Thunder Strike','Sky Thunder'],nature:['Vine Lash','Thorn Forest'],dark:['Shadow Slash','Dark Moon'],light:['Light Blade','Holy Radiance'],metal:['Iron Slash','Steel Storm']};
for(const [id,e] of Object.entries(db.elements)){
  e.ten=labels[id];e.moTa=`A ${labels[id].toLowerCase()} dragon with the power of ${labels[id].toLowerCase()}.`;
  e.noiTai.ten=passiveNames[id];e.noiTai.moTa=`Increases ${e.noiTai.chiSo==='tanCong'?'attack':e.noiTai.chiSo==='phongThu'?'defense':e.noiTai.chiSo==='tocDo'?'speed':'health'}.`;
}
for(const [id,r] of Object.entries(db.rarities))r.ten=rarities[id];
for(const [key,p] of Object.entries(db.pairs)){
  const parts=key.split('>');p.ten=db.species.find(s=>s.id===key)?.ten||p.ten;p.ten_ngan=p.ten;
  p.hienTuong=`A fusion of ${parts.map(x=>labels[x]).join(' and ')}.`;
}
for(const [key,t] of Object.entries(db.triples)){
  const parts=key.split('>');t.ten=db.species.find(s=>s.id===key)?.ten||t.ten;t.hienTuong=`A fusion of ${parts.map(x=>labels[x]).join(', ')}.`;
}
for(const [id] of Object.entries(db.adjectives))db.adjectives[id]=labels[id];
db.stageInfo.non.ten='Young';db.stageInfo.truongThanh.ten='Adult';db.stageInfo.toiThuong.ten='Elder';
for(const s of db.species){
  const elements=s.elements, names=elements.map(id=>labels[id]);
  s.ten=s.ten||names.join('-')+' Dragon';
  s.doHiemTen=rarities[s.doHiem];
  s.hienTuong=`A ${rarities[s.doHiem].toLowerCase()} dragon that channels ${names.join(', ')}.`;
  s.moTa=`Primary element: ${names[0]}. ${elements.length>1?'Additional elements: '+names.slice(1).join(', ')+'.':'Pure element.'}`;
  s.sachGhi=s.moTa;
  if(s.dieuKienDacBiet)s.dieuKienDacBiet='Both parents must collectively carry all four elements.';
  for(const passive of s.noiTai){passive.ten=passiveNames[passive.tuHe];passive.moTa=db.elements[passive.tuHe].noiTai.moTa;}
}
const nicknameMap={'Mây':'Cloud','Nắng':'Sunny','Sóc':'Sparky','Bông':'Fluffy','Lửa Nhỏ':'Ember','Gió Con':'Breezy','Mực':'Ink','Bé Băng':'Frosty','Kim':'Steel','Mầm':'Sprout','Sao':'Star','Sương':'Mist','Bụi':'Dust','Lá':'Leafy','Tia':'Flash'};
game.nicknames=game.nicknames.slice(0,34).concat(Object.values(nicknameMap));
for(const [key,name] of Object.entries({habitat:'Dragon Habitat',farm:'Farm',hatchery:'Hatchery',cave:'Breeding Cave',arena:'Arena',decor:'Flagpole',academy:'Dragon Academy'}))game.buildings[key].name=name;
for(const crop of game.crops)crop.name={wheat:'Wheat',carrot:'Carrot',pumpkin:'Pumpkin',dragonfruit:'Dragon Fruit'}[crop.id];
for(const [group,skills] of Object.entries(game.skills.elemental))skills.forEach((skill,i)=>skill.name=skillNames[group][i]);
game.skills.neutral.forEach((skill,i)=>skill.name=skillNames.neutral[i]);
fs.writeFileSync(gameFile,JSON.stringify(game,null,2)+'\n');
fs.writeFileSync(dragonFile,JSON.stringify(db,null,2)+'\n');
