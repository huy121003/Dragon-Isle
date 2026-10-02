import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import arenaConfig from '../js/config/arena.js';
import challengeConfig from '../js/config/challenge.js';
import combatConfig from '../js/config/combat.js';
import dragonConfig from '../js/config/dragons.js';

const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
  globalThis.window={confirm:()=>true,DragonConfig:{arena:arenaConfig,challenge:challengeConfig,combat:combatConfig,dragons:dragonConfig},DragonGame:{data:{
    species:{fire:{name:'Fire Dragon',elements:['fire'],rarity:'common'}},
    elements:{fire:{name:'Fire',color:'#e45'}},
    rarities:{common:{name:'Common',color:'#aaa'}}
  }}};
  const {default:ChallengeView}=await server.ssrLoadModule('/src/features/challenge/ChallengeView.jsx');
  const now=Date.now();
  const reconnecting={opponent:'Bela',opponentConnection:'reconnecting',
    opponentReconnectUntil:now+45000,id:'m1',ready:false,opponentReady:false};

  const invited=renderToStaticMarkup(React.createElement(ChallengeView,{
    status:{busy:false,match:{...reconnecting,phase:'invited',outgoing:false,until:now+30000}},
    request:()=>{},refresh:()=>{}
  }));
  assert.match(invited,/Bela is reconnecting/);
  assert.match(invited,/Challenge actions are paused/);
  assert.match(invited,/>Accept<\/span><\/button>|>Accept<\/button>/);
  const acceptButton=invited.match(/<button[^>]*>[^<]*(?:<span[^>]*>)?Accept/);
  assert(acceptButton&&/disabled=""/.test(acceptButton[0]),'Accept must be disabled while opponent reconnects');
  const declineButton=invited.match(/<button[^>]*>[^<]*(?:<span[^>]*>)?Decline/);
  assert(declineButton&&!/disabled=""/.test(declineButton[0]),'Decline must remain available');

  const dragon={id:2,nickname:'A',species:'fire',level:20,canBattle:true,
    skills:[{index:0,name:'Flame',power:1.2,unlocked:true,element:'fire'}]};
  const selecting=renderToStaticMarkup(React.createElement(ChallengeView,{
    status:{busy:false,match:{...reconnecting,phase:'select',roster:[dragon],selection:[]}},
    request:()=>{},refresh:()=>{}
  }));
  assert.match(selecting,/challenge-reconnecting/);
  assert.match(selecting,new RegExp('Ready with these '+challengeConfig.teamSize));

  const battleDragon={...dragon,hp:500,maxHp:500};
  const battle=renderToStaticMarkup(React.createElement(ChallengeView,{
    status:{busy:false,match:{...reconnecting,phase:'battle',myTurn:true,eventSeq:0,
      battle:{turn:1,nextSide:'attack',attack:[battleDragon],defense:[{...battleDragon,id:3,nickname:'B'}],
        activeAttack:0,activeDefense:0,events:[]}}},
    request:()=>{},refresh:()=>{}
  }));
  assert.match(battle,/Bela is reconnecting/);
  assert.match(battle,/disabled=""/,'Battle controls must be disabled while opponent reconnects');

  console.log('PASS challenge reconnect UI pause and countdown');
}finally{await server.close();}
