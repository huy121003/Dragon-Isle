/* DATA: Danh mục 360 rồng ba hệ và 50 rồng bốn hệ, tái tạo ổn định từ bảng hệ. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'data/dragons.json');
const db=JSON.parse(fs.readFileSync(file,'utf8'));
globalThis.DragonDatabase=db;
const rules=require('../js/data/dragon-rules.js');
const ids=Object.keys(db.elements),order=new Map(ids.map((id,i)=>[id,i]));
const canonical=parts=>[parts[0],...parts.slice(1).sort((a,b)=>order.get(a)-order.get(b))].join('>');
const existing=new Map(db.species.map(s=>[s.id,s]));
const common=db.species.filter(s=>s.elements.length<3);
const triples=[];
for(const primary of ids){
  const others=ids.filter(id=>id!==primary);
  for(let i=0;i<others.length;i++)for(let j=i+1;j<others.length;j++){
    const parts=[primary,others[i],others[j]],id=canonical(parts);
    triples.push(existing.get(id)||rules.buildDragon(parts));
  }
}
const fours=[],used=new Set();
const frequency=new Map(ids.map(id=>[id,0]));
for(const s of fours)for(const id of s.elements)frequency.set(id,frequency.get(id)+1);
for(const primary of ids){
  const others=ids.filter(id=>id!==primary),chosen=fours.filter(s=>s.elements[0]===primary);
  while(chosen.length<5){
    const candidates=[];
    for(let i=0;i<others.length;i++)for(let j=i+1;j<others.length;j++)for(let k=j+1;k<others.length;k++){
      const parts=[primary,others[i],others[j],others[k]],set=parts.slice().sort().join('|');
      if(used.has(set))continue;
      const overlap=chosen.reduce((sum,s)=>sum+
        Math.max(0,parts.slice(1).filter(id=>s.elements.includes(id)).length-1),0);
      const score=parts.slice(1).reduce((sum,id)=>sum+frequency.get(id),0)+overlap*4;
      candidates.push({parts,set,score});
    }
    candidates.sort((a,b)=>a.score-b.score||a.set.localeCompare(b.set,'en'));
    const next=candidates[0];
    if(!next)throw new Error('Không đủ tổ hợp 4 hệ cho '+primary);
    const dragon=rules.buildDragon(next.parts);
    fours.push(dragon);chosen.push(dragon);used.add(next.set);
    for(const id of next.parts)frequency.set(id,frequency.get(id)+1);
  }
}
if(triples.length!==360||fours.length!==50||
  ids.some(id=>fours.filter(s=>s.elements[0]===id).length!==5))throw new Error('Sai số lượng loài');
db.species=common.concat(triples,fours);
db.version=2;
fs.writeFileSync(file,JSON.stringify(db,null,2)+'\n');
console.log('Đã tạo '+triples.length+' rồng 3 hệ và '+fours.length+' rồng 4 hệ.');
