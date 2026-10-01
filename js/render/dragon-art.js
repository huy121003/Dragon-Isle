"use strict";

/* World, cards, book, breeding preview and Arena all call this same renderer. */
function dragonPortraitPlacement(width,height,level){
  const stage=level<10?.74:level<30?1:1.2;
  return {x:width*.60,y:height*.74,
    scale:Math.min(width/168,height/124)/stage};
}
function drawDragon(context,params){
  const dragon=params.dragon,species=DATA.species[dragon.species];
  if(!species)return;
  const form=DATA.dragonForms[species.elements[0]],colors=species.detail.mau;
  if(!form)return;
  const time=params.time||0,level=dragon.level||1;
  const activity=params.activity||(dragon.id===0?{id:"walk"}:dragonActivity(dragon,Date.now()));
  const pose=dragonPose(dragon,time,activity,params.x);
  const stage=level<10?.74:level<30?1:1.2;
  const scale=(params.scale||1)*stage*(species.rarity==='transcendent'?1.05:1);
  const phase=time*.001;
  const float=form.motion==='hover'||form.motion==='swim';
  const idle=activity.id==='sleep'?0:Math.sin(phase*(float?3:4)+dragon.id*.73)*
    (float?2.5:1.4)*(.5+.5*pose.blend);
  const jumpAt=ui.jumps.get(dragon.id)||0,elapsed=(time-jumpAt)/520;
  const jump=(elapsed>=0&&elapsed<1?Math.sin(elapsed*Math.PI)*15:0)+
    (activity.id==='jump'?Math.sin(phase*6+dragon.id)**2*8:0);
  context.save();
  context.globalAlpha=float?.17:.26;
  context.fillStyle="#244948";context.beginPath();
  context.ellipse(params.x,params.y+17,24*scale,4*scale,0,0,Math.PI*2);context.fill();
  context.globalAlpha=1;
  context.translate(params.x,params.y+idle-jump);
  context.scale(scale*(params.facing===-1?-1:1),scale*pose.breath);
  if(activity.id==='sleep')context.rotate(-.035);
  if(activity.id==='happy')context.rotate(Math.sin(phase*8+dragon.id)*.045*pose.blend);
  drawDragonForm(context,species,colors,form,pose,
    activity.id==='sleep'?0:time,dragon.id,level);
  if(activity.id==='sleep'){
    context.globalAlpha=.75;context.fillStyle="#374967";
    context.font="bold 14px system-ui";context.fillText("Zᶻ",20,-53+Math.sin(phase*2)*3);
  }else if(activity.id==='happy'){
    context.fillStyle="#f06b94";context.font="bold 15px system-ui";
    context.fillText("♥",20,-53+Math.sin(phase*7)*4);
  }
  context.restore();
}
