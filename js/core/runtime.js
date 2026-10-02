"use strict";
(function(){
  const listeners=new Set();
  function emit(){
    for(const listener of [...listeners])try{listener();}catch(error){console.error(error);}
    window.dispatchEvent(new Event("dragon-ui-update"));
  }
  function subscribe(listener){
    listeners.add(listener);return function(){listeners.delete(listener);};
  }
  function game(){return window.DragonGame||null;}
  function snapshot(){
    const current=game();
    return current?{state:current.state,ui:current.ui,account:current.account,data:current.data}:null;
  }
  window.DragonRuntime={emit,subscribe,game,snapshot};
})();