"use strict";
/* Persistent joint springs give appendages follow-through without storing animation in saves. */
const dragonMotion=new Map();
const MOTION_CONFIG={spring:85,damping:12,maxStep:.05,segments:5,
  pace:{stride:.006,heavy:.0035,prowl:.005,hover:.004,swim:.0038,jitter:.008}};
/* Cumulative distance along a sine path: the gait keeps moving forward after each turn. */
function dragonTravelPhase(phase){
  const quarter=Math.floor(phase/(Math.PI/2));
  const local=phase-quarter*Math.PI/2;
  return (quarter+(quarter%2===0?Math.sin(local):1-Math.cos(local)))*Math.PI*1.5;
}
function dragonPose(dragon,time,form,x,locomotion,stepPhase){
  const id=dragon.id||0,key=id||('gallery:'+dragon.species);
  let pose=dragonMotion.get(key);
  if(!pose){pose={last:time,tail:Array(MOTION_CONFIG.segments).fill(0),
    velocity:Array(MOTION_CONFIG.segments).fill(0),neck:0,neckVelocity:0};dragonMotion.set(key,pose);}
  const dt=Math.max(0,Math.min(MOTION_CONFIG.maxStep,(time-pose.last)/1000));pose.last=time;
  const phase=time*(MOTION_CONFIG.pace[form.motion]||MOTION_CONFIG.pace.stride)+id*1.37;
  const target=Math.sin(phase)*.5;
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
  pose.phase=phase;pose.stepPhase=locomotion?(stepPhase??phase):0;pose.locomotion=locomotion;
  pose.breath=1+Math.sin(phase*.65)*.018;
  pose.bob=!locomotion?0:form.motion==='hover'?Math.sin(phase)*3:
    form.motion==='swim'?Math.sin(phase)*1.7:
    form.motion==='heavy'?Math.sin(phase*2)*.6:Math.sin(phase*2)*1.1;
  const flap=(phase*1.7)%(Math.PI*2),down=Math.max(0,Math.sin(flap));
  pose.flap=Math.pow(down,1.8)-Math.pow(Math.max(0,-Math.sin(flap)),.6)*.45;
  return pose;
}
