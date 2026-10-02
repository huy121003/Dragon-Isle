/**
 * Arena/Challenge battle presentation and animation.
 *
 * Server responses remain authoritative; this module only replays events and emits actions.
 */
import React,{useEffect,useMemo,useState} from 'react';
import {Button} from 'antd';
import {game,send} from '../../app/game-bridge.js';
import {badges,combatConfig,fmt,Portrait,RarityGem,SkillHex,speciesOf,Stars} from './ArenaShared.jsx';

function battleSnapshot(before,events,frame){
  const snapshot={...before,attack:before.attack.map(f=>({...f})),
    defense:before.defense.map(f=>({...f})),events:before.events.concat(events.slice(0,frame))};
  for(const event of events.slice(0,frame)){
    if(event.state){
      for(const side of ['attack','defense'])for(const state of event.state[side]){
        const f=snapshot[side].find(dragon=>dragon.id===state.id);
        if(f){f.hp=state.hp;f.maxHp=state.maxHp;f.statuses=state.statuses;
          f.skills=f.skills.map((skill,i)=>skill?{...skill,remainingCooldown:state.cooldowns[i]||0}:null);}
      }
      snapshot.activeAttack=event.state.activeAttack;
      snapshot.activeDefense=event.state.activeDefense;
      continue;
    }
    if(event.switchTo){
      const side=event.side,index=snapshot[side].findIndex(f=>f.nickname===event.switchTo);
      if(index>=0)snapshot[side==='attack'?'activeAttack':'activeDefense']=index;
    }else if(event.target){
      const target=event.side==='attack'?'defense':'attack';
      const dragon=snapshot[target].find(f=>f.nickname===event.target);
      if(dragon)dragon.hp=event.remaining;
    }
  }
  return snapshot;
}
const effectIcons={fire:'🔥',water:'💧',earth:'◆',wind:'🌀',ice:'❄',thunder:'⚡',
  nature:'❀',dark:'☾',light:'✦',metal:'⚔',neutral:'⚔'};
const illustratedEffects=new Set(['war','pure','legend','primal','time']);
const effectNames={poison:'POISON',regen:'REGEN',heal:'HEAL',cleanse:'CLEANSE',
  freeze:'FROZEN',vitality:'MAX HP ↑',damage_up:'DAMAGE ↑',damage_down:'DAMAGE ↓',
  armor_up:'ARMOR ↑',armor_down:'ARMOR ↓',damage_reduction:'GUARD',accuracy_down:'ACCURACY ↓'};
function MatchupMark({value}){
  if(!(value>1||value<1))return null;
  const strong=value>1,label=strong?'Strong':'Weak';
  return <span className={'matchup-mark '+(strong?'strong':'weak')}
    title={`${label} elemental matchup · ×${value}`} aria-label={`${label} · ×${value}`}>
    <span aria-hidden="true">{strong?'▲':'▼'}</span> {label.toUpperCase()}</span>;
}
function DamageMarks({event}){
  return <span className="fx-marks">
    {event.damage>0&&<MatchupMark value={event.matchup}/>}
    {event.damage>0&&event.critical&&<span className="matchup-mark crit" aria-label={`Critical hit · ×${combatConfig().critical.multiplier}`}>
      <span aria-hidden="true">✦</span> CRIT</span>}
  </span>;
}
export function SkillEffect({event,frame}){
  if(!event||(!event.damage&&!event.heal&&!event.special&&!event.skipped&&!event.misses))return null;
  const theme=game()?.data?.elements?.[event.element];
  const element=theme||effectIcons[event.element]?event.element:'neutral';
  const color=theme?.color||'#f7cf80';
  const illustrated=illustratedEffects.has(element);
  const effect=event.effect||'strike';
  const support=event.special&&!event.damage||!!event.statusTick||!!event.skipped;
  const self=event.targetSide===event.side||event.statusTick||event.skipped;
  const caption=event.heal?'+'+fmt.format(event.heal)+' HP':event.damage?
    '−'+fmt.format(event.damage):event.misses?'MISS':
    event.skipped?'FROZEN':effectNames[effect]||'STATUS';
  const styleType=event.statusTick||event.skipped?'status-tick':
    event.special?'special':event.element?'elemental':'normal';
  return <div key={frame} className={'battle-skill-fx element-'+element+' '+
    (event.side==='attack'?'toward-right':'toward-left')+
    (self?' self-target':'')+(support?' support':'')+
    (event.critical?' critical':'')+(event.misses&&!event.damage?' missed':'')+
    ' '+styleType+' effect-'+effect+(event.special?' special-'+
      (event.skillId?.endsWith('-double-2')?'mantle':'crown'):'')}
    style={{'--fx':color}} aria-label={`${event.skill}: ${caption}`}>
    <span className="fx-trail"/><span className="fx-projectile"><i>{illustrated?
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href={'#flag-'+element}/></svg>:
      effectIcons[element]}</i></span>
    {event.special&&<span className="fx-special-seal" aria-hidden="true">
      {[0,1].map(i=><span key={i}>{illustrated?
        <svg viewBox="0 0 24 24"><use href={'#flag-'+element}/></svg>:effectIcons[element]||'✦'}</span>)}</span>}
    <span className="fx-impact"><span className="fx-core"/><span className="fx-ring"/>
      {Array.from({length:8},(_,i)=><span key={i} className="fx-particle" style={{'--i':i}}/>)}</span>
    <span className={'fx-damage '+(event.heal?'healing':'')} role="status">
      <strong>{caption}</strong><DamageMarks event={event}/>
      {event.hits>1&&<small>{event.hits} HITS</small>}
      {event.misses>0&&event.hits>0&&<small>{event.misses} MISS</small>}
    </span>
    <small className="fx-skill-name">{event.skill}</small>
  </div>;
}
function StatusIcons({dragon}){
  const names={damage_up:'Damage ↑',damage_down:'Damage ↓',armor_up:'Armor ↑',
    armor_down:'Armor ↓',damage_reduction:'Damage resistance',poison:'Poison',
    freeze:'Frozen',regen:'Regeneration',vitality:'Maximum HP ↑',accuracy_down:'Accuracy ↓'};
  return <div className="battle-statuses" aria-label="Active statuses">{(dragon.statuses||[]).map(status=><span
    key={status.kind} className={'battle-status status-'+status.kind}
    title={`${names[status.kind]||status.kind}: ${status.turns} actions remaining`}
    aria-label={`${names[status.kind]||status.kind}: ${status.turns} actions remaining`}>
    {status.icon||'✦'}<sup>{status.turns}</sup></span>)}</div>;
}
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
  return <div className="arena-battle"><div className="battle-top"><div><small>⚔ {challenge?'DUEL':'BATTLE'} · TURN {battle.turn}</small>
    <h2>{battle.opponent}</h2></div><Button danger onClick={()=>act('forfeit')} disabled={arena.busy||arena.animating}>Forfeit</Button></div>
    {arena.error&&<div className="arena-error">{arena.error}</div>}
    <div className={'battle-stage '+(impact?'fx-'+(impact.element||'neutral'):'')+(arena.pendingSkill?' is-charging':'')}>
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
      {impact&&<SkillEffect event={impact} frame={frame}/>}
      {arena.pendingSkill&&<div className="battle-charge" aria-live="polite">
        <span>✦</span><b>{attacker.nickname} is casting {arena.pendingSkill}</b>
      </div>}
      {event?.switchTo&&<div className="battle-switch-cue">🔄 {event.switchTo} enters the arena!</div>}
    </div>
    <div className="battle-details-scroll" role="region" aria-label="Skills, dragon switch and recent moves" tabIndex={0}>
    <div className="battle-controls"><div><small>CHOOSE SKILL · {attacker.nickname}</small><h3>{arena.animating?'Attacking…':challenge&&!myTurn?'Waiting for opponent…':'Turn: '+attacker.nickname}</h3>
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
            Math.round(skill.power*100)+'% base attack'}</small></Button>;})}</div>
      <b>Switch dragon · uses a turn</b><div className="battle-switch-list">{battle.attack.map((dragon,index)=>index===battle.activeAttack||dragon.hp<=0?null:
        <Button key={dragon.id} disabled={disabled} onClick={()=>act('switch',challenge?{dragonId:dragon.id}:{id:dragon.id})}>
          <Portrait dragon={dragon}/><span>{dragon.nickname}<small>{fmt.format(dragon.hp)} HP · {badges(dragon.species)}</small></span></Button>)}</div>
    </div>
    <div className="battle-bench"><b>Attack team</b><div>{battle.attack.map((dragon,index)=><span key={dragon.id}
      className={'battle-bench-dragon '+(index===battle.activeAttack?'active':'')+(dragon.hp<=0?' fainted':'')}>
      <Portrait dragon={dragon}/><small>{dragon.nickname}<br/>{Math.round(dragon.hp/dragon.maxHp*100)}% HP</small></span>)}</div></div>
    <div className="battle-feed"><b>Recent moves</b>{battle.events.slice(-4).reverse().map((e,i)=><p key={i}>
      {e.switchTo?'🔄 '+e.switchTo+' enters the arena':e.forfeit?'🏳️ Forfeit':
        e.skipped?`${e.actor} missed a turn · Frozen`:
        `${e.actor} used ${e.skill} → ${e.target}: `+
        (e.heal?'+'+fmt.format(e.heal)+' HP':e.damage?'−'+fmt.format(e.damage)+' HP':e.misses?'Missed':effectNames[e.effect]||'Status applied')+
        (e.damage&&e.matchup>1?' · ▲ Strong':e.damage&&e.matchup<1?' · ▼ Weak':'')+
        (e.damage&&e.critical?' · ✦ Crit':'')+
        (e.hits>1?' · '+e.hits+' hits':'')}</p>)}</div></div>
  </div>;
}
