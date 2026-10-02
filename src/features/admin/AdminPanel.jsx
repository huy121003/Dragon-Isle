import React,{useEffect,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {Button,Card,Drawer,Form,InputNumber,Modal,Popconfirm,Space,Table,Tag,Typography,message} from 'antd';
import {apiFetch} from '../../api/http.js';
import {AdminUsersSchema,parseWith} from '../../api/schemas.js';

const RESOURCE_FIELDS=[['gold','🪙 Gold',1_000_000_000_000],['food','🍎 Food',1_000_000_000],
  ['gems','💎 Gem',1_000_000_000]];
function ResourceFields(){
  return RESOURCE_FIELDS.map(([name,label,max])=><Form.Item key={name} name={name} label={label}
    rules={[{validator:(_,value)=>value==null||Number.isSafeInteger(value)&&value>=0&&value<=max?
      Promise.resolve():Promise.reject(new Error('Whole number from 0 to '+max.toLocaleString('en-US')))}]}>
    <InputNumber min={0} max={max} precision={0} style={{width:'100%'}} placeholder="Leave unchanged"/>
  </Form.Item>);
}
export default function AdminPanel({open,onClose}){
  const [editing,setEditing]=useState(null);
  const [editForm]=Form.useForm(),[bulkForm]=Form.useForm();
  const queryClient=useQueryClient();
  const usersQuery=useQuery({
    queryKey:['admin','users'],
    enabled:open,
    retry:false,
    queryFn:async()=>parseWith(AdminUsersSchema,await apiFetch('/api/admin/users'),'Admin users')
  });
  const users=usersQuery.data?.users||[];

  useEffect(()=>{
    if(editing)editForm.setFieldsValue({gold:editing.progress?.gold??10000,
      food:editing.progress?.food??2500,gems:editing.progress?.gems??20});
  },[editing,editForm]);

  const actionMutation=useMutation({
    mutationFn:({user,action})=>apiFetch('/api/admin/users/'+encodeURIComponent(user.id)+'/'+action,{method:'POST'}),
    onSuccess:async(_,variables)=>{
      message.success(variables.action==='reset'?'Progress reset':'Account updated');
      await queryClient.invalidateQueries({queryKey:['admin','users']});
    },
    onError:error=>message.error(error.message)
  });

  const resourceMutation=useMutation({
    mutationFn:({target,patch})=>{
      const route=target?'/api/admin/users/'+encodeURIComponent(target.id)+'/resources':'/api/admin/resources';
      return apiFetch(route,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
    },
    onSuccess:async body=>{
      setEditing(null);bulkForm.resetFields();
      if(body.relogin){
        message.success('Resources saved. Sign in again to see the new balance.');
        setTimeout(()=>window.location.reload(),900);return;
      }
      message.success('Updated '+body.updated+' accounts. Players need to sign in again.');
      await queryClient.invalidateQueries({queryKey:['admin','users']});
    },
    onError:error=>message.error(error.message)
  });

  async function applyResources(target,values){
    const patch=Object.fromEntries(Object.entries(values).filter(([,value])=>value!==undefined&&value!==null));
    if(!Object.keys(patch).length){message.warning('Enter at least one resource.');return;}
    resourceMutation.mutate({target,patch});
  }

  const columns=[
    {title:'Player',dataIndex:'username',key:'username',render:(name,row)=><Space>{name}{row.role==='admin'&&<Tag color="gold">Admin</Tag>}{row.disabled&&<Tag color="red">Disabled</Tag>}</Space>},
    {title:'Level',key:'level',render:(_,row)=>row.progress?.level??'—'},
    {title:'Dragons',key:'dragons',render:(_,row)=>row.progress?.dragons??'—'},
    {title:'Gold',key:'gold',render:(_,row)=>(row.progress?.gold??10000).toLocaleString('en-US')},
    {title:'Food',key:'food',render:(_,row)=>(row.progress?.food??2500).toLocaleString('en-US')},
    {title:'Gem',key:'gems',render:(_,row)=>(row.progress?.gems??20).toLocaleString('en-US')},
    {title:'Last saved',key:'saved',render:(_,row)=>row.progress?.savedAt?new Date(row.progress.savedAt).toLocaleString('en-US'):'—'},
    {title:'Actions',key:'actions',render:(_,row)=><Space wrap>
      <Button type="primary" size="small" onClick={()=>setEditing(row)}>Edit resources</Button>
      {row.role==='admin'?null:<>
        <Popconfirm title="Reset this player’s progress?" description="The account remains and progress starts over."
          onConfirm={()=>actionMutation.mutate({user:row,action:'reset'})}><Button danger size="small">Reset</Button></Popconfirm>
        <Popconfirm title={row.disabled?'Enable this account?':'Disable this account?'}
          onConfirm={()=>actionMutation.mutate({user:row,action:row.disabled?'enable':'disable'})}>
          <Button size="small">{row.disabled?'Enable':'Disable'}</Button>
        </Popconfirm>
      </>}
    </Space>}
  ];
  return <Drawer title="Admin · Dragon Isle" open={open} onClose={onClose} width="min(100vw, 1000px)"
    extra={<Button onClick={()=>usersQuery.refetch()}>Refresh</Button>}>
    <Typography.Paragraph>Player: {users.length} · Progress is saved separately for each account.</Typography.Paragraph>
    {usersQuery.error&&<Typography.Paragraph type="danger">{usersQuery.error.message}</Typography.Paragraph>}
    <Card size="small" title="Set balances for all accounts" style={{marginBottom:16}}>
      <Typography.Paragraph type="secondary">Enter the resources to change; leave other fields blank. Active players need to sign in again.</Typography.Paragraph>
      <Form form={bulkForm} layout="vertical" className="admin-resource-form"><ResourceFields/></Form>
      <Popconfirm title="Apply balances to all players?" description="Each active player must sign in again."
        onConfirm={()=>bulkForm.validateFields().then(values=>applyResources(null,values)).catch(()=>{})}>
        <Button type="primary" loading={resourceMutation.isPending}>Apply to all</Button>
      </Popconfirm>
    </Card>
    <Table rowKey="id" size="small" loading={usersQuery.isFetching} columns={columns} dataSource={users}
      scroll={{x:940}} pagination={{pageSize:12}}/>
    <Modal title={'Edit resources · '+(editing?.username||'')} open={!!editing} onCancel={()=>setEditing(null)}
      onOk={()=>editForm.validateFields().then(values=>applyResources(editing,values)).catch(()=>{})}
      okText="Save balances" okButtonProps={{loading:resourceMutation.isPending}} destroyOnHidden>
      <Typography.Paragraph type="secondary">Enter the new balance. This player must sign in again.</Typography.Paragraph>
      <Form form={editForm} layout="vertical"><ResourceFields/></Form>
    </Modal>
  </Drawer>;
}
