"use strict";

/* RENDER: Shared projected-footprint primitives and building animation helpers. */
let structureBase=null,structureBounds=null;
let structureUnit=1,structureUnitX=1,structureUnitY=1;
function trackStructure(points){
  if(!structureBounds)return;
  for(const [x] of points){structureBounds.min=Math.min(structureBounds.min,x);
    structureBounds.max=Math.max(structureBounds.max,x);}
}

function eggBounce(ready,time,index){return ready?-Math.abs(Math.sin(time*.007+index*.8))*8:0;}

function nestSlots(level){
  return {1:[[0,.12]],2:[[-.2,.14],[.2,.14]],
    3:[[-.23,.18],[.23,.18],[0,-.02]],
    4:[[-.23,.18],[.23,.18],[-.15,-.08],[.15,-.08]],
    5:[[-.26,.19],[0,.2],[.26,.19],[-.14,-.08],[.14,-.08]]}
    [Math.min(5,Math.max(1,level))];
}

function hatcheryEggScale(level,unitX,unitY){
  // Size against the projected nest, not a fixed number of screen pixels.
  const width=level>=4?.0048:level===3?.006:level===2?.0075:.01;
  return Math.min(unitX*width,unitY*.012);
}

function structurePoly(points,fill,stroke,line=0){
  trackStructure(points);
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line||.014;ctx.stroke();}
}

function structureLine(points,color,width=.014){
  trackStructure(points);
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
}

function structureEllipse(x,y,rx,ry,fill,stroke,width=.014){
  trackStructure([[x-rx,y],[x+rx,y]]);
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}

function structureGlow(x,y,r,color){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}

function structurePlinth(top,side,front,rim){
  if(structureBase){
    const [a,b,c,d]=structureBase,depth=.055;
    structurePoly([d,c,[c[0],c[1]+depth],[d[0],d[1]+depth]],side);
    structurePoly([b,c,[c[0],c[1]+depth],[b[0],b[1]+depth]],front);
    structurePoly([a,b,c,d],top,rim,.016);
    return;
  }
  structurePoly([[-.51,.04],[0,.23],[0,.285],[-.51,.095]],side);
  structurePoly([[0,.23],[.51,.04],[.51,.095],[0,.285]],front);
  structurePoly([[-.51,.04],[0,-.17],[.51,.04],[0,.23]],top,rim,.016);
  structureLine([[-.47,.045],[0,.205],[.47,.045]],'#fff9d875',.012);
}

function structureLantern(x,y,color,time,night){
  structurePoly([[x-.025,y+.05],[x+.025,y+.05],[x+.018,y-.11],[x-.018,y-.11]],'#6f6050');
  structureEllipse(x,y-.12,.035,.045,color,'#fff3c5',.01);
  if(night>.2||color==='#ff8a43'){
    ctx.globalAlpha=Math.max(.38,night)*(.82+.18*Math.sin(time*.005+x*50));
    structureGlow(x,y-.12,.19,'#ffe48c99');ctx.globalAlpha=1;
  }
}

function structureBanner(x,y,body,trim,time){
  structureLine([[x,y+.14],[x,y-.38]],'#eed9ab',.018);
  const flutter=Math.sin(time*.003+x*31)*.022;
  structurePoly([[x,y-.37],[x+.18+flutter,y-.31],[x+.12+flutter,y-.12],[x+.05,y-.16],[x,y-.12]],body,trim,.013);
  structureLine([[x+.035,y-.31],[x+.11+flutter,y-.275]],trim,.012);
}

function structureCrop(x,y,ready,time,color){
  const sway=Math.sin(time*.0016+x*19)*.02;
  structureLine([[x,y+.065],[x+sway,y-.08]],'#466e3c',.018);
  structurePoly([[x,y-.015],[x-.075,y-.085],[x-.08,y-.02]],'#55a951');
  structurePoly([[x,y-.025],[x+.075,y-.105],[x+.07,y-.035]],'#8cd56a');
  if(ready)structureEllipse(x+sway,y-.10,.027,.039,color,'#fff1c4',.006);
}
