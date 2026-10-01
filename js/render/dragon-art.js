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
  const pose=dragonPose(dragon,time,form,params.x,params.locomotion!==false,params.stepPhase);
  const stage=level<10?.74:level<30?1:1.2;
  const scale=(params.scale||1)*stage*(species.rarity==='transcendent'?1.05:1);
  const float=form.motion==='hover'||form.motion==='swim';
  context.save();
  context.globalAlpha=float?.17:.26;
  context.fillStyle="#244948";context.beginPath();
  context.ellipse(params.x,params.y+17,24*scale,4*scale,0,0,Math.PI*2);context.fill();
  context.globalAlpha=1;
  context.translate(params.x,params.y+pose.bob);
  context.scale(scale*(params.facing===-1?-1:1),scale*pose.breath);
  drawDragonForm(context,species,colors,form,pose,time,dragon.id,level);
  context.restore();
}
