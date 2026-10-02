/**
 * Perspective-correct public DTO builder for live Challenge matches.
 *
 * Match state is stored in player-0 attack orientation. This adapter flips
 * battle sides/events for player 1 without mutating authoritative match state.
 */
const challengeConfig=require('../../js/config/challenge.js');

/**
 * Bind Challenge DTO helpers to user/presence/Arena services.
 * @param {object} deps
 * @param {Function} deps.users - Current account list provider.
 * @param {object} deps.presencePolicy - Presence/reconnect policy facade.
 * @param {object} deps.arena - Shared Arena battle/public DTO facade.
 */
function createChallengeView({users,presencePolicy,arena}){
  /** Build the Challenge DTO seen by one participant. */
  function view(match,id){
    const index=match.players.indexOf(id),opponentId=match.players[1-index];
    const opponent=users().find(user=>user.id===opponentId);
    const opponentPresence=presencePolicy.state(match,1-index);
    const result={id:match.id,phase:match.phase,opponent:opponent?.username||'Player',
      outgoing:index===0,until:match.until,ready:!!match.ready[index],
      opponentReady:!!match.ready[1-index],selection:match.selection[index]||[],
      updatedAt:match.updatedAt,opponentConnection:opponentPresence.state,
      opponentReconnectUntil:opponentPresence.reconnectUntil};

    if(match.phase===challengeConfig.phases.SELECT)result.roster=match.rosters[index];

    if(match.phase===challengeConfig.phases.BATTLE){
      const reverse=index===1,raw=arena.publicBattle(match.battle);
      const flip=side=>side==='attack'?'defense':side==='defense'?'attack':side;
      const swapEvent=event=>reverse?{...event,side:flip(event.side),targetSide:flip(event.targetSide),
        state:event.state?{...event.state,attack:event.state.defense,defense:event.state.attack,
          activeAttack:event.state.activeDefense,activeDefense:event.state.activeAttack}:undefined}:event;
      result.battle=reverse?{...raw,attack:raw.defense,defense:raw.attack,
        activeAttack:raw.activeDefense,activeDefense:raw.activeAttack,
        events:raw.events.map(swapEvent)}:raw;
      result.battle.opponent=result.opponent;
      result.eventSeq=match.battle.events.length;
      result.myTurn=match.battle.nextSide===(reverse?'defense':'attack');
    }
    return result;
  }

  return {view};
}

module.exports={createChallengeView};
