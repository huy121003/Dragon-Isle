/**
 * Shared battle status rules. Statuses belong to fighters, including reserves.
 * A side clock advances after that side acts; damage over time therefore cannot
 * be avoided by switching. A new application never extends an active status.
 */
const combat=require('../../js/data/combat-rules.js');
const {record}=require('./battle-view.cjs');
const harmful=new Set(['poison','burn','curse','freeze','damage_down','armor_down',
  'accuracy_down','lock_switch']);
const dots=new Set(['poison','burn','curse']);

function status(fighter,kind){return fighter.statuses?.find(item=>item.kind===kind);}
function addStatus(fighter,effect,element){
  fighter.statuses||=[];
  const current=status(fighter,effect.kind);
  if(current){
    if((effect.value||0)>(current.value||0)){
      current.value=effect.value;current.element=element;
      if(effect.healingReduction)current.healingReduction=effect.healingReduction;
    }
    return current;
  }
  const added={kind:effect.kind,turns:effect.duration,value:effect.value||0,element};
  if(effect.healingReduction)added.healingReduction=effect.healingReduction;
  if(effect.cap)added.cap=effect.cap;
  if(effect.counterBonus)added.counterBonus=effect.counterBonus;
  if(effect.kind==='shield')added.amount=Math.round(fighter.maxHp*effect.value);
  fighter.statuses.push(added);
  return added;
}
function removeHarmful(fighter,count=Infinity){
  let removed=0;
  fighter.statuses=fighter.statuses.filter(item=>{
    if(removed<count&&harmful.has(item.kind)){removed++;return false;}
    return true;
  });
  return removed;
}
function absorb(fighter,amount){
  const shield=status(fighter,'shield');
  if(shield&&shield.amount>0){
    const absorbed=Math.min(amount,shield.amount);
    shield.amount-=absorbed;amount-=absorbed;
    if(!shield.amount)fighter.statuses.splice(fighter.statuses.indexOf(shield),1);
  }
  const actual=Math.min(fighter.hp,Math.max(0,Math.round(amount)));
  fighter.hp-=actual;
  fighter.damageLastTurn=(fighter.damageLastTurn||0)+actual;
  if(!fighter.hp)fighter.statuses=[];
  return actual;
}
function heal(fighter,amount){
  if(fighter.hp<=0)return 0;
  const before=fighter.hp,curse=status(fighter,'curse');
  const multiplier=1-Math.min(.5,curse?.healingReduction||0);
  fighter.hp=Math.min(combat.effectiveMaxHp(fighter),fighter.hp+Math.round(amount*multiplier));
  return fighter.hp-before;
}
function living(group){return group.filter(f=>f.hp>0);}
function lowest(group){return living(group).sort((a,b)=>
  a.hp/combat.effectiveMaxHp(a)-b.hp/combat.effectiveMaxHp(b))[0];}
function tickSide(battle,side){
  for(const fighter of battle[side]){
    if(fighter.hp<=0)continue;
    const existing=[...(fighter.statuses||[])];
    let dot=0;
    for(const item of existing)if(dots.has(item.kind))
      dot+=Math.round(fighter.maxHp*item.value);
    const actual=absorb(fighter,Math.min(dot,Math.round(fighter.maxHp*.10)));
    if(actual)record(battle,{side,targetSide:side,actor:fighter.nickname,
      target:fighter.nickname,skill:'Damage over time',effect:'poison',
      statusTick:true,damage:actual,remaining:fighter.hp,knockout:!fighter.hp});
    if(fighter.hp<=0)continue;
    const regeneration=existing.find(item=>item.kind==='regen');
    if(regeneration){
      const amount=heal(fighter,fighter.maxHp*regeneration.value);
      if(amount)record(battle,{side,targetSide:side,actor:fighter.nickname,
        target:fighter.nickname,skill:'Regeneration',effect:'regen',
        statusTick:true,heal:amount,remaining:fighter.hp});
    }
    for(const item of existing){
      if(!fighter.statuses.includes(item))continue;
      item.turns--;
      if(item.turns<=0){
        fighter.statuses.splice(fighter.statuses.indexOf(item),1);
        if(item.kind==='lock_switch')fighter.switchImmunity=4;
        fighter.hp=Math.min(fighter.hp,combat.effectiveMaxHp(fighter));
      }
    }
  }
}
function nextFighter(battle,side){
  const key=side==='attack'?'activeAttack':'activeDefense';
  if(battle[side][battle[key]]?.hp>0)return;
  const index=battle[side].findIndex(f=>f.hp>0);
  if(index>=0){battle[key]=index;record(battle,{side,switchTo:battle[side][index].nickname,automatic:true});}
}
function switchFighter(battle,side,index){
  const key=side==='attack'?'activeAttack':'activeDefense';
  const current=battle[side][battle[key]];
  if(status(current,'lock_switch')||battle.locks?.[side]>0)
    throw Object.assign(new Error('Switching is locked.'),{status:400});
  const incoming=battle[side][index];
  if(!incoming||incoming.hp<=0||index===battle[key])
    throw Object.assign(new Error('Choose a different living dragon.'),{status:400});
  battle[key]=index;
  battle.lastSwitchSide=side;
  const enemy=side==='attack'?'defense':'attack';
  const trap=battle.traps?.[side];
  if(trap?.turns>0){
    const damage=absorb(incoming,Math.round(incoming.maxHp*trap.value));
    battle.traps[side]=null;
    record(battle,{side:enemy,targetSide:side,target:incoming.nickname,skill:'Seismic Trap',
      effect:'switch_trap',damage,remaining:incoming.hp});
  }
  record(battle,{side,switchTo:incoming.nickname});
  nextFighter(battle,side);
}
module.exports={status,addStatus,removeHarmful,absorb,heal,living,lowest,tickSide,
  nextFighter,switchFighter,harmful};
