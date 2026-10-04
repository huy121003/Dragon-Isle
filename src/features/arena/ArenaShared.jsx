/**
 * Reusable Arena roster/presentation primitives.
 *
 * These components read catalog/config only and are shared by Arena and live Challenge.
 */
import React,{useEffect,useRef} from 'react';
import {game} from '../../app/game-bridge.js';

export const fmt=new Intl.NumberFormat('en-US');
export function arenaConfig(){return window.DragonConfig.arena;}
export function combatConfig(){return window.DragonConfig.combat;}
export function speciesOf(id){return game()?.data?.species?.[id];}
export function ElementFlag({id,primary=false,size='sm'}){
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
export function SkillHex({element,locked=false}){
  const e=game()?.data?.elements?.[element],color=e?.color||'#bd7520';
  return <span className={'skill-hex '+(e?'elemental':'neutral')+(locked?' locked':'')} style={{'--skill-color':color}} aria-label={e?.name||'Normal skill'}>
    {e?<svg viewBox="0 0 24 24" aria-hidden="true"><use href={'#flag-'+element}/></svg>:'⚔'}{locked&&<i aria-label="Locked">🔒</i>}
  </span>;
}
export function RarityGem({id,element}){
  const rarity=game()?.data?.rarities?.[id];
  const color=game()?.data?.elements?.[element]?.color||rarity?.color;
  return rarity?<span className={'rarity-gem rarity-'+id} style={{'--gem':color,'--tier':rarity.color}}
    title={rarity.name} aria-label={rarity.name}><svg viewBox="0 0 40 46" aria-hidden="true">
      <path d="M20 1 37 11 36 30 20 45 4 30 3 11Z" fill={rarity.color} stroke="#283a4b" strokeWidth="2"/>
      <path d="M20 5 33 13 32 28 20 40 8 28 7 13Z" fill={color} stroke="#ffffffbb" strokeWidth="1.5"/>
      <path d="M8 13 20 5 32 13 20 15Z" fill="#ffffff55"/>
      <text x="20" y="29" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="19" fontWeight="900"
        fill="white" stroke="#182839" strokeWidth="2" paintOrder="stroke">{rarity.name[0]}</text>
    </svg></span>:null;
}
export function badges(id){return (speciesOf(id)?.elements||[]).map((element,index)=>{
  return <ElementFlag key={index} id={element} primary={index===0}/>;
});}
export function Stars({count=0}){
  const max=combatConfig().star.max,value=Math.max(0,Math.min(max,count));
  return <span className="arena-stars" aria-label={`${count} of ${max} stars`}>
    {'★'.repeat(value)}{'☆'.repeat(max-value)}
  </span>;
}
export function Portrait({dragon,large=false,facing=1}){
  const ref=useRef(null);
  useEffect(()=>{
    if(!dragon||!ref.current)return;
    if(!large){game()?.paint(ref.current,dragon.species,dragon.level,{time:900,facing,locomotion:false});return;}
    let animation,visible=true;
    const draw=time=>{
      if(!visible)return;
      game()?.paint(ref.current,dragon.species,dragon.level,{time,facing,locomotion:false,battleFit:large});
      animation=requestAnimationFrame(draw);
    };
    animation=requestAnimationFrame(draw);
    return()=>{visible=false;cancelAnimationFrame(animation);};
  },[dragon?.species,dragon?.level,facing,large]);
  return <canvas ref={ref} className={'arena-portrait '+(large?'large':'')} width={large?290:112} height={large?230:96}
    aria-label={'Dragon '+(dragon?.nickname||speciesOf(dragon?.species)?.name||'')}/>;
}
export function RosterCard({dragon,selected,onClick,disabled}){
  const s=speciesOf(dragon.species),rarity=game()?.data?.rarities?.[s?.rarity];
  return <button className={'arena-roster-card '+(selected?'selected':'')} type="button"
    onClick={onClick} disabled={disabled||(!dragon.canBattle&&!selected)} aria-pressed={selected}>
    <span className="roster-art" style={{'--rarity':rarity?.color||'#b8adcc'}}><Portrait dragon={dragon}/></span>
    <span className="roster-copy"><b>{dragon.nickname}</b><small title={s?.name}>{s?.name} · Lv{dragon.level}</small>
      <Stars count={dragon.stars||0}/>
      <span className="arena-element-row">{badges(dragon.species)}<RarityGem id={s?.rarity} element={s?.elements?.[0]}/></span>
      {dragon.battleReason&&<small className="arena-rarity">{dragon.battleReason}</small>}</span>
    <span className="arena-check">{selected?'✓':'+'}</span>
  </button>;
}
export function TeamSlots({title,ids,dragons}){
  const teamSize=arenaConfig().teamSize;
  return <div className="arena-team-slots"><b>{title} · {ids.length}/{teamSize}</b><div>{Array.from({length:teamSize},(_,i)=>i).map(i=>{
    const dragon=dragons.find(d=>d.id===ids[i]);
    return <span className={'arena-team-slot '+(!dragon?'empty':'')} key={i} title={dragon?.nickname||'Empty'}>
      {dragon?<><Portrait dragon={dragon}/><span className="arena-slot-marks">{badges(dragon.species)}<RarityGem id={speciesOf(dragon.species)?.rarity} element={speciesOf(dragon.species)?.elements?.[0]}/></span><small>{dragon.nickname}</small><Stars count={dragon.stars||0}/></>:<strong>+</strong>}
    </span>;
  })}</div></div>;
}
export function ElementFilter({value,onChange}){
  const elements=game()?.data?.elements||{};
  const maxElements=window.DragonConfig.dragons.maxElementsPerDragon;
  return <div className="arena-filter-wrap"><div className="arena-element-filter" role="group" aria-label="Filter by element">
    <button type="button" className={'arena-filter-btn'+(!value.length?' active':'')} aria-pressed={!value.length}
      onClick={()=>onChange([])}>All</button>
    {Object.entries(elements).map(([id,e])=><button key={id} type="button"
      className={'arena-filter-btn'+(value.includes(id)?' active selected':'')} title={e.name+(value.includes(id)?' · Selected':'')}
      aria-label={'Filter: '+e.name} aria-pressed={value.includes(id)} disabled={value.length>=maxElements&&!value.includes(id)}
      onClick={()=>onChange(value.includes(id)?value.filter(item=>item!==id):value.length<maxElements?[...value,id]:value)}>
      <ElementFlag id={id}/>{value.includes(id)&&<span className="filter-check" aria-hidden="true">✓</span>}</button>)}
  </div><small className="filter-count">{value.length}/{maxElements} elements selected · match all selected elements</small></div>;
}
/** Filter roster cards by dragon rarity; gems reuse the same tier art as the cards. */
export function RarityFilter({value,onChange}){
  const rarities=game()?.data?.rarities||{};
  return <div className="arena-filter-wrap"><div className="arena-rarity-filter" role="group" aria-label="Filter by dragon tier">
    <button type="button" className={'arena-filter-btn arena-filter-all'+(!value.length?' active':'')}
      aria-label="All tiers" aria-pressed={!value.length} onClick={()=>onChange([])}>All</button>
    {Object.entries(rarities).map(([id,rarity])=><button key={id} type="button"
      className={'arena-filter-btn arena-rarity-filter-btn'+(value.includes(id)?' active selected':'')}
      title={rarity.name+(value.includes(id)?' · Selected':'')} aria-label={'Tier: '+rarity.name}
      aria-pressed={value.includes(id)} onClick={()=>onChange(value.includes(id)?value.filter(item=>item!==id):[...value,id])}>
      <RarityGem id={id} element={Object.keys(game()?.data?.elements||{})[0]}/>
      {value.includes(id)&&<span className="filter-check" aria-hidden="true">✓</span>}</button>)}
  </div><small className="filter-count">{value.length?value.map(id=>rarities[id]?.name||id).join(', '):'All tiers'}</small></div>;
}
