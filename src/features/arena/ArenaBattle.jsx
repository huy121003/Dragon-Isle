/**
 * Arena/Challenge battle presentation and animation.
 *
 * Server responses remain authoritative; this module only replays events and emits actions.
 */
import React,{useEffect,useMemo,useState} from 'react';
import {Button} from 'antd';
import {game,send} from '../../app/game-bridge.js';
import {badges,fmt,Portrait,RarityGem,speciesOf,Stars} from './ArenaShared.jsx';
import {battleSnapshot,SkillEffect,StatusIcons} from './ArenaEffects.jsx';
import {useBattleAnchors} from './useBattleAnchors.js';
import {BattleSkillControls} from './BattleSkillControls.jsx';

export function Battle({arena,challenge=false,onDuelAction,myTurn=true}){
  const presentation=arena.presentation;
  const [frame,setFrame]=useState(0);
  useEffect(()=>{
    setFrame(0);
    if(!presentation)return;
    const timing=window.DragonConfig.system.presentation;
    const handles=presentation.events.map((_,i)=>
      setTimeout(()=>setFrame(i+1),timing.battleEventLeadMs+i*timing.battleEventMs));
    return()=>handles.forEach(clearTimeout);
  },[presentation?.id]);
  const battle=useMemo(()=>presentation?battleSnapshot(presentation.before,presentation.events,frame):arena.data?.battle,
    [presentation,frame,arena.data?.battle]);
  const {stageRef,anchors}=useBattleAnchors(battle);
  if(!battle)return null;
  const attacker=battle.attack[battle.activeAttack],defender=battle.defense[battle.activeDefense];
  const event=presentation?.events[frame-1];
  const impact=event&&(event.damage||event.heal||event.special||event.skipped||event.misses)?event:null;
  const attacking=impact&&impact.targetSide!==impact.side&&!impact.statusTick&&!impact.skipped;
  const disabled=arena.busy||arena.animating||(challenge&&!myTurn);
  const act=(action,payload={})=>challenge?onDuelAction({action,...payload}):
    send({action:action==='forfeit'?'arena-forfeit':action==='skill'?'arena-skill':'arena-switch',
      ...payload});
  const ReserveLineup=({side})=>{
    const activeIndex=side==='attack'?battle.activeAttack:battle.activeDefense;
    return <div className={'arena-reserve-side '+side} role="group" aria-label={side==='attack'?'Your reserve dragons':'Rival reserve dragons'}>
      {battle[side].map((dragon,index)=>{
        if(index===activeIndex)return null;
        const species=speciesOf(dragon.species);
        const elementNames=(species?.elements||[]).map(element=>game()?.data?.elements?.[element]?.name||element).join(' · ');
        return <button type="button" key={dragon.id}
        aria-label={`${dragon.nickname} · ${elementNames||species?.name||'Dragon'} · ${fmt.format(dragon.hp)} / ${fmt.format(dragon.maxHp)} HP`}
        disabled={dragon.hp<=0||(side==='attack'?disabled:true)}
        onClick={()=>side==='attack'&&act('switch',challenge?{dragonId:dragon.id}:{id:dragon.id})}
        className={['arena-reserve-button',dragon.hp<=0&&'dead',side==='attack'&&'switchable'].filter(Boolean).join(' ')}>
        <span className="arena-reserve-top">
          {side==='defense'&&<ReserveVitals dragon={dragon}/>}
          <span className="arena-reserve-avatar-frame"><Portrait dragon={dragon}/></span>
          {side==='attack'&&<ReserveVitals dragon={dragon}/>}
        </span>
        {dragon.hp<=0&&<i className="arena-reserve-dead-mark" aria-hidden="true">×</i>}
      </button>})}
    </div>;
  };
  const ReserveVitals=({dragon})=><span className="arena-reserve-vitals">
    <span className="arena-reserve-flags" aria-hidden="true">{badges(dragon.species)}</span>
    <span className="arena-reserve-hp" role="img" aria-label={`${fmt.format(dragon.hp)} / ${fmt.format(dragon.maxHp)} HP`}>
      <i style={{width:Math.max(0,Math.min(100,dragon.hp/dragon.maxHp*100))+'%'}}/>
    </span>
    <StatusIcons dragon={dragon} compact/>
  </span>;
  return <div className="arena-battle"><div className="battle-top"><div><small>⚔ {challenge?'DUEL':'BATTLE'} · TURN {battle.turn}</small>
    <h2>{battle.opponent}</h2></div><Button danger onClick={()=>act('forfeit')}
      disabled={challenge?(arena.challengeBusy??arena.busy):arena.busy||arena.animating}>Forfeit</Button></div>
    {arena.error&&<div className="arena-error">{arena.error}</div>}
    <div ref={stageRef} className={'battle-stage has-arena-controls'+(impact?' fx-'+(impact.element||'neutral'):'')+(arena.pendingSkill?' is-charging':'')}>
      <div className="battle-crowd"/><div className="battle-sun"/><div className="battle-floor"/>
      <div className="battle-side player"><div className="battle-name"><b>{attacker.nickname} · Lv{attacker.level}</b><Stars count={attacker.stars||0}/>
        <span className="arena-element-row">{badges(attacker.species)}<RarityGem id={speciesOf(attacker.species)?.rarity} element={speciesOf(attacker.species)?.elements?.[0]}/></span></div>
        <div className="battle-hp"><div><span style={{width:(attacker.hp/attacker.maxHp*100)+'%'}}/></div>
          <small>{fmt.format(attacker.hp)} / {fmt.format(attacker.maxHp)} HP</small></div>
        <StatusIcons dragon={attacker}/>
        <ReserveLineup side="attack"/>
        <div key={impact?frame:'idle'} className={'battle-dragon '+(attacking&&impact.side==='attack'?'lunge':'')+(attacking&&impact.side==='defense'?' struck':'')}>
          <Portrait dragon={attacker} large/></div></div>
      <span className="battle-vs">VS</span>
      <div className="battle-side opponent"><div className="battle-name"><b>{defender.nickname} · Lv{defender.level}</b><Stars count={defender.stars||0}/>
        <span className="arena-element-row">{badges(defender.species)}<RarityGem id={speciesOf(defender.species)?.rarity} element={speciesOf(defender.species)?.elements?.[0]}/></span></div>
        <div className="battle-hp"><div><span style={{width:(defender.hp/defender.maxHp*100)+'%'}}/></div>
          <small>{fmt.format(defender.hp)} / {fmt.format(defender.maxHp)} HP</small></div>
        <StatusIcons dragon={defender}/>
        <ReserveLineup side="defense"/>
      <div key={impact?frame:'idle'} className={'battle-dragon '+(attacking&&impact.side==='defense'?'lunge':'')+(attacking&&impact.side==='attack'?' struck':'')}>
          <Portrait dragon={defender} large facing={-1}/></div></div>
      <div className="arena-stage-controls"><BattleSkillControls attacker={attacker} defender={defender} disabled={disabled} animating={arena.animating} challenge={challenge} myTurn={myTurn} act={act}/></div>
      {impact&&<SkillEffect event={impact} frame={frame} anchors={anchors}/>}
      {arena.pendingSkill&&<div className="battle-charge" aria-live="polite">
        <span>✦</span><b>{attacker.nickname} is casting {arena.pendingSkill}</b>
      </div>}
      {event?.switchTo&&<div className="battle-switch-cue">🔄 {event.switchTo} enters the arena!</div>}
    </div>
  </div>;
}

export {SkillEffect} from './ArenaEffects.jsx';
