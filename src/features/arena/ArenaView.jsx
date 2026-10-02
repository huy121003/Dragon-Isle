/* Arena screen orchestration: team setup, opponent list and battle hand-off. */
import React,{useState} from 'react';
import {Button,Tag} from 'antd';
import '../../arena.css';
import {emitRuntime,send} from '../../app/game-bridge.js';
import {arenaConfig,ElementFilter,fmt,RosterCard,speciesOf,TeamSlots} from './ArenaShared.jsx';
import {Battle} from './ArenaBattle.jsx';
import ResourceAmount from '../../components/ResourceAmount.jsx';

function ArenaSetup({arena}){
  const [elements,setElements]=useState([]),data=arena.data;
  const config=arenaConfig(),teamSize=config.teamSize,minLevel=config.minBattleLevel;
  if(!data)return <div className="arena-loading">⏳ Loading Arena…
    {arena.error&&<p>{arena.error}</p>}<Button onClick={()=>send({action:'arena-refresh'})}>Reload</Button></div>;
  const visibleDragons=data.dragons.filter(dragon=>elements.every(id=>speciesOf(dragon.species)?.elements.includes(id)));
  const resetSeconds=Math.max(0,Math.ceil(((data.resetAt||0)-Date.now())/1000));
  const resetText=Math.floor(resetSeconds/3600)+'h '+String(Math.floor(resetSeconds%3600/60)).padStart(2,'0')+'m';
  return <div className="arena-hub">
    <div className="arena-hub-hero"><span className="arena-crest">⚔</span><div><small>DRAGON ISLE · PVP</small>
      <h2>Dragon Arena</h2><p>Choose your attack team and challenge server-generated rivals.</p></div>
      <Button onClick={()=>send({action:'arena-refresh'})} disabled={arena.busy}>↻ Refresh</Button></div>
    <div className="arena-record"><span>🏆 Wins <b>{fmt.format(data.wins||0)}</b></span>
      <span>🛡 Losses <b>{fmt.format(data.losses||0)}</b></span>
      <span>⚔ Attempts <b>{data.attemptsRemaining??3}/3</b></span><small>Resets in {resetText}</small></div>
    {arena.error&&<div className="arena-error">{arena.error}</div>}
    {arena.result&&<div className={'arena-finish '+(arena.result.won?'win':'lose')}>
      <span>{arena.result.won?'🏆':'💔'}</span><div><b>{arena.result.won?'Victory!':'Defeat'}</b>
      <small>{arena.result.won?<><ResourceAmount kind="gold" amount={arena.result.reward.gold}/>{' '}<ResourceAmount kind="food" amount={arena.result.reward.food}/>{' '}<ResourceAmount kind="gems" amount={arena.result.reward.gems||0}/></>:'One attempt was used. Your next attempts reset at the next 8-hour mark.'}</small></div></div>}
    {arena.phase!=='opponents'?<section className="arena-setup-section"><div className="arena-section-head"><div><small>01 · PREPARE</small>
      <h3>Attack team</h3></div><Tag color="gold">Exactly {teamSize} dragons at Lv{minLevel}+</Tag></div>
      <div className="arena-teams-preview single"><TeamSlots title="⚔ Attack" ids={arena.draft.attack} dragons={data.dragons}/></div>
      <ElementFilter value={elements} onChange={setElements}/>
      <div className="arena-roster-grid">{visibleDragons.map(dragon=><RosterCard key={dragon.id} dragon={dragon}
        selected={arena.draft.attack.includes(dragon.id)} disabled={arena.busy}
        onClick={()=>send({action:'arena-toggle',side:'attack',id:dragon.id})}/>)}
        {!visibleDragons.length&&<p className="arena-empty">No dragons match all selected elements.</p>}</div>
      <div className="arena-save-bar"><span>AI rivals scale from your trainer and selected dragons.</span>
        <Button type="primary" size="large" loading={arena.busy} disabled={arena.draft.attack.length!==teamSize}
          onClick={()=>send({action:'arena-save'})}>Save attack team</Button></div>
    </section>:<section className="arena-setup-section"><div className="arena-section-head"><div><small>02 · CHALLENGE</small>
      <h3>Choose an AI rival</h3></div><Tag color={data.attemptsRemaining?'green':'volcano'}>⚔ {data.attemptsRemaining??3} attempts · resets in {resetText}</Tag></div>
      <Button onClick={()=>{arena.phase='teams';emitRuntime();}}>← Edit teams</Button>
      {!data.opponents.length&&<p className="arena-empty">Your five Arena rivals will be created when you first enter the Arena.</p>}
      <div className="arena-opponents">{data.opponents.map((opponent,index)=>{
        const defeated=data.defeatedOpponentIds?.includes(opponent.id);
        return <div key={opponent.id} className={'arena-opponent-card'+(defeated?' defeated':'')}>
        <div className="arena-opponent-head"><span className="opponent-emblem">{defeated?'✓':'?'}</span><div><b>Arena rival {index+1}</b><small>{defeated?'Defeated this round':'Opponent team concealed'}</small></div></div>
        <div className="arena-enemy-team concealed" aria-label="Three concealed opponent dragons" aria-hidden="true">
          {[0,1,2].map(slot=><div key={slot} className="arena-hidden-dragon"><span>🐉</span><i>?</i></div>)}
        </div>
        <Button type="primary" size="large" block disabled={defeated||arena.busy||(data.attemptsRemaining??3)<=0||data.attack.length!==teamSize}
          onClick={()=>send({action:'arena-fight',opponent:opponent.id})}>{defeated?'✓ Defeated':'⚔ Challenge'}</Button>
      </div>;})}</div>
      {(data.attemptsRemaining??3)<3&&<div className="arena-attempt-tools">
        <p className="arena-tip">Attempts refill at 00:00, 08:00 and 16:00 (Vietnam time). Your rival list stays until all five are defeated.</p>
        <Button className="resource-action" loading={arena.busy} disabled={!!data.battle} onClick={()=>send({action:'arena-refill'})}>
          ✦ Restore all attempts · <ResourceAmount kind="gems" amount={config.attemptRefillGemCost}/>
        </Button>
      </div>}
    </section>}
  </div>;
}

export default function ArenaView({arena}){
  return <div className="arena-view">{arena?.data?.battle||arena?.presentation?<Battle arena={arena}/>:<ArenaSetup arena={arena}/>}</div>;
}

export {ElementFilter,RosterCard} from './ArenaShared.jsx';
export {Battle,SkillEffect} from './ArenaBattle.jsx';
