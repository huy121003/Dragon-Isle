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
function drawDragonJoints(c,s,p,pose,time,id){
  const primary=s.elements[0],second=s.elements[1];
  const tailColor=second?DATA.elements[second].light:p.thanSang;
  c.save();c.lineCap='round';c.lineJoin='round';
  // The wing root and head ornaments follow the eased flap and pointer spring.
  if(['wind','thunder','light','dark','fire'].includes(primary)){
    const wingLift=pose.flap*9;
    c.strokeStyle=p.canh||tailColor;c.globalAlpha=.68;c.lineWidth=2.3;
    c.beginPath();c.moveTo(-11,-11);c.quadraticCurveTo(-24,-31-wingLift,-39,-40-wingLift);
    c.stroke();c.globalAlpha=1;
  }
  c.strokeStyle=p.sung||tailColor;c.globalAlpha=.65;c.lineWidth=1.6;
  c.beginPath();c.moveTo(14,-20);c.quadraticCurveTo(22+pose.neck*8,-25,27+pose.neck*9,-27);
  c.stroke();c.globalAlpha=1;
  const tail=pose.tail;
  if(['water','wind','dark'].includes(primary)){
    c.strokeStyle=tailColor;c.globalAlpha=.78;c.lineWidth=primary==='dark'?5:3.6;
    c.beginPath();c.moveTo(-32,0);
    for(let i=0;i<tail.length;i++)c.lineTo(-40-i*6,2+i*2+tail[i]*15);
    c.stroke();
    if(primary==='water')for(let i=0;i<3;i++){
      c.beginPath();c.moveTo(-54+i*5,10+tail[i]*10);c.lineTo(-60+i*5,14+tail[i]*13);c.stroke();
    }
  }else{
    c.strokeStyle=p.vien;c.lineWidth=5;c.beginPath();c.moveTo(-25,2);
    for(let i=0;i<tail.length;i++)c.lineTo(-32-i*6,4+i*1.6+tail[i]*12);c.stroke();
    c.strokeStyle=tailColor;c.lineWidth=2.8;c.stroke();
  }
  if(primary==='fire'){
    c.fillStyle='#ffca67';for(let n=0;n<3;n++){
      const x=-57-n*2,y=13+tail[4]*12-n*6;
      c.globalAlpha=.5+.45*Math.sin(time*.007+n+id)**2;
      c.beginPath();c.ellipse(x,y,2.5,5,0,0,Math.PI*2);c.fill();
    }
  }
  if(primary==='metal'){
    c.strokeStyle='#f6d986';c.lineWidth=2;c.beginPath();
    c.arc(-5,-8,4+Math.sin(time*.004+id),0,Math.PI*2);c.stroke();
  }
  c.restore();
}
