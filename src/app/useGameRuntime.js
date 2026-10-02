import {useEffect} from 'react';
import {useAppStore} from './store.js';

export function useGameRuntime(){
  const gameRuntime=useAppStore(state=>state.gameRuntime);
  const connection=useAppStore(state=>state.connection);
  const syncGameRuntime=useAppStore(state=>state.syncGameRuntime);
  const syncConnection=useAppStore(state=>state.syncConnection);
  useEffect(()=>{
    document.body.classList.add('react-ready');
    const unsubscribe=window.DragonRuntime?.subscribe?.(syncGameRuntime);
    if(!unsubscribe)window.addEventListener('dragon-ui-update',syncGameRuntime);
    window.addEventListener('dragon-connection-change',syncConnection);
    syncGameRuntime();
    window.gameBootPromise?.then(syncGameRuntime);syncConnection();
    return()=>{
      if(unsubscribe)unsubscribe();else window.removeEventListener('dragon-ui-update',syncGameRuntime);
      window.removeEventListener('dragon-connection-change',syncConnection);
    };
  },[syncGameRuntime,syncConnection]);
  return {...(gameRuntime||{}),connection};
}
