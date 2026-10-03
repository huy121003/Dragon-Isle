import React from 'react';
import {Button,Popover} from 'antd';
import {game} from '../../app/game-bridge.js';
import {SkillHex} from './ArenaShared.jsx';
import {specialGlyph} from './ArenaSkillGlyph.js';

const pct=value=>`${+(value*100).toFixed(1)}%`;
function summary(skill){
  const effect=skill.effect||{};
  const kind=effect.kind;
  if(kind==='revive_first')return `Hồi sinh ${pct(effect.value)} HP · 1 lần/trận`;
  if(kind==='heal_team'||kind==='cleanse_team_heal'||kind==='regen_team')
    return `Cả đội +${pct(effect.value)} HP${kind==='regen_team'?` × ${effect.duration} lượt`:''}`;
  if(kind==='heal_lowest'||kind==='cleanse_heal_lowest'||kind==='cleanse_heal_self')
    return `Hồi ${pct(effect.value)} HP`;
  if(kind==='rewind_ally')return `Hồi 50% HP đã mất · tối đa ${pct(effect.cap)}`;
  if(kind==='shield'||kind==='vitality'||kind==='armor_up'||kind==='damage_up'||
    kind==='damage_reduction'||kind==='reflect'||kind==='next_attack_up'||kind==='carapace')
    return `${pct(effect.value)}${effect.duration?` · ${effect.duration} lượt`:''}`;
  if(kind==='echo_last')return `Lặp ${pct(effect.value)} sát thương trước`;
  if(kind==='copy_last')return `Sao chép ${pct(effect.value)} hiệu lực`;
  if(skill.power>0)return `${pct(skill.power)} tấn công${effect.hits?` × ${effect.hits} nhịp`:''}`;
  return skill.description||'Chiêu hỗ trợ';
}

export function BattleSkillControls({attacker,defender,disabled,animating,challenge,myTurn,act}){
  return <div className="battle-controls"><div className="battle-controls-heading">
    <small>CHỌN CHIÊU · {attacker.nickname}</small>
    <h3>{animating?'Đang tấn công…':challenge&&!myTurn?'Đợi đối thủ…':'Lượt: '+attacker.nickname}</h3>
    <p className="battle-matchup-key">▲ Khắc hệ · ▼ Bị khắc</p></div>
    <div className="battle-skill-grid">{attacker.skills.filter(Boolean).map(skill=>{
      const offensive=skill.element&&(!skill.special||skill.power+skill.bonus>0);
      const matchup=offensive?game()?.skillMatchup?.(skill.element,defender.species):1;
      const mark=matchup>1?'▲':matchup<1?'▼':'';
      const reason=!skill.unlocked?`Mở ở cấp ${skill.unlockLevel}`:
        skill.unavailableReason||skill.remainingCooldown>0&&`Hồi chiêu còn ${skill.remainingCooldown} lượt`;
      const description=skill.description||summary(skill);
      return <Popover key={skill.index} trigger={['hover','focus']} placement="top"
        classNames={{root:'arena-skill-popover'}}
        title={<span className="arena-skill-popover-title" title={skill.name}>{skill.name}</span>}
        content={<div className="arena-skill-popover-content">
          <div title={description}>{description}</div>
          <div>Tóm tắt: {summary(skill)}</div>
          <div>Hồi chiêu: {skill.cooldown||0} lượt</div>
          {mark&&<div>Khắc hệ: {mark} ×{matchup}</div>}
          {reason&&<div className="arena-skill-unavailable">{reason}</div>}
        </div>}>
        <Button disabled={disabled||!skill.unlocked||skill.available===false||skill.remainingCooldown>0}
          className={'battle-skill battle-skill-card '+(!skill.unlocked?'locked':'')+(skill.special?' special':'')}
          aria-label={`${skill.name} · ${summary(skill)}${mark?` · ${mark} ×${matchup}`:''}${reason?` · ${reason}`:''}`}
          onClick={()=>act('skill',challenge?{skillIndex:skill.index}:{skill:skill.index})}>
          <span className="battle-skill-label"><span className="battle-skill-icon-wrap">
            <SkillHex element={skill.element} locked={!skill.unlocked}/>
            {skill.special&&<i className="battle-skill-glyph" aria-hidden="true">{specialGlyph[skill.effect?.kind]||'✦'}</i>}
          </span><span className="battle-skill-name" title={skill.name}>{skill.name}</span>
            {mark&&<span className={'battle-skill-matchup '+(matchup>1?'strong':'weak')} aria-label={`×${matchup}`}>{mark}</span>}
          </span>
          <small className="battle-skill-summary" title={reason||summary(skill)}>{reason||summary(skill)}</small>
          {skill.remainingCooldown>0&&<i className="battle-skill-cooldown">{skill.remainingCooldown}</i>}
        </Button>
      </Popover>;
    })}</div>
  </div>;
}
