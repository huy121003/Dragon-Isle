/**
 * Arena/Challenge battle presentation and animation.
 *
 * Server responses remain authoritative; this module only replays events and emits actions.
 */
import React,{useEffect,useMemo,useState} from 'react';
import {Button} from 'antd';
import {game,send} from '../../app/game-bridge.js';
import {badges,fmt,Portrait,RarityGem,SkillHex,speciesOf,Stars} from './ArenaShared.jsx';
import {battleSnapshot,MatchupMark,SkillEffect,StatusIcons} from './ArenaEffects.jsx';
import {useBattleAnchors} from './useBattleAnchors.js';
import {specialGlyph} from './ArenaSkillGlyph.js';

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
  const skillOptions=attacker.skills.filter(Boolean);
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
    <StatusIcons dragon={dragon} compact/>
    <span className="arena-reserve-hp" role="img" aria-label={`${fmt.format(dragon.hp)} / ${fmt.format(dragon.maxHp)} HP`}>
      <i style={{width:Math.max(0,Math.min(100,dragon.hp/dragon.maxHp*100))+'%'}}/>
    </span>
  </span>;
  const SkillControls=()=><div className="battle-controls"><div className="battle-controls-heading">
    <small>CHOOSE SKILL · {attacker.nickname}</small>
    <h3>{arena.animating?'Attacking…':challenge&&!myTurn?'Waiting for opponent…':'Turn: '+attacker.nickname}</h3>
    <p className="battle-matchup-key">▲ Strong · ▼ Weak · exact multiplier is shown on each skill</p></div>
    <div className="battle-skill-grid">{skillOptions.map(skill=>{
      const offensive=skill.element&&(!skill.special||skill.power+skill.bonus>0);
      const matchup=offensive?game()?.skillMatchup?.(skill.element,defender.species):1;
      return <Button key={skill.index}
        disabled={disabled||!skill.unlocked||skill.remainingCooldown>0}
        className={'battle-skill battle-skill-icon '+(skill.unlocked?'':'locked')+(skill.special?' special':'')}
        title={skill.name+' — '+(!skill.unlocked?'Unlocks at Lv'+skill.unlockLevel:
          skill.remainingCooldown?'Cooldown · '+skill.remainingCooldown+' turns':
          skill.description|| (skill.element?'Base + '+Math.round(skill.bonus*100)+'% '+game()?.data?.elements?.[skill.element]?.name:
          Math.round(skill.power*100)+'% base attack'))}
        aria-label={skill.name+' — '+(!skill.unlocked?'Unlocks at level '+skill.unlockLevel:
          skill.remainingCooldown?'Cooldown, '+skill.remainingCooldown+' turns':
          skill.description||'Skill')}
        onClick={()=>act('skill',challenge?{skillIndex:skill.index}:{skill:skill.index})}>
        <span className="battle-skill-label"><SkillHex element={skill.element} locked={!skill.unlocked}/>
          {skill.special&&<i className="battle-skill-glyph" aria-hidden="true">
            {specialGlyph[skill.effect?.kind]||'✦'}</i>}
          {!skill.unlocked&&<i className="battle-skill-state">🔒</i>}
          {skill.remainingCooldown>0&&<i className="battle-skill-cooldown">{skill.remainingCooldown}</i>}
        </span></Button>;
    })}</div>
  </div>;
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
      <div className="arena-stage-controls"><SkillControls/></div>
      {impact&&<SkillEffect event={impact} frame={frame} anchors={anchors}/>}
      {arena.pendingSkill&&<div className="battle-charge" aria-live="polite">
        <span>✦</span><b>{attacker.nickname} is casting {arena.pendingSkill}</b>
      </div>}
      {event?.switchTo&&<div className="battle-switch-cue">🔄 {event.switchTo} enters the arena!</div>}
    </div>
  </div>;
}

export {SkillEffect} from './ArenaEffects.jsx';
