/* Giao diện PvP phải render được dữ liệu thật ở màn chuẩn bị và trong trận. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {inlineStyle} from '../src/inline-style.mjs';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
const skillStyle=inlineStyle('--skill-color:#2F8FE8; --element:#E8452C; border-color:red');
assert.equal(skillStyle['--skill-color'],'#2F8FE8');
assert.equal(skillStyle['--element'],'#E8452C');
assert.equal(skillStyle.borderColor,'red');
assert.match(renderToStaticMarkup(React.createElement('span',{className:'skill-hex elemental',style:skillStyle})),
  /style="--skill-color:#2F8FE8;--element:#E8452C;border-color:red"/);
const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
  const {default:ArenaView,SkillEffect,ElementFilter}=await server.ssrLoadModule('/src/ArenaView.jsx');
  const species={fire:{name:'Fire Dragon',elements:['fire'],rarity:'common'},
    water:{name:'Water Dragon',elements:['water'],rarity:'common'}};
  globalThis.window={DragonGame:{data:{species,elements:{fire:{mark:'🔥',name:'Fire',color:'#e45'},
    water:{mark:'💧',name:'Water',color:'#48e'},earth:{mark:'◆',name:'Earth',color:'#a86'},
    wind:{mark:'🌀',name:'Wind',color:'#6ab'},ice:{mark:'❄',name:'Ice',color:'#9ce'}},
    rarities:{common:{name:'Common',color:'#aaa'}}}}};
  const dragon={id:2,nickname:'Alex',species:'fire',level:20,hp:500,maxHp:500,
    canBattle:true,skills:[{index:0,name:'Flame Slash',power:1.3,unlocked:true,element:'fire'}]};
  const unavailable={...dragon,id:4,nickname:'Bé',level:9,canBattle:false,battleReason:'Requires level 10'};
  const data={attack:[],defense:[],dragons:[dragon,unavailable],wins:4,losses:2,
    opponents:[{id:'other',username:'Bela',level:2,wins:3,losses:5,
      team:[{...dragon,id:3,species:'water'}]}],cooldownUntil:0};
  const arena={data,draft:{attack:[2],defense:[2]},busy:false};
  const setup=renderToStaticMarkup(React.createElement(ArenaView,{arena}));
  assert.match(setup,/arena-roster-card/);assert.match(setup,/Fire Dragon/);
  assert.match(setup,/class="element-flag flag-sm primary"/);assert.match(setup,/class="rarity-gem"/);
  assert.match(setup,/--gem:#e45/);
  assert.match(setup,/href="#flag-fire"/);
  assert.match(setup,/fill="#e45"/);
  assert.match(setup,/aria-label="Filter: Fire"/);
  assert.match(setup,/0\/4 elements selected/);
  const multi=renderToStaticMarkup(React.createElement(ElementFilter,{value:['fire','water'],onChange:()=>{}}));
  assert.match(multi,/2\/4 elements selected/);
  assert.match(multi,/aria-label="Filter: Fire" aria-pressed="true"/);
  assert.match(multi,/aria-label="Filter: Water" aria-pressed="true"/);
  assert.match(multi,/filter-check/);
  const fullFilter=renderToStaticMarkup(React.createElement(ElementFilter,{value:['fire','water','earth','wind'],onChange:()=>{}}));
  assert.match(fullFilter,/aria-label="Filter: Ice" aria-pressed="false" disabled=""/);
  assert.doesNotMatch(setup,/<select id="arena-element-filter"/);
  assert.match(setup,/Wins <b>4<\/b>/);assert.match(setup,/Losses <b>2<\/b>/);
  assert.match(setup,/OK · Confirm teams<\/span><\/button>/);
  assert.match(setup,/Requires level 10/);assert.match(setup,/disabled=""/);
  assert.doesNotMatch(setup,/arena-enemy-dragon/);
  const opponents=renderToStaticMarkup(React.createElement(ArenaView,{arena:{...arena,phase:'opponents'}}));
  assert.match(opponents,/arena-enemy-dragon/);assert.match(opponents,/Water Dragon/);
  assert.doesNotMatch(opponents,/arena-element-filter|Filter: Fire/);
  assert.doesNotMatch(opponents,/arena-roster-grid/);
  const full={...arena,draft:{attack:[2,5,9],defense:[2,5,9]}};
  const fullSetup=renderToStaticMarkup(React.createElement(ArenaView,{arena:full}));
  assert.doesNotMatch(fullSetup.match(/<div class="arena-save-bar">(.*?)<\/div>/)[1],/disabled=""/);
  const battle={opponent:'Bela',turn:1,attack:[dragon],defense:[{...dragon,id:3,species:'water',nickname:'Milo'}],
    activeAttack:0,activeDefense:0,events:[]};
  const fighting=renderToStaticMarkup(React.createElement(ArenaView,{arena:{...arena,data:{...data,battle}}}));
  assert.match(fighting,/battle-stage/);assert.match(fighting,/battle-skill-grid/);
  assert.match(fighting,/Flame Slash/);assert.match(fighting,/Milo/);
  assert(fighting.indexOf('battle-stage')<fighting.indexOf('battle-controls')&&
    fighting.indexOf('battle-controls')<fighting.indexOf('battle-bench'),
    'Chọn chiêu và đổi rồng phải nằm ngay dưới sân đấu');
  assert.doesNotMatch(fighting,/Đánh thường/);
  const charging=renderToStaticMarkup(React.createElement(ArenaView,{arena:{...arena,
    data:{...data,battle},busy:true,pendingSkill:'Flame Slash'}}));
  assert.match(charging,/is-charging/);assert.match(charging,/is casting Flame Slash/);
  for(const element of ['fire','water','earth','wind','ice','thunder','nature','dark','light','metal']){
    const effect=renderToStaticMarkup(React.createElement(SkillEffect,{frame:1,
      event:{damage:134,element,skill:'Chiêu '+element,side:'attack',critical:false}}));
    assert.match(effect,new RegExp('element-'+element));
    assert.match(effect,/fx-projectile/);assert.match(effect,/fx-impact/);
    assert.match(effect,/134/);
  }
  const counterEffect=renderToStaticMarkup(React.createElement(SkillEffect,{frame:2,
    event:{damage:300,element:'thunder',skill:'Sky Thunder',side:'defense',critical:true}}));
  assert.match(counterEffect,/toward-left critical/);assert.match(counterEffect,/CRIT!/);
  assert.equal(renderToStaticMarkup(React.createElement(SkillEffect,{event:{switchTo:'Alex'}})),'');
  const styles=readFileSync(new URL('../src/arena.css',import.meta.url),'utf8');
  const reducedMotion=styles.match(/@media\(prefers-reduced-motion:reduce\)\{[^\n]+/i)?.[0]||'';
  assert.doesNotMatch(reducedMotion,/\.fx-(?:trail|projectile|impact)[^}]*display\s*:\s*none/i,
    'Chế độ giảm chuyển động không được ẩn hiệu ứng chiêu và chỉ để lại sát thương');
  console.log('OK: thẻ đội hình, hệ rồng và cảnh chiến đấu React.');
}finally{await server.close();}
