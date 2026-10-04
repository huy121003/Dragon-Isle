"use strict";

/* RENDER: Dấu vân gắn với loài, nên trứng cùng loài giống nhau dù ID cá thể khác. */
function eggStyle(egg){
  const species=typeof egg==="string"?egg:(egg&&egg.species)||"unknown";
  const double=DATA.species[species]?.rarity==="transcendent";
  const apex=DATA.species[species]?.rarity==='apex';
  let hash=2166136261;
  for(let i=0;i<species.length;i++)hash=Math.imul(hash^species.charCodeAt(i),16777619)>>>0;
  hash^=hash>>>16;hash=Math.imul(hash,2246822507)>>>0;
  const hue=hash%360,other=(hue+62+(hash>>>12)%140)%360;
  return {seed:hash,pattern:(hash>>>8)%8,contour:(double||apex)?3:(hash>>>20)%3,double,apex,
    base:"hsl("+hue+" 55% 74%)",shade:"hsl("+hue+" 39% 44%)",
    shine:"hsl("+hue+" 78% 94%)",mark:"hsl("+other+" 68% 48%)"};
}
/* RENDER: HTML của vỏ không chứa tên, hệ, độ hiếm hoặc ID loài. */
function eggShellHtml(egg,ready){
  const style=eggStyle(egg);
  return '<span class="mystery-egg pattern-'+style.pattern+' contour-'+style.contour+
    (style.double?' double-egg':'')+(style.apex?' apex-egg':'')+(ready?' ready':'')+'" aria-label="Mystery egg" style="--shell:'+style.base+
    ';--shell-shade:'+style.shade+';--shell-shine:'+style.shine+
    ';--shell-mark:'+style.mark+'"><i></i></span>';
}
/* RENDER: Cùng dấu vân được vẽ trên Canvas tại lò ấp và hang lai. */
function drawEgg(context,egg,x,y,time,scale){
  const style=eggStyle(egg),ready=egg.readyAt&&egg.readyAt<=Date.now();
  const top=style.contour===1?5:style.contour===2?1:0;
  context.save();context.translate(x,y+eggBounce(ready,time,(egg.id||0)%7));
  context.scale(scale,scale);
  const gradient=context.createRadialGradient(-5,-6,2,1,1,18);
  gradient.addColorStop(0,style.shine);gradient.addColorStop(.63,style.base);
  gradient.addColorStop(1,style.shade);
  context.fillStyle=gradient;context.beginPath();context.moveTo(0,-17-top);
  context.bezierCurveTo(-12,-17,-14,-5,-13,5);
  context.bezierCurveTo(-12,15,12,15,13,5);
  context.bezierCurveTo(14,-5,12,-17,0,-17-top);context.fill();
  context.save();context.beginPath();context.moveTo(0,-17-top);
  context.bezierCurveTo(-12,-17,-14,-5,-13,5);
  context.bezierCurveTo(-12,15,12,15,13,5);
  context.bezierCurveTo(14,-5,12,-17,0,-17-top);context.clip();
  context.fillStyle=style.mark;context.strokeStyle=style.mark;
  context.lineWidth=2.3;context.globalAlpha=.75;
  switch(style.pattern){
  case 0:
    for(const point of [[-6,-4],[5,-7],[-2,6],[7,5]]){
      context.beginPath();context.arc(point[0],point[1],2.5,0,Math.PI*2);context.fill();
    }break;
  case 1:
    for(let i=-1;i<=1;i++){
      context.beginPath();context.moveTo(-13,i*8-5);context.lineTo(13,i*8+5);context.stroke();
    }break;
  case 2:
    context.beginPath();context.ellipse(0,1,7,10,-.2,0,Math.PI*2);context.fill();
    context.fillStyle=style.shine;context.beginPath();context.ellipse(0,1,3,6,-.2,0,Math.PI*2);context.fill();break;
  case 3:
    for(const yy of [-4,4]){
      context.beginPath();context.moveTo(-12,yy-4);context.lineTo(0,yy+3);
      context.lineTo(12,yy-4);context.stroke();
    }break;
  case 4:
    context.beginPath();context.arc(2,0,9,.4,Math.PI*1.7);
    context.arc(6,-3,8,Math.PI*1.5,.3,true);context.fill();break;
  case 5:
    context.beginPath();context.moveTo(-9,-9);context.lineTo(-3,-3);context.lineTo(-7,2);
    context.lineTo(2,9);context.lineTo(6,1);context.lineTo(11,5);context.stroke();break;
  case 6:
    for(const point of [[-5,-5],[5,4]]){
      context.save();context.translate(point[0],point[1]);context.rotate(-.5);
      context.beginPath();context.ellipse(0,0,3,7,0,0,Math.PI*2);context.fill();context.restore();
    }break;
  case 7:
    for(const point of [[-6,2],[5,-5],[7,7]]){
      context.beginPath();context.moveTo(point[0],point[1]-3);
      context.lineTo(point[0]+3,point[1]);context.lineTo(point[0],point[1]+3);
      context.lineTo(point[0]-3,point[1]);context.closePath();context.fill();
    }break;
  }
  if(style.apex){
    context.strokeStyle='#fff1a8';context.lineWidth=2.4;context.globalAlpha=.95;
    context.beginPath();context.ellipse(0,0,8,14,.2,0,Math.PI*2);context.stroke();
    context.fillStyle='#5ce1ff';for(const side of [-1,1]){context.beginPath();context.arc(side*7,-5,2,0,Math.PI*2);context.fill();}
  }
  if(style.double){
    context.strokeStyle=style.shine;context.lineWidth=2.4;
    for(let i=0;i<2;i++){
      context.beginPath();context.arc(0,-1,6+i*4,-Math.PI*.75,Math.PI*.75);
      context.stroke();
    }
    context.fillStyle=style.mark;
    for(const x of [-7,7]){
      context.beginPath();context.moveTo(x,-11);context.lineTo(x+3,-5);
      context.lineTo(x-2,-3);context.closePath();context.fill();
    }
  }
  context.restore();
  if(ready){
    context.strokeStyle="#735c69";context.lineWidth=1.8;context.beginPath();
    context.moveTo(-4,-6);context.lineTo(1,-2);context.lineTo(-2,3);
    context.lineTo(4,8);context.stroke();
  }
  context.restore();
}
