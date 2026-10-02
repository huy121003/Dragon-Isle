import {useEffect} from 'react';
import {connectionState} from './game-bridge.js';
import {useAppStore} from '../store/app-store.js';

export function useGameRuntime(){
  const engineVersion=useAppStore(state=>state.engineVersion);
  const connection=useAppStore(state=>state.connection);
  const bumpEngine=useAppStore(state=>state.bumpEngine);
  const syncConnection=useAppStore(state=>state.syncConnection);

  useEffect(()=>{
    document.body.classList.add('react-ready');
    const refresh=()=>bumpEngine();
    const refreshConnection=()=>syncConnection();
    const unsubscribe=window.DragonRuntime?.subscribe?.(refresh);
    if(!unsubscribe)window.addEventListener('dragon-ui-update',refresh);
    window.addEventListener('dragon-connection-change',refreshConnection);
    window.gameBootPromise?.then(refresh);
    refreshConnection();
    const timer=setInterval(refresh,1000);
    return()=>{
      clearInterval(timer);
      if(unsubscribe)unsubscribe();else window.removeEventListener('dragon-ui-update',refresh);
      window.removeEventListener('dragon-connection-change',refreshConnection);
    };
  },[bumpEngine,syncConnection]);

  const current=window.DragonRuntime?.game?.()||window.DragonGame;
  return {engineVersion,game:current,state:current?.state,ui:current?.ui,
    connection:connection||connectionState()};
}
