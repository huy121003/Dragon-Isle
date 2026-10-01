"use strict";

/* The same Canvas brushwork as ordinary dragons, with a new body built from the
   ordered elements and the design profile. No original silhouette is reused. */
function drawDoubleDragon(c,s,p,time,id){
  const primary=s.elements[0],form=DATA.dragonForms[primary];
  const variant=s.detail.doubleForm==='crown'?0:1;
  let seed=2166136261;
  for(const char of s.id)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  const wingSpan=(variant?49:42)+(seed%13)+(form.width||16)*.24;
  const crestHeight=15+(seed>>>4)%17;
  const bodyWidth=(variant?23:31)+Math.round((form.width||18)*.28);
  const bodyHeight=(variant?25:19)+Math.round((form.height||14)*.18);
  const snout=43+(seed>>>10)%16;
  const tailLength=30+(seed>>>16)%19;
  const spikes=3+(seed>>>21)%4;
  const wingFins=2+(seed>>>26)%4;
  const pulse=Math.sin(time*.003+id*.6)*3;
  const essence=DATA.elements[primary],accent=DATA.elements[s.elements[2]],rim=DATA.elements[s.elements[3]];
  const edge=p.vien;
  c.save();
  c.globalAlpha=.45+.15*Math.sin(time*.003+seed);
  c.strokeStyle=essence.light;c.lineWidth=variant?2.6:3.6;
  c.beginPath();c.ellipse(-3,-20,50+variant*8,40+variant*5,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<5;i++){
    const angle=time*.001*(variant?-1:1)+i*Math.PI*2/5+seed*.0001;
    artOval(c,-3+Math.cos(angle)*(50+variant*8),-20+Math.sin(angle)*43,
      2.4+(i%2),3,essence.light);
  }
  c.globalAlpha=1;
  // Long split tail: its length, forks and motion differ for every species.
  const tipX=-37-tailLength,tipY=variant?-4:16;
  artStroke(c,[[-bodyWidth+6,-3],[-48,7],[tipX+12,tipY+pulse],[tipX,tipY-5+pulse]],edge,13-variant*3);
  artStroke(c,[[-bodyWidth+6,-3],[-48,7],[tipX+12,tipY+pulse],[tipX,tipY-5+pulse]],p.than,9-variant*2);
  for(const bend of [-1,1])artFill(c,[[tipX+5,tipY+pulse],
    [tipX-8-bend*5,tipY-13+bend*13+pulse],[tipX-2,tipY+9+bend*5+pulse]],
    bend<0?essence.light:accent.color,edge,1.3);
  // The two profiles use separate wing topologies; each inherits the dominant
  // element's wing anatomy while the ordered partners change membranes and tips.
  const wingLift=Math.sin(time*.005+id)*5;
  for(let side=0;side<2;side++){
    c.save();c.translate(side?8:-9,side?3:0);c.scale(side?-.74:1,side?.78:1);
    const tipY=-wingSpan-wingLift+(variant?10:0);
    const wing=[[-7,-12],[-18,tipY+15],[-wingSpan*.65,tipY],
      [-wingSpan,tipY+(variant?-9:8)],[-wingSpan+10,-25],[-28,-17]];
    artFill(c,wing,variant?accent.light:p.canhMang,edge,2.2);
    for(let i=0;i<wingFins;i++){
      const x=-20-i*(wingSpan-22)/wingFins,y=tipY+16+i*8;
      artFill(c,[[x,-19],[x-8,y],[x-14,y+12],[x-11,-16]],
        i%2?rim.color:p.canh,edge,1.3);
      artStroke(c,[[x,-17],[x-8,y]],essence.light,1.4);
    }
    c.restore();
  }
  const step=Math.sin(time*.003+id)*3;
  if(variant===0){
    for(const x of [-bodyWidth+8,-12,12,bodyWidth-6])
      artLeg(c,[[x,-1],[x+(x<0?-3:4),17]],p,7+(seed%4),x-3,20,x<0?step:-step);
  }else{
    artLeg(c,[[-14,-1],[-22,18]],p,8,-24,21,step);
    artLeg(c,[[16,-2],[20,19]],p,8,19,21,-step);
  }
  const top=-bodyHeight-7;
  artBody(c,[[-bodyWidth,-9],[-bodyWidth+6,top],[-8,top-7],[bodyWidth-7,top+4],
    [bodyWidth+2,-15],[bodyWidth-6,5],[-bodyWidth+7,9]],p);
  artFill(c,[[-bodyWidth+13,-10],[-9,top+7],[bodyWidth-1,-10],
    [bodyWidth-10,1],[-bodyWidth+9,0]],p.bung,edge,1.4);
  for(let i=0;i<spikes;i++){
    const x=-bodyWidth+8+i*(bodyWidth*1.7)/(spikes-1);
    artFill(c,[[x-7,top+5],[x-1,top-crestHeight-(i%2)*5],
      [x+7,top+5]],i%2?essence.light:p.sung,edge,1.5);
  }
  // Element texture is engraved in the body and echoes the two partner colors.
  for(let i=0;i<4+(seed>>>8)%4;i++){
    const x=-bodyWidth+13+i*8,y=-16+(i%2)*6;
    artFill(c,[[x,y],[x+3, y-6-(seed>>>i)%5],[x+7,y]],
      i%2?accent.light:essence.light,edge,.7);
  }
  const neckX=variant?19:bodyWidth-4;
  artStroke(c,[[neckX,-13],[neckX+9,-38],[neckX+19,-46]],edge,variant?12:16);
  artStroke(c,[[neckX,-13],[neckX+9,-38],[neckX+19,-46]],p.than,variant?8:12);
  const headX=neckX+17,headY=-44+(seed%7)-3;
  artFace(c,p,[[headX-12,headY-9],[headX+5,headY-16],
    [snout+15,headY-6],[snout+18,headY+7],[headX+1,headY+11],[headX-14,headY+2]],
    headX+7,headY-4,time,id);
  for(let horn=0;horn<(variant?2:3)+(seed%2);horn++){
    const x=headX-8+horn*9;
    artFill(c,[[x,headY-8],[x+(variant?-5:3),headY-crestHeight-14-horn*3],
      [x+8,headY-8]],horn%2?essence.light:p.sung,edge,1.4);
  }
  // Crown and mantle are different outlines; each design has its own facets.
  if(variant===0){
    artFill(c,[[headX-9,headY-12],[headX,headY-29],[headX+10,headY-10]],
      essence.color,edge,1.5);
  }else{
    artStroke(c,[[headX-9,headY+4],[headX+1,headY+16],[snout+9,headY+11]],
      essence.light,2.5);
    for(let i=0;i<3;i++)artFin(c,{canhMang:accent.light,canh:accent.color,vien:edge},
      -bodyWidth+5+i*10,top-1,12+i*2);
  }
  c.restore();
}
