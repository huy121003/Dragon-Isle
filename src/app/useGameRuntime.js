import {useEffect} from 'react';
import {useAppStore,runtimeSnapshot} from './store.js';

export function useGameRuntime(){
  const runtimeVersion=useAppStore(state=>state.runtimeVersion);
  const connection=useAppStore(state=>state.connection);
  const bumpRuntime=useAppStore(state=>state.bumpRuntime);
  const syncConnection=useAppStore(state=>state.syncConnection);
  useEffect(()=>{
    document.body.classList.add('react-ready');
    const unsubscribe=window.DragonRuntime?.subscribe?.(bumpRuntime);
    if(!unsubscribe)window.addEventListener('dragon-ui-update',bumpRuntime);
    window.addEventListener('dragon-connection-change',syncConnection);
    window.gameBootPromise?.then(bumpRuntime);syncConnection();
    const timer=setInterval(bumpRuntime,1000);
    return()=>{
      clearInterval(timer);
      if(unsubscribe)unsubscribe();else window.removeEventListener('dragon-ui-update',bumpRuntime);
      window.removeEventListener('dragon-connection-change',syncConnection);
    };
  },[bumpRuntime,syncConnection]);
  void runtimeVersion;
  return {...runtimeSnapshot(),connection};
}

