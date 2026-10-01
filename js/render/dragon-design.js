"use strict";

/* A single articulated drawing system for every ordered species. Species IDs
   seed stable proportions; the first element supplies the skeleton and each
   later slot changes actual shapes rather than merely recoloring the body. */
function dragonSeed(id){
  let n=2166136261;
  for(const letter of id)n=Math.imul(n^letter.charCodeAt(0),16777619)>>>0;
  return n;
}
function drawDragonForm(c,s,p,form,pose,time,id,level){
  const primary=s.elements[0],double=s.rarity==='transcendent';
  const seed=dragonSeed(s.id),shape=form.body;
  const crown=double&&s.detail.doubleForm==='crown';
  const mantle=double&&!crown;
  const adult=level>=30;
  const bodyW=form.width*(shape==='aquatic'?1.27:1.04)*(mantle?1.17:1);
  const bodyH=form.height*(crown?1.3:1)*(mantle?.9:1);
  const headX=(shape==='aquatic'?32:shape==='quadruped'?28:22)+(form.neck-10)*.35;
  const headY=(shape==='aquatic'?-34:shape==='avian'?-44:shape==='quadruped'?-26:-38)-
    (form.neck-10)*.55;
  const accent=DATA.elements[s.elements[double?2:1]||primary];
  c.save();
  // Pivot 1: a segmented tail, with independently lagging spring segments.
  c.save();c.translate(-bodyW*.85,-3);
  drawDragonTail(c,form.tail,p,accent,pose,seed,adult,s.elements,time);
  c.restore();
  // Rear limbs and the far wing sit behind the torso.
  drawDragonLimbs(c,form,p,pose,time,id,bodyW,bodyH,true);
  drawDragonWing(c,form,p,accent,pose,-13,-bodyH*.72,seed,true,mantle);
  // Body topology is deliberately different for swimmers, birds and grounded dragons.
  if(shape==='aquatic'){
    artFill(c,[[-bodyW-3,-3],[-bodyW*.65,-bodyH],[-bodyW*.16,-bodyH*.6],
      [bodyW*.22,-bodyH*1.35],[bodyW*.65,-bodyH*.7],[bodyW*.87,5],
      [bodyW*.4,14],[-bodyW*.25,10],[-bodyW*.8,15]],p.than,p.vien,2.5);
    artStroke(c,[[-bodyW*.78,8],[-bodyW*.2,7],[bodyW*.4,9],[bodyW*.75,-3]],p.bung,4);
  }else if(shape==='avian'){
    artBody(c,[[-bodyW*.9,-8],[-bodyW*.52,-bodyH*1.5],[0,-bodyH*1.95],
      [bodyW*.8,-bodyH],[bodyW*.72,8],[0,17],[-bodyW*.9,6]],p);
    artFill(c,[[-bodyW*.15,-bodyH*.8],[bodyW*.45,-bodyH*.7],
      [bodyW*.37,8],[-bodyW*.2,11]],p.bung,p.vien,1.2);
  }else if(shape==='quadruped'){
    artBody(c,[[-bodyW-7,-7],[-bodyW*.73,-bodyH*1.2],[-bodyW*.2,-bodyH*1.6],
      [bodyW*.65,-bodyH*1.3],[bodyW+5,-bodyH*.55],[bodyW*.75,10],
      [-bodyW*.65,11],[-bodyW-7,1]],p);
    artFill(c,[[-bodyW*.7,-3],[bodyW*.6,-1],[bodyW*.44,10],[-bodyW*.6,9]],p.bung,p.vien,1);
  }else{
    artBody(c,[[-bodyW-2,-9],[-bodyW*.65,-bodyH*1.3],[-bodyW*.1,-bodyH*1.75],
      [bodyW*.8,-bodyH*1.1],[bodyW+3,-8],[bodyW*.65,11],
      [-bodyW*.6,12],[-bodyW-4,0]],p);
    artFill(c,[[-2,-bodyH*1.3],[bodyW*.7,-bodyH*.8],[bodyW*.45,8],
      [-bodyW*.08,8]],p.bung,p.vien,1.2);
  }
  drawDragonSurface(c,primary,s,p,form,bodyW,bodyH,seed,time,adult);
  // Slots 2–4 alter crest, shoulders and scale marks at stable anchors.
  for(let slot=1;slot<s.elements.length;slot++){
    if(double&&slot===1)continue;
    drawDragonAffinity(c,s.elements[slot],slot,p,form,pose,time,seed);
  }
  if(double)drawDragonDouble(c,primary,p,seed,crown,bodyW,bodyH);
  drawDragonLimbs(c,form,p,pose,time,id,bodyW,bodyH,false);
  drawDragonWing(c,form,p,accent,pose,-8,-bodyH*.74,seed,false,mantle);
  // Pivot 2: neck and head lead the body, with spring eased look direction.
  c.save();c.translate(bodyW*.62,-bodyH*.83);c.rotate(pose.neck*.32);
  const hx=headX-bodyW*.62,hy=headY+bodyH*.83;
  artStroke(c,[[0,1],[hx*.42,hy*.5],[hx,hy]],p.vien,shape==='aquatic'?13:12);
  artStroke(c,[[0,1],[hx*.42,hy*.5],[hx,hy]],p.than,shape==='aquatic'?9:8);
  c.translate(hx,hy);
  drawDragonHead(c,form,p,accent,seed,time,id,primary,adult,crown,mantle);
  c.restore();
  c.restore();
}
function drawDragonTail(c,tip,p,accent,pose,seed,adult,elements,time){
  const tail=pose.tail,thick=tip==='club'||tip==='spike'?10:tip==='fin'?7:6;
  const points=[[0,0]];
  for(let i=0;i<5;i++)points.push([-10-i*9,4+i*.65+tail[i]*13]);
  artStroke(c,points,p.vien,thick+3);artStroke(c,points,p.duoi||p.than,thick);
  const x=-47,y=7+tail[4]*13,reach=adult?17:13;
  if(tip==='club'){
    artFill(c,[[x+7,y-9],[x-7,y-12],[x-reach,y],[x-5,y+12],[x+8,y+7]],p.thanToi,p.vien,2);
    artSpikes(c,p,[[x-6,y-8,8]],accent.light);
  }else if(tip==='fin'||tip==='feather'||tip==='leaf'||tip==='sun'){
    for(const dir of [-1,1])artFill(c,[[x+5,y],[x-8,y+dir*reach],[x-reach-3,y+dir*5]],
      dir<0?accent.light:p.canhMang,p.vien,1.3);
  }else if(tip==='flame'||tip==='bolt'){
    artFill(c,[[x+5,y],[x-5,y-12],[x-11,y-5],[x-21,y-18],
      [x-14,y+2],[x-19,y+8],[x-5,y+10]],accent.light,p.vien,1.3);
  }else{
    artFill(c,[[x+5,y-5],[x-14,y-12],[x-8,y-2],[x-19,y+8],[x+3,y+6]],
      p.sung,p.vien,1.5);
  }
  if(seed%3===0)artStroke(c,[[-27,4+tail[2]*13],[-36,8+tail[3]*13]],accent.light,2);
  if(elements.length>=3)drawTailAffinityRing(c,elements,time,tail[3],seed);
}
/* One rotating ring follows the tail spring. Each arc represents one element
   slot in order, so the doubled primary occupies two bright segments. */
function drawTailAffinityRing(c,elements,time,tailSwing,seed){
  const rotation=time*.0015*(seed%2?-1:1)+seed*.0001;
  c.save();c.translate(-33,6+tailSwing*13);c.scale(1,.78);c.rotate(rotation);
  const count=elements.length,radius=16,gap=.075;
  for(let slot=0;slot<count;slot++){
    const element=DATA.elements[elements[slot]],from=-Math.PI/2+slot*Math.PI*2/count+gap;
    const to=-Math.PI/2+(slot+1)*Math.PI*2/count-gap;
    c.beginPath();c.arc(0,0,radius,from,to);
    c.strokeStyle=element.dark;c.lineWidth=slot===0?9:8;c.lineCap="round";c.stroke();
    c.beginPath();c.arc(0,0,radius,from,to);
    c.strokeStyle=element.light;c.lineWidth=slot===0?6:5;
    c.shadowColor=element.color;c.shadowBlur=9;c.stroke();c.shadowBlur=0;
    const mid=(from+to)/2;
    artOval(c,Math.cos(mid)*radius,Math.sin(mid)*radius,
      slot===0?3.2:2.6,slot===0?3.2:2.6,element.color);
  }
  c.restore();
}
function drawDragonLimbs(c,form,p,pose,time,id,w,h,far){
  if(!form.legs)return;
  const four=form.legs===4,hover=form.motion==='hover';
  const xs=four?[-w*.67,w*.6]:[-w*.38,w*.42];
  for(let i=0;i<xs.length;i++){
    const x=xs[i],swing=hover?Math.sin(time*.002+id+i)*1.5:
      Math.sin(time*(form.motion==='heavy'?.0024:.0045)+id+i*Math.PI+(far?Math.PI:0))*
      (form.motion==='heavy'?2.5:4);
    const lean=far?-5:3,foot=hover?12:24;
    c.save();c.globalAlpha=far?.77:1;
    artStroke(c,[[x,-1],[x+lean,foot*.54],[x+lean+swing,foot]],p.vien,
      (four?9:7)+(far?0:1));
    artStroke(c,[[x,-1],[x+lean,foot*.54],[x+lean+swing,foot]],
      far?p.thanToi:p.than,(four?6:5));
    artFill(c,[[x+lean+swing-5,foot-1],[x+lean+swing+7,foot-3],
      [x+lean+swing+12,foot+2],[x+lean+swing-5,foot+3]],p.thanToi,p.vien,1);
    if(!hover)for(let claw=0;claw<2;claw++)artFill(c,[[x+lean+swing+4+claw*5,foot],
      [x+lean+swing+10+claw*5,foot+2],[x+lean+swing+5+claw*5,foot+4]],p.sung);
    c.restore();
  }
}
function drawDragonWing(c,form,p,accent,pose,x,y,seed,far,mantle){
  if(form.wing==='none')return;
  c.save();c.translate(x+(far?-8:5),y+(far?2:-2));
  c.rotate((far?-.23:.1)+pose.flap*(far?-.18:.31));
  c.scale(far?.8:.94,far?.83:.94);
  c.globalAlpha=far?.72:1;
  const reach=(far?32:49)+(seed%9)+(mantle?11:0);
  const wing=form.wing,fill=far?p.canh:accent.light;
  if(wing==='fin'){
    artFill(c,[[0,2],[-9,-reach*.5],[-17,-reach*.95],[-25,-reach*.68],
      [-reach*.8,-reach*.9],[-reach*.57,-reach*.45],[-reach,-reach*.27],[-18,-5]],
      p.canhMang,p.vien,2);
    for(let i=0;i<3;i++)artStroke(c,[[0,0],[-16-i*12,-reach*(.85-i*.23)]],
      i===1?accent.light:p.canh,1.5);
  }else if(wing==='leaf'){
    artFill(c,[[0,0],[-17,-reach*.55],[-30,-reach],[-38,-reach*.56],
      [-reach,-reach*.42],[-35,-reach*.2],[-reach*.8,-5],[-20,3]],
      p.canhMang,p.vien,2);
    artStroke(c,[[0,0],[-20,-reach*.34],[-30,-reach]],accent.light,2.2);
    for(let i=0;i<3;i++)artStroke(c,[[-18-i*5,-reach*.3],
      [-30-i*5,-reach*(.58-i*.1)]],p.canh,1);
  }else if(wing==='feather'){
    artFill(c,[[0,2],[-12,-reach*.65],[-27,-reach],[-37,-reach*.75],
      [-reach,-reach*.72],[-reach*.67,-reach*.42],[-reach*.9,-reach*.26],[-20,-4]],
      p.canhMang,p.vien,2);
    for(let i=0;i<4;i++){
      const yy=-reach+i*reach*.18;
      artFill(c,[[-20-i*4,-13],[-reach-8+i*5,yy],[-reach+8+i*5,yy+14]],
        i%2?fill:accent.color,p.vien,1);
    }
  }else if(wing==='plate'||wing==='crystal'){
    for(let i=0;i<3;i++)artFill(c,[[0,0],[-18-i*9,-reach*.55],
      [-26-i*13,-reach+i*9],[-27-i*9,-12]],i%2?p.canhMang:fill,p.vien,2);
  }else if(wing==='bolt'){
    artFill(c,[[0,3],[-9,-reach*.5],[-17,-reach*.42],[-28,-reach],
      [-36,-reach*.56],[-reach,-reach*.72],[-reach*.65,-reach*.24],
      [-reach,-reach*.12],[-22,-5]],p.canhMang,p.vien,2);
    artStroke(c,[[0,0],[-20,-reach*.45],[-15,-reach*.56],[-28,-reach]],
      accent.light,2.5);
  }else{
    artFill(c,[[0,3],[-9,-reach*.6],[-19,-reach*.78],[-30,-reach],
      [-38,-reach*.54],[-reach,-reach*.73],[-reach*.8,-reach*.22],
      [-reach,-reach*.17],[-27,-7]],p.canhMang,p.vien,2.2);
    for(let i=0;i<3;i++)artStroke(c,[[0,0],[-20-i*12,-reach*(.8-i*.15)]],
      i===1?accent.light:p.canh,2);
  }
  c.restore();
}
function drawDragonHead(c,form,p,accent,seed,time,id,primary,adult,crown,mantle){
  const long=form.head==='long'||form.head==='beak',square=form.head==='square';
  const sharp=form.head==='sharp'||form.head==='angular';
  const snout=long?29:square?22:sharp?27+(seed%5):23+(seed%5);
  const top=-(square?12:sharp?18:15),nose=long?-2:sharp?1:3;
  artBody(c,[[-13,top+4],[-3,top-3],[12,top-2],[snout+4,nose-8],
    [snout+(sharp?9:4),nose+4],[7,12],[-11,5]],p);
  artFill(c,[[5,5],[snout+3,nose+4],[snout,nose+8],[7,10]],p.bung,p.vien,1);
  artEye(c,p,11,-7,time,id);
  artOval(c,snout,nose-2,1.4,1.3,p.vien);
  if(form.head==='beak')artFill(c,[[17,-7],[snout+12,nose-3],[snout,nose+6]],p.sung,p.vien,1);
  const spike=adult?20:13,crest=form.crest;
  if(crest==='halo'){
    for(const x of [-12,0,12])artFill(c,[[x-5,-17],[x,-33-(x===0?5:0)],
      [x+5,-17],[x,-14]],p.sung,p.vien,1.2);
  }else if(crest==='antler'){
    for(const x of [-6,6]){
      artStroke(c,[[x,-12],[x-5,-spike-18],[x-14,-spike-25]],p.sung,3);
      artStroke(c,[[x-5,-spike-17],[x+4,-spike-26]],p.sung,2);
    }
  }else{
    const number=crown?4:mantle?2:crest==='gill'?3:2+(seed%2);
    for(let i=0;i<number;i++){
      const x=-10+i*8,tip=spike+(i%2)*5+(seed>>>i)%5;
      artFill(c,[[x-5,top+2],[x+(crest==='curved'?-6:3),top-tip],
        [x+6,top+3]],i%2?accent.light:p.sung,p.vien,1.2);
    }
  }
  if(primary==='war'){
    artFill(c,[[-12,-13],[-5,-25],[14,-23],[20,-10],[10,-6],[-8,-7]],p.canh,p.vien,2);
    for(let i=0;i<5;i++)artFill(c,[[-6+i*4,-23],[-11+i*4,-39-(i%2)*4],
      [i*4,-23]],p.sung,p.vien,.7);
  }else if(primary==='primal'){
    for(const x of [-9,0,9])artFill(c,[[x-4,top+2],[x-7,top-18],
      [x+2,top-26],[x+4,top+3]],p.sung,p.vien,1.4);
  }else if(primary==='time'){
    artFill(c,[[-9,-33],[9,-33],[1,-25],[9,-17],[-9,-17],[-1,-25]],
      p.sung,p.vien,1.4);
  }else if(primary==='legend'){
    artFill(c,[[-10,-20],[0,-36],[10,-20],[0,-15]],p.sung,p.vien,1.4);
    artStroke(c,[[-6,-20],[0,-26],[6,-20]],accent.light,1.6);
  }else if(primary==='pure'){
    artFill(c,[[-7,-14],[0,-40],[9,-14],[0,-9]],p.sung,p.vien,1.5);
  }
}
function drawDragonSurface(c,primary,s,p,form,w,h,seed,time,adult){
  const count=3+(seed%3),accent=DATA.elements[primary];
  for(let i=0;i<count;i++){
    const x=-w*.7+i*w*1.4/(count-1),rise=adult?18:12;
    if(['earth','metal','primal','ice'].includes(primary)){
      artFill(c,[[x-7,-h*1.08],[x,-h*1.08-rise-(i%2)*5],
        [x+8,-h*1.08]],i%2?p.sung:p.canhMang,p.vien,1.4);
    }else if(['nature','wind','light','pure'].includes(primary)){
      artFill(c,[[x-7,-h*.9],[x,-h*.9-rise],[x+7,-h*.9]],
        i%2?accent.light:p.canhMang,p.vien,1);
    }else{
      artFill(c,[[x-7,-h],[x+1,-h-rise],[x+7,-h]],
        i%2?accent.light:p.sung,p.vien,1);
    }
  }
  for(let i=0;i<4;i++){
    const x=-w*.55+i*w*.36,y=-h*.48+(i%2)*5;
    artFill(c,[[x-4,y],[x+2,y-4-(seed>>>i)%4],[x+7,y+1],[x,y+3]],
      i%2?p.thanSang:p.canhMang,p.vien,.65);
  }
  if(primary==='dark'){
    c.globalAlpha=.4;for(let i=0;i<3;i++)artOval(c,-w-i*8,0+i*4+
      Math.sin(time*.002+i)*2,12+i*2,4+i*2,p.thanToi);c.globalAlpha=1;
  }else if(primary==='thunder'){
    artStroke(c,[[-w*.6,-h*.5],[-w*.1,-h],[0,-h*.25],[w*.5,-h*.8]],accent.light,2.5);
  }else if(primary==='water'){
    for(let i=0;i<3;i++)artOval(c,-w*.5+i*13,-h*.7,2,2,accent.light);
  }else if(primary==='war'){
    artFill(c,[[-w*.55,-h*.5],[-w*.3,-h*1.25],[w*.35,-h*1.12],
      [w*.6,-h*.3],[0,3]],p.canh,p.vien,2);
  }else if(primary==='time'){
    artFill(c,[[-7,-h*.9],[7,-h*.9],[0,-h*.6],[7,-h*.3],[-7,-h*.3],[0,-h*.6]],
      accent.light,p.vien,1.2);
  }
}
function drawDragonAffinity(c,id,slot,p,form,pose,time,seed){
  const e=DATA.elements[id],x=slot===1?-15:slot===2?0:14;
  const y=slot===1?-12:slot===2?-22:-10;
  c.save();c.translate(x,y);c.rotate(Math.sin(time*.002+slot+seed)*.04);
  switch(id){
  case 'fire':case 'thunder':
    artFill(c,[[-9,5],[-4,-15],[2,-6],[8,-23],[9,5]],e.light,e.dark,1.5);break;
  case 'water':case 'wind':
    for(let i=0;i<3;i++)artFill(c,[[-9+i*5,5],[-15+i*8,-13],
      [-5+i*6,-18],[1+i*4,3]],i%2?e.color:e.light,e.dark,1);break;
  case 'earth':case 'metal':case 'war':case 'primal':
    artFill(c,[[-12,2],[-9,-11],[2,-20],[13,-11],[12,5],[0,8]],
      e.color,e.dark,1.8);
    artStroke(c,[[-5,0],[1,-11],[9,-4]],e.light,2);break;
  case 'nature':case 'light':case 'pure':
    for(let i=0;i<3;i++)artFill(c,[[0,4],[-14+i*8,-18],
      [-2+i*6,-16],[8,4]],i%2?e.light:e.color,e.dark,1);break;
  case 'dark':case 'ice':case 'legend':case 'time':
    artFill(c,[[-9,4],[-12,-11],[0,-25],[12,-11],[9,4],[0,8]],
      e.color,e.dark,1.5);
    artFill(c,[[-4,-3],[0,-17],[4,-3],[0,3]],e.light,e.dark,.8);break;
  }
  c.restore();
}
function drawDragonDouble(c,primary,p,seed,crown,w,h){
  const e=DATA.elements[primary];
  if(crown){
    for(const x of [-w*.45,0,w*.45]){
      artFill(c,[[x-7,-h*1.25],[x,-h*2.25-(seed%5)],
        [x+7,-h*1.25]],e.light,p.vien,1.5);
    }
  }else{
    artFill(c,[[-w*.85,-h*.7],[-w*.95,-h*2.2],[-w*.35,-h*1.5],
      [0,-h*2.1],[w*.8,-h*.75],[w*.5,2],[-w*.7,3]],
      e.dark,p.vien,2);
    artStroke(c,[[-w*.6,-h*.8],[0,-h*1.9],[w*.55,-h*.7]],e.light,3);
  }
}
