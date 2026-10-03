import React from 'react';
import {Button,Popover} from 'antd';
import {game} from '../../app/game-bridge.js';
import {SkillHex} from './ArenaShared.jsx';

const pct=value=>`${+(value*100).toFixed(1)}%`;
/** This is the catalog's base multiplier; matchup, armor and crit apply during combat. */
export function skillDamageLabel(skill){
  if(!skill.power)return ['echo_last','copy_last'].includes(skill.effect?.kind)?
    'Sát thương phụ thuộc chiêu được lặp hoặc sao chép':
    'Sát thương trực tiếp theo tấn công gốc: 0%';
  const hits=skill.effect?.hits;
  return `Sát thương cơ bản: ${pct(skill.power)} tấn công gốc${hits?` mỗi nhịp × ${hits} nhịp`:''}`;
}

export function BattleSkillControls({attacker,defender,disabled,animating,challenge,myTurn,act}){
  return <div className="battle-controls"><div className="battle-controls-heading">
    <small>CHỌN CHIÊU · {attacker.nickname}</small>
    <h3>{animating?'Đang tấn công…':challenge&&!myTurn?'Đợi đối thủ…':'Lượt: '+attacker.nickname}</h3>
    <p className="battle-matchup-key">▲ Khắc hệ · ▼ Bị khắc</p></div>
    <div className="battle-skill-grid">{attacker.skills.filter(Boolean).map(skill=>{
      const offensive=skill.element&&skill.power>0;
      const matchup=offensive?game()?.skillMatchup?.(skill.element,defender.species):1;
      const mark=matchup>1?'▲':matchup<1?'▼':'';
      const reason=!skill.unlocked?`Mở ở cấp ${skill.unlockLevel}`:
        skill.unavailableReason||skill.remainingCooldown>0&&`Hồi chiêu còn ${skill.remainingCooldown} lượt`;
      return <div key={skill.index} className="battle-skill-slot">
        <Button disabled={disabled||!skill.unlocked||skill.available===false||skill.remainingCooldown>0}
          className={'battle-skill battle-skill-card '+(!skill.unlocked?'locked':'')+(skill.special?' special':'')}
          aria-label={`${skill.name}${mark?` · ${mark} ×${matchup}`:''}${reason?` · ${reason}`:''}`}
          onClick={()=>act('skill',challenge?{skillIndex:skill.index}:{skill:skill.index})}>
          <span className="battle-skill-label"><span className="battle-skill-icon-wrap">
            <SkillHex element={skill.element} locked={!skill.unlocked}/>
            {skill.special&&<i className="battle-skill-glyph" aria-hidden="true">{skill.glyph||'✦'}</i>}
          </span><span className="battle-skill-name" title={skill.name}>{skill.name}</span>
            {mark&&<span className={'battle-skill-matchup '+(matchup>1?'strong':'weak')} aria-label={`×${matchup}`}>{mark}</span>}
          </span>
          {skill.remainingCooldown>0&&<i className="battle-skill-cooldown">{skill.remainingCooldown}</i>}
        </Button>
        <Popover trigger={['hover','focus','click']} placement="top"
          classNames={{root:'arena-skill-popover'}}
          title={<span className="arena-skill-popover-title" title={skill.name}>{skill.name}</span>}
          content={<div className="arena-skill-popover-content">
            <div>{skillDamageLabel(skill)}</div>
            {skill.description&&<div title={skill.description}>{skill.description}</div>}
            <div>Hồi chiêu: {skill.cooldown||0} lượt</div>
            {mark&&<div>Khắc hệ: {mark} ×{matchup}</div>}
            {reason&&<div className="arena-skill-unavailable">{reason}</div>}
          </div>}>
          <Button type="text" className="battle-skill-info" aria-label={`Thông tin chi tiết ${skill.name}`}
            onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}>ⓘ</Button>
        </Popover>
      </div>;
    })}</div>
  </div>;
}
