/* Giao diện PvP phải render được dữ liệu thật ở màn chuẩn bị và trong trận. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {inlineStyle} from '../src/inline-style.mjs';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import arenaConfig from '../js/config/arena.js';
import challengeConfig from '../js/config/challenge.js';
import combatConfig from '../js/config/combat.js';
import dragonConfig from '../js/config/dragons.js';
const skillStyle=inlineStyle('--skill-color:#2F8FE8; --element:#E8452C; border-color:red');
assert.equal(skillStyle['--skill-color'],'#2F8FE8');
assert.equal(skillStyle['--element'],'#E8452C');
assert.equal(skillStyle.borderColor,'red');
assert.match(renderToStaticMarkup(React.createElement('span',{className:'skill-hex elemental',style:skillStyle})),
  /style="--skill-color:#2F8FE8;--element:#E8452C;border-color:red"/);
const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
  const {default:ArenaView,SkillEffect,ElementFilter}=await server.ssrLoadModule('/src/features/arena/ArenaView.jsx');
  const species={fire:{name:'Fire Dragon',elements:['fire'],rarity:'common'},
    water:{name:'Water Dragon',elements:['water'],rarity:'common'},
    ice:{name:'Ice Dragon',elements:['ice'],rarity:'common'}};
  globalThis.window={DragonConfig:{arena:arenaConfig,challenge:challengeConfig,combat:combatConfig,dragons:dragonConfig},DragonGame:{skillMatchup:(element,target)=>
    element==='fire'&&target==='water'?.5:element==='fire'&&target==='ice'?2:1,
    data:{species,elements:{fire:{mark:'🔥',name:'Fire',color:'#e45'},
    water:{mark:'💧',name:'Water',color:'#48e'},earth:{mark:'◆',name:'Earth',color:'#a86'},
    wind:{mark:'🌀',name:'Wind',color:'#6ab'},ice:{mark:'❄',name:'Ice',color:'#9ce'},
    war:{name:'War',color:'#d64e33'},pure:{name:'Pure',color:'#db71c9'},
    legend:{name:'Legend',color:'#8155c5'},primal:{name:'Primal',color:'#8b8e83'},
    time:{name:'Time',color:'#b7aba4'}},
    rarities:{common:{name:'Common',color:'#aaa'}}}}};
  const {default:ChallengeView}=await server.ssrLoadModule('/src/features/challenge/ChallengeView.jsx');
  const invitation={busy:true,match:{phase:'invited',outgoing:false,opponent:'Bela',until:Date.now()+60000}};
  const invitationHtml=renderToStaticMarkup(React.createElement(ChallengeView,
    {status:invitation,request:()=>{},refresh:()=>{}}));
  assert.match(invitationHtml,/Challenge from Bela/);
  assert.match(invitationHtml,/<button[^>]*disabled=""[^>]*>.*Accept/);
  assert.match(invitationHtml,/<button[^>]*disabled=""[^>]*>.*Decline/);
  const dragon={id:2,nickname:'Alex',species:'fire',level:20,power:4250,hp:500,maxHp:500,
    canBattle:true,skills:[{index:0,name:'Flame Slash',power:1.3,unlocked:true,element:'fire'}]};
  const unavailable={...dragon,id:4,nickname:'Bé',level:arenaConfig.minBattleLevel-1,canBattle:false,
    battleReason:'Requires level '+arenaConfig.minBattleLevel};
  const data={attack:[],dragons:[dragon,unavailable],wins:4,losses:2,attemptsRemaining:3,resetAt:Date.now()+8*3600000,
    opponents:[{id:'bot-1',username:'Rookie Warden',level:2,strength:'Weaker',
      team:[{...dragon,id:3,species:'water'}]}]};
  const arena={data,draft:{attack:[2]},busy:false};
  const setup=renderToStaticMarkup(React.createElement(ArenaView,{arena}));
  assert.match(setup,/arena-roster-card/);assert.match(setup,/Fire Dragon/);
  assert.match(setup,/class="element-flag flag-sm primary"/);assert.match(setup,/class="rarity-gem"/);
  assert.match(setup,/--gem:#e45/);
  assert.doesNotMatch(setup,/roster-power|4,250 power/);
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
  assert.match(setup,/Save attack team<\/span><\/button>/);
  assert.doesNotMatch(setup,/Choose defense|Your defense team/);
  assert.match(setup,new RegExp('Requires level '+arenaConfig.minBattleLevel));assert.match(setup,/disabled=""/);
  assert.doesNotMatch(setup,/arena-enemy-dragon/);
  const opponents=renderToStaticMarkup(React.createElement(ArenaView,{arena:{...arena,phase:'opponents'}}));
  assert.match(opponents,/arena-hidden-dragon/);assert.match(opponents,/Opponent team concealed/);
  assert.doesNotMatch(opponents,/Water Dragon|Lv20|Rookie Warden/);
  assert.doesNotMatch(opponents,/arena-element-filter|Filter: Fire/);
  assert.doesNotMatch(opponents,/arena-roster-grid/);
  const refill=renderToStaticMarkup(React.createElement(ArenaView,{arena:{...arena,phase:'opponents',
    data:{...data,attemptsRemaining:1}}}));
  assert.match(refill,/Restore all attempts · 5 gems/);
  assert.match(refill,/Your rival list stays until all five are defeated/);
  const defeated=renderToStaticMarkup(React.createElement(ArenaView,{arena:{...arena,phase:'opponents',
    data:{...data,defeatedOpponentIds:['bot-1']}}}));
  assert.match(defeated,/Defeated this round/);
  assert.match(defeated,/<button[^>]*disabled=""[^>]*><span>✓ Defeated<\/span>/);
  const fullIds=Array.from({length:arenaConfig.teamSize},(_,index)=>index===0?2:index+4);
  const full={...arena,draft:{attack:fullIds}};
  const fullSetup=renderToStaticMarkup(React.createElement(ArenaView,{arena:full}));
  assert.doesNotMatch(fullSetup.match(/<div class="arena-save-bar">(.*?)<\/div>/)[1],/disabled=""/);
  const battle={opponent:'Bela',turn:1,attack:[dragon,{...dragon,id:5,nickname:'Sparky',species:'fire'},
      {...dragon,id:6,nickname:'Breeze',species:'wind'}],
    defense:[{...dragon,id:3,species:'water',nickname:'Milo'},
      {...dragon,id:7,nickname:'River',species:'water'},{...dragon,id:8,nickname:'Stone',species:'ice'}],
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
  assert(fighting.indexOf('battle-stage')<fighting.indexOf('arena-battle-reserves')&&
    fighting.indexOf('arena-battle-reserves')<fighting.indexOf('arena-stage-controls')&&
    fighting.indexOf('arena-stage-controls')<fighting.indexOf('battle-skill-grid'),
    'Reserve avatars and skill buttons are contained inside the battle field');
  assert.match(fighting,/Your reserve dragons/);
  assert.match(fighting,/Rival reserve dragons/);
  assert.equal((fighting.match(/arena-reserve-button/g)||[]).length,4,
    'Only the two reserve dragons per side appear beside the battlefield');
  assert.doesNotMatch(fighting,/arena-parties|arena-battle-party/,
    'Large translucent party overlays are removed');
  assert.doesNotMatch(fighting,/4,250 power|roster-power/);
  assert.doesNotMatch(fighting,/battle-feed|Recent moves/);
  assert.doesNotMatch(fighting,/battle-details-scroll|battle-feed|Recent moves/,
    'Arena skills stay inside the battle and turn logs remain hidden');
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
    event:{damage:345,matchup:2,element:'fire',skill:'Inferno',side:'attack',critical:true}}));
  assert.match(strongCrit,/−345/);assert.match(strongCrit,/matchup-mark strong/);
  assert.match(strongCrit,/matchup-mark crit/);
  const weak=renderToStaticMarkup(React.createElement(SkillEffect,{frame:4,
    event:{damage:88,matchup:.5,element:'fire',skill:'Ember',side:'attack'}}));
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
