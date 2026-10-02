import React,{useEffect,useMemo} from 'react';
import {Button,Progress} from 'antd';
import {inlineStyle} from '../inline-style.mjs';
import {game,send} from '../app/game-bridge.js';

function DragonCanvas({species,level,attrs}){
  const ref=React.useRef(null);
  useEffect(()=>{if(ref.current)game()?.paint(ref.current,species,level);},[species,level]);
  return <canvas ref={ref} {...attrs}/>;
}
function convert(node,key){
  if(node.nodeType===3)return node.textContent;
  if(node.nodeType!==1)return null;
  const tag=node.tagName.toLowerCase(),d=node.dataset||{};
  const children=()=>Array.from(node.childNodes).map((child,i)=>convert(child,i));
  if(tag==='button'){
    if(node.classList.contains('breed-dragon'))return <button key={key} type="button"
      className={node.className} disabled={node.disabled}
      aria-pressed={node.getAttribute('aria-pressed')||undefined}
      onClick={e=>{e.stopPropagation();send({...d});}}>{children()}</button>;
    return <Button key={key}
      type={node.classList.contains('primary')||node.classList.contains('good')?'primary':'default'}
      danger={node.classList.contains('danger')} disabled={node.disabled} className={node.className}
      title={node.title||undefined} aria-label={node.getAttribute('aria-label')||undefined}
      aria-pressed={node.getAttribute('aria-pressed')||undefined}
      role={node.getAttribute('role')||undefined} aria-selected={node.getAttribute('aria-selected')||undefined}
      onClick={e=>{e.stopPropagation();send({...d});}}>{children()}</Button>;
  }
  if(tag==='canvas'&&d.dragonArt)return <DragonCanvas key={key} species={d.dragonArt}
    level={Number(d.artLevel)||1} attrs={{width:Number(node.getAttribute('width'))||144,
      height:Number(node.getAttribute('height'))||116,className:node.className,
      style:node.getAttribute('style')?{width:node.style.width||undefined}:undefined}}/>;
  if(tag==='input'&&node.type==='file')return <input key={key} type="file"
    id={node.id==='saveImport'?'reactSaveImport':node.id} className={node.className} accept={node.accept}
    onChange={e=>{e.stopPropagation();const file=e.target.files?.[0];if(file)game()?.importSave(file);}}/>;
  if(tag==='input'&&d.breedSearch)return <input key={key} type="search" className={node.className}
    value={node.value} data-breed-search={d.breedSearch} placeholder={node.placeholder}
    aria-label={node.getAttribute('aria-label')} onChange={e=>{
      const slot=d.breedSearch,query=e.target.value;
      game().ui[slot==='father'?'breedFatherQuery':'breedMotherQuery']=query;
      send({action:'breed-search',slot,query});
    }}/>;
  const props={key};
  for(const attr of Array.from(node.attributes)){
    const name=attr.name;
    if(name==='class')props.className=attr.value;
    else if(name==='for')props.htmlFor=attr.value==='saveImport'?'reactSaveImport':attr.value;
    else if(name==='tabindex')props.tabIndex=Number(attr.value);
    else if(name==='style')props.style=inlineStyle(attr.value);
    else if(!name.startsWith('on')&&!['value','disabled'].includes(name))props[name]=attr.value;
  }
  if(tag==='progress')return <Progress key={key}
    percent={Math.round((Number(node.value)/Math.max(1,Number(node.max)))*100)} showInfo={false}/>;
  if(d.action&&node.getAttribute('role')==='button'){
    props.onClick=e=>{e.stopPropagation();if(e.target.closest('button,a,input,select,textarea'))return;send({...d});};
    props.onKeyDown=e=>{if(e.target===e.currentTarget&&['Enter',' '].includes(e.key)){
      e.preventDefault();e.stopPropagation();send({...d});
    }};
  }
  return React.createElement(tag,props,...children());
}

export default function LegacyContent({html}){
  const content=useMemo(()=>{
    if(!html)return null;
    const doc=new DOMParser().parseFromString('<div>'+html+'</div>','text/html');
    return Array.from(doc.body.firstChild.childNodes).map((node,i)=>convert(node,i));
  },[html]);
  return <div className="react-content">{content}</div>;
}
