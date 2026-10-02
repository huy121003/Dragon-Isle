import {useEffect,useRef,useState} from 'react';
import {measureDragonAnchor} from './battle-geometry.mjs';

/** Track the painted body positions while the field resizes or dragons switch. */
export function useBattleAnchors(battle){
  const stageRef=useRef(null);
  const [anchors,setAnchors]=useState({});
  useEffect(()=>{
    if(!battle)return;
    let request,last=0;
    const track=time=>{
      if(time-last>=160){
        last=time;
        const stage=stageRef.current;
        const attack=measureDragonAnchor(stage?.querySelector('.battle-side.player .battle-dragon canvas'),stage);
        const defense=measureDragonAnchor(stage?.querySelector('.battle-side.opponent .battle-dragon canvas'),stage);
        if(attack&&defense)setAnchors(previous=>{
          const changed=['attack','defense'].some(side=>{
            const before=previous[side],after=side==='attack'?attack:defense;
            return !before||Math.abs(before.x-after.x)>4||Math.abs(before.y-after.y)>4;
          });
          return changed?{attack,defense}:previous;
        });
      }
      request=requestAnimationFrame(track);
    };
    request=requestAnimationFrame(track);
    return()=>cancelAnimationFrame(request);
  },[!!battle,battle?.activeAttack,battle?.activeDefense]);
  return {stageRef,anchors};
}
