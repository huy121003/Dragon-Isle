import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {measureDragonAnchor} from '../../src/features/arena/battle-geometry.mjs';
const require=createRequire(import.meta.url);
const arenaConfig=require('../../js/config/arena.js');
const progression=require('../../js/config/progression.js');
const {publicBattle}=require('../../server/arena/battle-view.cjs');

it('places a skill impact at the painted dragon torso after canvas scaling',()=>{
  const width=12,height=12,pixels=new Uint8ClampedArray(width*height*4);
  for(let y=3;y<=9;y++)for(let x=3;x<=9;x++)pixels[(y*width+x)*4+3]=255;
  const stage={getBoundingClientRect:()=>({left:100,top:200})};
  const canvas={width,height,getContext:()=>({getImageData:()=>({data:pixels})}),
    getBoundingClientRect:()=>({left:150,top:250,width:120,height:120})};
  expect(measureDragonAnchor(canvas,stage)).toEqual({x:110,y:120.8});
  canvas.getBoundingClientRect=()=>({left:150,top:250,width:120,height:60});
  expect(measureDragonAnchor(canvas,stage).y).toBe(85.4);
  pixels.fill(0);
  expect(measureDragonAnchor(canvas,stage)).toBeNull();
});

it('unlocks Arena and Challenge at level 5 and skill slots at 1/5/10/15',()=>{
  expect(arenaConfig.minBattleLevel).toBe(5);
  expect(progression.skillUnlockLevels).toEqual([1,5,10,15]);
  const fighter=level=>({id:level,species:'fire',nickname:'Tester',level,stars:0,hp:100,
    maxHp:100,statuses:[],skills:Array.from({length:4},(_,index)=>({name:'Skill '+index,power:1})),
    cooldowns:[0,0,0,0]});
  for(const [level,count] of [[1,1],[4,1],[5,2],[9,2],[10,3],[14,3],[15,4]]){
    const view=publicBattle({opponent:'Bot',turn:1,attack:[fighter(level)],defense:[],
      activeAttack:0,activeDefense:0,events:[]});
    expect(view.attack[0].skills.filter(skill=>skill.unlocked)).toHaveLength(count);
  }
});
