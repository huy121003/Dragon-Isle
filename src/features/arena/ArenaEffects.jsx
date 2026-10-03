/**
 * Arena battle replay/effect presentation primitives.
 *
 * This module is display-only: it reconstructs snapshots from authoritative
 * events and renders status/matchup/skill feedback without sending actions.
 */
import React from 'react';
import {game} from '../../app/game-bridge.js';
import {combatConfig,fmt} from './ArenaShared.jsx';

export function battleSnapshot(before,events,frame){
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
export const effectNames={poison:'POISON',regen:'REGEN',heal:'HEAL',cleanse:'CLEANSE',
  freeze:'FROZEN',vitality:'MAX HP ↑',damage_up:'DAMAGE ↑',damage_down:'DAMAGE ↓',
  armor_up:'ARMOR ↑',armor_down:'ARMOR ↓',damage_reduction:'GUARD',accuracy_down:'ACCURACY ↓'};
export function MatchupMark({value}){
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
export function SkillEffect({event,frame,anchors}){
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
  const targetSide=self?event.side:event.targetSide||
    (event.side==='attack'?'defense':'attack');
  const origin=anchors?.[event.side],target=anchors?.[targetSide];
  const geometry=origin&&target?{
    '--origin':origin.x+'px','--target':target.x+'px',
    '--fx-origin-y':origin.y+'px','--fx-target-y':target.y+'px',
    '--fx-damage-y':Math.max(24,target.y-42)+'px',
    '--fx-distance':Math.hypot(target.x-origin.x,target.y-origin.y)+'px',
    '--fx-angle':Math.atan2(target.y-origin.y,target.x-origin.x)+'rad'
  }:{};
  return <div key={frame} className={'battle-skill-fx element-'+element+' '+
    (event.side==='attack'?'toward-right':'toward-left')+
    (self?' self-target':'')+(support?' support':'')+
    (event.critical?' critical':'')+(event.misses&&!event.damage?' missed':'')+
    ' '+styleType+' effect-'+effect+(event.special?' special-'+
      (event.skillId?.endsWith('-double-2')?'mantle':'crown'):'')}
    style={{'--fx':color,...geometry}} aria-label={`${event.skill}: ${caption}`}>
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
const statusGlyphs={poison:'☠',regen:'✚',heal:'✚',cleanse:'✧',freeze:'❄',
  damage_up:'⚔',damage_down:'↘',armor_up:'⬟',armor_down:'⬡',damage_reduction:'◈',
  vitality:'♥',accuracy_down:'◎',burn:'♨',curse:'☾',shield:'⬢',reflect:'↶',
  lock_switch:'⛓',next_attack_up:'⚡',carapace:'◆',carapace_strike:'✦'};
export function StatusIcons({dragon,compact=false}){
  const names={damage_up:'Damage ↑',damage_down:'Damage ↓',armor_up:'Armor ↑',
    armor_down:'Armor ↓',damage_reduction:'Damage resistance',poison:'Poison',
    freeze:'Frozen',regen:'Regeneration',vitality:'Maximum HP ↑',accuracy_down:'Accuracy ↓',
    burn:'Burn',curse:'Curse',shield:'Shield',reflect:'Reflect',
    lock_switch:'Switch locked',next_attack_up:'Next attack ↑',
    carapace:'Carapace',carapace_strike:'Counter attack ↑'};
  return <div className={'battle-statuses'+(compact?' compact':'')} aria-label="Active statuses">
    {(dragon.statuses||[]).map((status,index)=><span key={status.kind+'-'+index}
      className={'battle-status status-'+status.kind}
      title={`${names[status.kind]||status.kind}: ${status.turns} turns remaining`}
      aria-label={`${names[status.kind]||status.kind}: ${status.turns} turns remaining`}>
      <i aria-hidden="true">{statusGlyphs[status.kind]||'✦'}</i><sup>{status.turns}</sup></span>)}</div>;
}
