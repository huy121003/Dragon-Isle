const resetScrollActions=new Set(['shop-tab','book-tab','book-page','guide-tab']);
const detailActions=new Set(['shop-egg-detail','book-detail','dragon-detail']);
const backActions=new Set(['shop-egg-back','book-back','dragon-back']);
const savedModalScroll=new Map();

export const $=id=>typeof document==='undefined'?null:document.getElementById(id);
export const game=()=>typeof window==='undefined'?null:(window.DragonRuntime?.game?.()||window.DragonGame);
export const read=id=>$(id)?.innerHTML||'';
export const text=id=>$(id)?.textContent||'';
const modalKey=modal=>modal.name+':'+String(modal.extra??'');

export function send(data){
  const modal=game()?.ui.modal;
  const scroller=modal?document.querySelector('.game-modal:not(.arena-modal) .ant-modal-body'):null;
  const scrollTop=scroller?.scrollTop;
  if(modal&&detailActions.has(data.action))savedModalScroll.set(modalKey(modal),scrollTop);
  game()?.action(data);
  const next=game()?.ui.modal;
  if(next&&scroller)requestAnimationFrame(()=>{
    const current=document.querySelector('.game-modal:not(.arena-modal) .ant-modal-body');
    if(!current||game()?.ui.modal?.name!==next.name||game()?.ui.modal?.extra!==next.extra)return;
    current.scrollTop=resetScrollActions.has(data.action)?0:
      modal?.name===next.name&&modal?.extra===next.extra?scrollTop:
      backActions.has(data.action)?savedModalScroll.get(modalKey(next))||0:0;
  });
}

export function connectionApi(){return typeof window==='undefined'?null:window.DragonConnectionApi;}
export function connectionState(){
  return typeof window!=='undefined'&&window.DragonConnectionState?
    window.DragonConnectionState:{status:'connected',blocked:false,since:0,nextRetryAt:0,attempts:0,message:''};
}

export function emitRuntime(){
  if(typeof window!=='undefined')window.DragonRuntime?.emit?.();
}
