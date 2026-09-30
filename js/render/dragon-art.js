"use strict";

/* RENDER: Một hàm dựng rồng cho đảo, chuồng, hang lai và mọi ảnh Canvas trong giao diện. */
function drawDragon(context,params){
  const dragon=params.dragon,species=DATA.species[dragon.species];
  if(!species)return;
  const colors=species.detail.mau,form=DATA.dragonForms[species.elements[0]];
  const doubled=species.rarity==="transcendent";
  const drawPrimary=doubled?null:DRAGON_SILHOUETTES[form.silhouette];
  if(!drawPrimary&&!doubled)return;
  const time=params.time||0,stage=dragon.level<10?.74:dragon.level<30?1:1.22;
  const activity=params.activity||(dragon.id===0?{id:"walk"}:dragonActivity(dragon,Date.now()));
  const pose=dragonPose(dragon,time,activity,params.x),artTime=activity.id==="sleep"?0:time;
  const tierScale=doubled?1.31:[1,1,1.08,1.16,1.25][species.elements.length];
  const scale=(params.scale||1)*stage*tierScale;
  const motion={stride:[.003,1.4],swim:[.003,3],heavy:[.002,.7],
    hover:[.0032,3],prowl:[.0026,1],jitter:[.007,1.3]}[form.motion]||[.003,1];
  const bob=activity.id==="sleep"?0:Math.sin(time*motion[0]+dragon.id*.73)*motion[1]*(.5+.5*pose.blend);
  const jumpAt=ui.jumps.get(dragon.id)||0,jumpPhase=(time-jumpAt)/520;
  const activeJump=activity.id==="jump"?Math.pow(Math.max(0,Math.sin(time*.006+dragon.id)),2)*8:0;
  const jump=(jumpPhase>=0&&jumpPhase<1?Math.sin(jumpPhase*Math.PI)*15:0)+activeJump;
  context.save();
  context.fillStyle=form.motion==="hover"||form.motion==="swim"?"#25494825":"#24494848";
  context.beginPath();context.ellipse(params.x,params.y+18,24*scale,4*scale,0,0,Math.PI*2);context.fill();
  context.translate(params.x,params.y+bob-jump);
  const stretch=jump>1?1+Math.sin(Math.min(1,jump/15)*Math.PI)*.09:1;
  context.scale(scale*stretch*(params.facing===-1?-1:1),scale/stretch*pose.breath);
  if(activity.id==="sleep")context.rotate(-.035);
  if(activity.id==="happy")context.rotate(Math.sin(time*.008+dragon.id)*.06*pose.blend);
  if(species.rarity==="legendary"||species.rarity==="mythic"||doubled){
    context.strokeStyle=colors.haoQuang||colors.hao||colors.thanSang;
    context.globalAlpha=.45;context.lineWidth=2.5;
    context.beginPath();context.ellipse(-2,-18,58,43,0,0,Math.PI*2);context.stroke();
    context.globalAlpha=1;
  }
  /* Hệ thứ ba mở rộng bóng dáng từ phía sau, rồi phủ chi tiết phía trước thân. */
  drawTertiaryBack(context,species,artTime,dragon.id);
  if(doubled)drawDoubleDragon(context,species,colors,artTime,dragon.id);
  else drawPrimary(context,colors,artTime,dragon.id);
  /* Hệ 2 thêm cánh/đuôi; hệ 3 thêm áo choàng, vây, giáp hoặc năng lượng lớn. */
  if(!doubled)artHybrid(context,species,colors,form);
  drawTertiaryFront(context,species,artTime,dragon.id);
  if(!doubled)artFourth(context,species,artTime);
  if(!doubled)drawDragonJoints(context,species,colors,pose,time,dragon.id);
  if(dragon.level>=10){
    artStroke(context,[[-19,-8],[-10,-5]],colors.thanSang,1.8);
    artStroke(context,[[-6,-10],[2,-7]],colors.thanSang,1.8);
  }
  if(dragon.level>=30){
    artSpikes(context,colors,[[-19,-25,7],[-5,-28,8]],
      species.elements[2]?DATA.elements[species.elements[2]].light:colors.sung);
  }
  /* RENDER: Các trạng thái có chuyển động/biểu tượng chung trên mọi dáng rồng. */
  if(activity.id==="sleep"){
    context.globalAlpha=.75;context.fillStyle="#374967";context.font="bold 14px system-ui";
    context.fillText("Zᶻ",15,-48+Math.sin(time*.002)*3);context.globalAlpha=1;
  }else if(activity.id==="happy"){
    context.fillStyle="#f06b94";context.font="bold 15px system-ui";
    context.fillText("♥",16,-51+Math.sin(time*.007)*4);
  }
  context.restore();
}
