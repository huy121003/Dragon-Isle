"use strict";

/* RENDER: Shared projected-footprint primitives and building animation helpers. */
let structureBase=null,structureBounds=null;
let structureUnit=1,structureUnitX=1,structureUnitY=1;
const elementEmblemImages=Object.create(null);

/** Draw the exact glyph used by the matching element flag from index.html. */
function drawElementEmblem(id,x,y,size){
  const key=String(id||"");let image=elementEmblemImages[key];
  if(!image){
    const symbol=document.getElementById("flag-"+key);
    if(!symbol)return;
    image=document.createElement("img");elementEmblemImages[key]=image;
    const paths=symbol.innerHTML.replace(/currentColor/g,"#fff");
    image.onload=function(){elementEmblemImages[key]=image;};
    image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'+paths+'</svg>');
  }
  if(image.complete&&image.naturalWidth){ctx.drawImage(image,x-size/2,y-size/2,size,size);return true;}
  return false;
}

/** Place an element-flag glyph on a softly lit badge in the current drawing space. */
function structureElementBadge(id,x,y,size){
  const color=DATA.elements[id]?.color||"#fff";
  structureEllipse(x,y,size*.62,size*.62,"#172638dd",color,.025);
  structureGlow(x,y,size*.72,color+"42");
  return drawElementEmblem(id,x,y,size*.78);
}
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

function structureCrop(x,y,ready,time,crop){
  const id=typeof crop==="string"?crop:crop?.id||"wheat";
  const readyFill={wheat:"#f7ce5f",carrot:"#f18a3d",blueberry:"#6178e8",
    pumpkin:"#ed9639",corn:"#f6d04d",dragonfruit:"#e95891",
    starfruit:"#f8df55","crystal-melon":"#a8e6c4"}[id]||"#f7ce5f";
  const sway=Math.sin(time*.0016+x*19)*.02,growth=ready?1:.82;
  const top=y-.11*growth;
  structureLine([[x,y+.065],[x+sway,top]],'#466e3c',.018);
  structurePoly([[x+sway*.3,y-.015],[x-.075,y-.085],[x-.08,y-.02]],'#55a951');
  structurePoly([[x+sway*.4,y-.025],[x+.075,y-.105],[x+.07,y-.035]],'#8cd56a');
  if(id==="wheat"||id==="corn"){
    const ears=id==="corn"?[-.035,.035]:[-.045,0,.045];
    for(const offset of ears){
      const ex=x+sway+offset;
      structureLine([[ex,top+.05],[ex,top-.045]],id==="corn"?'#688c38':'#ad843c',.012);
      structureEllipse(ex,top-.05,.018,id==="corn"?.045:.032,
        ready?readyFill:'#b9a14c','#f3df8a',.006);
      if(id==="wheat")for(let n=-1;n<=1;n++)structureLine([[ex,top-.025],[ex+n*.018,top-.01]],'#f6dd91',.007);
    }
    return;
  }
  if(id==="carrot"){
    structurePoly([[x-.028,top-.005],[x+.028,top-.005],[x+sway,top+.11]],readyFill,'#c96c36',.006);
    structureLine([[x,top+.03],[x+.014,top+.062]],'#ffca71',.006);return;
  }
  if(id==="pumpkin"){
    structureEllipse(x+sway,top+.01,.045,.035,readyFill,'#b96832',.007);
    structureLine([[x+sway,top-.028],[x+sway,top-.045]],'#48653d',.009);return;
  }
  if(id==="dragonfruit"){
    structureLine([[x+sway,top+.04],[x+sway,top-.105]],'#438b59',.025);
    structureLine([[x+sway,top-.01],[x-.035,top-.045],[x-.035,top-.09]],'#438b59',.019);
    structureLine([[x+sway,top-.035],[x+.04,top-.065],[x+.04,top-.105]],'#438b59',.019);
    if(ready)structurePoly([[x-.022,top-.12],[x,top-.158],[x+.023,top-.12],[x+.014,top-.087],[x-.014,top-.087]],readyFill,'#fff0ce',.006);
    return;
  }
  if(id==="blueberry"){
    structureEllipse(x+sway,top+.015,.052,.039,'#5c9d50','#34734c',.007);
    if(ready)for(const [dx,dy] of [[-.025,0],[.018,-.01],[0,.025]])structureEllipse(x+dx,top+dy,.013,.013,readyFill,'#d2d9ff',.004);
    return;
  }
  if(id==="starfruit"){
    structureEllipse(x+sway,top+.01,.045,.033,'#70a655','#3a7346',.006);
    if(ready){structurePoly([[x,top-.06],[x+.014,top-.035],[x+.042,top-.033],[x+.02,top-.014],[x+.028,top+.012],[x,top-.002],[x-.028,top+.012],[x-.02,top-.014],[x-.042,top-.033],[x-.014,top-.035]],readyFill,'#e6b94e',.005);}
    return;
  }
  if(id==="crystal-melon"){
    structureEllipse(x+sway,top+.014,.05,.037,readyFill,'#659b78',.007);
    structureLine([[x+sway,top-.02],[x+sway,top+.045]],'#e5fff0',.006);
    if(ready){structureLine([[x-.027,top-.005],[x-.04,top-.04]],'#4e9955',.009);structureLine([[x+.027,top-.005],[x+.04,top-.04]],'#4e9955',.009);}
    return;
  }
  if(ready)structureEllipse(x+sway,top,.027,.039,readyFill,'#fff1c4',.006);
}
