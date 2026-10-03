"use strict";

/**
 * Building render router.
 *
 * Shared primitives and type-specific artwork live in sibling render modules.
 */
function paintFlag(b,time,night){
  structurePlinth('#d5bc8a','#89775d','#675b53','#f6e5b9');
  structurePoly([[-.24,.03],[0,-.15],[.24,.03],[0,.18]],'#b1a176','#fff0b7',.014);
  structurePoly([[-.07,-.12],[.07,-.12],[.05,-.8],[-.05,-.8]],'#b69063','#f3dca6',.016);
  structureEllipse(0,-.82,.055,.055,'#ffeb9e','#8d714d',.013);
  structureBanner(.02,-.45,'#d46b62','#fff0bd',time);
  for(const s of [-1,1])structureEllipse(s*.18,.025,.04,.025,'#879d62');
}

function drawBuilding(b,time,occupantsByHabitat){
  const f=buildingFootprint(b),v=footprintVertices(b.x,b.y,f.w,f.h);
  const center=gridToScreen(b.x+f.w/2,b.y+f.h/2);
  const width=Math.max(...v.map(p=>p.x))-Math.min(...v.map(p=>p.x));
  const height=Math.max(...v.map(p=>p.y))-Math.min(...v.map(p=>p.y));
  // The base occupies the exact footprint; vertical art is shorter to preserve sightlines.
  const unitX=width/1.02,unitY=height/.4*.48,unit=Math.min(unitX,unitY);
  const night=1-daylightAt(Date.now());
  const anchor=v[2];
  ctx.save();ctx.translate(anchor.x,anchor.y);ctx.scale(unitX,unitY);
  ctx.translate((center.x-anchor.x)/unitX,(center.y-anchor.y)/unitY);
  structureBase=v.map(p=>[(p.x-center.x)/unitX,(p.y-center.y)/unitY]);
  structureBounds=ui.debugIso?{min:Infinity,max:-Infinity}:null;
  // Animation code below converts back to local pixels for drawDragon/drawEgg.
  structureUnit=unit;structureUnitX=unitX;structureUnitY=unitY;
  if(b.type==='habitat')paintHabitat(b,time,night,occupantsByHabitat);
  else if(b.type==='farm')paintFarm(b,time,night);
  else if(b.type==='hatchery')paintHatchery(b,time,night);
  else if(b.type==='academy')paintAcademy(b,time,night);
  else if(b.type==='arena')paintArena(b,time,night);
  else if(b.type==='cave')paintCave(b,time,night);
  else if(b.type==='premiumCave')paintPremiumCave(b,time,night);
  else paintFlag(b,time,night);
  if(b.upgradeEnds){
    structureGlow(0,-.68,.27,'#e1b7ff99');
    structurePoly([[-.08,-.64],[0,-.76],[.08,-.64]],'#efd6ff','#775e96',.012);
  }
  const bounds=structureBounds;
  if(ui.debugIso&&bounds.min<Infinity&&
    (bounds.min<-.561||bounds.max>.561)){
    ctx.fillStyle='#ff5555';ctx.font='bold .08px system-ui';ctx.textAlign='center';
    ctx.fillText('⚠ sprite exceeds base',0,-.92);
  }
  structureBase=null;structureBounds=null;
  ctx.restore();
  return bounds;
}
