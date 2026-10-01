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
    water:{name:'Water Dragon',elements:['water'],rarity:'common'},
    ice:{name:'Ice Dragon',elements:['ice'],rarity:'common'}};
  globalThis.window={DragonGame:{skillMatchup:(element,target)=>
    element==='fire'&&target==='water'?.75:element==='fire'&&target==='ice'?1.5:1,
    data:{species,elements:{fire:{mark:'🔥',name:'Fire',color:'#e45'},
    water:{mark:'💧',name:'Water',color:'#48e'},earth:{mark:'◆',name:'Earth',color:'#a86'},
    wind:{mark:'🌀',name:'Wind',color:'#6ab'},ice:{mark:'❄',name:'Ice',color:'#9ce'},
    war:{name:'War',color:'#d64e33'},pure:{name:'Pure',color:'#db71c9'},
    legend:{name:'Legend',color:'#8155c5'},primal:{name:'Primal',color:'#8b8e83'},
    time:{name:'Time',color:'#b7aba4'}},
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
  assert.match(fighting,/matchup-mark weak/);assert.match(fighting,/▼.*WEAK/);
  const strongBattle={...battle,defense:[{...battle.defense[0],species:'ice'}]};
  const strongMenu=renderToStaticMarkup(React.createElement(ArenaView,{arena:{...arena,
    data:{...data,battle:strongBattle}}}));
  assert.match(strongMenu,/matchup-mark strong/);assert.match(strongMenu,/▲.*STRONG/);
  const supportBattle={...battle,attack:[{...dragon,skills:[{...dragon.skills[0],
    special:true,power:0,bonus:0,description:'Heal',effect:{kind:'heal',target:'self'}}]}]};
  const supportMenu=renderToStaticMarkup(React.createElement(ArenaView,{arena:{...arena,
    data:{...data,battle:supportBattle}}}));
  assert.doesNotMatch(supportMenu,/matchup-mark weak/);
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
  for(const element of ['war','pure','legend','primal','time']){
    const effect=renderToStaticMarkup(React.createElement(SkillEffect,{frame:1,
      event:{damage:134,element,skill:'Advanced '+element,side:'attack',critical:false}}));
    assert.match(effect,new RegExp('element-'+element));
    assert.match(effect,new RegExp('href="#flag-'+element+'"'));
    assert.doesNotMatch(effect,/element-neutral/);
  }
  const counterEffect=renderToStaticMarkup(React.createElement(SkillEffect,{frame:2,
    event:{damage:300,element:'thunder',skill:'Sky Thunder',side:'defense',critical:true}}));
  assert.match(counterEffect,/toward-left critical/);assert.match(counterEffect,/✦<\/span> CRIT/);
  const strongCrit=renderToStaticMarkup(React.createElement(SkillEffect,{frame:3,
    event:{damage:345,matchup:1.5,element:'fire',skill:'Inferno',side:'attack',critical:true}}));
  assert.match(strongCrit,/−345/);assert.match(strongCrit,/matchup-mark strong/);
  assert.match(strongCrit,/matchup-mark crit/);
  const weak=renderToStaticMarkup(React.createElement(SkillEffect,{frame:4,
    event:{damage:88,matchup:.75,element:'fire',skill:'Ember',side:'attack'}}));
  assert.match(weak,/matchup-mark weak/);assert.doesNotMatch(weak,/matchup-mark crit/);
  const normal=renderToStaticMarkup(React.createElement(SkillEffect,{frame:5,
    event:{damage:99,matchup:1,element:null,skill:'Claw',side:'attack'}}));
  assert.match(normal,/element-neutral toward-right normal/);
  assert.doesNotMatch(normal,/matchup-mark (strong|weak)/);
  const support=renderToStaticMarkup(React.createElement(SkillEffect,{frame:6,
    event:{damage:0,heal:120,element:'pure',skill:'Restoration',side:'attack',targetSide:'attack',
      special:true,skillId:'pure-double-1',effect:'heal'}}));
  assert.match(support,/self-target support/);assert.match(support,/fx-special-seal/);
  assert.match(support,/\+120 HP/);assert.doesNotMatch(support,/matchup-mark/);
  assert.equal(renderToStaticMarkup(React.createElement(SkillEffect,{event:{switchTo:'Alex'}})),'');
  const styles=readFileSync(new URL('../src/arena.css',import.meta.url),'utf8');
  assert(styles.includes('.battle-skill-fx.normal .fx-projectile'));
  assert(styles.includes('.battle-skill-fx.support .fx-trail'));
  for(const element of ['war','pure','legend','primal','time'])
    assert(styles.includes('.element-'+element+' .fx-projectile'));
  const reducedMotion=styles.match(/@media\(prefers-reduced-motion:reduce\)\{[^\n]+/i)?.[0]||'';
  assert.doesNotMatch(reducedMotion,/\.fx-(?:trail|projectile|impact)[^}]*display\s*:\s*none/i,
    'Chế độ giảm chuyển động không được ẩn hiệu ứng chiêu và chỉ để lại sát thương');
  console.log('OK: thẻ đội hình, hệ rồng và cảnh chiến đấu React.');
}finally{await server.close();}
