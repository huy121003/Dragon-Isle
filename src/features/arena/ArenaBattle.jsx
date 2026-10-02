/**
 * Arena/Challenge battle presentation and animation.
 *
 * Server responses remain authoritative; this module only replays events and emits actions.
 */
import React,{useEffect,useMemo,useState} from 'react';
import {Button} from 'antd';
import {game,send} from '../../app/game-bridge.js';
import {badges,fmt,Portrait,RarityGem,SkillHex,speciesOf,Stars} from './ArenaShared.jsx';
import {battleSnapshot,effectNames,MatchupMark,SkillEffect,StatusIcons} from './ArenaEffects.jsx';

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
  if(!battle)return null;
  const attacker=battle.attack[battle.activeAttack],defender=battle.defense[battle.activeDefense];
  const event=presentation?.events[frame-1];
  const impact=event&&(event.damage||event.heal||event.special||event.skipped||event.misses)?event:null;
  const attacking=impact&&impact.targetSide!==impact.side&&!impact.statusTick&&!impact.skipped;
  const disabled=arena.busy||arena.animating||(challenge&&!myTurn);
  const act=(action,payload={})=>challenge?onDuelAction({action,...payload}):
    send({action:action==='forfeit'?'arena-forfeit':action==='skill'?'arena-skill':'arena-switch',
      ...payload});
  const skillOptions=attacker.skills.filter(Boolean);
  const ReserveLineup=({side})=>{
    const activeIndex=side==='attack'?battle.activeAttack:battle.activeDefense;
    return <div className={'arena-reserve-side '+side} role="group" aria-label={side==='attack'?'Your reserve dragons':'Rival reserve dragons'}>
      {battle[side].map((dragon,index)=>index===activeIndex?null:<button type="button" key={dragon.id}
        aria-label={`${dragon.nickname}, ${dragon.hp>0?'alive':'defeated'}`}
        disabled={dragon.hp<=0||(side==='attack'&&disabled)}
        onClick={()=>side==='attack'&&act('switch',challenge?{dragonId:dragon.id}:{id:dragon.id})}
        className={'arena-reserve-button '+(dragon.hp<=0?'dead':'')+(side==='attack'?' switchable':'')}>
        <Portrait dragon={dragon}/><span className="arena-element-row">{badges(dragon.species)}</span>
        {dragon.hp<=0&&<i aria-hidden="true">×</i>}
      </button>)}
    </div>;
  };
  const SkillControls=()=><div className="battle-controls"><div className="battle-controls-heading">
    <small>CHOOSE SKILL · {attacker.nickname}</small>
    <h3>{arena.animating?'Attacking…':challenge&&!myTurn?'Waiting for opponent…':'Turn: '+attacker.nickname}</h3>
    <p className="battle-matchup-key">▲ Strong · ▼ Weak · exact multiplier is shown on each skill</p></div>
    <div className="battle-skill-grid">{skillOptions.map(skill=>{
      const offensive=skill.element&&(!skill.special||skill.power+skill.bonus>0);
      const matchup=offensive?game()?.skillMatchup?.(skill.element,defender.species):1;
      return <Button key={skill.index}
        disabled={disabled||!skill.unlocked||skill.remainingCooldown>0}
        className={'battle-skill '+(skill.unlocked?'':'locked')+(skill.special?' special':'')}
        onClick={()=>act('skill',challenge?{skillIndex:skill.index}:{skill:skill.index})}>
        <span className="battle-skill-label"><SkillHex element={skill.element} locked={!skill.unlocked}/>
          <span className="battle-skill-name">{skill.name}</span>
          {skill.unlocked&&<MatchupMark value={matchup}/>}</span>
        <small>{!skill.unlocked?'Unlocks at Lv'+skill.unlockLevel:
          skill.remainingCooldown?'Cooldown · '+skill.remainingCooldown+' turns':
          skill.special?skill.description+' · CD '+skill.cooldown:
          skill.element?'Base + '+Math.round(skill.bonus*100)+'% '+game()?.data?.elements?.[skill.element]?.name:
          Math.round(skill.power*100)+'% base attack'}</small></Button>;
    })}</div>
    {challenge&&<><b>Switch dragon · uses a turn</b><div className="battle-switch-list">{battle.attack.map((dragon,index)=>index===battle.activeAttack||dragon.hp<=0?null:
      <Button key={dragon.id} disabled={disabled} onClick={()=>act('switch',{dragonId:dragon.id})}>
        <Portrait dragon={dragon}/><span>{dragon.nickname}<small>{fmt.format(dragon.hp)} HP · {badges(dragon.species)}</small></span></Button>)}</div>
    </>}
  </div>;
  return <div className="arena-battle"><div className="battle-top"><div><small>⚔ {challenge?'DUEL':'BATTLE'} · TURN {battle.turn}</small>
    <h2>{battle.opponent}</h2></div><Button danger onClick={()=>act('forfeit')} disabled={arena.busy||arena.animating}>Forfeit</Button></div>
    {arena.error&&<div className="arena-error">{arena.error}</div>}
    <div className={'battle-stage '+(!challenge?' has-arena-controls ':'')+(impact?'fx-'+(impact.element||'neutral'):'')+(arena.pendingSkill?' is-charging':'')}>
      <div className="battle-crowd"/><div className="battle-sun"/><div className="battle-floor"/>
      <div className="battle-side player"><div className="battle-name"><b>{attacker.nickname} · Lv{attacker.level}</b><Stars count={attacker.stars||0}/>
        <span className="arena-element-row">{badges(attacker.species)}<RarityGem id={speciesOf(attacker.species)?.rarity} element={speciesOf(attacker.species)?.elements?.[0]}/></span></div>
        <div className="battle-hp"><div><span style={{width:(attacker.hp/attacker.maxHp*100)+'%'}}/></div>
          <small>{fmt.format(attacker.hp)} / {fmt.format(attacker.maxHp)} HP</small></div>
        <StatusIcons dragon={attacker}/>
        <div key={impact?frame:'idle'} className={'battle-dragon '+(attacking&&impact.side==='attack'?'lunge':'')+(attacking&&impact.side==='defense'?' struck':'')}>
          <Portrait dragon={attacker} large/></div></div>
      <span className="battle-vs">VS</span>
      <div className="battle-side opponent"><div className="battle-name"><b>{defender.nickname} · Lv{defender.level}</b><Stars count={defender.stars||0}/>
        <span className="arena-element-row">{badges(defender.species)}<RarityGem id={speciesOf(defender.species)?.rarity} element={speciesOf(defender.species)?.elements?.[0]}/></span></div>
        <div className="battle-hp"><div><span style={{width:(defender.hp/defender.maxHp*100)+'%'}}/></div>
          <small>{fmt.format(defender.hp)} / {fmt.format(defender.maxHp)} HP</small></div>
        <StatusIcons dragon={defender}/>
      <div key={impact?frame:'idle'} className={'battle-dragon '+(attacking&&impact.side==='defense'?'lunge':'')+(attacking&&impact.side==='attack'?' struck':'')}>
          <Portrait dragon={defender} large facing={-1}/></div></div>
      {!challenge&&<div className="arena-battle-reserves"><ReserveLineup side="attack"/><ReserveLineup side="defense"/></div>}
      {!challenge&&<div className="arena-stage-controls"><SkillControls/></div>}
      {impact&&<SkillEffect event={impact} frame={frame}/>}
      {arena.pendingSkill&&<div className="battle-charge" aria-live="polite">
        <span>✦</span><b>{attacker.nickname} is casting {arena.pendingSkill}</b>
      </div>}
      {event?.switchTo&&<div className="battle-switch-cue">🔄 {event.switchTo} enters the arena!</div>}
    </div>
    {challenge&&<div className="battle-bench"><b>Attack team</b><div>{battle.attack.map((dragon,index)=><span key={dragon.id}
      className={'battle-bench-dragon '+(index===battle.activeAttack?'active':'')+(dragon.hp<=0?' fainted':'')}>
      <Portrait dragon={dragon}/><small>{dragon.nickname}<br/>{Math.round(dragon.hp/dragon.maxHp*100)}% HP</small></span>)}</div></div>}
    {challenge&&<div className="battle-details-scroll" role="region" aria-label="Skills, dragon switch and recent moves" tabIndex={0}>
      <SkillControls/>
      <div className="battle-feed"><b>Recent moves</b>{battle.events.slice(-4).reverse().map((e,i)=><p key={i}>
        {e.switchTo?'🔄 '+e.switchTo+' enters the arena':e.forfeit?'🏳️ Forfeit':`${e.actor} used ${e.skill} → ${e.target}: `+
          (e.heal?'+'+fmt.format(e.heal)+' HP':e.damage?'−'+fmt.format(e.damage)+' HP':e.misses?'Missed':effectNames[e.effect]||'Status applied')}</p>)}</div>
    </div>}
  </div>;
}

export {SkillEffect} from './ArenaEffects.jsx';
