import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createBattleEngine}=require('../../server/arena/battle-engine.cjs');

const stat=(hp,attack,defense)=>({hp,tanCong:attack,phongThu:defense});
const catalog={
  elements:{
    fire:{chiSo:stat(100,50,30)},water:{chiSo:stat(110,45,35)}
  },
  rarities:{common:{heSoChiSo:1}},
  species:[
    {id:'fire',elements:['fire'],doHiem:'common'},
    {id:'water',elements:['water'],doHiem:'common'}
  ],
  typeChart:{fire:{fire:1,water:.5},water:{fire:2,water:1}}
};
const game={skills:{
  neutral:[
    {id:'claw',name:'Claw',power:.9},
    {id:'slam',name:'Slam',power:1.15}
  ],
  elemental:{
    fire:[{id:'fire-1',name:'Flame',power:1,bonus:.5},{id:'fire-2',name:'Inferno',power:1,bonus:.8}],
    water:[{id:'water-1',name:'Wave',power:1,bonus:.5},{id:'water-2',name:'Tide',power:1,bonus:.8}]
  }
}};

function sequence(values){
  let index=0;
  return ()=>values[index++%values.length];
}
function dragon(id,species){
  return {id,species,nickname:species+'-'+id,level:30,stars:0};
}

describe('authoritative battle engine',()=>{
  it('builds fighters from shared combat rules',()=>{
    const engine=createBattleEngine({catalog,game,rng:()=>.5});
    const fighter=engine.makeFighter(dragon(1,'fire'));
    expect(fighter.parts).toEqual(['fire']);
    expect(fighter.hp).toBeGreaterThan(0);
    expect(fighter.attack).toBeGreaterThan(0);
    expect(fighter.defense).toBeGreaterThan(0);
    expect(fighter.skills.map(skill=>skill.id)).toEqual(['claw','slam','fire-1','fire-2']);
  });

  it('is replayable when RNG is injected',()=>{
    const rolls=[.2,.7,.4,.6,.1,.8,.3,.9];
    const run=()=>{
      const engine=createBattleEngine({catalog,game,rng:sequence(rolls)});
      return engine.fight(
        [dragon(1,'fire'),dragon(2,'water'),dragon(3,'fire')],
        [dragon(4,'water'),dragon(5,'fire'),dragon(6,'water')]
      );
    };
    expect(run()).toEqual(run());
  });

  it('enforces turn ownership in live challenge battles',()=>{
    const engine=createBattleEngine({catalog,game,rng:()=>.5});
    const battle={turn:1,nextSide:'attack',events:[],activeAttack:0,activeDefense:0,
      attack:[engine.makeFighter(dragon(1,'fire'))],
      defense:[engine.makeFighter(dragon(2,'water'))]};
    expect(()=>engine.liveTurn(battle,'defense',{action:'skill',skillIndex:0}))
      .toThrow(/Wait for the other player/);
    expect(()=>engine.liveTurn(battle,'attack',{action:'skill',skillIndex:0})).not.toThrow();
    expect(battle.nextSide).toBe('defense');
  });
});
