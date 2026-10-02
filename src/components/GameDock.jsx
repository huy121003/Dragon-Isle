import React from 'react';
import {Button} from 'antd';
import {send,text} from '../app/game-bridge.js';

const BASE_BUTTONS=[
  ['📅','Daily Missions','open-daily-missions'],['🗺️','Islands','open-islands'],
  ['🏪','Shop','open-shop'],['🐲','Dragons','open-dragons'],
  ['📖','Dragon Book','open-book'],['🎒','Inventory','open-inventory'],['📚','Hướng dẫn','open-guide']
];
export default function GameDock({state,ui,challengeOpen,openChallenge,refProp}){
  const buttons=[...BASE_BUTTONS];
  const arenaConfig=window.DragonConfig.arena;
  const modalSection={"shop-egg-detail":"shop","dragon-detail":"dragons","book-detail":ui?.returnModal?.name||"book"};
  const activeSection=modalSection[ui?.modal?.name]||ui?.modal?.name;
  if(state.buildings.some(building=>building.type==='arena'&&!building.stored))
    buttons.push(['⚔️','Arena','open-arena']);
  const breedingParents=new Set(state.buildings.filter(building=>
    (building.type==='cave'||building.type==='premiumCave')&&building.breeding)
    .flatMap(building=>[building.breeding.fatherId,building.breeding.motherId]));
  if(state.dragons.filter(dragon=>dragon.level>=arenaConfig.minBattleLevel&&
    dragon.level<=arenaConfig.maxBattleLevel&&!breedingParents.has(dragon.id)).length>=arenaConfig.teamSize)
    buttons.push(['🗡️','Thách đấu','open-challenge']);
  return <nav ref={refProp} className="react-dock" aria-label="Main menu">
    {buttons.map(([icon,label,action])=><Button key={action}
      className={activeSection===action.slice(5)||action==='open-challenge'&&challengeOpen?'selected':''}
      onClick={()=>action==='open-challenge'?openChallenge():send({action})}>
      <span>{icon}</span><b>{label}</b>{action==='open-book'&&<small>{text('collectionProgress')}</small>}
    </Button>)}
  </nav>;
}
