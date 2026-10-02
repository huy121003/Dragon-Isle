"use strict";

/* RENDER: Standard/Premium Breeding Cave renderers and breeding occupants. */
function paintCave(b,time,night){
  structurePlinth('#9d88a0','#655a79','#493d60','#d8bdde');
  // A broken rock arch frames a purple portal; crystals mark the entrance.
  structurePoly([[-.48,.09],[-.41,-.34],[-.18,-.69],[.06,-.51],[.29,-.72],[.48,-.34],[.48,.13]],
    '#655c80','#cab4d2',.02);
  structurePoly([[-.48,.09],[-.41,-.34],[-.18,-.69],[-.15,-.24],[-.24,.07]],'#b1a1ad');
  structurePoly([[.06,-.51],[.29,-.72],[.48,-.34],[.37,.09],[.25,-.31]],'#82739b');
  const portal=ctx.createRadialGradient(0,-.04,.02,0,-.04,.3);
  portal.addColorStop(0,'#ae83d0');portal.addColorStop(.45,'#5d4b82');portal.addColorStop(1,'#292944');
  structureEllipse(0,-.035,.225,.28,portal,'#ddc6ed',.021);
  structureGlow(0,-.04,.32,'#c880eb55');
  for(const s of [-1,1]){
    structurePoly([[s*.31,.13],[s*.28,-.14],[s*.38,-.4],[s*.43,.09]],
      s<0?'#78c6d2':'#a97bd7','#eef7ee',.012);
    structureLine([[s*.31,.03],[s*.37,-.28]],'#ffffff99',.01);
  }
  paintBreedingOccupants(b,time,'#ffe3ee');
  if(night>.1)structureGlow(0,-.05,.3,'#b886e946');
}

function caveDragonScale(unitX,unitY){return Math.min(1.5,unitX/420,unitY/285);}

function caveEggScale(unitX,unitY){return Math.min(4,unitX/140,unitY/96);}

function paintBreedingOccupants(b,time,color){
  if(!b.breeding)return;
  if(b.breeding.readyAt<=Date.now()){
    ctx.save();ctx.scale(1/structureUnitX,1/structureUnitY);
    drawEgg(ctx,{id:b.id,species:b.breeding.result,readyAt:Date.now()-1},
      0,.06*structureUnitY,time,caveEggScale(structureUnitX,structureUnitY));ctx.restore();
    return;
  }
  for(const [i,id] of [b.breeding.fatherId,b.breeding.motherId].entries()){
    const d=dragonById(id);if(!d)continue;
    ctx.save();ctx.scale(1/structureUnitX,1/structureUnitY);
    drawDragon(ctx,{dragon:d,x:(i?.20:-.20)*structureUnitX,y:.12*structureUnitY,
      time,scale:caveDragonScale(structureUnitX,structureUnitY),facing:i?-1:1});ctx.restore();
  }
  ctx.font='bold .17px system-ui';ctx.fillStyle=color;ctx.textAlign='center';
  ctx.fillText('♥',0,-.38+Math.sin(time*.005)*.025);
}

function paintPremiumCave(b,time,night){
  // An open celestial observatory with a low crystal arch, distinct from the rock cave.
  structurePlinth('#e1ece4','#637f83','#496d82','#fff0c4');
  structurePoly([[-.43,.02],[-.32,-.17],[0,-.29],[.32,-.17],[.43,.02],[0,.18]],
    '#7cb7b7','#e8d6a4',.018);
  for(const side of [-1,1]){
    structurePoly([[side*.29,.02],[side*.27,-.32],[side*.36,-.55],[side*.44,-.3],[side*.43,.03]],
      side<0?'#cae7de':'#86b8bf','#fff2cd',.016);
    structureEllipse(side*.355,-.39,.045,.055,'#ffe9aa','#fff9e0',.012);
  }
  structureEllipse(0,-.24,.26,.235,'#396a79','#ffdf98',.028);
  structureEllipse(0,-.24,.19,.18,'#8ad5cc','#eaf8ec',.013);
  structurePoly([[0,-.49],[.12,-.28],[0,-.06],[-.12,-.28]],'#d8f7ee','#fff7c6',.018);
  structurePoly([[0,-.49],[.12,-.28],[0,-.27]],'#ffffffaa');
  structureGlow(0,-.31,.30,night>.15?'#a9fff599':'#faf1af55');
  for(const side of [-1,1])structureLine([[side*.17,-.53],[side*.23,-.6],[side*.28,-.53]],'#ffecb0',.02);
  paintBreedingOccupants(b,time,'#fff4b9');
}
