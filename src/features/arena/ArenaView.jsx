/* Arena screen orchestration: team setup, opponent list and battle hand-off. */
import React,{useState} from 'react';
import {Button,Tag} from 'antd';
import '../../arena.css';
import {emitRuntime,send} from '../../app/game-bridge.js';
import {arenaConfig,badges,ElementFilter,fmt,Portrait,RarityGem,RosterCard,speciesOf,Stars,TeamSlots} from './ArenaShared.jsx';
import {Battle} from './ArenaBattle.jsx';

function ArenaSetup({arena}){
  const [side,setSide]=useState('attack'),[elements,setElements]=useState([]),data=arena.data;
  const config=arenaConfig(),teamSize=config.teamSize,minLevel=config.minBattleLevel;
  const cooldownMinutes=Math.round(config.cooldownMs/60000);
  if(!data)return <div className="arena-loading">⏳ Loading Arena…
    {arena.error&&<p>{arena.error}</p>}<Button onClick={()=>send({action:'arena-refresh'})}>Reload</Button></div>;
  const visibleDragons=data.dragons.filter(dragon=>elements.every(id=>speciesOf(dragon.species)?.elements.includes(id)));
  const wait=Math.max(0,Math.ceil(((data.cooldownUntil||0)-Date.now())/1000));
  const waitText=Math.floor(wait/60)+'m '+String(wait%60).padStart(2,'0')+'s';
  return <div className="arena-hub">
    <div className="arena-hub-hero"><span className="arena-crest">⚔</span><div><small>DRAGON ISLE · PVP</small>
      <h2>Dragon Arena</h2><p>Choose your teams to unlock the opponent list.</p></div>
      <Button onClick={()=>send({action:'arena-refresh'})} disabled={arena.busy}>↻ Refresh</Button></div>
    <div className="arena-record"><span>🏆 Wins <b>{fmt.format(data.wins||0)}</b></span>
      <span>🛡 Losses <b>{fmt.format(data.losses||0)}</b></span>
      <small>Includes attack and defense battles</small></div>
    {arena.error&&<div className="arena-error">{arena.error}</div>}
    {arena.result&&<div className={'arena-finish '+(arena.result.won?'win':'lose')}>
      <span>{arena.result.won?'🏆':'💔'}</span><div><b>{arena.result.won?'Victory!':'Defeat'}</b>
      <small>{arena.result.won?`+${fmt.format(arena.result.reward.gold)} gold · +${fmt.format(arena.result.reward.food)} food · +${fmt.format(arena.result.reward.gems||0)} gem`:`Wait ${cooldownMinutes} minutes before your next battle.`}</small></div></div>}
    {arena.phase!=='opponents'?<section className="arena-setup-section"><div className="arena-section-head"><div><small>01 · PREPARE</small>
      <h3>Your teams</h3></div><Tag color="gold">Exactly {teamSize} dragons at Lv{minLevel}+ per team</Tag></div>
      <div className="arena-teams-preview"><TeamSlots title="⚔ Attack" ids={arena.draft.attack} dragons={data.dragons}/>
        <TeamSlots title="🛡 Defense" ids={arena.draft.defense} dragons={data.dragons}/></div>
      <div className="arena-team-tabs"><Button type={side==='attack'?'primary':'default'} onClick={()=>setSide('attack')}>⚔ Choose attack</Button>
        <Button type={side==='defense'?'primary':'default'} onClick={()=>setSide('defense')}>🛡 Choose defense</Button></div>
      <ElementFilter value={elements} onChange={setElements}/>
      <div className="arena-roster-grid">{visibleDragons.map(dragon=><RosterCard key={dragon.id} dragon={dragon}
        selected={arena.draft[side].includes(dragon.id)} disabled={arena.busy}
        onClick={()=>send({action:'arena-toggle',side,id:dragon.id})}/>)}
        {!visibleDragons.length&&<p className="arena-empty">No dragons match all selected elements.</p>}</div>
      <div className="arena-save-bar"><span>Your defense team protects your island while you are away.</span>
        <Button type="primary" size="large" loading={arena.busy} disabled={arena.draft.attack.length!==teamSize||arena.draft.defense.length!==teamSize}
          onClick={()=>send({action:'arena-save'})}>OK · Confirm teams</Button></div>
    </section>:<section className="arena-setup-section"><div className="arena-section-head"><div><small>02 · CHALLENGE</small>
      <h3>Choose opponent</h3></div>{wait>0&&<Tag color="volcano">⏳ Remaining: {waitText}</Tag>}</div>
      <Button onClick={()=>{arena.phase='teams';emitRuntime();}}>← Edit teams</Button>
      {!data.opponents.length&&<p className="arena-empty">No other player has set a defense team yet.</p>}
      <div className="arena-opponents">{data.opponents.map(opponent=><div key={opponent.id} className="arena-opponent-card">
        <div className="arena-opponent-head"><span className="opponent-emblem">🛡</span><div><b>{opponent.username}</b><small>Trainer · Level {opponent.level} · Wins {fmt.format(opponent.wins||0)} / Losses {fmt.format(opponent.losses||0)}</small></div></div>
        <div className="arena-enemy-team">{opponent.team.map(dragon=><div key={dragon.id} className="arena-enemy-dragon">
          <Portrait dragon={dragon} facing={-1}/><b>{dragon.nickname}</b>
          <small>{speciesOf(dragon.species)?.name} · Lv{dragon.level}</small><Stars count={dragon.stars||0}/>
          <span className="arena-element-row">{badges(dragon.species)}<RarityGem id={speciesOf(dragon.species)?.rarity} element={speciesOf(dragon.species)?.elements?.[0]}/></span></div>)}</div>
        <Button type="primary" size="large" block disabled={arena.busy||wait>0||data.attack.length!==teamSize}
          onClick={()=>send({action:'arena-fight',opponent:opponent.id})}>⚔ Start battle</Button>
      </div>)}</div>
      {data.attack.length!==teamSize&&<p className="arena-tip">Save an attack team of exactly {teamSize} dragons before challenging.</p>}
    </section>}
  </div>;
}

export default function ArenaView({arena}){
  return <div className="arena-view">{arena?.data?.battle||arena?.presentation?<Battle arena={arena}/>:<ArenaSetup arena={arena}/>}</div>;
}

export {ElementFilter,RosterCard} from './ArenaShared.jsx';
export {Battle,SkillEffect} from './ArenaBattle.jsx';
