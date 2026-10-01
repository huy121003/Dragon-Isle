/* Arena: giao diện chiến đấu theo lượt, used hình dragons Canvas của game. */
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Button,Tag} from 'antd';
import './arena.css';
const game=()=>window.DragonGame;
const send=data=>game()?.action(data);
const fmt=new Intl.NumberFormat('en-US');
function speciesOf(id){return game()?.data?.species?.[id];}
function ElementFlag({id,primary=false,size='sm'}){
  const e=game()?.data?.elements?.[id];
  if(!e)return null;
  const name=e.name+(primary?' · Primary element':'');
  return <span className={'element-flag flag-'+size+(primary?' primary':'')} style={{'--element':e.color}}
    title={name} aria-label={name}><svg viewBox="0 0 32 42" aria-hidden="true">
      <path d="M1 1H31V41L16 32 1 41Z" fill={e.dark||'#253849'}/>
      <path d="M3.5 3.5H28.5V36.5L16 29 3.5 36.5Z" fill={e.color}/>
      <path d="M5 5H27V9H5Z" fill="#ffffff33"/>
      <svg x="5" y="8" width="22" height="22" viewBox="0 0 24 24" color="white">
        <use href={'#flag-'+id}/></svg>
    </svg></span>;
}
function SkillHex({element,locked=false}){
  const e=game()?.data?.elements?.[element],color=e?.color||'#bd7520';
  return <span className={'skill-hex '+(e?'elemental':'neutral')+(locked?' locked':'')} style={{'--skill-color':color}} aria-label={e?.name||'Normal skill'}>
    {e?<svg viewBox="0 0 24 24" aria-hidden="true"><use href={'#flag-'+element}/></svg>:'⚔'}{locked&&<i aria-label="Locked">🔒</i>}
  </span>;
}
function RarityGem({id,element}){
  const rarity=game()?.data?.rarities?.[id];
  const color=game()?.data?.elements?.[element]?.color||rarity?.color;
  return rarity?<span className="rarity-gem" style={{'--gem':color,'--tier':rarity.color}}
    title={rarity.name} aria-label={rarity.name}><svg viewBox="0 0 40 46" aria-hidden="true">
      <path d="M20 1 37 11 36 30 20 45 4 30 3 11Z" fill={rarity.color} stroke="#283a4b" strokeWidth="2"/>
      <path d="M20 5 33 13 32 28 20 40 8 28 7 13Z" fill={color} stroke="#ffffffbb" strokeWidth="1.5"/>
      <path d="M8 13 20 5 32 13 20 15Z" fill="#ffffff55"/>
      <text x="20" y="29" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="19" fontWeight="900"
        fill="white" stroke="#182839" strokeWidth="2" paintOrder="stroke">{rarity.name[0]}</text>
    </svg></span>:null;
}
function badges(id){return (speciesOf(id)?.elements||[]).map((element,index)=>{
  return <ElementFlag key={index} id={element} primary={index===0}/>;
});}
function Portrait({dragon,large=false,facing=1}){
  const ref=useRef(null);
  useEffect(()=>{
    if(!dragon||!ref.current)return;
    if(!large){game()?.paint(ref.current,dragon.species,dragon.level,{time:900,facing,locomotion:false});return;}
    let animation,visible=true;
    const draw=time=>{
      if(!visible)return;
      game()?.paint(ref.current,dragon.species,dragon.level,{time,facing,locomotion:false});
      animation=requestAnimationFrame(draw);
    };
    animation=requestAnimationFrame(draw);
    return()=>{visible=false;cancelAnimationFrame(animation);};
  },[dragon?.species,dragon?.level,facing,large]);
  return <canvas ref={ref} className={'arena-portrait '+(large?'large':'')} width={large?290:112} height={large?230:96}
    aria-label={'Dragon '+(dragon?.nickname||speciesOf(dragon?.species)?.name||'')}/>;
}
function RosterCard({dragon,selected,onClick,disabled}){
  const s=speciesOf(dragon.species),rarity=game()?.data?.rarities?.[s?.rarity];
  return <button className={'arena-roster-card '+(selected?'selected':'')} type="button"
    onClick={onClick} disabled={disabled||(!dragon.canBattle&&!selected)} aria-pressed={selected}>
    <span className="roster-art" style={{'--rarity':rarity?.color||'#b8adcc'}}><Portrait dragon={dragon}/></span>
    <span className="roster-copy"><b>{dragon.nickname}</b><small title={s?.name}>{s?.name} · Lv{dragon.level}</small>
      <span className="arena-element-row">{badges(dragon.species)}<RarityGem id={s?.rarity} element={s?.elements?.[0]}/></span>
      {dragon.battleReason&&<small className="arena-rarity">{dragon.battleReason}</small>}</span>
    <span className="arena-check">{selected?'✓':'+'}</span>
  </button>;
}
function TeamSlots({title,ids,dragons}){
  return <div className="arena-team-slots"><b>{title} · {ids.length}/3</b><div>{[0,1,2].map(i=>{
    const dragon=dragons.find(d=>d.id===ids[i]);
    return <span className={'arena-team-slot '+(!dragon?'empty':'')} key={i} title={dragon?.nickname||'Empty'}>
      {dragon?<><Portrait dragon={dragon}/><span className="arena-slot-marks">{badges(dragon.species)}<RarityGem id={speciesOf(dragon.species)?.rarity} element={speciesOf(dragon.species)?.elements?.[0]}/></span><small>{dragon.nickname}</small></>:<strong>+</strong>}
    </span>;
  })}</div></div>;
}
function ArenaSetup({arena}){
  const [side,setSide]=useState('attack'),[elements,setElements]=useState([]),data=arena.data;
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
      <small>{arena.result.won?`+${fmt.format(arena.result.reward.gold)} gold · +${fmt.format(arena.result.reward.food)} food · +1 gem`:'Wait 15 minutes before your next battle.'}</small></div></div>}
    {arena.phase!=='opponents'?<section className="arena-setup-section"><div className="arena-section-head"><div><small>01 · PREPARE</small>
      <h3>Your teams</h3></div><Tag color="gold">Exactly 3 dragons at Lv10+ per team</Tag></div>
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
        <Button type="primary" size="large" loading={arena.busy} disabled={arena.draft.attack.length!==3||arena.draft.defense.length!==3}
          onClick={()=>send({action:'arena-save'})}>OK · Confirm teams</Button></div>
    </section>:<section className="arena-setup-section"><div className="arena-section-head"><div><small>02 · CHALLENGE</small>
      <h3>Choose opponent</h3></div>{wait>0&&<Tag color="volcano">⏳ Remaining: {waitText}</Tag>}</div>
      <Button onClick={()=>{arena.phase='teams';window.dispatchEvent(new Event('dragon-ui-update'));}}>← Edit teams</Button>
      {!data.opponents.length&&<p className="arena-empty">No other player has set a defense team yet.</p>}
      <div className="arena-opponents">{data.opponents.map(opponent=><div key={opponent.id} className="arena-opponent-card">
        <div className="arena-opponent-head"><span className="opponent-emblem">🛡</span><div><b>{opponent.username}</b><small>Trainer · Level {opponent.level} · Wins {fmt.format(opponent.wins||0)} / Losses {fmt.format(opponent.losses||0)}</small></div></div>
        <div className="arena-enemy-team">{opponent.team.map(dragon=><div key={dragon.id} className="arena-enemy-dragon">
          <Portrait dragon={dragon} facing={-1}/><b>{dragon.nickname}</b>
          <small>{speciesOf(dragon.species)?.name} · Lv{dragon.level}</small>
          <span className="arena-element-row">{badges(dragon.species)}<RarityGem id={speciesOf(dragon.species)?.rarity} element={speciesOf(dragon.species)?.elements?.[0]}/></span></div>)}</div>
        <Button type="primary" size="large" block disabled={arena.busy||wait>0||data.attack.length!==3}
          onClick={()=>send({action:'arena-fight',opponent:opponent.id})}>⚔ Start battle</Button>
      </div>)}</div>
      {data.attack.length!==3&&<p className="arena-tip">Save an attack team of exactly three dragons before challenging.</p>}
    </section>}
  </div>;
}
export function ElementFilter({value,onChange}){
  const elements=game()?.data?.elements||{};
  return <div className="arena-filter-wrap"><div className="arena-element-filter" role="group" aria-label="Filter by element">
    <button type="button" className={'arena-filter-btn'+(!value.length?' active':'')} aria-pressed={!value.length}
      onClick={()=>onChange([])}>All</button>
    {Object.entries(elements).map(([id,e])=><button key={id} type="button"
      className={'arena-filter-btn'+(value.includes(id)?' active selected':'')} title={e.name+(value.includes(id)?' · Selected':'')}
      aria-label={'Filter: '+e.name} aria-pressed={value.includes(id)} disabled={value.length>=4&&!value.includes(id)}
      onClick={()=>onChange(value.includes(id)?value.filter(item=>item!==id):value.length<4?[...value,id]:value)}>
      <ElementFlag id={id}/>{value.includes(id)&&<span className="filter-check" aria-hidden="true">✓</span>}</button>)}
  </div><small className="filter-count">{value.length}/4 elements selected · match all selected elements</small></div>;
}
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
  if(value!==1.5&&value!==.75)return null;
  const strong=value>1,label=strong?'Strong':'Weak';
  return <span className={'matchup-mark '+(strong?'strong':'weak')}
    title={`${label} elemental matchup · ×${value}`} aria-label={`${label} · ×${value}`}>
    <span aria-hidden="true">{strong?'▲':'▼'}</span> {label.toUpperCase()}</span>;
}
function DamageMarks({event}){
  return <span className="fx-marks">
    {event.damage>0&&<MatchupMark value={event.matchup}/>}
    {event.damage>0&&event.critical&&<span className="matchup-mark crit" aria-label="Critical hit · ×1.5">
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
function Battle({arena}){
  const presentation=arena.presentation;
  const [frame,setFrame]=useState(0);
  const stageRef=useRef(null);
  useEffect(()=>{
    if(arena.pendingSkill||presentation?.id)
      stageRef.current?.scrollIntoView({block:'center',behavior:'auto'});
  },[arena.pendingSkill,presentation?.id]);
  useEffect(()=>{
    setFrame(0);
    if(!presentation)return;
    const handles=presentation.events.map((_,i)=>setTimeout(()=>setFrame(i+1),120+i*1600));
    return()=>handles.forEach(clearTimeout);
  },[presentation?.id]);
  const battle=useMemo(()=>presentation?battleSnapshot(presentation.before,presentation.events,frame):arena.data?.battle,
    [presentation,frame,arena.data?.battle]);
  if(!battle)return null;
  const attacker=battle.attack[battle.activeAttack],defender=battle.defense[battle.activeDefense];
  const event=presentation?.events[frame-1];
  const impact=event&&(event.damage||event.heal||event.special||event.skipped||event.misses)?event:null;
  const attacking=impact&&impact.targetSide!==impact.side&&!impact.statusTick&&!impact.skipped;
  const disabled=arena.busy||arena.animating;
  const skillOptions=attacker.skills.filter(Boolean);
  return <div className="arena-battle"><div className="battle-top"><div><small>⚔ BATTLE · TURN {battle.turn}</small>
    <h2>{battle.opponent}</h2></div><Button danger onClick={()=>send({action:'arena-forfeit'})} disabled={disabled}>Forfeit</Button></div>
    {arena.error&&<div className="arena-error">{arena.error}</div>}
    <div ref={stageRef} className={'battle-stage '+(impact?'fx-'+(impact.element||'neutral'):'')+(arena.pendingSkill?' is-charging':'')}>
      <div className="battle-crowd"/><div className="battle-sun"/><div className="battle-floor"/>
      <div className="battle-side player"><div className="battle-name"><b>{attacker.nickname} · Lv{attacker.level}</b>
        <span className="arena-element-row">{badges(attacker.species)}<RarityGem id={speciesOf(attacker.species)?.rarity} element={speciesOf(attacker.species)?.elements?.[0]}/></span></div>
        <div className="battle-hp"><div><span style={{width:(attacker.hp/attacker.maxHp*100)+'%'}}/></div>
          <small>{fmt.format(attacker.hp)} / {fmt.format(attacker.maxHp)} HP</small></div>
        <StatusIcons dragon={attacker}/>
        <div key={impact?frame:'idle'} className={'battle-dragon '+(attacking&&impact.side==='attack'?'lunge':'')+(attacking&&impact.side==='defense'?' struck':'')}>
          <Portrait dragon={attacker} large/></div></div>
      <span className="battle-vs">VS</span>
      <div className="battle-side opponent"><div className="battle-name"><b>{defender.nickname} · Lv{defender.level}</b>
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
    <div className="battle-controls"><div><small>CHOOSE SKILL · {attacker.nickname}</small><h3>{arena.animating?'Attacking…':'Turn: '+attacker.nickname}</h3>
      <p className="battle-matchup-key">▲ Strong ×1.5 · ▼ Weak ×0.75 · based on the opponent's primary element</p></div>
      <div className="battle-skill-grid">{skillOptions.map(skill=>{
        const offensive=skill.element&&(!skill.special||skill.power+skill.bonus>0);
        const matchup=offensive?game()?.skillMatchup?.(skill.element,defender.species):1;
        return <Button key={skill.index}
          disabled={disabled||!skill.unlocked||skill.remainingCooldown>0}
          className={'battle-skill '+(skill.unlocked?'':'locked')+(skill.special?' special':'')}
          onClick={()=>send({action:'arena-skill',skill:skill.index})}>
          <span className="battle-skill-label"><SkillHex element={skill.element} locked={!skill.unlocked}/>
            <span className="battle-skill-name">{skill.name}</span>
            {skill.unlocked&&<MatchupMark value={matchup}/>}</span>
          <small>{!skill.unlocked?'Unlocks at Lv'+skill.unlockLevel:
            skill.remainingCooldown?'Cooldown · '+skill.remainingCooldown+' turns':
            skill.special?skill.description+' · CD '+skill.cooldown:
            skill.element?'Base + '+Math.round(skill.bonus*100)+'% '+game()?.data?.elements?.[skill.element]?.name:
            Math.round(skill.power*100)+'% base attack'}</small></Button>;})}</div>
      <b>Switch dragon · uses a turn</b><div className="battle-switch-list">{battle.attack.map((dragon,index)=>index===battle.activeAttack||dragon.hp<=0?null:
        <Button key={dragon.id} disabled={disabled} onClick={()=>send({action:'arena-switch',id:dragon.id})}>
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
        (e.damage&&e.matchup===1.5?' · ▲ Strong':e.damage&&e.matchup===.75?' · ▼ Weak':'')+
        (e.damage&&e.critical?' · ✦ Crit':'')+
        (e.hits>1?' · '+e.hits+' hits':'')}</p>)}</div>
  </div>;
}
export default function ArenaView({arena}){
  return <div className="arena-view">{arena?.data?.battle||arena?.presentation?<Battle arena={arena}/>:<ArenaSetup arena={arena}/>}</div>;
}
