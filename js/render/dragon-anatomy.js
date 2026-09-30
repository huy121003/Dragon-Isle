"use strict";

/* RENDER: Nét cong và mảng tô dùng chung để mười dáng có cùng chất liệu tranh. */
function artTrace(c,commands){
  c.beginPath();
  commands.forEach(function(v,i){
    if(i===0)c.moveTo(v[0],v[1]);
    else if(v.length===2)c.lineTo(v[0],v[1]);
    else if(v.length===4)c.quadraticCurveTo(v[0],v[1],v[2],v[3]);
    else c.bezierCurveTo(v[0],v[1],v[2],v[3],v[4],v[5]);
  });
}
function artFill(c,commands,color,edge,width){
  artTrace(c,commands);c.closePath();c.fillStyle=color;c.fill();
  if(edge){c.strokeStyle=edge;c.lineWidth=width||1.8;c.lineJoin="round";c.stroke();}
}
function artStroke(c,commands,color,width){
  artTrace(c,commands);c.strokeStyle=color;c.lineWidth=width;
  c.lineCap="round";c.lineJoin="round";c.stroke();
}
function artOval(c,x,y,rx,ry,color,angle){
  c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle||0,0,Math.PI*2);c.fill();
}
function artBody(c,commands,p){
  const g=c.createLinearGradient(-26,-31,26,20);
  g.addColorStop(0,p.thanSang);g.addColorStop(.43,p.than);g.addColorStop(1,p.thanToi);
  artFill(c,commands,g,p.vien,2.2);
}
function artLeg(c,path,p,width,footX,footY,step){
  const offset=step||0,raised=Math.max(0,offset)*.45;
  const moved=path.map(function(point,index){
    return index===path.length-1?[point[0]+offset,point[1]-raised]:point;
  });
  footX+=offset;footY-=raised;
  artStroke(c,moved,p.vien,width+3);
  artStroke(c,moved,p.than,width);
  artFill(c,[[footX-4,footY-2],[footX+7,footY-1],[footX+12,footY+2],[footX-5,footY+2]],
    p.thanToi,p.vien,1);
  for(let i=0;i<2;i++)artFill(c,[[footX+5+i*4,footY-1],[footX+11+i*4,footY+2],
    [footX+6+i*4,footY+3]],"#f4ecdb");
}
function artEye(c,p,x,y,time,id,angle){
  const blink=Math.sin(time*.0016+id*3.7)>.995;
  c.save();c.translate(x,y);c.rotate(angle||0);
  artFill(c,[[-5,-2],[5,-1],[2,3],[-4,2]],blink?p.thanToi:p.mat);
  if(!blink)artOval(c,1,0,1,2,p.vien);
  artStroke(c,[[-6,-4],[5,-2]],p.vien,2.4);
  c.restore();
}
function artFace(c,p,outline,eyeX,eyeY,time,id,jaw){
  artBody(c,outline,p);
  if(jaw){artFill(c,jaw,p.bung,p.vien,1.2);}
  artEye(c,p,eyeX,eyeY,time,id,-.12);
  const snout=Math.max(...outline.map(function(point){return point[0];}));
  artOval(c,snout-6,eyeY+8,1.2,1.1,p.vien);
}
function artSpikes(c,p,coords,color){
  coords.forEach(function(v){
    artFill(c,[[v[0]-5,v[1]+5],[v[0],v[1]-v[2]],[v[0]+5,v[1]+4]],
      color||p.sung,p.vien,1.2);
  });
}
function artBatWing(c,p,flap,torn,small){
  c.save();if(small){c.translate(-13,-11);c.scale(.62,.62);}
  artFill(c,[[-6,-7],[-14,-43-flap],[-25,-31-flap],[-43,-55-flap],
    [-39,-25],[-48,-27],[-32,-9],[-25,-19],[-17,-7]],
    p.canhMang,p.vien,2);
  artStroke(c,[[-6,-7],[-19,-35-flap],[-43,-55-flap]],p.canh,2.3);
  artStroke(c,[[-19,-35-flap],[-39,-25]],p.canh,1.5);
  if(torn){artFill(c,[[-44,-23],[-36,-23],[-39,-14]],p.thanToi);}
  c.restore();
}
function artFeatherWing(c,p,flap){
  artFill(c,[[-5,-7],[-19,-39-flap],[-45,-67-flap],[-38,-40-flap],
    [-55,-39-flap],[-41,-23],[-50,-16],[-31,-13],[-20,-4]],p.canh,p.vien,1.8);
  for(let i=0;i<5;i++){
    const x=-39+i*5,y=-52+i*8-flap*.55;
    artStroke(c,[[x,y],[x-4,y+15]],p.canhMang,2.5);
  }
  artStroke(c,[[-5,-7],[-23,-35-flap],[-45,-67-flap]],p.canhMang,2);
}
function artFin(c,p,x,y,size){
  artFill(c,[[x-8,y+5],[x,y-size],[x+7,y+5]],p.canhMang,p.vien,1.5);
  artStroke(c,[[x,y-size],[x,y+3]],p.canh,1.2);
}
function artHybrid(c,s,p,form){
  if(s.elements.length<2)return;
  const second=s.elements[1],shape=DATA.dragonForms[second];
  const color=DATA.elements[second].color,light=DATA.elements[second].light;
  /* Hệ phụ đổi mũi đuôi và thêm một phần cánh/vây nhỏ, giữ nguyên xương của hệ đầu. */
  if(shape.wing==="feather"||shape.wing==="bat"||shape.wing==="bolt"){
    artFill(c,[[-17,-11],[-27,-30],[-34,-37],[-33,-16],[-24,-8]],light,color,1.5);
  }else if(shape.wing==="fin"||shape.wing==="crystal"||shape.wing==="leaf"){
    artFin(c,{canhMang:light,canh:color,vien:color},-15,-14,14);
  }else artSpikes(c,p,[[-18,-12,11]],light);
  if(second==="fire")artFill(c,[[-47,-1],[-55,-16],[-56,-6],[-61,-9],[-54,5]],light,color);
  else if(second==="water")artFin(c,{canhMang:light,canh:color,vien:color},-51,-4,12);
  else if(second==="nature")artFill(c,[[-50,-4],[-60,-18],[-62,-1],[-50,0]],light,color);
  else if(second==="thunder")artFill(c,[[-49,-3],[-59,-14],[-55,-4],[-63,1],[-53,7]],light,color);
  else artFill(c,[[-49,-3],[-54,-14],[-61,-5],[-55,4]],light,color);
  if(form.silhouette==="serpent"||form.silhouette==="celestial"){
    artStroke(c,[[-6,4],[7,5]],color,2);
  }
}
function artFourth(c,s,time){
  if(s.elements.length<4)return;
  const color=DATA.elements[s.elements[3]].light;
  c.strokeStyle=color;c.lineWidth=2;c.globalAlpha=.68;
  c.beginPath();c.ellipse(0,-14,60,42,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<4;i++){
    const a=time*.001+i*Math.PI/2;
    const orb=DATA.elements[s.elements[i]].light;
    c.shadowColor=orb;c.shadowBlur=9;artOval(c,Math.cos(a)*60,-14+Math.sin(a)*42,4.5,4.5,orb);
  }
  c.shadowBlur=0;c.globalAlpha=1;
}

/* RENDER: Lửa — thợ săn hai chân, ngực rộng, cánh da gấp và đuôi lửa. */
function artHunter(c,p,t,id){
  const walk=Math.sin(t*.006+id)*3;
  artStroke(c,[[-19,2],[-36,13],[-48,7],[-53,-4]],p.vien,11);
  artStroke(c,[[-19,2],[-36,13],[-48,7],[-53,-4]],p.duoi,7);
  artFill(c,[[-53,-4],[-58,-22],[-62,-11],[-59,-5],[-53,-10],[-49,3]],p.canhMang,p.vien,1.2);
  artFill(c,[[-55,-4],[-59,-14],[-54,-6]],p.bung);
  artBatWing(c,p,Math.sin(t*.01+id)*4,false,false);
  artLeg(c,[[-18,2],[-19,14],[-26,24]],p,10,-27,24,walk);
  artLeg(c,[[0,3],[3,17],[11,24]],p,10,8,24,-walk);
  artBody(c,[[-27,-12],[-21,-27],[-6,-31],[8,-25],[16,-13],[12,8],
    [-3,13],[-20,6],[-28,-3]],p);
  artFill(c,[[3,-19],[10,-15],[11,5],[3,10],[-4,5]],p.bung);
  artStroke(c,[[5,-19],[15,-33],[25,-34]],p.vien,12);
  artStroke(c,[[5,-19],[15,-33],[25,-34]],p.than,9);
  artFace(c,p,[[17,-40],[30,-44],[41,-36],[47,-27],[39,-21],[24,-24],[17,-30]],
    29,-35,t,id,[[24,-24],[40,-21],[43,-18],[28,-18]]);
  artSpikes(c,p,[[18,-42,12],[30,-44,10]],p.sung);
  artLeg(c,[[5,-13],[17,-7],[24,2]],p,6,22,2);
  artSpikes(c,p,[[-17,-25,10],[-5,-29,8]],p.canhMang);
}
/* RENDER: Nước — hải long thân chữ S, mang cổ và đuôi vây, không có chân. */
function artSerpent(c,p,t,id){
  const w=Math.sin(t*.003+id)*3;
  artFill(c,[[-52,9+w],[-38,-5],[-28,3],[-17,8],[2,-4],[6,-22],
    [15,-39],[28,-38],[31,-23],[19,-18],[12,6],[-3,17],[-18,20],[-35,10],[-48,18]],
    p.than,p.vien,2.5);
  artFill(c,[[-48,18],[-60,28],[-57,10+w],[-65,4],[-52,9+w]],p.canhMang,p.vien,1.6);
  artStroke(c,[[-41,12],[-28,16],[-14,14],[3,5],[13,-17]],p.bung,4);
  for(const pos of [[-29,1],[-8,1],[12,-20]])artFin(c,p,pos[0],pos[1],13);
  artFace(c,p,[[20,-44],[36,-45],[53,-37],[59,-31],[48,-25],[28,-28],[20,-34]],
    37,-37,t,id,[[29,-28],[48,-25],[54,-22],[34,-22]]);
  for(let i=0;i<3;i++)artStroke(c,[[19-i*4,-29+i*3],[14-i*4,-25+i*3]],p.thanToi,2);
  artFin(c,p,18,-44,11);
}
/* RENDER: Đất — bốn chân thấp, thân giáp đá và đuôi chùy. */
function artBulwark(c,p,t,id){
  const walk=Math.sin(t*.003+id)*2.4;
  artStroke(c,[[-30,-2],[-45,6],[-50,2]],p.vien,14);
  artStroke(c,[[-30,-2],[-45,6],[-50,2]],p.thanToi,10);
  artOval(c,-54,2,12,11,p.thanToi);artOval(c,-56,-2,6,3,p.thanSang,-.3);
  artLeg(c,[[-24,0],[-26,17],[-30,24]],p,12,-34,24,walk);
  artLeg(c,[[7,0],[10,19],[6,24]],p,12,4,24,-walk);
  artBody(c,[[-36,-12],[-30,-29],[-7,-31],[18,-25],[27,-13],[25,8],
    [4,14],[-27,11],[-38,1]],p);
  for(let i=0;i<3;i++){
    const x=-24+i*18;
    artFill(c,[[x-9,-16],[x-3,-25],[x+10,-21],[x+12,-11],[x-2,-9]],
      i===1?p.thanSang:p.thanToi,p.vien,1.4);
  }
  artLeg(c,[[-17,5],[-14,21],[-18,26]],p,12,-23,25,-walk);
  artLeg(c,[[18,3],[22,19],[19,25]],p,13,15,25,walk);
  artFace(c,p,[[16,-27],[35,-27],[45,-20],[50,-12],[44,-4],[25,-5],[15,-14]],
    32,-18,t,id,[[26,-5],[44,-4],[48,0],[27,0]]);
  artFill(c,[[28,-27],[37,-45],[41,-26]],p.sung,p.vien,1.4);
  artSpikes(c,p,[[-20,-28,13],[0,-32,11]],p.sung);
}
/* RENDER: Gió — chim săn mồi thân thon, cánh lông dài, chân quặp. */
function artRaptor(c,p,t,id){
  artFill(c,[[-19,3],[-47,5],[-59,20],[-47,8],[-58,12],[-29,12]],p.canhMang,p.vien);
  artFeatherWing(c,p,Math.sin(t*.008+id)*7);
  artLeg(c,[[-10,4],[-13,16],[-8,22]],p,5,-9,22);
  artLeg(c,[[2,3],[4,18],[10,22]],p,5,8,22);
  artBody(c,[[-23,-9],[-14,-30],[-5,-37],[4,-25],[12,-6],[5,12],[-10,11],[-23,2]],p);
  artFill(c,[[-4,-17],[7,-7],[6,8],[-5,8]],p.bung);
  artStroke(c,[[1,-22],[10,-39],[21,-42]],p.vien,9);
  artStroke(c,[[1,-22],[10,-39],[21,-42]],p.than,6);
  artFace(c,p,[[16,-47],[30,-48],[40,-40],[43,-33],[26,-31],[17,-37]],
    28,-42,t,id);
  artFill(c,[[36,-39],[53,-34],[39,-29],[35,-33]],p.sung,p.vien,1.4);
  for(let i=0;i<3;i++)artFill(c,[[18+i*5,-46],[14+i*6,-61],[23+i*5,-49]],p.canhMang);
}
/* RENDER: Băng — báo bốn chân, lưng thấp và tinh thể trên sống lưng. */
function artPanther(c,p,t,id){
  const walk=Math.sin(t*.005+id)*4;
  artStroke(c,[[-29,1],[-42,10],[-52,8],[-56,-1]],p.vien,7);
  artStroke(c,[[-29,1],[-42,10],[-52,8],[-56,-1]],p.than,4.5);
  artFill(c,[[-56,-1],[-58,-18],[-65,-7],[-61,3]],p.canhMang,p.vien);
  artLeg(c,[[-23,3],[-28,16],[-36,22]],p,7,-39,23,walk);
  artLeg(c,[[13,2],[19,15],[15,22]],p,6,13,23,-walk);
  artBody(c,[[-34,-7],[-28,-21],[-8,-26],[16,-22],[28,-14],[26,1],
    [9,8],[-14,8],[-32,4]],p);
  artFill(c,[[-26,2],[-8,6],[20,3],[10,9],[-15,9]],p.bung);
  artSpikes(c,p,[[-22,-19,13],[-9,-24,17],[6,-23,15],[19,-19,10]],p.canhMang);
  artLeg(c,[[-16,3],[-13,16],[-19,23]],p,7,-22,23,-walk);
  artLeg(c,[[21,-2],[26,14],[32,22]],p,8,29,23,walk);
  artFace(c,p,[[19,-30],[32,-33],[44,-26],[48,-19],[41,-13],[27,-14],[20,-20]],
    32,-26,t,id,[[28,-14],[42,-13],[45,-9],[30,-10]]);
  artSpikes(c,p,[[26,-30,14],[37,-32,10]],p.sung);
}
/* RENDER: Sét — wyvern góc cạnh; cánh là chi trước, hai chân bật nhảy. */
function artWyvern(c,p,t,id){
  const flap=Math.sin(t*.012+id)*7;
  artFill(c,[[-17,4],[-45,8],[-56,-5],[-52,7],[-60,6],[-44,17],[-24,11]],
    p.duoi,p.vien);
  artFill(c,[[-3,-7],[-12,-47-flap],[-19,-30],[-37,-53-flap],[-29,-29],[-44,-14],
    [-24,-12],[-10,4]],p.canhMang,p.vien,2.2);
  artStroke(c,[[-3,-7],[-15,-40-flap],[-37,-53-flap]],p.canh,2.5);
  artLeg(c,[[-12,5],[-15,16],[-22,24]],p,7,-25,24);
  artLeg(c,[[8,2],[12,16],[22,24]],p,7,19,24);
  artBody(c,[[-28,-12],[-14,-28],[3,-26],[17,-9],[11,11],[-10,11],[-28,-2]],p);
  artFill(c,[[-6,-18],[12,-8],[8,7],[-3,6]],p.bung);
  artStroke(c,[[8,-16],[18,-33],[26,-36]],p.vien,8);
  artStroke(c,[[8,-16],[18,-33],[26,-36]],p.than,5);
  artFace(c,p,[[19,-42],[31,-44],[43,-35],[51,-27],[43,-22],[25,-25],[18,-32]],
    31,-36,t,id,[[26,-25],[43,-22],[46,-17],[28,-20]]);
  artFill(c,[[25,-42],[30,-61],[33,-45],[42,-52],[35,-39]],p.sung,p.vien);
  artStroke(c,[[1,-7],[20,-1],[26,8]],p.vien,5);
  artStroke(c,[[1,-7],[20,-1],[26,8]],p.canh,3);
}
/* RENDER: Cây — rồng hươu cổ cao, gạc phân nhánh, bờm lá và chân mảnh. */
function artStag(c,p,t,id){
  const walk=Math.sin(t*.004+id)*3;
  artStroke(c,[[-28,2],[-43,9],[-53,0]],p.vien,7);
  artStroke(c,[[-28,2],[-43,9],[-53,0]],p.duoi,4);
  artFill(c,[[-51,0],[-61,-13],[-61,5],[-50,6]],p.canhMang,p.vien);
  for(const x of [-24,-14,8,18])
    artLeg(c,[[x,2],[x-2,17],[x-5,25]],p,5,x-8,25,(x===-24||x===18)?walk:-walk);
  artBody(c,[[-33,-9],[-25,-22],[-5,-24],[17,-18],[23,-5],[14,7],[-24,8],[-34,1]],p);
  for(let i=0;i<4;i++)artFill(c,[[-20+i*10,-20],[-17+i*10,-31],[-10+i*10,-20]],
    p.canhMang,p.vien,1);
  artStroke(c,[[13,-13],[19,-42],[26,-45]],p.vien,11);
  artStroke(c,[[13,-13],[19,-42],[26,-45]],p.than,8);
  artFace(c,p,[[20,-51],[33,-52],[43,-44],[47,-37],[35,-34],[21,-40]],
    31,-44,t,id,[[34,-34],[45,-36],[47,-32],[36,-30]]);
  for(const x of [23,35]){
    artStroke(c,[[x,-49],[x-5,-63],[x-14,-69]],p.sung,3);
    artStroke(c,[[x-5,-60],[x+2,-68]],p.sung,2);
  }
  artFill(c,[[8,-34],[-2,-45],[5,-26]],p.canhMang,p.vien);
}
/* RENDER: Tối — kẻ rình mồi gầy thấp, cánh rách gập xuống, đuôi móc. */
function artStalker(c,p,t,id){
  const walk=Math.sin(t*.004+id)*3;
  c.save();c.globalAlpha=.4;
  for(let n=0;n<4;n++)artOval(c,-42-n*8,-1+n*3+Math.sin(t*.002+n+id)*3,
    11+n*2,5+n*2,p.thanToi);
  c.restore();
  artStroke(c,[[-27,0],[-43,4],[-56,-8]],p.vien,7);
  artStroke(c,[[-27,0],[-43,4],[-56,-8]],p.duoi,4);
  artFill(c,[[-56,-8],[-63,-19],[-64,-3],[-57,1]],p.sung,p.vien);
  artBatWing(c,p,Math.sin(t*.006+id)*2,true,false);
  artLeg(c,[[-21,3],[-29,18],[-35,25]],p,6,-38,25,walk);
  artLeg(c,[[13,2],[17,18],[26,25]],p,6,23,25,-walk);
  artBody(c,[[-35,-9],[-21,-19],[0,-20],[22,-13],[29,-2],[13,8],[-17,8],[-35,0]],p);
  artFill(c,[[-16,2],[6,6],[22,0],[14,9],[-16,8]],p.bung);
  artSpikes(c,p,[[-24,-18,9],[-10,-20,10],[5,-20,9]],p.sung);
  artLeg(c,[[11,-9],[23,0],[30,15]],p,5,27,16);
  artFace(c,p,[[19,-27],[33,-29],[45,-22],[56,-13],[48,-10],[32,-15],[20,-17]],
    33,-22,t,id,[[33,-15],[48,-10],[53,-6],[37,-10]]);
  artFill(c,[[23,-27],[18,-45],[29,-30]],p.sung,p.vien);
  artFill(c,[[36,-28],[35,-43],[42,-26]],p.sung,p.vien);
}
/* RENDER: Sáng — thân trường long lơ lửng, chân nhỏ, dải cánh và hào quang. */
function artCelestial(c,p,t,id){
  const wave=Math.sin(t*.003+id)*3;
  // Two differently sized pairs read as four wings even in a small portrait.
  artFill(c,[[-17,-7],[-39,-49-wave],[-45,-56-wave],[-29,-28],[-36,-13]],p.canh,p.vien,1.4);
  artFill(c,[[3,-10],[-3,-48+wave],[-11,-56+wave],[9,-31],[14,-14]],p.canhMang,p.vien,1.4);
  artFill(c,[[-58,9+wave],[-42,-4],[-25,-5],[-13,10],[1,6],[7,-14],
    [14,-36],[27,-39],[32,-24],[20,-17],[14,9],[-3,18],[-20,18],
    [-35,6],[-50,16]],p.than,p.vien,2);
  artFill(c,[[-58,9+wave],[-65,-6+wave],[-69,13+wave],[-60,21+wave]],
    p.canhMang,p.vien,1.2);
  artStroke(c,[[-37,5],[-21,12],[-6,13],[9,3],[16,-17]],p.bung,3.5);
  for(let i=0;i<4;i++){
    const x=-27+i*12,y=i%2?10:12;
    artStroke(c,[[x,y],[x-3,y+12]],p.sung,2.8);
  }
  artFill(c,[[-9,-8],[-24,-49-wave],[-28,-64-wave],[-12,-48],[0,-18]],p.canhMang,p.vien,1.6);
  artFill(c,[[10,-8],[8,-44+wave],[4,-53+wave],[18,-34],[24,-11]],p.canh,p.vien,1.4);
  artStroke(c,[[-9,-8],[-22,-50-wave],[-28,-64-wave]],p.canh,2.5);
  artFace(c,p,[[19,-45],[32,-49],[46,-41],[55,-34],[48,-28],[29,-31],[20,-35]],
    33,-40,t,id,[[30,-31],[48,-28],[51,-24],[33,-26]]);
  c.strokeStyle=p.sung;c.lineWidth=3;c.beginPath();c.ellipse(21,-60,17,5,-.12,0,Math.PI*2);c.stroke();
  artSpikes(c,p,[[14,-45,8],[26,-48,10]],p.sung);
}
/* RENDER: Kim loại — rồng tê giác giáp thép, chân trụ và đuôi búa. */
function artIronback(c,p,t,id){
  const walk=Math.sin(t*.0025+id)*2;
  artStroke(c,[[-30,0],[-45,9],[-51,4]],p.vien,12);
  artStroke(c,[[-30,0],[-45,9],[-51,4]],p.thanToi,8);
  artFill(c,[[-54,-5],[-64,0],[-61,13],[-49,10],[-47,0]],p.canh,p.vien,1.8);
  for(const x of [-25,-14,11,21])
    artLeg(c,[[x,0],[x-2,15],[x-4,24]],p,11,x-8,24,(x===-25||x===21)?walk:-walk);
  artBody(c,[[-38,-12],[-30,-28],[-9,-34],[16,-28],[30,-14],[26,7],
    [7,13],[-29,11],[-40,0]],p);
  for(let i=0;i<3;i++){
    const x=-25+i*18;
    artFill(c,[[x-11,-16],[x-5,-29],[x+9,-27],[x+14,-12],[x,-7]],
      i%2?p.thanSang:p.canhMang,p.vien,1.7);
    artFill(c,[[x+2,-11],[x+12,-12],[x+11,2],[x+3,4]],p.thanToi,p.vien,1);
  }
  artFace(c,p,[[18,-31],[35,-31],[47,-24],[54,-14],[48,-6],[29,-6],[19,-17]],
    35,-22,t,id,[[29,-6],[48,-6],[50,-1],[30,-1]]);
  artFill(c,[[40,-26],[51,-45],[50,-23]],p.sung,p.vien,1.5);
  artFill(c,[[18,-30],[15,-43],[29,-32]],p.canh,p.vien);
}

/* RENDER: Ánh xạ cấu hình hình thể; một loài mới chỉ cần chọn silhouette trong JSON. */
const DRAGON_SILHOUETTES={hunter:artHunter,serpent:artSerpent,bulwark:artBulwark,
  raptor:artRaptor,panther:artPanther,wyvern:artWyvern,stag:artStag,
  stalker:artStalker,celestial:artCelestial,ironback:artIronback};
