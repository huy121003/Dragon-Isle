"use strict";

/* RENDER: Hệ thứ ba chọn một hình thể phụ lớn; màu và tốc độ lấy từ bảng dữ liệu. */
function tertiaryTheme(species,time,id){
  if(species.elements.length<3)return null;
  const element=species.elements[2],form=DATA.tertiaryForms[element];
  if(!form)return null;
  const e=DATA.elements[element];
  return {kind:form.kind,color:e.color,light:e.light,dark:e.dark,
    wave:Math.sin(time*form.speed+id*.7),pulse:.5+.5*Math.sin(time*form.speed*1.4+id)};
}
/* RENDER: Bóng dáng của hệ thứ ba nằm phía sau thân, nhìn rõ cả trên ảnh thu nhỏ. */
function drawTertiaryBack(c,s,time,id){
  const t=tertiaryTheme(s,time,id);
  if(!t)return;
  const w=t.wave,a=t.light,b=t.color,d=t.dark;
  c.save();
  switch(t.kind){
  case "flame-mantle":
    artFill(c,[[-37,-4],[-49,-31],[-46,-57-w*5],[-32,-46],[-27,-75-w*5],
      [-15,-53],[-2,-69+w*3],[2,-32],[-18,-12]],b,d,2.5);
    artFill(c,[[-33,-11],[-40,-36],[-34,-49-w*4],[-24,-39],[-20,-60],
      [-12,-40],[-1,-55],[-5,-23]],a,b,1.7);
    break;
  case "tidal-sail":
    artFill(c,[[-35,7],[-60,-4-w*3],[-77,-37-w*4],[-48,-30],
      [-54,-67-w*4],[-18,-39],[-5,-9]],b,d,2.5);
    artFill(c,[[-43,-2],[-62,-20],[-53,-36],[-35,-22],[-47,-51],
      [-15,-29],[-10,-8]],a,b,1.7);
    artStroke(c,[[-61,-42],[-38,-24],[-18,-14]],a,2.4);
    break;
  case "stone-carapace":
    artFill(c,[[-43,5],[-56,-28],[-50,-48],[-34,-42],[-24,-62],
      [-7,-43],[7,-52],[12,-16],[-10,4]],d,b,3.4);
    for(const plate of [[-47,-29],[-23,-42],[-2,-34]]){
      artFill(c,[[plate[0]-11,plate[1]+14],[plate[0]-6,plate[1]-11],
        [plate[0]+7,plate[1]-16],[plate[0]+12,plate[1]+10]],b,d,2);
      artStroke(c,[[plate[0]-5,plate[1]+7],[plate[0]+4,plate[1]-6]],a,1.8);
    }
    break;
  case "feather-fan":
    for(let i=0;i<4;i++){
      const y=-70+i*13+w*3;
      artFill(c,[[-8,-11],[-25-i*5,-31],[-77+i*4,y],
        [-61+i*4,y+17],[-27,-14]],i%2?a:b,d,1.6);
      artStroke(c,[[-13,-14],[-50+i*2,y+11]],a,1.2);
    }
    break;
  case "crystal-ridge":
    artFill(c,[[-37,-2],[-54,-38],[-43,-32],[-32,-71],[-18,-39],
      [-8,-63],[1,-31],[11,-48],[8,-7]],b,d,2.7);
    artFill(c,[[-49,-27],[-40,-33],[-31,-60],[-26,-35],[-16,-38],
      [-7,-55],[-3,-22]],a,b,1.4);
    for(const x of [-32,-8])artStroke(c,[[x,-34],[x+2,-55]],"#ffffff",1.8);
    break;
  case "lightning-prongs":
    artFill(c,[[-39,-10],[-69,-29-w*3],[-48,-31],[-69,-70-w*3],
      [-34,-47],[-21,-66+w*2],[-17,-35],[-1,-51],[-12,-14]],b,d,2.5);
    artStroke(c,[[-58,-61],[-42,-43],[-55,-42],[-30,-20]],a,3.1);
    artStroke(c,[[-15,-58],[-7,-36],[-18,-36],[-3,-16]],a,2.5);
    break;
  case "branch-canopy":
    artStroke(c,[[-38,2],[-48,-27],[-51,-61-w*2]],d,7);
    artStroke(c,[[-45,-28],[-67,-49],[-70,-65]],d,4.5);
    for(const leaf of [[-69,-54,-.5],[-49,-66,.4],[-30,-51,.8],[-59,-29,-.4]]){
      c.save();c.translate(leaf[0],leaf[1]+w*2);c.rotate(leaf[2]);
      artFill(c,[[-12,0],[0,-21],[12,0],[0,7]],a,b,1.8);
      artStroke(c,[[0,5],[0,-15]],d,1.2);c.restore();
    }
    break;
  case "shadow-cloak":
    artFill(c,[[-17,-25],[-46,-59-w*3],[-61,-51],[-53,-27],
      [-76,-29],[-63,-12],[-74,10+w*3],[-46,2],[-57,21],[-20,8]],d,b,2.4);
    artFill(c,[[-25,-26],[-49,-49],[-44,-23],[-66,-19],[-48,-10],
      [-58,8],[-25,3]],b,d,1.4);
    break;
  case "solar-rays":
    for(let i=0;i<7;i++){
      const angle=(-2.85+i*.4)+w*.03;
      const x=-19+Math.cos(angle)*62,y=-17+Math.sin(angle)*62;
      artFill(c,[[-19,-17],[x-7,y+6],[x,y-12],[x+6,y+5]],
        i%2?a:b,d,1.4);
    }
    artOval(c,-19,-17,23,20,b);
    break;
  case "armored-blades":
    for(let i=0;i<4;i++){
      const offset=i*11;
      artFill(c,[[-31+i*6,-3],[-62+offset,-24],[-72+offset,-67+w*2],
        [-57+offset,-56],[-22+i*6,-17]],i%2?b:d,a,2);
      artStroke(c,[[-58+offset,-54],[-27+i*6,-16]],a,2);
    }
    break;
  }
  c.restore();
}
/* RENDER: Dấu hệ thứ ba phủ trên ngực và đầu để không chỉ khác phần bóng lưng. */
function drawTertiaryFront(c,s,time,id){
  const t=tertiaryTheme(s,time,id);
  if(!t)return;
  const w=t.wave,a=t.light,b=t.color,d=t.dark;
  c.save();
  switch(t.kind){
  case "flame-mantle":
    artFill(c,[[-20,-9],[-16,-29],[-8,-20],[-3,-40+w*2],
      [5,-15],[-3,1]],b,d,1.7);
    artFill(c,[[-11,-7],[-10,-24],[-2,-14],[0,-2]],a,b,1.1);
    artFill(c,[[15,-41],[18,-61-w*3],[25,-50],[29,-67-w*2],[34,-43]],a,d,1.2);
    break;
  case "tidal-sail":
    for(let i=0;i<3;i++)artFin(c,{canhMang:a,canh:b,vien:d},-21+i*11,-17-i*4,13+i*2);
    artStroke(c,[[-11,-9],[0,-3],[10,-8]],a,2.6);
    for(const drop of [[28,-56],[37,-62],[-36,-40]])artOval(c,drop[0],drop[1]+w*3,2.7,4,a);
    break;
  case "stone-carapace":
    artFill(c,[[-24,-16],[-27,-31],[-10,-34],[5,-24],[9,-10],[-6,-3]],b,d,2.8);
    artStroke(c,[[-17,-27],[-8,-19],[0,-25]],a,2.2);
    artFill(c,[[16,-43],[13,-56],[22,-63],[30,-46]],a,d,2);
    break;
  case "feather-fan":
    for(let i=0;i<3;i++){
      artFill(c,[[-22+i*8,-9],[-32+i*8,-33-w*2],[-11+i*8,-19],
        [-9+i*8,-7]],i%2?b:a,d,1.2);
    }
    artFill(c,[[13,-41],[16,-64+w*2],[24,-53],[28,-42]],a,b,1.5);
    break;
  case "crystal-ridge":
    artFill(c,[[-22,-14],[-20,-36],[-11,-23],[-2,-42],
      [7,-14],[-2,-3]],a,b,2);
    artStroke(c,[[-18,-24],[-5,-17],[0,-32]],"#ffffff",1.5);
    artFill(c,[[16,-42],[17,-62],[25,-48],[31,-67],[34,-43]],a,b,2);
    break;
  case "lightning-prongs":
    artFill(c,[[-21,-16],[-4,-36],[-9,-18],[7,-21],[-10,2],[-4,-13]],a,d,1.7);
    artStroke(c,[[15,-42],[13,-66],[21,-54],[29,-70],[32,-43]],a,3.4);
    for(let i=0;i<2;i++)artOval(c,-28+i*34,-39+w*4,2+t.pulse,2+t.pulse,a);
    break;
  case "branch-canopy":
    artStroke(c,[[-17,-8],[-6,-20],[2,-38]],d,3.3);
    for(const leaf of [[-16,-12],[0,-28],[13,-48]]){
      artFill(c,[[leaf[0]-8,leaf[1]],[leaf[0],leaf[1]-14],
        [leaf[0]+8,leaf[1]],[leaf[0],leaf[1]+4]],a,b,1.3);
    }
    artStroke(c,[[17,-42],[11,-58],[4,-64]],d,3);
    artStroke(c,[[25,-44],[31,-62],[38,-64]],d,3);
    break;
  case "shadow-cloak":
    artFill(c,[[-27,-17],[-11,-35],[2,-28],[6,-9],[-12,3]],b,d,1.8);
    artStroke(c,[[-16,-27],[-5,-15],[-9,-2]],a,1.7);
    artFill(c,[[13,-43],[8,-64],[20,-56],[29,-68],[32,-42]],d,a,1.2);
    break;
  case "solar-rays":
    c.strokeStyle=a;c.lineWidth=3.5;c.beginPath();
    c.ellipse(21,-59+w*2,19,5,-.08,0,Math.PI*2);c.stroke();
    artFill(c,[[-15,-19],[-2,-31],[9,-17],[-2,-3]],a,b,1.7);
    artOval(c,-2,-17,3,3,"#ffffff");
    break;
  case "armored-blades":
    artFill(c,[[-29,-16],[-17,-33],[1,-30],[11,-13],[-8,-1]],d,a,2.4);
    artFill(c,[[-16,-18],[-5,-25],[4,-16],[-5,-8]],b,a,1.4);
    for(const x of [-20,-3,5])artOval(c,x,-17,2,2,a);
    artFill(c,[[13,-44],[13,-61],[21,-55],[25,-69],[30,-44]],a,d,1.5);
    break;
  }
  c.restore();
}
