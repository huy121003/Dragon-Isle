/**
 * Locate a fighter's torso in the stage from the visible canvas pixels.
 * Dragon designs and CSS sizing vary, so a fixed percentage of the field
 * cannot reliably place skill impacts on the body.
 */
export function measureDragonAnchor(canvas,stage){
  if(!canvas||!stage)return null;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)return null;
  const width=canvas.width,height=canvas.height;
  let pixels;
  try{pixels=context.getImageData(0,0,width,height).data;}catch{return null;}
  let left=width,right=0,top=height,bottom=0;
  for(let y=0;y<height;y+=3)for(let x=0;x<width;x+=3){
    if(pixels[(y*width+x)*4+3]<48)continue;
    left=Math.min(left,x);right=Math.max(right,x);
    top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(top>bottom)return null;
  const canvasBox=canvas.getBoundingClientRect(),stageBox=stage.getBoundingClientRect();
  // Two thirds down the visible silhouette points at the torso, below the head.
  return {x:canvasBox.left-stageBox.left+(left+right)/2/width*canvasBox.width,
    y:canvasBox.top-stageBox.top+(top+(bottom-top)*.68)/height*canvasBox.height};
}
