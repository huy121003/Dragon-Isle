import React,{useEffect,useRef} from 'react';
import {Button,Card,Modal,Space,Spin} from 'antd';
import ArenaView from '../ArenaView.jsx';
import ChallengeView from '../ChallengeView.jsx';
import { $,game,read,send,text } from './game-bridge.js';
import {useGameRuntime} from './useGameRuntime.js';
import {useAuth} from '../features/auth/useAuth.js';
import {useAppStore} from '../store/app-store.js';
import AuthView from '../features/auth/AuthView.jsx';
import AdminPanel from '../features/admin/AdminPanel.jsx';
import ReconnectModal from '../features/connection/ReconnectModal.jsx';
import useChallenge from '../features/challenge/useChallenge.js';
import LegacyContent from '../components/LegacyContent.jsx';
import GameHud from '../components/GameHud.jsx';
import GameDock from '../components/GameDock.jsx';

export default function GameShell(){
  const {account,ready:authReady}=useAuth();
  const {state,ui,connection}=useGameRuntime();
  const admin=useAppStore(state=>state.adminOpen);
  const setAdmin=useAppStore(state=>state.setAdminOpen);
  const hudRef=useRef(null),dockRef=useRef(null);
  const challengeCtl=useChallenge(account,connection);
  const {challenge,open:challengeOpen,setOpen:setChallengeOpen,status:challengeStatus,request:challengeRequest}=challengeCtl;

  useEffect(()=>{
    if(!account||!hudRef.current||!dockRef.current)return;
    const root=$('react-root');
    const resize=()=>{
      root.style.setProperty('--hud-height',hudRef.current.getBoundingClientRect().height+'px');
      root.style.setProperty('--dock-height',dockRef.current.getBoundingClientRect().height+'px');
    };
    const observer=new ResizeObserver(resize);
    observer.observe(hudRef.current);observer.observe(dockRef.current);resize();
    return()=>{observer.disconnect();root.style.removeProperty('--hud-height');root.style.removeProperty('--dock-height');};
  },[account?.id,!!state]);

  if(!authReady)return <div className="react-loading"><Spin size="large"/></div>;
  if(!account)return <AuthView/>;
  if(!state)return <div className="react-loading"><Spin size="large" tip="Loading dragon island"/></div>;

  const xpNeeded=game().xpNeeded(state.player.level);
  const commerceModal=['shop','crops'].includes(ui?.modal?.name);
  const arenaBattle=ui?.modal?.name==='arena'&&!!(ui.arena?.data?.battle||ui.arena?.presentation);
  const challengeBattle=challenge?.match?.phase==='battle';

  return <>
    <ReconnectModal connection={connection}/>
    <GameHud account={account} state={state} xpNeeded={xpNeeded} onAdmin={()=>setAdmin(true)} refProp={hudRef}/>
    {read('timersBar')&&<div className="react-timers"><LegacyContent html={read('timersBar')}/></div>}
    {ui?.selection&&!ui?.mode&&!ui?.modal&&!challengeOpen&&!challenge?.match&&!admin&&read('inspector')&&
      <aside className="react-inspector"><LegacyContent html={read('inspector')}/></aside>}
    {ui?.mode&&<div className="react-placement"><Card size="small"><Space wrap>
      {text('placementText')}
      <Button danger onClick={()=>send({action:'cancel-mode'})}>{ui.mode.fromShop?'Back to Shop':'Cancel'}</Button>
    </Space></Card></div>}
    <GameDock state={state} ui={ui} challengeOpen={challengeOpen}
      openChallenge={()=>{setChallengeOpen(true);challengeStatus();}} refProp={dockRef}/>
    <Modal className={'game-modal '+(ui?.modal?.name==='arena'?'arena-modal'+(arenaBattle?' battle-modal':''):
        commerceModal?'commerce-modal':['dragons','book'].includes(ui?.modal?.name)?'collection-modal':'')}
      title={text('sheetTitle')} open={!!ui?.modal} onCancel={()=>send({action:'close-modal'})} footer={null}
      width={ui?.modal?.name==='arena'?1120:760} destroyOnHidden
      styles={{body:{height:commerceModal?'min(66dvh, 560px)':undefined,
        maxHeight:ui?.modal?.name==='arena'?'min(84dvh, 850px)':'min(72dvh, 700px)',overflowY:'auto'}}}>
      {ui?.modal?.name==='arena'?<ArenaView arena={ui.arena}/>:<LegacyContent html={read('sheetBody')}/>}
    </Modal>
    <Modal className={'game-modal arena-modal'+(challengeBattle?' battle-modal':'')} title="🗡️ Thách đấu"
      open={challengeOpen||!!challenge?.match}
      onCancel={()=>challenge?.match?challengeRequest('leave'):setChallengeOpen(false)} footer={null}
      width={1120} destroyOnHidden styles={{body:{maxHeight:'min(84dvh, 850px)',overflowY:'auto'}}}>
      <ChallengeView status={challenge} request={challengeRequest} refresh={challengeStatus}/>
    </Modal>
    <AdminPanel open={admin} onClose={()=>setAdmin(false)}/>
  </>;
}
