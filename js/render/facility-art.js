"use strict";

/* RENDER: Farm, Hatchery, Academy and Arena building renderers. */
function paintFarm(b,time,night){
  structurePlinth('#a28c58','#766449','#655342','#d9c67e');
  // Terraced rows, each with curved soil grooves and actual crops.
  for(let row=0;row<3;row++){
    const y=.025+row*.075;
    structurePoly([[-.38+row*.055,y-.057],[.17+row*.05,y-.057],
      [.34+row*.025,y],[0+row*.05,y+.048]],row%2?'#674935':'#7b5335','#ab7947',.008);
    if(b.crop)for(let col=0;col<3;col++){
      const x=-.25+col*.2+row*.035;
      structureCrop(x,y-.02,b.crop.readyAt<=Date.now(),time,
        b.crop.id==='dragonfruit'?'#f270a1':b.crop.id==='pumpkin'?'#efac45':'#f8d277');
    }
  }
  // Elevated wooden granary with a pitched two-sided roof and chimney.
  structurePoly([[-.27,-.16],[.03,-.24],[.25,-.16],[.25,-.43],[-.03,-.53],[-.27,-.43]],'#986a49');
  structurePoly([[-.27,-.43],[-.03,-.61],[.25,-.43],[.04,-.37],[-.03,-.48]],'#dc9860','#ffe1a0',.014);
  structurePoly([[.04,-.37],[.25,-.43],[.25,-.16],[.04,-.12]],'#684d3e');
  structurePoly([[-.115,-.22],[-.115,-.39],[-.035,-.42],[.035,-.39],[.035,-.2]],'#513e35','#eec990',.011);
  structureLine([[-.115,-.38],[.035,-.22]],'#e5ba83',.012);
  structureLine([[-.24,-.29],[.005,-.35]],'#e5bd8a',.01);
  structurePoly([[.14,-.53],[.21,-.55],[.21,-.75],[.14,-.72]],'#887257');
  const smoke=night>.4?Math.sin(time*.002)*.025:0;
  structureEllipse(.2+smoke,-.78,.04,.023,'#f4eee688');
  if(b.level>2)structureBanner(-.34,-.14,'#79b36b','#f7e6a4',time);
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
