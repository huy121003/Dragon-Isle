"use strict";
(function(){
  const listeners=new Set();
  function emit(reason="ui"){
    for(const listener of [...listeners])try{listener(reason);}catch(error){console.error(error);}
    const event=typeof CustomEvent==='function'?new CustomEvent("dragon-ui-update",{detail:{reason}}):new Event("dragon-ui-update");
    if(!('detail' in event))Object.defineProperty(event,'detail',{value:{reason}});
    window.dispatchEvent(event);
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
