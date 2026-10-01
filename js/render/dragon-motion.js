"use strict";
/* Persistent joint springs give appendages follow-through without storing animation in saves. */
const dragonMotion=new Map();
const MOTION_CONFIG={spring:85,damping:12,blendMs:220,maxStep:.05,segments:5};
function dragonPose(dragon,time,activity,x){
  const id=dragon.id||0,key=id||('gallery:'+dragon.species);
  let pose=dragonMotion.get(key);
  if(!pose){pose={last:time,state:activity.id,blend:1,tail:Array(MOTION_CONFIG.segments).fill(0),
    velocity:Array(MOTION_CONFIG.segments).fill(0),neck:0,neckVelocity:0};dragonMotion.set(key,pose);}
  const dt=Math.max(0,Math.min(MOTION_CONFIG.maxStep,(time-pose.last)/1000));pose.last=time;
  if(pose.state!==activity.id){pose.previous=pose.state;pose.state=activity.id;pose.blend=0;}
  pose.blend=Math.min(1,pose.blend+dt*1000/MOTION_CONFIG.blendMs);
  const phase=time*.003+id*1.37;
  const target=activity.id==='sleep'?0:Math.sin(phase)*(.35+(activity.id==='happy'?.25:0));
  for(let n=0;n<pose.tail.length;n++){
    const next=n?pose.tail[n-1]*.88:target;
    pose.velocity[n]+=(next-pose.tail[n])*MOTION_CONFIG.spring*dt;
    pose.velocity[n]*=Math.exp(-MOTION_CONFIG.damping*dt);
    pose.tail[n]+=pose.velocity[n]*dt;
  }
  const look=ui.pointerWorld&&id?Math.max(-1,Math.min(1,(ui.pointerWorld.x-x)/80)):Math.sin(phase*.35);
  pose.neckVelocity+=(look*.22-pose.neck)*MOTION_CONFIG.spring*dt;
  pose.neckVelocity*=Math.exp(-MOTION_CONFIG.damping*dt);
  pose.neck+=pose.neckVelocity*dt;
  pose.phase=phase;pose.breath=1+Math.sin(phase*.65)*.018;
  const flap=(phase*1.7)%(Math.PI*2),down=Math.max(0,Math.sin(flap));
  pose.flap=Math.pow(down,1.8)-Math.pow(Math.max(0,-Math.sin(flap)),.6)*.45;
  return pose;
}
