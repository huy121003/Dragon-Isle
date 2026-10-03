"use strict";

/* RENDER: Farm, Hatchery, Academy and Arena building renderers. */
function paintFarm(b,time,night){
  const mature=!!b.crop&&b.crop.readyAt<=Date.now();
  const crop=b.crop&&cropById(b.crop.id);
  structurePlinth('#aab779','#71845d','#526848','#e3d59b');
  // Curved raised beds, clean stone paths and irrigation channels read clearly at map scale.
  structurePoly([[-.43,.045],[-.23,-.045],[.43,.045],[.22,.14],[0,.22]],'#8b9e69','#e5dba7',.014);
  for(let row=0;row<3;row++){
    const y=-.015+row*.095,shift=(row-1)*.035;
    structurePoly([[-.38+shift,y-.035],[.18+shift,y-.035],[.34+shift,y+.018],[-.02+shift,y+.07]],
      row%2?'#76523a':'#835a3d','#bd8a55',.01);
    structureLine([[-.34+shift,y+.005],[.12+shift,y+.005]],'#c99a60',.008);
    if(b.crop)for(let col=0;col<4;col++){
      const x=-.27+col*.145+shift;
      structureCrop(x,y-.005,mature,time,crop||b.crop.id);
    }
  }
  // Irrigation glints and fence posts make the plots look maintained rather than bare dirt.
  for(let i=0;i<4;i++){
    const x=-.33+i*.22;
    structureLine([[x,.13],[x+.04,.17],[x+.09,.15]],'#76cbd0',.012);
  }
  for(const x of [-.43,.43]){
    structureLine([[x,.07],[x-.015,-.1],[x+.015,-.19]],'#75513c',.014);
    structureEllipse(x-.015,-.2,.026,.027,'#f7e4a4','#966b47',.006);
  }
  // Red-and-cream barn with readable doorway, windows and a raised roofline.
  structurePoly([[-.26,-.13],[-.04,-.21],[.2,-.13],[.2,-.43],[-.03,-.52],[-.26,-.43]],'#b4664a','#744b3f',.018);
  structurePoly([[.2,-.13],[.31,-.17],[.31,-.46],[.2,-.43]],'#774d42','#e4b876',.012);
  structurePoly([[-.31,-.42],[-.08,-.64],[.26,-.48],[.2,-.4],[-.03,-.51],[-.26,-.42]],
    b.level>=3?'#55745a':'#d59a58','#f5d89b',.017);
  structurePoly([[-.11,-.25],[-.11,-.43],[-.04,-.46],[.045,-.42],[.045,-.22]],'#573d36','#efcf91',.012);
  structureLine([[-.11,-.42],[.045,-.24]],'#dbad75',.01);
  for(const x of [-.21,.12]){
    structurePoly([[x,-.31],[x+.075,-.285],[x+.075,-.35],[x,-.375]],'#d9eff0','#725346',.01);
    structureLine([[x+.037,-.36],[x+.037,-.3]],'#725346',.008);
  }
  structurePoly([[.22,-.49],[.3,-.52],[.3,-.69],[.22,-.66]],'#8e7350','#f0cf8b',.01);
  structurePoly([[.205,-.69],[.26,-.74],[.315,-.68],[.3,-.64],[.22,-.65]],'#9d7950','#f0d49d',.01);
  // Higher Farm levels add visible equipment and richer planting rows.
  if(b.level>=2){
    structureLine([[-.36,-.1],[-.36,-.36]],'#6f5740',.018);
    ctx.save();ctx.translate(-.36,-.36);ctx.rotate(time*.0007);
    for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);structurePoly([[0,0],[.018,-.03],[.11,-.15],[-.012,-.12]],'#e8ddb1','#87965e',.008);}
    structureEllipse(0,0,.025,.025,'#f4d88d');ctx.restore();
  }
  if(b.level>=3){
    structureEllipse(-.28,-.4,.064,.12,'#d8bd85','#795941',.014);
    structurePoly([[-.34,-.5],[-.28,-.56],[-.22,-.5],[-.23,-.45],[-.33,-.45]],'#857252','#e5ce9e',.01);
  }
  if(b.level>=4){
    for(const x of [.32,.39]){
      structureLine([[x,.1],[x,-.16]],'#76523c',.013);
      structureEllipse(x,-.19,.055,.045,'#4f985a','#d4e7a1',.01);
      if(mature)structureEllipse(x+.018,-.18,.014,.018,'#edbf4c','#fff0ac',.004);
    }
  }
  const smoke=night>.4?Math.sin(time*.002)*.025:0;
  structureEllipse(.27+smoke,-.78,.035,.02,'#f4eee677');
  if(b.level>2)structureBanner(-.42,-.14,'#6d9660','#f7e6a4',time);
}

function paintHatchery(b,time,night){
  structurePlinth('#e6c995','#9e7c64','#7d655b','#ffedbc');
  // A cracked golden shell wraps an open, lit glass incubator.
  const shell=ctx.createLinearGradient(-.4,-.65,.38,.18);
  shell.addColorStop(0,'#fff9df');shell.addColorStop(.55,'#e3bc82');shell.addColorStop(1,'#a47a61');
  ctx.beginPath();ctx.moveTo(-.4,.04);
  ctx.bezierCurveTo(-.43,-.42,-.28,-.73,0,-.77);
  ctx.bezierCurveTo(.28,-.73,.43,-.42,.4,.04);
  ctx.quadraticCurveTo(0,.23,-.4,.04);ctx.fillStyle=shell;ctx.fill();
  ctx.strokeStyle='#fff6d7';ctx.lineWidth=.025;ctx.stroke();
  const glass=ctx.createLinearGradient(-.28,-.48,.32,.18);
  glass.addColorStop(0,'#c9eff0');glass.addColorStop(1,'#6a9ca7');
  ctx.beginPath();ctx.moveTo(-.29,.025);
  ctx.bezierCurveTo(-.3,-.39,-.16,-.61,0,-.62);
  ctx.bezierCurveTo(.16,-.61,.3,-.39,.29,.025);
  ctx.quadraticCurveTo(0,.125,-.29,.025);ctx.fillStyle=glass;ctx.fill();
  structureGlow(0,-.29,.32,night>.15?'#fceaa176':'#ffffff33');
  structureLine([[-.30,.025],[-.21,-.13],[-.03,-.15],[.09,-.3],[.28,-.33]],'#fff5d4',.024);
  structureLine([[-.12,-.57],[.01,-.67],[.14,-.53]],'#fffde0',.016);
  structurePoly([[-.4,.02],[-.28,.16],[.29,.16],[.4,.02],[.3,-.04],[.18,.04],
    [.05,-.02],[-.1,.07],[-.23,-.05]],'#f9e9bc','#c59b71',.012);
  const eggs=eggsInHatchery(b.id),slots=nestSlots(b.level);
  slots.forEach((slot,i)=>{
    const [x,y]=slot,r=b.level>=4?.078:.10;
    structureEllipse(x,y+.065,r*1.2,r*.42,'#79583f','#e9ca85',.012);
    structureLine([[x-r*.8,y+.06],[x,y+.085],[x+r*.8,y+.06]],'#f9e2a1',.014);
    if(eggs[i]){ctx.save();ctx.scale(1/structureUnitX,1/structureUnitY);
      drawEgg(ctx,eggs[i],x*structureUnitX,(y-.02)*structureUnitY,time,
        hatcheryEggScale(b.level,structureUnitX,structureUnitY));ctx.restore();}
  });
  structureLantern(-.36,-.05,'#ffcf88',time,night);
}

function paintAcademy(b,time,night){
  structurePlinth('#9ab6c6','#557796','#35536b','#d8e5ee');
  // Twin annexes sit behind a six-sided tower with visible sidewalls.
  for(const s of [-1,1]){
    structurePoly([[s*.16,-.15],[s*.4,-.12],[s*.42,-.38],[s*.17,-.46]],'#7495ae');
    structurePoly([[s*.15,-.46],[s*.29,-.64],[s*.43,-.38],[s*.3,-.29]],'#4d7099','#c6e4e9',.012);
    structureEllipse(s*.31,-.29,.037,.06,'#ffdc91','#e2f4fd',.008);
  }
  const wall=ctx.createLinearGradient(-.2,-.62,.22,.12);
  wall.addColorStop(0,'#dfedf1');wall.addColorStop(1,'#7195b2');
  structurePoly([[-.21,-.47],[0,-.56],[.21,-.47],[.21,.16],[0,.25],[-.21,.16]],wall,'#486786',.017);
  structurePoly([[.21,-.47],[.3,-.51],[.3,.11],[.21,.16]],'#426487');
  structurePoly([[-.26,-.48],[0,-.87],[.26,-.48],[0,-.57]],'#42699b','#e2f6f2',.015);
  structurePoly([[0,-.87],[.26,-.48],[.0,-.57]],'#7bb3c0');
  structureLine([[0,-.86],[0,-.98]],'#f2d38a',.02);
  structureEllipse(0,-.99,.035,.035,'#fff1aa');
  structurePoly([[-.095,.19],[-.095,-.04],[0,-.14],[.095,-.04],[.095,.19]],'#355372','#debe86',.014);
  structureLine([[0,-.13],[0,.2]],'#9bc0d0',.01);
  structurePoly([[-.07,-.39],[0,-.46],[.07,-.39],[0,-.32]],'#f7e4aa','#947a71',.012);
  for(const s of [-1,1])structureBanner(s*.38,-.15,'#5679a7','#f7dea3',time);
  if(night>.1)structureGlow(0,-.39,.19,'#ffeab277');
  if(b.level>=3){ctx.font='bold .12px system-ui';ctx.textAlign='center';ctx.fillStyle='#fbecbb';
    ctx.fillText(String(dragonLevelCap()),0,.11);}
}

function paintArena(b,time,night){
  structurePlinth('#dfc089','#9b775d','#75564e','#f8dfa6');
  // Sweeping stone stands and three tiered terraces around an open sand floor.
  for(let tier=0;tier<3;tier++){
    const rx=.44-tier*.065,ry=.29-tier*.045,y=-.095+tier*.025;
    ctx.beginPath();ctx.ellipse(0,y,rx,ry,0,Math.PI*1.02,Math.PI*1.98);
    ctx.strokeStyle=tier===0?'#74596a':'#e4b781';ctx.lineWidth=.074;ctx.stroke();
    ctx.strokeStyle='#ffe4aa';ctx.lineWidth=.014;ctx.stroke();
  }
  structureEllipse(0,.045,.3,.12,'#ad684f','#f5d595',.025);
  structureEllipse(0,.045,.23,.085,'#d2aa6e');
  for(const s of [-1,1]){
    structurePoly([[s*.36,-.04],[s*.4,-.33],[s*.47,-.34],[s*.48,.08]],'#b78c72','#ffe2b0',.014);
    structurePoly([[s*.37,-.34],[s*.435,-.49],[s*.49,-.34]],'#bc7567');
    structureBanner(s*.38,-.19,s<0?'#a64f5c':'#557db0','#f4dba0',time);
  }
  structureLine([[-.1,.12],[.095,-.11]],'#f8e9bd',.024);
  structureLine([[.1,.12],[-.095,-.11]],'#f8e9bd',.024);
  structureEllipse(0,.015,.032,.035,'#ffe5a7');
  if(night>.2)structureGlow(0,.02,.29,'#ffe4a244');
}
