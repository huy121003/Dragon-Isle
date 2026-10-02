import {useEffect,useState} from 'react';
import {connectionState,game} from './game-bridge.js';

export function useGameRuntime(){
  const [,setVersion]=useState(0);
  const [connection,setConnection]=useState(()=>connectionState());
  useEffect(()=>{
    document.body.classList.add('react-ready');
    const refresh=()=>setVersion(value=>value+1);
    const refreshConnection=()=>setConnection({...connectionState()});
    window.addEventListener('dragon-ui-update',refresh);
    window.addEventListener('dragon-connection-change',refreshConnection);
    window.gameBootPromise?.then(refresh);
    refreshConnection();
    const timer=setInterval(refresh,1000);
    return()=>{
      clearInterval(timer);
      window.removeEventListener('dragon-ui-update',refresh);
      window.removeEventListener('dragon-connection-change',refreshConnection);
    };
  },[]);
  return {game:game(),state:game()?.state,ui:game()?.ui,connection};
}

export function useAccount(){
  const [account,setAccount]=useState(null),[ready,setReady]=useState(false);
  useEffect(()=>{
    let alive=true;
    fetch('/api/auth/me',{cache:'no-store'}).then(async response=>
      response.ok?(await response.json()).user:null)
      .then(user=>{if(alive){setAccount(user);setReady(true);}})
      .catch(()=>{if(alive)setReady(true);});
    return()=>{alive=false;};
  },[]);
  return {account,ready};
}
