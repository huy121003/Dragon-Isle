/* REACT: Giao diện Ant Design used chung các thao tác và dữ liệu của game Canvas. */
import React, {useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button,Card,ConfigProvider,Drawer,Form,Input,InputNumber,Modal,Popconfirm,Progress,Space,Spin,Table,Tag,Typography,message} from 'antd';
import ArenaView from './ArenaView.jsx';
import {inlineStyle} from './inline-style.mjs';
import './ui.css';
const $=id=>document.getElementById(id);
const game=()=>window.DragonGame;
const send=data=>game()?.action(data);
const read=id=>$(id)?.innerHTML||'';
const txt=id=>$(id)?.textContent||'';

/* Tranh dragons: Canvas riêng trong từng thẻ React, cùng hàm vẽ với đảo. */
function DragonCanvas({species,level,attrs}){
  const ref=React.useRef(null);
  useEffect(()=>{if(ref.current)game()?.paint(ref.current,species,level);},[species,level]);
  return <canvas ref={ref} {...attrs}/>;
}

/* Bộ chuyển DOM: giữ cấu trúc nội dung game, used điều khiển Ant Design và một đường xử lý hành động. */
function convert(node,key){
  if(node.nodeType===3)return node.textContent;
  if(node.nodeType!==1)return null;
  const tag=node.tagName.toLowerCase(),d=node.dataset||{};
  const children=()=>Array.from(node.childNodes).map((child,i)=>convert(child,i));
  if(tag==='button'){
    if(node.classList.contains('breed-dragon'))return <button key={key} type="button"
      className={node.className} disabled={node.disabled}
      aria-pressed={node.getAttribute('aria-pressed')||undefined}
      onClick={()=>send({...d})}>{children()}</button>;
    const danger=node.classList.contains('danger');
    return <Button key={key} type={node.classList.contains('primary')||node.classList.contains('good')?'primary':'default'}
      danger={danger} disabled={node.disabled} className={node.className}
      title={node.title||undefined} aria-label={node.getAttribute('aria-label')||undefined}
      aria-pressed={node.getAttribute('aria-pressed')||undefined}
      onClick={()=>send({...d})}>{children()}</Button>;
  }
  if(tag==='canvas'&&d.dragonArt){
    return <DragonCanvas key={key} species={d.dragonArt} level={Number(d.artLevel)||1}
      attrs={{width:Number(node.getAttribute('width'))||144,height:Number(node.getAttribute('height'))||116,
        className:node.className,style:node.getAttribute('style')?{width:node.style.width||undefined}:undefined}}/>;
  }
  if(tag==='input'&&node.type==='file'){
    return <input key={key} type="file" id={node.id} accept={node.accept}
      onChange={e=>{e.stopPropagation();const file=e.target.files?.[0];if(file)game()?.importSave(file);}}/>;
  }
  if(tag==='input'&&d.breedSearch){
    return <input key={key} type="search" className={node.className} defaultValue={node.value}
      placeholder={node.placeholder} aria-label={node.getAttribute('aria-label')}
      onChange={e=>{
        const slot=d.breedSearch,query=e.target.value;
        game().ui[slot==='father'?'breedFatherQuery':'breedMotherQuery']=query;
        send({action:'breed-search',slot,query});
      }}/>
  }
  const props={key};
  for(const attr of Array.from(node.attributes)){
    const name=attr.name;
    if(name==='class')props.className=attr.value;
    else if(name==='for')props.htmlFor=attr.value;
    else if(name==='style'){
      props.style=inlineStyle(attr.value);
    }else if(!name.startsWith('on')&&!['value','disabled'].includes(name))props[name]=attr.value;
  }
  if(tag==='progress')return <Progress key={key} percent={Math.round((Number(node.value)/Math.max(1,Number(node.max)))*100)} showInfo={false}/>;
  return React.createElement(tag,props,...children());
}
function LegacyContent({html}){
  const content=useMemo(()=>{
    if(!html)return null;
    const doc=new DOMParser().parseFromString('<div>'+html+'</div>','text/html');
    return Array.from(doc.body.firstChild.childNodes).map((node,i)=>convert(node,i));
  },[html]);
  return <div className="react-content">{content}</div>;
}

/* AUTH: Sign in/đăng ký với phiên cookie HttpOnly do Node cấp. */
function Auth({onDone}){
  const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(values){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'same-origin',body:JSON.stringify(values)});
      const body=await response.json();if(!response.ok)throw Error(body.error||'Unable to sign in.');
      onDone();window.location.reload();
    }catch(e){setError(e.message);setBusy(false);}
  }
  return <div className="react-auth"><Card className="login-card">
    <div className="login-crest">🐉</div><Typography.Title level={2}>Dragon Isle</Typography.Title>
    <Typography.Text type="secondary">Your own dragon island</Typography.Text>
    <div className="auth-switch"><Button type={mode==='login'?'primary':'default'} onClick={()=>{setMode('login');setError('');}}>Sign in</Button>
      <Button type={mode==='register'?'primary':'default'} onClick={()=>{setMode('register');setError('');}}>Register</Button></div>
    <Form layout="vertical" onFinish={submit} autoComplete="on">
      <Form.Item name="username" label="Username" rules={[{required:true,message:'Enter your username'},{pattern:/^[A-Za-z0-9_]{3,24}$/,message:'3–24 letters, numbers or underscores'}]}>
        <Input size="large" autoComplete="username"/></Form.Item>
      <Form.Item name="password" label="Password" rules={[{required:true,message:'Enter your password'},{min:8,message:'At least 8 characters'}]}>
        <Input.Password size="large" autoComplete={mode==='login'?'current-password':'new-password'}/></Form.Item>
      {error&&<Typography.Text type="danger">{error}</Typography.Text>}
      <Button size="large" type="primary" htmlType="submit" loading={busy} block>{mode==='login'?'Enter island':'Create account'}</Button>
    </Form></Card></div>;
}

/* ADMIN: Một bộ trường used cho sửa riêng và áp dụng hàng loạt. */
const RESOURCE_FIELDS=[['gold','🪙 Gold',1_000_000_000_000],['food','🍎 Food',1_000_000_000],
  ['gems','💎 Gem',1_000_000_000]];
function ResourceFields(){
  return RESOURCE_FIELDS.map(([name,label,max])=><Form.Item key={name} name={name} label={label}
    rules={[{validator:(_,value)=>value==null||Number.isSafeInteger(value)&&value>=0&&value<=max?
      Promise.resolve():Promise.reject(new Error('Whole number from 0 to '+max.toLocaleString('en-US')))}]}>
    <InputNumber min={0} max={max} precision={0} style={{width:'100%'}} placeholder="Leave unchanged"/>
  </Form.Item>);
}
/* ADMIN: Danh sách tài khoản và tiến trình; mọi thao tác đều do API phân quyền xác thực. */
function Admin({open,onClose}){
  const [users,setUsers]=useState([]),[loading,setLoading]=useState(false);
  const [editing,setEditing]=useState(null),[saving,setSaving]=useState(false);
  const [editForm]=Form.useForm(),[bulkForm]=Form.useForm();
  useEffect(()=>{
    if(editing)editForm.setFieldsValue({gold:editing.progress?.gold??500,
      food:editing.progress?.food??50,gems:editing.progress?.gems??10});
  },[editing,editForm]);
  async function load(){
    setLoading(true);
    try{const response=await fetch('/api/admin/users',{cache:'no-store'});const body=await response.json();
      if(!response.ok)throw Error(body.error);setUsers(body.users||[]);
    }catch(e){message.error(e.message);}finally{setLoading(false);}
  }
  useEffect(()=>{if(open)load();},[open]);
  async function act(user,action){
    try{const response=await fetch('/api/admin/users/'+encodeURIComponent(user.id)+'/'+action,{method:'POST'});
      const body=await response.json();if(!response.ok)throw Error(body.error);
      message.success(action==='reset'?'Progress reset':'Account updated');await load();
    }catch(e){message.error(e.message);}
  }
  function openEditor(user){setEditing(user);}
  async function applyResources(target,values){
    const patch=Object.fromEntries(Object.entries(values).filter(([,value])=>value!==undefined&&value!==null));
    if(!Object.keys(patch).length){message.warning('Enter at least one resource.');return;}
    setSaving(true);
    try{
      const route=target?'/api/admin/users/'+encodeURIComponent(target.id)+'/resources':'/api/admin/resources';
      const response=await fetch(route,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
      const body=await response.json();if(!response.ok)throw Error(body.error||'Unable to update resources.');
      setEditing(null);bulkForm.resetFields();
      if(body.relogin){message.success('Resources saved. Sign in again to see the new balance.');
        setTimeout(()=>window.location.reload(),900);return;}
      message.success('Updated '+body.updated+' accounts. Players need to sign in again.');
      await load();
    }catch(e){message.error(e.message);}finally{setSaving(false);}
  }
  const columns=[
    {title:'Player',dataIndex:'username',key:'username',render:(name,row)=><Space>{name}{row.role==='admin'&&<Tag color="gold">Admin</Tag>}{row.disabled&&<Tag color="red">Disabled</Tag>}</Space>},
    {title:'Level',key:'level',render:(_,row)=>row.progress?.level??'—'},
    {title:'Dragons',key:'dragons',render:(_,row)=>row.progress?.dragons??'—'},
    {title:'Gold',key:'gold',render:(_,row)=>(row.progress?.gold??500).toLocaleString('en-US')},
    {title:'Food',key:'food',render:(_,row)=>(row.progress?.food??50).toLocaleString('en-US')},
    {title:'Gem',key:'gems',render:(_,row)=>(row.progress?.gems??10).toLocaleString('en-US')},
    {title:'Last saved',key:'saved',render:(_,row)=>row.progress?.savedAt?new Date(row.progress.savedAt).toLocaleString('en-US'):'—'},
    {title:'Actions',key:'actions',render:(_,row)=><Space wrap>
      <Button type="primary" size="small" onClick={()=>openEditor(row)}>Edit resources</Button>
      {row.role==='admin'?null:<>
      <Popconfirm title="Reset this player’s progress?" description="The account remains and progress starts over." onConfirm={()=>act(row,'reset')}><Button danger size="small">Reset</Button></Popconfirm>
      <Popconfirm title={row.disabled?'Enable this account?':'Disable this account?'} onConfirm={()=>act(row,row.disabled?'enable':'disable')}>
        <Button size="small">{row.disabled?'Enable':'Disable'}</Button></Popconfirm>
      </>}
    </Space>}
  ];
  return <Drawer title="Admin · Dragon Isle" open={open} onClose={onClose} width="min(100vw, 1000px)" extra={<Button onClick={load}>Refresh</Button>}>
    <Typography.Paragraph>Player: {users.length} · Progress is saved separately for each account.</Typography.Paragraph>
    <Card size="small" title="Set balances for all accounts" style={{marginBottom:16}}>
      <Typography.Paragraph type="secondary">Enter the resources to change; leave other fields blank. Active players need to sign in again.</Typography.Paragraph>
      <Form form={bulkForm} layout="vertical" className="admin-resource-form"><ResourceFields/></Form>
      <Popconfirm title="Apply balances to all players?" description="Each active player must sign in again." onConfirm={()=>bulkForm.validateFields().then(values=>applyResources(null,values)).catch(()=>{})}>
        <Button type="primary" loading={saving}>Apply to all</Button></Popconfirm>
    </Card>
    <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={users}
      scroll={{x:940}} pagination={{pageSize:12}}/>
    <Modal title={'Edit resources · '+(editing?.username||'')} open={!!editing} onCancel={()=>setEditing(null)}
      onOk={()=>editForm.validateFields().then(values=>applyResources(editing,values)).catch(()=>{})}
      okText="Save balances" okButtonProps={{loading:saving}} destroyOnHidden>
      <Typography.Paragraph type="secondary">Enter the new balance. This player must sign in again.</Typography.Paragraph>
      <Form form={editForm} layout="vertical"><ResourceFields/></Form>
    </Modal>
  </Drawer>;
}

/* GAME UI: Tài nguyên, tiến trình, thanh thao tác, bảng thông tin và modal. */
function App(){
  const [tick,setTick]=useState(0),[account,setAccount]=useState(null),[authReady,setAuthReady]=useState(false),[admin,setAdmin]=useState(false);
  useEffect(()=>{
    document.body.classList.add('react-ready');
    let alive=true;
    fetch('/api/auth/me',{cache:'no-store'}).then(async r=>r.ok?(await r.json()).user:null)
      .then(user=>{if(alive){setAccount(user);setAuthReady(true);}})
      .catch(()=>{if(alive)setAuthReady(true);});
    const update=()=>setTick(t=>t+1);window.addEventListener('dragon-ui-update',update);
    window.gameBootPromise?.then(update);
    const timer=setInterval(update,1000);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener('dragon-ui-update',update);};
  },[]);
  const state=game()?.state,ui=game()?.ui;
  if(!authReady)return <div className="react-loading"><Spin size="large"/></div>;
  if(!account)return <Auth onDone={()=>{}}/>;
  if(!state)return <div className="react-loading"><Spin size="large" tip="Loading dragon island"/></div>;
  const xp=state.player.level>=60?100:Math.min(100,Math.round(state.player.xp/game().xpNeeded(state.player.level)*100));
  const buttons=[['🗺️','Islands','open-islands'],['🏪','Shop','open-shop'],['🐲','Dragons','open-dragons'],['📖','Dragon Book','open-book'],['🎒','Inventory','open-inventory']];
  return <>
    <header className="react-hud"><div className="hud-identity"><span className="hud-dragon">🐉</span><div><b>Dragon Isle</b><small>Level {state.player.level} · {account.username}</small><Progress percent={xp} showInfo={false} size="small"/></div></div>
      <div className="hud-resources"><Card size="small"><span>🪙</span><b>{txt('goldAmount')}</b><small>{txt('incomeRate')}</small></Card>
        <Card size="small"><span>🍎</span><b>{txt('foodAmount')}</b></Card>
        <Card size="small"><span>💎</span><b>{txt('gemAmount')}</b></Card></div>
      <Space className="hud-tools">{account.role==='admin'&&<Button onClick={()=>setAdmin(true)}>⚙ Admin</Button>}
        <Button onClick={()=>send({action:'logout'})}>Sign out</Button></Space>
    </header>
    {read('timersBar')&&<div className="react-timers"><LegacyContent html={read('timersBar')}/></div>}
    {ui?.selection&&!ui?.mode&&read('inspector')&&<aside className="react-inspector"><LegacyContent html={read('inspector')}/></aside>}
    {ui?.mode&&<div className="react-placement"><Card size="small"><Space wrap>{txt('placementText')}<Button danger onClick={()=>send({action:'cancel-mode'})}>Cancel</Button></Space></Card></div>}
    <nav className="react-dock" aria-label="Main menu">{buttons.map(([icon,label,action])=><Button key={action} className={ui?.modal?.name===action.slice(5)?'selected':''} onClick={()=>send({action})}>
      <span>{icon}</span><b>{label}</b>{action==='open-book'&&<small>{txt('collectionProgress')}</small>}</Button>)}</nav>
    <Modal className={'game-modal '+(ui?.modal?.name==='arena'?'arena-modal':'')} title={txt('sheetTitle')} open={!!ui?.modal} onCancel={()=>send({action:'close-modal'})} footer={null}
      width={ui?.modal?.name==='arena'?1120:760} destroyOnHidden styles={{body:{maxHeight:ui?.modal?.name==='arena'?'min(84dvh, 850px)':'min(72dvh, 700px)',overflowY:'auto'}}}>
      {ui?.modal?.name==='arena'?<ArenaView arena={ui.arena}/>:<LegacyContent html={read('sheetBody')}/>}
    </Modal>
    <Admin open={admin} onClose={()=>setAdmin(false)}/>
  </>;
}

/* THEME: Màu sắc nhất quán cho điện thoại và màn hình lớn. */
createRoot($('react-root')).render(<ConfigProvider theme={{token:{colorPrimary:'#298d80',colorInfo:'#298d80',borderRadius:14,fontFamily:'system-ui, sans-serif',colorBgContainer:'#fffdf7'},components:{Button:{controlHeight:38,fontWeight:700},Card:{borderRadiusLG:20}}}}><App/></ConfigProvider>);
