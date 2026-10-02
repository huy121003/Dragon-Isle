import React from 'react';
import {Button,Card,Space} from 'antd';
import {send,text} from '../app/game-bridge.js';
import {useAppStore} from '../app/store.js';

export default function GameHud({account,state,xpNeeded,onAdmin,refProp}){
  // HUD values change during world ticks; keep those updates inside this component.
  const worldRevision=useAppStore(store=>store.worldRevision);
  void worldRevision;
  const xp=Math.min(100,Math.round(state.player.xp/xpNeeded*100));
  const xpLabel=`${Math.floor(state.player.xp).toLocaleString('en-US')} / ${xpNeeded.toLocaleString('en-US')} XP`;
  return <header ref={refProp} className="react-hud">
    <div className="hud-identity"><span className="hud-dragon">🐉</span><div>
      <b>Dragon Isle</b><small>Level {state.player.level} · {account.username}</small>
      <div className="hud-xp-track" role="progressbar" aria-label="Player experience"
        aria-valuemin={0} aria-valuenow={Math.floor(state.player.xp)} aria-valuemax={xpNeeded}>
        <span className="hud-xp-fill" style={{width:xp+'%'}}/><span className="hud-xp-label">{xpLabel}</span>
      </div>
    </div></div>
    <div className="hud-resources">
      <Card size="small"><span>🪙</span><b>{state.gold.toLocaleString('en-US')}</b><small>{text('incomeRate')}</small></Card>
      <Card size="small"><span>🍎</span><b>{state.food.toLocaleString('en-US')}</b></Card>
      <Card size="small"><span>💎</span><b>{state.gems.toLocaleString('en-US')}</b></Card>
    </div>
    <Space className="hud-tools">
      {account.role==='admin'&&<Button onClick={onAdmin}>⚙ Admin</Button>}
      <Button onClick={()=>send({action:'logout'})}>Sign out</Button>
    </Space>
  </header>;
}
