"use strict";

/* Shared brushwork for the articulated dragon designs. */
function artTrace(c,commands){
  c.beginPath();
  commands.forEach(function(v,i){
    if(i===0)c.moveTo(v[0],v[1]);
    else if(v.length===2)c.lineTo(v[0],v[1]);
    else if(v.length===4)c.quadraticCurveTo(v[0],v[1],v[2],v[3]);
    else c.bezierCurveTo(v[0],v[1],v[2],v[3],v[4],v[5]);
  });
}
function artFill(c,commands,color,edge,width){
  artTrace(c,commands);c.closePath();c.fillStyle=color;c.fill();
  if(edge){c.strokeStyle=edge;c.lineWidth=width||1.8;c.lineJoin="round";c.stroke();}
}
function artStroke(c,commands,color,width){
  artTrace(c,commands);c.strokeStyle=color;c.lineWidth=width;
  c.lineCap="round";c.lineJoin="round";c.stroke();
}
function artOval(c,x,y,rx,ry,color,angle){
  c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle||0,0,Math.PI*2);c.fill();
}
function artBody(c,commands,p){
  const g=c.createLinearGradient(-26,-31,26,20);
  g.addColorStop(0,p.thanSang);g.addColorStop(.43,p.than);g.addColorStop(1,p.thanToi);
  artFill(c,commands,g,p.vien,2.2);
}
function artEye(c,p,x,y,time,id,angle){
  const blink=Math.sin(time*.0016+id*3.7)>.995;
  c.save();c.translate(x,y);c.rotate(angle||0);
  artFill(c,[[-5,-2],[5,-1],[2,3],[-4,2]],blink?p.thanToi:p.mat);
  if(!blink)artOval(c,1,0,1,2,p.vien);
  artStroke(c,[[-6,-4],[5,-2]],p.vien,2.4);
  c.restore();
}
function artSpikes(c,p,coords,color){
  coords.forEach(function(v){
    artFill(c,[[v[0]-5,v[1]+5],[v[0],v[1]-v[2]],[v[0]+5,v[1]+4]],
      color||p.sung,p.vien,1.2);
  });
}
