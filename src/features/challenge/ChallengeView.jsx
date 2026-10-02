import React,{useEffect,useRef,useState} from 'react';
import {Button,Switch} from 'antd';
import {Battle} from '../arena/ArenaBattle.jsx';
import {ElementFilter,RosterCard} from '../arena/ArenaShared.jsx';
import '../../arena.css';
import '../../challenge.css';
import {game} from '../../app/game-bridge.js';

export default function ChallengeView({status,request,refresh}){
  const match=status?.match,[selection,setSelection]=useState([]),[elements,setElements]=useState([]);
  const challengeConfig=window.DragonConfig.challenge,arenaConfig=window.DragonConfig.arena;
  const teamSize=challengeConfig.teamSize,minLevel=arenaConfig.minBattleLevel;
  const [presentation,setPresentation]=useState(null),[animating,setAnimating]=useState(false);
  const last=useRef(null);
  useEffect(()=>{
    if(match?.phase!=='select')setSelection([]);
    else setSelection(match.selection||[]);
  },[match?.id,match?.phase,match?.ready]);
  useEffect(()=>{
    if(match?.phase!=='battle'){last.current=null;setPresentation(null);setAnimating(false);return;}
    const previous=last.current,current={id:match.id,seq:match.eventSeq||0,battle:match.battle};
    last.current=current;
    if(previous?.id===current.id&&current.seq>previous.seq){
      const count=Math.min(current.seq-previous.seq,current.battle.events.length);
      const events=current.battle.events.slice(-count);
      setPresentation({id:Date.now()+Math.random(),before:previous.battle,events});
      setAnimating(true);
      const timing=window.DragonConfig.system.presentation;
      const timer=setTimeout(()=>{setPresentation(null);setAnimating(false);},
        Math.max(timing.battleFinishMinMs,events.length*timing.battleEventMs+timing.battleFinishPaddingMs));
      return()=>clearTimeout(timer);
    }
  },[match?.id,match?.phase,match?.eventSeq]);
  async function act(body){
    if(body.action==='forfeit'&&!window.confirm('Forfeit this duel? No rewards or cooldown apply.'))return;
    await request('turn',{...body,expectedTurn:match.battle.turn,expectedEvents:match.eventSeq});
  }
  const roster=match?.roster?.filter(dragon=>elements.every(element=>
    game()?.data?.species?.[dragon.species]?.elements?.includes(element)))||[];
  const opponentReconnecting=match?.opponentConnection==='reconnecting';
  const opponentReconnectSeconds=opponentReconnecting?
    Math.max(0,Math.ceil(((match?.opponentReconnectUntil||0)-Date.now())/1000)):0;
  if(!status)return <div className="challenge-panel">Connecting to online players…</div>;
  return <div className="challenge-panel">
    {status.error&&<p className="challenge-error" role="alert">{status.error}</p>}
    {opponentReconnecting&&<p className="challenge-reconnecting" role="status">
      🟠 {match.opponent} is reconnecting · {opponentReconnectSeconds}s remaining. Challenge actions are paused.
    </p>}
    {match?.phase==='battle'?<Battle challenge onDuelAction={act} myTurn={match.myTurn}
      arena={{data:{battle:match.battle},presentation,animating,busy:status.busy||opponentReconnecting,error:status.error}}/>:
    match?.phase==='invited'?<section className="challenge-wait">
      <h3>{match.outgoing?'Waiting for '+match.opponent:'Challenge from '+match.opponent}</h3>
      <p>{match.outgoing?'Waiting for the other player to accept.':`Accept to choose ${teamSize} dragons privately.`}</p>
      <p>Expires in {Math.max(0,Math.ceil((match.until-Date.now())/1000))} seconds.</p>
      {match.outgoing?<Button danger disabled={status.busy} onClick={()=>request('leave')}>Cancel invitation</Button>:<div className="challenge-actions">
        <Button type="primary" disabled={status.busy||opponentReconnecting}
          onClick={()=>request('respond',{accept:true})}>Accept</Button>
        <Button danger disabled={status.busy} onClick={()=>request('respond',{accept:false})}>Decline</Button></div>}
    </section>:match?.phase==='select'?<section className="challenge-select">
      <h3>Choose {teamSize} dragons · {selection.length}/{teamSize}</h3>
      <p>Your selection is private. {match.opponentReady?'Opponent is ready.':'Waiting for opponent selection.'}</p>
      {match.ready?<p className="challenge-waiting">You are ready. Waiting for {match.opponent}…</p>:<>
        <ElementFilter value={elements} onChange={setElements}/>
        <div className="arena-roster-grid">{roster.map(dragon=><RosterCard key={dragon.id} dragon={dragon}
          selected={selection.includes(dragon.id)} onClick={()=>setSelection(current=>current.includes(dragon.id)?
            current.filter(id=>id!==dragon.id):current.length<teamSize?[...current,dragon.id]:current)}/>)}
        </div><Button type="primary" disabled={selection.length!==teamSize||status.busy||opponentReconnecting}
          onClick={()=>request('select',{ids:selection})}>Ready with these {teamSize}</Button></>}
      <Button danger disabled={status.busy} onClick={()=>request('leave')}>Cancel challenge</Button>
    </section>:<section className="challenge-lobby">
      <h3>Online challenges</h3><p>No rewards and no cooldown. Both players take turns manually.</p>
      <p role="status">Your status: <b>{status.online?'🟢 Online':'⚫ Offline'}</b> · Based on your latest saved progress.</p>
      <label className="challenge-availability">Accept challenges
        <Switch checked={!!status.enabled} disabled={status.busy} onChange={enabled=>request('availability',{enabled},'PUT')}/>
        <b>{status.enabled?'Enabled':'Disabled'}</b></label>
      {!status.enabled?<p>Turn on availability to appear online and send invitations.</p>:
      !status.online?<p>Saving your progress will bring you online shortly.</p>:
      !status.eligible?<p>You need {teamSize} dragons at level {minLevel} or above that are not breeding.</p>:
      <><Button onClick={refresh} disabled={status.busy}>Refresh online players</Button><div className="challenge-players">
        {status.players.length?status.players.map(player=><Button key={player.id} block
          disabled={status.busy} onClick={()=>request('invite',{opponentId:player.id})}>
          🟢 {player.username} · Challenge</Button>):<p>No eligible players are online and available right now.</p>}
      </div></>}
    </section>}
  </div>;
}
