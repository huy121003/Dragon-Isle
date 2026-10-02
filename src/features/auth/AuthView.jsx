import React,{useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {Button,Card,Form,Input,Typography} from 'antd';
import {z} from 'zod';
import {apiFetch} from '../../api/http.js';

const CredentialsSchema=z.object({username:z.string().regex(/^[A-Za-z0-9_]{3,24}$/),
  password:z.string().min(8).max(128)});
export default function AuthView(){
  const [mode,setMode]=useState('login'),[error,setError]=useState('');
  const queryClient=useQueryClient();
  const mutation=useMutation({
    mutationFn:values=>apiFetch('/api/auth/'+mode,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)
    }),
    onSuccess:async()=>{
      await queryClient.invalidateQueries({queryKey:['auth','me']});
      window.location.reload();
    },
    onError:error=>setError(error.message)
  });
  function submit(values){setError('');mutation.mutate(values);}
  return <div className="react-auth"><Card className="login-card">
    <div className="login-crest">🐉</div><Typography.Title level={2}>Dragon Isle</Typography.Title>
    <Typography.Text type="secondary">Your own dragon island</Typography.Text>
    <div className="auth-switch">
      <Button type={mode==='login'?'primary':'default'} onClick={()=>{setMode('login');setError('');}}>Sign in</Button>
      <Button type={mode==='register'?'primary':'default'} onClick={()=>{setMode('register');setError('');}}>Register</Button>
    </div>
    <Form layout="vertical" onFinish={submit} autoComplete="on">
      <Form.Item name="username" label="Username" rules={[{required:true,message:'Enter your username'},
        {pattern:/^[A-Za-z0-9_]{3,24}$/,message:'3–24 letters, numbers or underscores'}]}>
        <Input size="large" autoComplete="username"/></Form.Item>
      <Form.Item name="password" label="Password" rules={[{required:true,message:'Enter your password'},
        {min:8,message:'At least 8 characters'}]}>
        <Input.Password size="large" autoComplete={mode==='login'?'current-password':'new-password'}/></Form.Item>
      {error&&<Typography.Text type="danger">{error}</Typography.Text>}
      <Button size="large" type="primary" htmlType="submit" loading={mutation.isPending} block>
        {mode==='login'?'Enter island':'Create account'}
      </Button>
    </Form>
  </Card></div>;
}
